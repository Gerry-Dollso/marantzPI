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
const volumeOverlay = document.getElementById('volumeOverlay');
const volumeOverlayValue = document.getElementById('volumeOverlayValue');
const volumeOverlayBar = document.getElementById('volumeOverlayBar');
const zone2Power = document.getElementById('zone2Power');
const zone3Power = document.getElementById('zone3Power');
const standbyZone2Power = document.getElementById('standbyZone2Power');
const standbyZone3Power = document.getElementById('standbyZone3Power');
const zone2Source = document.getElementById("zone2Source");
const standbyZone2Source = document.getElementById("standbyZone2Source");
const zone2SourceMenu = document.getElementById("zone2SourceMenu");
const receiverSettings = document.getElementById("receiverSettings");

let latest = null;
let lastImageUrl = '';
let localTickStarted = 0;
let localTickPosition = 0;
let lastTrackInfoAt = 0;
let idleDelayMs = 60000;
let clock24h = true;

let previousReceiverVolume = null;
let previousReceiverMuted = null;
let volumeOverlayInitialised = false;
let volumeOverlayTimer = null;

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
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    !Number.isFinite(Number(value))
  ) {
    return 'VOLUME —';
  }

  const volume = Number(value);
  const displayed = Number.isInteger(volume)
    ? volume.toFixed(1)
    : String(volume);

  return `${displayed} dB`;
}


function volumeBarPercentage(value) {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    !Number.isFinite(Number(value))
  ) {
    return 0;
  }

  const volume = Number(value);

  // Approximate the Marantz receiver scale from minimum to maximum.
  const minimum = -80;
  const maximum = 18;
  const clamped = Math.min(maximum, Math.max(minimum, volume));

  return ((clamped - minimum) / (maximum - minimum)) * 100;
}

function hideVolumeOverlay() {
  clearTimeout(volumeOverlayTimer);
  volumeOverlayTimer = null;

  volumeOverlay.classList.remove('visible');
  volumeOverlay.setAttribute('aria-hidden', 'true');
}

function receiverVolumeValue(receiver) {
  const rawVolume = receiver?.volume;

  if (
    rawVolume === null ||
    rawVolume === undefined ||
    rawVolume === '' ||
    !Number.isFinite(Number(rawVolume))
  ) {
    return null;
  }

  return Number(rawVolume);
}

function showVolumeOverlay(receiver) {
  if (receiver.power !== 'on') {
    hideVolumeOverlay();
    return;
  }

  const muted = receiver.muted === true;
  const volume = receiverVolumeValue(receiver);

  // A missing status value must never be displayed as 0.0 dB.
  if (!muted && volume === null) return;

  volumeOverlayValue.textContent = muted
    ? 'MUTED'
    : formatVolume(volume);

  volumeOverlayValue.classList.toggle('muted', muted);

  if (muted) {
    volumeOverlayBar.style.width = '0%';
  } else if (volume !== null) {
    volumeOverlayBar.style.width =
      `${volumeBarPercentage(volume)}%`;
  }

  volumeOverlay.classList.add('visible');
  volumeOverlay.setAttribute('aria-hidden', 'false');

  clearTimeout(volumeOverlayTimer);
  volumeOverlayTimer = setTimeout(hideVolumeOverlay, 1500);
}

function updateVolumeOverlay(receiver) {
  const powerOn = receiver.power === 'on';
  const volume = receiverVolumeValue(receiver);
  const muted = receiver.muted === true;

  if (!powerOn) {
    hideVolumeOverlay();
    previousReceiverVolume = volume;
    previousReceiverMuted = muted;
    volumeOverlayInitialised = false;
    return;
  }

  if (!volumeOverlayInitialised) {
    previousReceiverVolume = volume;
    previousReceiverMuted = muted;
    volumeOverlayInitialised = true;
    return;
  }

  const volumeChanged =
    volume !== null &&
    previousReceiverVolume !== null &&
    volume !== previousReceiverVolume;

  const muteChanged = muted !== previousReceiverMuted;

  if (volumeChanged || muteChanged) {
    showVolumeOverlay(receiver);
  }

  // Preserve the last genuine receiver value when a poll is incomplete.
  if (volume !== null) {
    previousReceiverVolume = volume;
  }

  previousReceiverMuted = muted;
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

  const isStandby = receiver.power !== 'on';
  const isTvIdle = receiver.power === 'on' && inputCode === 'TV';
  const showIdle = isStandby || isTvIdle;

  document.body.classList.toggle('show-idle', showIdle);
  document.body.classList.toggle('show-standby', isStandby);
  document.body.classList.toggle('show-tv-idle', isTvIdle);
  idleScreen.setAttribute('aria-hidden', String(!showIdle));
  nowPlayingScreen.setAttribute('aria-hidden', String(showIdle));
}

