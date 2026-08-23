'use strict';

const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
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

let activeRadioFavourite = null;
let previousSmartSelectInputCode = null;
let smartSelectCommandInFlight = false;
let heosProgressCurrentMs = 0;
let heosProgressDurationMs = 0;
let heosProgressSocket = null;
let heosProgressReconnectTimer = null;



const execFileAsync = promisify(execFile);

const PANEL_DDC_BUS = '21';
const PANEL_NORMAL_BRIGHTNESS = '50';

let panelPowerState = 'unknown';
let panelCommandQueue = Promise.resolve();


function mediaBackendRequest(pathname, method = 'GET', timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        host: config.mediaBackendHost || '192.168.50.145',
        port: Number(config.mediaBackendPort) || 3100,
        path: pathname,
        method,
        timeout: timeoutMs
      },
      response => {
        let body = '';

        response.setEncoding('utf8');

        response.on('data', chunk => {
          body += chunk;
        });

        response.on('end', () => {
          let data;

          try {
            data = body ? JSON.parse(body) : {};
          } catch {
            reject(new Error('Invalid media-backend JSON'));
            return;
          }

          if (
            response.statusCode < 200 ||
            response.statusCode >= 300
          ) {
            reject(new Error(
              data.error ||
              `Media backend HTTP ${response.statusCode}`
            ));
            return;
          }

          resolve(data);
        });
      }
    );

    request.on('timeout', () => {
      request.destroy(new Error('Media backend timeout'));
    });

    request.on('error', reject);
    request.end();
  });
}

async function handleAutomaticSmartSelect(receiver) {
  const inputCode = String(receiver?.inputCode || "").toUpperCase();

  if (!inputCode || inputCode === "UNKNOWN") return;

  if (previousSmartSelectInputCode === null) {
    previousSmartSelectInputCode = inputCode;
    return;
  }

  const enteredTv =
    previousSmartSelectInputCode !== "TV" && inputCode === "TV";

  previousSmartSelectInputCode = inputCode;

  if (!enteredTv || smartSelectCommandInFlight) return;

  smartSelectCommandInFlight = true;

  try {
    await avr("MSSMART4");
  } catch (error) {
    console.warn(`Automatic Smart Select 4 failed: ${error.message}`);
  } finally {
    smartSelectCommandInFlight = false;
  }
}

async function runDdcutil(...args) {
  await execFileAsync(
    'ddcutil',
    ['--bus', PANEL_DDC_BUS, ...args],
    { timeout: 5000 }
  );
}

function queuePanelCommand(command) {
  panelCommandQueue = panelCommandQueue.then(command, command);
  return panelCommandQueue;
}

async function powerPanelOn() {
  return queuePanelCommand(async () => {
    await runDdcutil('setvcp', 'D6', '01');
    await runDdcutil('setvcp', '10', PANEL_NORMAL_BRIGHTNESS);

    panelPowerState = 'on';

    return {
      power: panelPowerState,
      brightness: Number(PANEL_NORMAL_BRIGHTNESS)
    };
  });
}

async function powerPanelOff() {
  return queuePanelCommand(async () => {
    if (panelPowerState === 'off') {
      return {
        power: panelPowerState,
        brightness: Number(PANEL_NORMAL_BRIGHTNESS)
      };
    }

    await runDdcutil('setvcp', 'D6', '05');
    panelPowerState = 'off';

    return {
      power: panelPowerState,
      brightness: Number(PANEL_NORMAL_BRIGHTNESS)
    };
  });
}

function handleHeosProgressEvent(response) {
  if (response?.heos?.command !== 'event/player_now_playing_progress') return;

  const values = params(response);
  if (String(values.pid || '') !== String(config.playerId)) return;

  heosProgressCurrentMs = Number(values.cur_pos || 0);
  heosProgressDurationMs = Number(values.duration || 0);
}

