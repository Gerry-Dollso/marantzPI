'use strict';

const artwork = document.getElementById('artwork');
const artworkFallback = document.getElementById('artworkFallback');
const song = document.getElementById('song');
const artist = document.getElementById('artist');
const album = document.getElementById('album');
const progressBar = document.getElementById('progressBar');
const currentTime = document.getElementById('currentTime');
const duration = document.getElementById('duration');
const playPause = document.getElementById('playPause');
const connection = document.getElementById('connection');
const muteButton = document.getElementById('muteButton');
const idleScreen = document.getElementById('idleScreen');
const nowPlayingScreen = document.getElementById('nowPlayingScreen');
const idleClock = document.getElementById('idleClock');
const idleDate = document.getElementById('idleDate');
const idleInput = document.getElementById('idleInput');
const idleSourceIcon = document.getElementById('idleSourceIcon');
const idlePower = document.getElementById('idlePower');
const idleVolume = document.getElementById('idleVolume');

let latest = null;
let lastImageUrl = '';
let localTickStarted = 0;
let localTickPosition = 0;
let lastTrackInfoAt = 0;
let idleDelayMs = 60000;
let clock24h = true;

function formatTime(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(value / 60);
  const remainder = value % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function updateProgress(position, total) {
  currentTime.textContent = formatTime(position);
  duration.textContent = formatTime(total);

  const percentage =
    total > 0
      ? Math.min(100, Math.max(0, (position / total) * 100))
      : 0;

  progressBar.style.width = `${percentage}%`;
}

function showArtwork(url) {
  if (!url) {
    artwork.style.display = 'none';
    artworkFallback.style.display = 'grid';
    lastImageUrl = '';
    return;
  }

  if (url === lastImageUrl) return;

  lastImageUrl = url;

  artwork.onload = () => {
    artwork.style.display = 'block';
    artworkFallback.style.display = 'none';
  };

  artwork.onerror = () => {
    artwork.style.display = 'none';
    artworkFallback.style.display = 'grid';
  };

  artwork.src = url;
}

function updateClock() {
  const now = new Date();

  idleClock.textContent = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !clock24h
  });

  idleDate.textContent = now
    .toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
    .toUpperCase();
}

function formatVolume(value) {
  if (!Number.isFinite(Number(value))) return 'VOLUME —';

  const volume = Number(value);
  const displayed = Number.isInteger(volume)
    ? volume.toFixed(1)
    : String(volume);

  return `${displayed} dB`;
}

function updateIdleDisplay(data) {
  const receiver = data.receiver || {};
  const hasTrackInfo = data.hasTrackInfo === true;

  idleDelayMs = Math.max(
    0,
    Number(data.settings?.idleTimeoutSeconds || 60) * 1000
  );
  clock24h = data.settings?.clock24h !== false;

  if (hasTrackInfo) {
    lastTrackInfoAt = Date.now();
  }

  idleInput.textContent =
    receiver.power === 'on'
      ? receiver.input || 'MARANTZ'
      : 'MARANTZ';

  const inputCode = String(receiver.inputCode || '').toUpperCase();

  idleSourceIcon.className = 'idle-source-icon';

  if (inputCode === '8K') {
    idleSourceIcon.classList.add('show-record');
  } else if (inputCode === 'CD') {
    idleSourceIcon.classList.add('show-cd');
  } else if (inputCode === 'NET') {
    idleSourceIcon.classList.add('show-heos');
  }

  idlePower.textContent =
    receiver.power === 'on'
      ? receiver.muted
        ? 'MUTED'
        : 'RECEIVER ON'
      : 'STANDBY';

  idleVolume.textContent =
    receiver.power === 'on'
      ? formatVolume(receiver.volume)
      : '';

  const isTvInput = inputCode === 'TV';

  const showIdle =
    receiver.power !== 'on' ||
    isTvInput;

  document.body.classList.toggle('show-idle', showIdle);
  idleScreen.setAttribute('aria-hidden', String(!showIdle));
  nowPlayingScreen.setAttribute('aria-hidden', String(showIdle));
}

function render(data) {
  latest = data;
  SourceController.syncFromReceiver(data.receiver);

  const receiver = data.receiver || {};
  const inputCode = String(receiver.inputCode || '').toUpperCase();
  const inputName = receiver.input || 'MARANTZ';

  document.body.classList.toggle(
    'streaming-source',
    inputCode === 'NET'
  );

  const hasUsefulStreamingMetadata =
    inputCode === 'NET' &&
    data.hasTrackInfo === true &&
    Boolean(
      String(data.artist || '').trim() ||
      String(data.imageUrl || '').trim() ||
      Number(data.duration) > 0
    );

  if (hasUsefulStreamingMetadata) {
    song.textContent = data.song || inputName;
    artist.textContent = data.artist || '';
    album.textContent = data.album || '';

    showArtwork(data.imageUrl);

    const playing = data.state === 'play';
    playPause.dataset.action = playing ? 'pause' : 'play';
    playPause.textContent = playing ? 'Ⅱ' : '▶';

    localTickPosition = Number(data.current) || 0;
    localTickStarted = Date.now();

    updateProgress(
      localTickPosition,
      Number(data.duration) || 0
    );
  } else {
    song.textContent = inputName;
    artist.textContent = '';
    album.textContent = '';

    showArtwork('');

    playPause.dataset.action = 'play';
    playPause.textContent = '▶';

    localTickPosition = 0;
    localTickStarted = Date.now();
    updateProgress(0, 0);
  }

  connection.textContent = 'CONNECTED';
  connection.className = 'connection connected';
  updateIdleDisplay(data);
}