function render(data) {
  latest = data;
  SourceController.syncFromReceiver(data.receiver);

  const receiver = data.receiver || {};
  updateVolumeOverlay(receiver);

  standbyZone2Power?.classList.toggle('on', receiver.zone2Power === 'on');
  standbyZone3Power?.classList.toggle('on', receiver.zone3Power === 'on');
  zone2Power?.classList.toggle('on', receiver.zone2Power === 'on');
  zone3Power?.classList.toggle('on', receiver.zone3Power === 'on');

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

  if (data.playbackSource === 'internet-radio') {
    const stationName =
      String(data.album || '').trim() ||
      String(data.song || '').trim() ||
      'Internet Radio';

    const programme =
      String(data.song || '').trim() !== stationName
        ? String(data.song || '').trim()
        : '';

    song.textContent = stationName;
    artist.textContent = programme || 'LIVE RADIO';
    album.textContent = String(data.artist || '').trim();

    showArtwork(data.imageUrl);

    const playing = data.state === 'play';
    playPause.dataset.action = playing ? 'pause' : 'play';
    playPause.textContent = playing ? 'Ⅱ' : '▶';

    localTickPosition = 0;
    localTickStarted = Date.now();
    updateProgress(0, 0);
  } else if (hasUsefulStreamingMetadata) {
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
    if (inputCode === "8K") {
      song.textContent = "TECHNICS";
      artist.textContent = "SL-1210G";
      album.textContent = "";
    } else if (inputCode === "CD") {
      song.textContent = "SHANLING";
      artist.textContent = "ET3";
      album.textContent = "";
    } else {
      song.textContent = inputName;
      artist.textContent = "";
      album.textContent = "";
    }

    showArtwork('');

    playPause.dataset.action = 'play';
    playPause.textContent = '▶';

    localTickPosition = 0;
    localTickStarted = Date.now();
    updateProgress(0, 0);
  }

  connection.classList.remove(
    'error',
    'powering-off',
    'holding'
  );
  connection.classList.add('connected');
  updateIdleDisplay(data);
    updatePhysicalPanelForReceiver(data);
}