function startHeosProgressListener() {
  if (heosProgressSocket) return;

  const socket = net.createConnection({
    host: config.marantzHost,
    port: config.marantzPort
  });

  heosProgressSocket = socket;
  socket.setEncoding('utf8');
  let buffer = '';

  socket.on('connect', () => {
    socket.write('heos://system/register_for_change_events?enable=on\r\n');
  });

  socket.on('data', chunk => {
    buffer += chunk;
    while (buffer.includes('\n')) {
      const newline = buffer.indexOf('\n');
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      try {
        handleHeosProgressEvent(JSON.parse(line));
      } catch {}
    }
  });

  const reconnect = () => {
    if (heosProgressSocket === socket) {
      heosProgressSocket = null;
    }

    clearTimeout(heosProgressReconnectTimer);
    heosProgressReconnectTimer =
      setTimeout(startHeosProgressListener, 3000);
  };

  socket.on('error', reconnect);
  socket.on('close', reconnect);
}

function heos(command, timeoutMs = 3000, waitForFinal = false) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host: config.marantzHost,
      port: config.marantzPort
    });

    let buffer = '';
    let settled = false;
    let lastResponse = null;

    function finish(error, value) {
      if (settled) return;
      settled = true;
      socket.destroy();
      error ? reject(error) : resolve(value);
    }

    function handleResponse(response) {
      lastResponse = response;

      const message = String(response?.heos?.message || '');
      const underProcess = message.includes('command under process');

      if (!waitForFinal || !underProcess) {
        finish(null, response);
      }
    }

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      socket.write(`heos://${command}\r\n`);
    });

    socket.on('data', chunk => {
      buffer += chunk.toString('utf8');

      while (buffer.includes('\n')) {
        const newline = buffer.indexOf('\n');
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);

        if (!line) continue;

        try {
          handleResponse(JSON.parse(line));
        } catch {
          finish(new Error('Invalid HEOS response'));
        }
      }
    });

    socket.on('timeout', () => {
      if (lastResponse) {
        finish(null, lastResponse);
      } else {
        finish(new Error('HEOS request timed out'));
      }
    });

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

