'use strict';

const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');
const { URL } = require('url');

const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')
);

const defaultSettings = {
  clock24h: true,
  idleTimeoutSeconds: 60,
  inputNames: {}
};

let settings = defaultSettings;

try {
  settings = {
    ...defaultSettings,
    ...JSON.parse(
      fs.readFileSync(path.join(__dirname, 'settings.json'), 'utf8')
    )
  };
} catch (error) {
  console.warn(`Using default settings: ${error.message}`);
}

const publicDir = path.join(__dirname, 'public');

function heos(command, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host: config.marantzHost,
      port: config.marantzPort
    });

    let buffer = '';
    let settled = false;

    function finish(error, value) {
      if (settled) return;
      settled = true;
      socket.destroy();
      error ? reject(error) : resolve(value);
    }

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      socket.write(`heos://${command}\r\n`);
    });

    socket.on('data', chunk => {
      buffer += chunk.toString('utf8');
      const newline = buffer.indexOf('\n');

      if (newline < 0) return;

      const line = buffer.slice(0, newline).trim();

      try {
        finish(null, JSON.parse(line));
      } catch {
        finish(new Error('Invalid HEOS response'));
      }
    });

    socket.on('timeout', () => finish(new Error('HEOS request timed out')));
    socket.on('error', finish);
  });
}

function avr(command, expectedPrefix = '', timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host: config.marantzHost,
      port: 23
    });

    let buffer = '';
    let settled = false;

    function finish(error, value) {
      if (settled) return;
      settled = true;
      socket.destroy();
      error ? reject(error) : resolve(value);
    }

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      socket.write(`${command}\r`);
      if (!expectedPrefix) {
        setTimeout(() => finish(null, { ok: true }), 180);
      }
    });

    socket.on('data', chunk => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\r');

      for (const rawLine of lines) {
        const line = rawLine.trim();

        if (line && (!expectedPrefix || line.startsWith(expectedPrefix))) {
          finish(null, line);
          return;
        }
      }
    });

    socket.on('timeout', () => {
      if (expectedPrefix) {
        finish(new Error(`No response to ${command}`));
      } else {
        finish(null, { ok: true });
      }
    });

    socket.on('error', finish);
  });
}

function params(response) {
  return Object.fromEntries(
    new URLSearchParams(response?.heos?.message || '')
  );
}

function parseVolume(line) {
  if (!line || !line.startsWith('MV')) return null;

  const value = line.slice(2);

  if (!/^\d{2,3}$/.test(value)) return null;

  const receiverValue =
    value.length === 3
      ? Number(value) / 10
      : Number(value);

  return receiverValue - 80;
}

function inputLabel(line) {
  const input = line?.slice(2) || 'UNKNOWN';
  return settings.inputNames?.[input] || input;
}

async function getReceiverStatus() {
  const results = await Promise.allSettled([
    avr('PW?', 'PW'),
    avr('SI?', 'SI'),
    avr('MV?', 'MV'),
    avr('MU?', 'MU')
  ]);

  const value = index =>
    results[index].status === 'fulfilled'
      ? results[index].value
      : '';

  const powerLine = value(0);
  const inputLine = value(1);
  const volumeLine = value(2);
  const muteLine = value(3);

  return {
    power: powerLine === 'PWON' ? 'on' : 'standby',
    input: inputLabel(inputLine),
    inputCode: inputLine.slice(2) || 'UNKNOWN',
    volume: parseVolume(volumeLine),
    muted: muteLine === 'MUON'
  };
}