async function toggleZonePower(action) {
  try {
    const response = await fetch(`/api/control/${action}`, {
      method: 'POST',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }

    setTimeout(refresh, 200);
  } catch (error) {
    console.warn('Zone power control failed:', error);
  }
}

zone2Power?.addEventListener('click', event => {
  event.stopPropagation();
  toggleZonePower('zone2-toggle');
});

zone3Power?.addEventListener('click', event => {
  event.stopPropagation();
  toggleZonePower('zone3-toggle');
});
standbyZone2Power?.addEventListener('click', event => {
  event.stopPropagation();
  toggleZonePower('zone2-toggle');
});

standbyZone3Power?.addEventListener('click', event => {
  event.stopPropagation();
  toggleZonePower('zone3-toggle');
});
function toggleZone2SourceMenu(event) {
  event?.stopPropagation();
  const open = !zone2SourceMenu?.classList.contains("open");
  zone2SourceMenu?.classList.toggle("open", open);
  zone2SourceMenu?.setAttribute("aria-hidden", String(!open));
}

zone2Source?.addEventListener("click", toggleZone2SourceMenu);
standbyZone2Source?.addEventListener("click", toggleZone2SourceMenu);

zone2SourceMenu?.addEventListener("click", async event => {
  const button = event.target.closest("[data-zone2-source]");
  if (!button) return;

  const source = button.dataset.zone2Source;
  try {
    await requestControl("zone2-source-" + source);
    zone2SourceMenu.classList.remove("open");
    zone2SourceMenu.setAttribute("aria-hidden", "true");
    setTimeout(refresh, 200);
  } catch (error) {
    console.warn("Zone 2 source control failed:", error);
  }
});



receiverSettings?.addEventListener("click", () => {
  const host = latest?.settings?.marantzHost;
  if (host == null || host === "") return;
  window.location.href = "https://" + host + ":10443";
});

async function refresh() {
  try {
    const response = await fetch('/api/status', {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }

    const data = await response.json();

    if (
      Date.now() < standbyWakeGraceUntil &&
      data.receiver?.power !== 'on'
    ) {
      return;
    }

    render(data);
  } catch (error) {
    connection.classList.remove('connected');
    connection.classList.add('error');
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


async function requestVolumeSet(value) {
  const response = await fetch(
    `/api/control/volume-set?value=${encodeURIComponent(value)}`,
    {
      method: 'POST',
      cache: 'no-store'
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Volume command failed');
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
    connection.classList.remove('connected');
    connection.classList.add('error');
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
    AUX1: 'aux'
  },

  current: null,
  changing: false,

  syncFromReceiver(receiver) {
    const inputCode = String(
      receiver?.inputCode || ''
    ).toUpperCase();

    const source = this.inputCodes[inputCode];

    this.current = source || null;

    document
      .querySelectorAll(
        '.inputs button[data-action]:not([data-net-source]), ' +
        '.idle-input-controls button[data-action]:not([data-net-source])'
      )
      .forEach(button => {
        button.classList.toggle(
          'active',
          button.dataset.action === this.current
        );
      });
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

// Idle swipe and source-icon controls removed.
// TV input selection uses the visible source buttons.


// Touch and hold the standby screen for one second to power on.
let standbyHoldTimer = null;
let standbyHoldStartX = 0;
let standbyHoldStartY = 0;
let standbyWakeTriggered = false;
let standbyWakeGraceUntil = 0;

function cancelStandbyHold() {
  if (standbyHoldTimer) {
    clearTimeout(standbyHoldTimer);
    standbyHoldTimer = null;
  }

  if (!standbyWakeTriggered) {
    document.body.classList.remove('standby-holding');
  }
}

idleScreen.addEventListener('pointerdown', event => {
  if (!document.body.classList.contains('show-standby')) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;

  // Only the central standby branding area powers on the AVR.
  const rect = idleScreen.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const inWakeZone =
    x >= rect.width * 0.25 &&
    x <= rect.width * 0.75 &&
    y >= rect.height * 0.55 &&
    y <= rect.height * 0.95;

  if (!inWakeZone) return;

  standbyWakeTriggered = false;
  standbyHoldStartX = event.clientX;
  standbyHoldStartY = event.clientY;

  document.body.classList.add('standby-holding');

  standbyHoldTimer = setTimeout(async () => {
    standbyHoldTimer = null;

    if (!document.body.classList.contains('show-standby')) {
      cancelStandbyHold();
      return;
    }

    standbyWakeTriggered = true;
    document.body.classList.remove('standby-holding');
    document.body.classList.add('standby-waking');
    idlePower.textContent = 'POWERING ON';

    try {
      standbyWakeGraceUntil = Date.now() + 15000;
      await requestControl('power-on');
      setTimeout(refresh, 500);
    } catch (error) {
      document.body.classList.remove('standby-waking');
      idlePower.textContent = 'CONTROL ERROR';
      connection.textContent = 'CONTROL ERROR';
      connection.className = 'connection error';
    }
  }, 1000);
});

idleScreen.addEventListener('pointermove', event => {
  if (!standbyHoldTimer) return;

  const movementX = event.clientX - standbyHoldStartX;
  const movementY = event.clientY - standbyHoldStartY;

  if (Math.hypot(movementX, movementY) > 20) {
    cancelStandbyHold();
  }
});

idleScreen.addEventListener('pointerup', cancelStandbyHold);
idleScreen.addEventListener('pointercancel', cancelStandbyHold);

// Tap or hold the receiver volume controls.
//
// Volume changes use confirmed absolute targets. The next 0.5 dB step is
// not sent until the receiver reports that the previous one was applied.
let volumeRepeatTimer = null;
let volumeRepeatButton = null;
let volumeRepeatSession = 0;
let volumeRepeatCurrent = null;
let volumeRequestBusy = false;

function validReceiverVolume(value) {
  return (
    value !== null &&
    value !== undefined &&
    value !== '' &&
    Number.isFinite(Number(value))
  );
}

function stopVolumeRepeat() {
  volumeRepeatSession += 1;

  clearTimeout(volumeRepeatTimer);
  volumeRepeatTimer = null;

  if (volumeRepeatButton) {
    volumeRepeatButton.classList.remove('pressed');
    delete volumeRepeatButton.dataset.activePointer;
    volumeRepeatButton = null;
  }
}

async function sendConfirmedVolumeStep(button, session) {
  if (volumeRequestBusy) return false;
  if (session !== volumeRepeatSession) return false;
  if (volumeRepeatButton !== button) return false;

  if (!validReceiverVolume(volumeRepeatCurrent)) {
    const statusVolume = latest?.receiver?.volume;

    if (!validReceiverVolume(statusVolume)) {
      return false;
    }

    volumeRepeatCurrent = Number(statusVolume);
  }

  const direction =
    button.dataset.action === 'volume-up' ? 0.5 : -0.5;

  const target = Math.min(
    18,
    Math.max(-80, volumeRepeatCurrent + direction)
  );

  volumeRequestBusy = true;

  try {
    const result = await requestVolumeSet(target);

    if (validReceiverVolume(result.volume)) {
      volumeRepeatCurrent = Number(result.volume);
    } else {
      volumeRepeatCurrent = target;
    }

    showVolumeOverlay({
      power: 'on',
      muted: false,
      volume: volumeRepeatCurrent
    });

    setTimeout(refresh, 60);
    return true;
  } catch (error) {
    connection.classList.remove('connected');
    connection.classList.add('error');
    stopVolumeRepeat();
    return false;
  } finally {
    volumeRequestBusy = false;
  }
}

function scheduleConfirmedVolumeStep(button, session, delay) {
  clearTimeout(volumeRepeatTimer);

  volumeRepeatTimer = setTimeout(async () => {
    if (
      session !== volumeRepeatSession ||
      volumeRepeatButton !== button
    ) {
      return;
    }

    await sendConfirmedVolumeStep(button, session);

    if (
      session !== volumeRepeatSession ||
      volumeRepeatButton !== button
    ) {
      return;
    }

    // The next step is scheduled only after receiver confirmation.
    scheduleConfirmedVolumeStep(button, session, 70);
  }, delay);
}

document.addEventListener('pointerdown', event => {
  const button = event.target.closest(
    'button[data-action="volume-up"], button[data-action="volume-down"]'
  );

  if (!button) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;

  event.preventDefault();
  stopVolumeRepeat();

  const currentVolume = latest?.receiver?.volume;

  if (!validReceiverVolume(currentVolume)) {
    connection.classList.remove('connected');
    connection.classList.add('error');
    return;
  }

  volumeRepeatCurrent = Number(currentVolume);
  volumeRepeatButton = button;

  const session = volumeRepeatSession;

  button.classList.add('pressed');
  button.dataset.activePointer = String(event.pointerId);

  try {
    button.setPointerCapture(event.pointerId);
  } catch {
    // Pointer capture is optional.
  }

  // A tap applies one confirmed 0.5 dB step.
  sendConfirmedVolumeStep(button, session);

  // Holding repeats only after each preceding step is confirmed.
  scheduleConfirmedVolumeStep(button, session, 425);
}, { passive: false });

document.addEventListener('pointerup', stopVolumeRepeat);
document.addEventListener('pointercancel', stopVolumeRepeat);
document.addEventListener('lostpointercapture', stopVolumeRepeat);
window.addEventListener('blur', stopVolumeRepeat);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopVolumeRepeat();
});


// Tap the top-right power symbol to place the AVR into standby.
connection.addEventListener('click', async event => {
  if (document.body.classList.contains('show-idle')) return;

  event.preventDefault();

  connection.classList.add('powering-off');

  try {
    await requestControl('power-off');
    setTimeout(refresh, 500);
  } catch (error) {
    connection.classList.remove('powering-off');
    connection.classList.add('error');
  }
});

document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const action = button.dataset.action;

  // Volume commands are handled by the pointer events above.
  if (action === 'volume-up' || action === 'volume-down') {
    event.preventDefault();
    return;
  }

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

// Automatically refresh the kiosk whenever the Node server restarts.
(() => {
  let knownInstanceId = null;

  async function checkServerInstance() {
    try {
      const response = await fetch('/api/instance-id', {
        cache: 'no-store'
      });

      if (!response.ok) return;

      const data = await response.json();

      if (knownInstanceId === null) {
        knownInstanceId = data.instanceId;
        return;
      }

      if (data.instanceId !== knownInstanceId) {
        window.location.reload();
      }
    } catch {
      // The server may briefly be unavailable while restarting.
    }
  }

  checkServerInstance();
  window.setInterval(checkServerInstance, 2000);
})();


/* Wake the physical Waveshare panel on any touchscreen press.
   This deliberately does not consume the event, so the original
   control underneath the touch continues to work normally. */
let panelWakeRequestInFlight = false;

async function wakePhysicalPanel() {
  if (panelWakeRequestInFlight) return;

  panelWakeRequestInFlight = true;

  try {
    await fetch('/api/panel/on', {
      method: 'POST',
      cache: 'no-store'
    });
  } catch (error) {
    console.warn('Panel wake failed:', error);
  } finally {
    panelWakeRequestInFlight = false;
  }
}

document.addEventListener(
  'pointerdown',
  event => {
    if (event.pointerType === 'touch') {
      wakePhysicalPanel();
    }
  },
  { capture: true }
);

let previousPanelReceiverPower = null;
let previousPanelInputCode = null;

async function sleepPhysicalPanel() {
  try {
    await fetch('/api/panel/off', {
      method: 'POST',
      cache: 'no-store'
    });
  } catch (error) {
    console.warn('Panel sleep failed:', error);
  }
}

function updatePhysicalPanelForReceiver(data) {
  const receiver = data?.receiver || {};
  const power = String(receiver.power || '').toLowerCase();
  const inputCode = String(receiver.inputCode || '').toUpperCase();

  if (previousPanelReceiverPower === null) {
    previousPanelReceiverPower = power;
    previousPanelInputCode = inputCode;
    resetPanelIdleTimer();
    return;
  }

  const poweredOn =
    previousPanelReceiverPower !== 'on' && power === 'on';

  const powerChanged =
    previousPanelReceiverPower !== power;

  const inputChanged =
    previousPanelInputCode !== inputCode;

  previousPanelReceiverPower = power;
  previousPanelInputCode = inputCode;

  if (poweredOn || inputChanged) {
    wakePhysicalPanel();
  }

  if (powerChanged || inputChanged) {
    resetPanelIdleTimer();
  }
}

const PANEL_STANDBY_TIMEOUT_MS = 60 * 60 * 1000;
const PANEL_VIDEO_TIMEOUT_MS = 5 * 60 * 1000;
let panelIdleTimer = null;

function resetPanelIdleTimer() {
  if (panelIdleTimer) {
    clearTimeout(panelIdleTimer);
    panelIdleTimer = null;
  }

  let timeoutMs = null;

  if (previousPanelReceiverPower !== 'on') {
    timeoutMs = PANEL_STANDBY_TIMEOUT_MS;
  } else if (
    previousPanelInputCode === 'TV' ||
    previousPanelInputCode === 'AUX1'
  ) {
    timeoutMs = PANEL_VIDEO_TIMEOUT_MS;
  }

  if (timeoutMs === null) return;

  panelIdleTimer = setTimeout(() => {
    panelIdleTimer = null;
    sleepPhysicalPanel();
  }, timeoutMs);
}

document.addEventListener(
  'pointerdown',
  event => {
    if (event.pointerType === 'touch') {
      resetPanelIdleTimer();
    }
  },
  { capture: true }
);

resetPanelIdleTimer();