function getZonePower(zone, timeoutMs = 1500) {
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
      socket.write(`${zone}?\r`);
    });

    socket.on('data', chunk => {
      buffer += chunk.toString('utf8');

      const lines = buffer.split('\r');

      for (const rawLine of lines) {
        const line = rawLine.trim();

        if (line === `${zone}ON` || line === `${zone}OFF`) {
          finish(null, line);
          return;
        }
      }
    });

    socket.on('timeout', () => {
      finish(new Error(`No power response from ${zone}`));
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
    value.length === 3 ? Number(value) / 10 : Number(value);

  return receiverValue - 80;
}

function inputLabel(line) {
  const input = line?.slice(2) || 'UNKNOWN';

  if (input === 'AUX1') return 'AUX';
  return settings.inputNames?.[input] || input;
}

async function getReceiverStatus() {
  const results = await Promise.allSettled([
    avr('ZM?', 'ZM'),
    avr('SI?', 'SI'),
    avr('MV?', 'MV'),
    avr('MU?', 'MU'),
    getZonePower('Z2'),
    getZonePower('Z3')
  ]);

  const value = index =>
    results[index].status === 'fulfilled' ? results[index].value : '';

  const powerLine = value(0);
  const inputLine = value(1);
  const zone2Line = value(4);
  const zone3Line = value(5);
  const volumeLine = value(2);
  const muteLine = value(3);

  return {
    power: powerLine === 'ZMON' ? 'on' : 'standby',
    zone2Power: zone2Line === 'Z2ON' ? 'on' : 'off',
    zone3Power: zone3Line === 'Z3ON' ? 'on' : 'off',
    input: inputLabel(inputLine),
    inputCode: inputLine.slice(2) || 'UNKNOWN',
    volume: parseVolume(volumeLine),
    muted: muteLine === 'MUON'
  };
}

async function getStatus() {
  const pid = encodeURIComponent(config.playerId);

  const [mediaResult, stateResult, receiverResult] =
    await Promise.allSettled([
      heos(`player/get_now_playing_media?pid=${pid}`),
      heos(`player/get_play_state?pid=${pid}`),
      getReceiverStatus()
    ]);

  const mediaResponse =
    mediaResult.status === 'fulfilled' ? mediaResult.value : {};

  const media =
    mediaResponse?.heos?.result === 'success'
      ? mediaResponse.payload || {}
      : {};

  const state =
    stateResult.status === 'fulfilled' ? params(stateResult.value) : {};

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

  handleAutomaticSmartSelect(receiver);


  let song = String(media.song || '').trim();
  let artist = String(media.artist || '').trim();
  let album = String(media.album || media.station || '').trim();
  const imageUrl = String(media.image_url || '').trim();
  const isNetPlayback =
    receiver.power === 'on' && receiver.inputCode === 'NET';
  const genericUrlStream = [song, artist, album].some(
    value => String(value).trim().toLowerCase() === 'url stream'
  );

  const rememberedUrlRadio =
    isNetPlayback &&
    genericUrlStream &&
    activeRadioFavourite &&
    Date.now() - activeRadioFavourite.selectedAt < 12 * 60 * 60 * 1000;

  if (rememberedUrlRadio) {
    song = '';
    artist = '';
    album = activeRadioFavourite.name;
  }

  const isInternetRadio =
    isNetPlayback &&
    (
      rememberedUrlRadio ||
      imageUrl.toLowerCase().includes('tunein.com') ||
      (!song && !artist && Boolean(album))
    );
  const playbackSource = !isNetPlayback
    ? 'other'
    : isInternetRadio
      ? 'internet-radio'
      : song || artist
        ? 'tidal'
        : 'other-net';
  const hasTrackInfo = isNetPlayback && Boolean(song || artist || album);

  return {
    connected:
      mediaResult.status === 'fulfilled' ||
      receiverResult.status === 'fulfilled',
    song,
    artist,
    album,
    playbackSource,
    hasTrackInfo,
    imageUrl,
    state: state.state || 'unknown',
    current: heosProgressCurrentMs / 1000,
    duration: heosProgressDurationMs / 1000,
    receiver,
    settings: {
      marantzHost: config.marantzHost,
      clock24h: settings.clock24h !== false,
      idleTimeoutSeconds: Math.max(
        0,
        Number(settings.idleTimeoutSeconds) || 60
      )
    },
    updatedAt: Date.now()
  };
}

async function seekHeos(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const target = [hours, minutes, secs]
    .map(value => String(value).padStart(2, '0'))
    .join(':');

  const body =
    '<?xml version="1.0"?>' +
    '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" ' +
    's:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">' +
    '<s:Body><u:Seek xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">' +
    '<InstanceID>0</InstanceID><Unit>REL_TIME</Unit>' +
    '<Target>' + target + '</Target>' +
    '</u:Seek></s:Body></s:Envelope>';

  const response = await fetch(
    'http://' + config.marantzHost +
    ':60006/upnp/control/renderer_dvc/AVTransport',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset="utf-8"',
        'SOAPACTION':
          '"urn:schemas-upnp-org:service:AVTransport:1#Seek"'
      },
      body
    }
  );

  if (!response.ok) {
    throw new Error('UPnP seek failed');
  }

  return { ok: true, position: total };
}

async function heosControl(action) {
  const pid = encodeURIComponent(config.playerId);
  const commands = {
    play: `player/set_play_state?pid=${pid}&state=play`,
    pause: `player/set_play_state?pid=${pid}&state=pause`,
    next: `player/play_next?pid=${pid}`,
    previous: `player/play_previous?pid=${pid}`
  };

  if (!commands[action]) throw new Error('Unknown HEOS action');

  const response = await heos(commands[action]);
  if (response?.heos?.result !== 'success') {
    throw new Error(response?.heos?.message || 'Control failed');
  }

  return { ok: true };
}

async function getRadioFavourites() {
  const response = await heos(
    'browse/browse?sid=1028&cid=1&range=0,100',
    5000,
    true
  );

  if (response?.heos?.result !== 'success') {
    throw new Error(response?.heos?.message || 'Could not load favourites');
  }

  return (Array.isArray(response.payload) ? response.payload : [])
    .filter(item => item?.playable === 'yes' && item?.mid)
    .map((item, index) => ({
      index,
      name: String(item.name || 'Radio station'),
      mid: String(item.mid),
      imageUrl: String(item.image_url || '')
    }));
}