async function getStatus() {
  const pid = encodeURIComponent(config.playerId);

  const [
    mediaResult,
    stateResult,
    progressResult,
    receiverResult
  ] = await Promise.allSettled([
    heos(`player/get_now_playing_media?pid=${pid}`),
    heos(`player/get_play_state?pid=${pid}`),
    heos(`player/get_now_playing_progress?pid=${pid}`),
    getReceiverStatus()
  ]);

  const mediaResponse =
    mediaResult.status === 'fulfilled'
      ? mediaResult.value
      : {};

  const media =
    mediaResponse?.heos?.result === 'success'
      ? mediaResponse.payload || {}
      : {};

  const state =
    stateResult.status === 'fulfilled'
      ? params(stateResult.value)
      : {};

  const progress =
    progressResult.status === 'fulfilled'
      ? params(progressResult.value)
      : {};

  const receiver =
    receiverResult.status === 'fulfilled'
      ? receiverResult.value
      : {
          power: 'unknown',
          input: 'UNKNOWN',
          inputCode: 'UNKNOWN',
          volume: null,
          muted: false
        };

  const song = String(media.song || '').trim();
  const artist = String(media.artist || '').trim();
  const album = String(media.album || media.station || '').trim();
  const hasTrackInfo = receiver.power === 'on' && receiver.inputCode === 'NET' && Boolean(song || artist || album);

  return {
    connected:
      mediaResult.status === 'fulfilled' ||
      receiverResult.status === 'fulfilled',
    song,
    artist,
    album,
    hasTrackInfo,
    imageUrl: media.image_url || '',
    state: state.state || 'unknown',
    current: Number(progress.cur_pos || 0),
    duration: Number(progress.duration || 0),
    receiver,
    settings: {
      clock24h: settings.clock24h !== false,
      idleTimeoutSeconds: Math.max(
        0,
        Number(settings.idleTimeoutSeconds) || 60
      )
    },
    updatedAt: Date.now()
  };
}

async function heosControl(action) {
  const pid = encodeURIComponent(config.playerId);

  const commands = {
    play: `player/set_play_state?pid=${pid}&state=play`,
    pause: `player/set_play_state?pid=${pid}&state=pause`,
    next: `player/play_next?pid=${pid}`,
    previous: `player/play_previous?pid=${pid}`
  };

  if (!commands[action]) {
    throw new Error('Unknown HEOS action');
  }

  const response = await heos(commands[action]);

  if (response?.heos?.result !== 'success') {
    throw new Error(response?.heos?.message || 'Control failed');
  }

  return { ok: true };
}

async function receiverControl(action) {
  const commands = {
    'volume-up': 'MVUP',
    'volume-down': 'MVDOWN',
    phono: 'SI8K',
    cd: 'SICD',
    heos: 'SINET'
  };

  if (action === 'mute') {
    let muted = false;

    try {
      const response = await avr('MU?', 'MU');
      muted = response === 'MUON';
    } catch {
      muted = false;
    }

    await avr(muted ? 'MUOFF' : 'MUON');
    return { ok: true, muted: !muted };
  }

  if (!commands[action]) {
    throw new Error('Unknown receiver action');
  }

  await avr(commands[action]);
  return { ok: true };
}

function sendJson(res, statusCode, value) {
  const body = JSON.stringify(value);

  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });

  res.end(body);
}

function serveFile(pathname, res) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(requested).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const extension = path.extname(filePath).toLowerCase();

    const types = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };

    res.writeHead(200, {
      'Content-Type': types[extension] || 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    });

    res.end(data);
  });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  try {
    if (req.method === 'GET' && url.pathname === '/api/status') {
      return sendJson(res, 200, await getStatus());
    }

    if (
      req.method === 'POST' &&
      url.pathname.startsWith('/api/control/')
    ) {
      const action = decodeURIComponent(url.pathname.split('/').pop());

      if (['play', 'pause', 'next', 'previous'].includes(action)) {
        return sendJson(res, 200, await heosControl(action));
      }

      return sendJson(res, 200, await receiverControl(action));
    }

    if (req.method === 'GET') {
      return serveFile(url.pathname, res);
    }

    res.writeHead(405);
    res.end('Method not allowed');
  } catch (error) {
    sendJson(res, 503, {
      connected: false,
      error: error.message,
      updatedAt: Date.now()
    });
  }
}).listen(
  config.listenPort,
  config.listenHost,
  () => {
    console.log(
      `Marantz display: http://${config.listenHost}:${config.listenPort}`
    );
  }
);