async function refresh() {
  try {
    const response = await fetch('/api/status', {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }

    render(await response.json());
  } catch (error) {
    connection.textContent = 'RECONNECTING';
    connection.className = 'connection error';
  }
}

async function requestControl(action) {
  const response = await fetch(
    `/api/control/${encodeURIComponent(action)}`,
    {
      method: 'POST',
      cache: 'no-store'
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Command failed');
  }

  return result;
}

async function sendAction(button) {
  const action = button.dataset.action;
  if (!action) return;

  button.disabled = true;
  button.classList.add('pressed');

  try {
    const result = await requestControl(action);

    if (action === 'mute' && typeof result.muted === 'boolean') {
      muteButton.textContent = result.muted ? 'UNMUTE' : 'MUTE';
    }

    setTimeout(refresh, 350);
  } catch (error) {
    connection.textContent = 'CONTROL ERROR';
    connection.className = 'connection error';
  } finally {
    setTimeout(() => {
      button.disabled = false;
      button.classList.remove('pressed');
    }, 180);
  }
}

const SourceController = {
  order: ['phono', 'cd', 'heos', 'aux'],

  inputCodes: {
    '8K': 'phono',
    CD: 'cd',
    NET: 'heos',
    AUX1: 'aux'
  },

  current: 'phono',
  changing: false,

  syncFromReceiver(receiver) {
    const inputCode = String(
      receiver?.inputCode || ''
    ).toUpperCase();

    const source = this.inputCodes[inputCode];

    if (source) {
      this.current = source;
    }
  },

  indexOfCurrent() {
    const index = this.order.indexOf(this.current);
    return index >= 0 ? index : 0;
  },

  relative(direction) {
    const currentIndex = this.indexOfCurrent();

    const nextIndex =
      (currentIndex + direction + this.order.length) %
      this.order.length;

    return this.change(this.order[nextIndex]);
  },

  next() {
    return this.relative(1);
  },

  previous() {
    return this.relative(-1);
  },

  async change(source) {
    if (!this.order.includes(source) || this.changing) {
      return;
    }

    if (source === this.current) {
      connection.textContent =
        `${source.toUpperCase()} SELECTED`;
      return;
    }

    this.changing = true;
    document.body.classList.add('source-changing');

    const button = document.querySelector(
      `button[data-action="${source}"]`
    );

    if (button) {
      button.disabled = true;
      button.classList.add('pressed');
    }

    try {
      connection.textContent =
        `SELECTING ${source.toUpperCase()}`;

      await requestControl(source);

      this.current = source;
      connection.textContent =
        `${source.toUpperCase()} SELECTED`;

      setTimeout(refresh, 350);
    } catch (error) {
      connection.textContent = 'CONTROL ERROR';
      connection.className = 'connection error';
    } finally {
      setTimeout(() => {
        this.changing = false;
        document.body.classList.remove('source-changing');

        if (button) {
          button.disabled = false;
          button.classList.remove('pressed');
        }
      }, 300);
    }
  }
};

let idleTouchStartX = 0;
let idleTouchStartY = 0;

idleScreen.addEventListener(
  'touchstart',
  event => {
    if (event.touches.length !== 1) return;

    idleTouchStartX = event.touches[0].clientX;
    idleTouchStartY = event.touches[0].clientY;
  },
  { passive: true }
);

idleScreen.addEventListener(
  'touchend',
  event => {
    const touch = event.changedTouches[0];
    if (!touch) return;

    const differenceX = touch.clientX - idleTouchStartX;
    const differenceY = touch.clientY - idleTouchStartY;

    if (
      Math.abs(differenceX) < 60 ||
      Math.abs(differenceX) <= Math.abs(differenceY)
    ) {
      return;
    }

    if (differenceX < 0) {
      SourceController.next();
    } else {
      SourceController.previous();
    }
  },
  { passive: true }
);

idleSourceIcon.addEventListener('click', () => {
  SourceController.next();
});

document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const action = button.dataset.action;

  if (SourceController.order.includes(action)) {
    SourceController.change(action);
    return;
  }

  sendAction(button);
});

setInterval(() => {
  if (!latest || latest.state !== 'play') return;

  const elapsed = (Date.now() - localTickStarted) / 1000;
  const position = localTickPosition + elapsed;

  updateProgress(position, Number(latest.duration) || 0);
}, 500);

updateClock();
setInterval(updateClock, 1000);
refresh();
setInterval(refresh, 750);