async function playRadioFavourite(mid, name) {
  if (!mid) throw new Error('Missing station ID');

  const pid = encodeURIComponent(config.playerId);
  const isDirectUrl = /^https?:\/\//i.test(mid);

  const streamUrl = mid.replace(/&/g, '%26');

  const command = isDirectUrl
    ? `browse/play_stream?pid=${pid}&url=${streamUrl}`
    : `browse/play_stream?pid=${pid}` +
      '&sid=1028&cid=1' +
      `&mid=${encodeURIComponent(mid)}` +
      `&name=${encodeURIComponent(name || 'Radio')}`;

  await avr('SINET');

  const netDeadline = Date.now() + 2500;

  while (Date.now() < netDeadline) {
    try {
      const input = await avr('SI?', 'SI', 700);

      if (input === 'SINET') {
        break;
      }
    } catch {
      // Keep checking briefly while the AVR changes input.
    }

    await sleep(100);
  }

  const response = await heos(command, 7000, true);

  if (response?.heos?.result !== 'success') {
    throw new Error(response?.heos?.message || 'Could not start station');
  }

  activeRadioFavourite = {
    name: String(name || 'Internet Radio'),
    mid: String(mid),
    selectedAt: Date.now()
  };

  return { ok: true, name: activeRadioFavourite.name };
}

function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function normaliseVolume(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new Error('Invalid receiver volume');
  return Math.min(18, Math.max(-80, Math.round(numeric * 2) / 2));
}

function marantzVolumeCommand(value) {
  const volume = normaliseVolume(value);
  const receiverValue = volume + 80;
  const encoded = Number.isInteger(receiverValue)
    ? String(receiverValue).padStart(2, '0')
    : String(Math.round(receiverValue * 10)).padStart(3, '0');
  return `MV${encoded}`;
}

async function setReceiverVolume(value) {
  const target = normaliseVolume(value);
  await avr(marantzVolumeCommand(target));

  const deadline = Date.now() + 1600;
  while (Date.now() < deadline) {
    try {
      const response = await avr('MV?', 'MV', 700);
      const actual = parseVolume(response);
      if (actual !== null && Math.abs(actual - target) < 0.25) {
        return actual;
      }
    } catch {
      // Retry briefly while the receiver applies the command.
    }
    await sleep(80);
  }

  throw new Error(`Receiver did not reach ${target} dB`);
}

async function receiverControl(action, requestedVolume = null) {
  if (action === 'zone2-toggle' || action === 'zone3-toggle') {
    const zone = action === 'zone2-toggle' ? 'Z2' : 'Z3';

    const response = await getZonePower(zone);
    const isOn = response === `${zone}ON`;

    await avr(`${zone}${isOn ? 'OFF' : 'ON'}`);

    return {
      ok: true,
      power: isOn ? 'off' : 'on'
    };
  }

  if (action === 'volume-set') {
    const volume = await setReceiverVolume(requestedVolume);
    return { ok: true, volume };
  }

  if (action === 'aux') {
    return mediaBackendRequest(
      '/api/control/source?source=aux',
      'POST'
    );
  }

  const commands = {
    'power-on': 'ZMON',
    'power-off': 'ZMOFF',
    'volume-up': 'MVUP',
    'volume-down': 'MVDOWN',
    phono: 'MSSMART1',
    cd: 'MSSMART2',
    heos: 'MSSMART3',
    aux: 'SIAUX1',
    "zone2-source-source": "Z2SOURCE",
    "zone2-source-phono": "Z28K",
    "zone2-source-cd": "Z2CD",
    "zone2-source-heos": "Z2NET"
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

  if (!commands[action]) throw new Error('Unknown receiver action');
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

const serverInstanceId = `${Date.now()}-${process.pid}`;

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  try {
    if (req.method === 'GET' && url.pathname === '/api/instance-id') {
      return sendJson(res, 200, { instanceId: serverInstanceId });
    }

      if (req.method === 'GET' && url.pathname === '/api/tidal/search') {
        const query = url.searchParams.get('q') || '';

        const result = await mediaBackendRequest(
          '/api/tidal/search?q=' + encodeURIComponent(query)
        );

        return sendJson(res, 200, result);
      }

        if (req.method === 'GET' && url.pathname === '/api/tidal/browse') {
      const cid = url.searchParams.get('cid') || '';
      const start = url.searchParams.get('start');
      const limit = url.searchParams.get('limit');

      let pathname =
        '/api/tidal/browse?cid=' + encodeURIComponent(cid);

      if (start !== null) {
        pathname += '&start=' + encodeURIComponent(start);
      }

      if (limit !== null) {
        pathname += '&limit=' + encodeURIComponent(limit);
      }

      const result = await mediaBackendRequest(
        pathname,
        'GET',
        40000
      );

      return sendJson(res, 200, result);
    }

  if (req.method === 'GET' && url.pathname === '/api/tidal/artist/albums') {
        const cid = url.searchParams.get('cid') || '';

        const result = await mediaBackendRequest(
          '/api/tidal/artist/albums?cid=' + encodeURIComponent(cid)
        );

        return sendJson(res, 200, result);
      }

      if (req.method === 'GET' && url.pathname === '/api/tidal/album/tracks') {
        const cid = url.searchParams.get('cid') || '';

        const result = await mediaBackendRequest(
          '/api/tidal/album/tracks?cid=' + encodeURIComponent(cid)
        );

        return sendJson(res, 200, result);
      }

        if (req.method === 'GET' && url.pathname === '/api/tidal/playlist/play') {
          const cid = url.searchParams.get('cid') || '';
          const mid = url.searchParams.get('mid');
          const shuffle = url.searchParams.get('shuffle') || '0';

          let pathname =
            '/api/tidal/playlist/play?cid=' + encodeURIComponent(cid);

          if (mid) {
            pathname += '&mid=' + encodeURIComponent(mid);
          }

          pathname += '&shuffle=' + encodeURIComponent(shuffle);

          const result = await mediaBackendRequest(
            pathname,
            'GET',
            20000
          );

          return sendJson(res, 200, result);
        }

      if (req.method === 'GET' && url.pathname === '/api/tidal/play') {
        const cid = url.searchParams.get('cid') || '';
        const mid = url.searchParams.get('mid') || '';

        const result = await mediaBackendRequest(
          '/api/tidal/play?cid=' + encodeURIComponent(cid) +
          '&mid=' + encodeURIComponent(mid)
        );

        return sendJson(res, 200, result);
      }

    if (req.method === 'GET' && url.pathname === '/api/status') {
      return sendJson(res, 200, await getStatus());
    }

      if (req.method === 'POST' && url.pathname === '/api/smart-select/4') {
        await avr('MSSMART4');
        return sendJson(res, 200, { ok: true });
      }

      if (req.method === 'POST' && url.pathname === '/api/panel/on') {
        return sendJson(res, 200, await powerPanelOn());
      }

      if (req.method === 'POST' && url.pathname === '/api/panel/off') {
        return sendJson(res, 200, await powerPanelOff());
      }

    if (req.method === 'GET' && url.pathname === '/api/radio/favourites') {
      return sendJson(res, 200, {
        favourites: await getRadioFavourites()
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/radio/play') {
      return sendJson(
        res,
        200,
        await playRadioFavourite(
          url.searchParams.get('mid'),
          url.searchParams.get('name')
        )
      );
    }

    if (req.method === 'POST' && url.pathname.startsWith('/api/control/')) {
      const action = decodeURIComponent(url.pathname.split('/').pop());

      if (action === 'seek') {
        const position = url.searchParams.get('position');
        return sendJson(res, 200, await seekHeos(position));
      }

      if (['play', 'pause', 'next', 'previous'].includes(action)) {
        return sendJson(res, 200, await heosControl(action));
      }

      const requestedVolume =
        action === 'volume-set' ? url.searchParams.get('value') : null;

      return sendJson(
        res,
        200,
        await receiverControl(action, requestedVolume)
      );
    }

    if (req.method === 'GET') return serveFile(url.pathname, res);

    res.writeHead(405);
    res.end('Method not allowed');
  } catch (error) {
    sendJson(res, 503, {
      connected: false,
      error: error.message,
      updatedAt: Date.now()
    });
  }
}).listen(config.listenPort, config.listenHost, () => {
  console.log(
    `Marantz display: http://${config.listenHost}:${config.listenPort}`
  );
  startHeosProgressListener();
});
