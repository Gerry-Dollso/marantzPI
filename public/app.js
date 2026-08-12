'use strict';

const $ = id => document.getElementById(id);
const artwork = $('artwork');
const artworkFallback = $('artworkFallback');
const song = $('song');
const artist = $('artist');
const album = $('album');
const progressBar = $('progressBar');
const currentTime = $('currentTime');
const duration = $('duration');
const playPause = $('playPause');
const connection = $('connection');
const muteButton = $('muteButton');
const idleScreen = $('idleScreen');
const nowPlayingScreen = $('nowPlayingScreen');
const idleClock = $('idleClock');
const idleDate = $('idleDate');
const idleInput = $('idleInput');
const idleSourceIcon = $('idleSourceIcon');
const idlePower = $('idlePower');
const idleVolume = $('idleVolume');
const powerTarget = $('powerTarget');
const powerProgressBar = $('powerProgressBar');
const standbyTagline = $('standbyTagline');
const screenBlanker = $('screenBlanker');

let latest = null;
let lastImageUrl = '';
let localTickStarted = 0;
let localTickPosition = 0;
let lastTrackInfoAt = 0;
let idleDelayMs = 60000;
let clock24h = true;
let standbySince = 0;
let blankUntilTouch = false;
let powerTimer = null;
let powerStartedAt = 0;
let powerAnimation = null;
const POWER_HOLD_MS = 1400;

function formatTime(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

function updateProgress(position, total) {
  currentTime.textContent = formatTime(position);
  duration.textContent = formatTime(total);
  progressBar.style.width = `${total > 0 ? Math.min(100, Math.max(0, position / total * 100)) : 0}%`;
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
  artwork.onload = () => { artwork.style.display = 'block'; artworkFallback.style.display = 'none'; };
  artwork.onerror = () => { artwork.style.display = 'none'; artworkFallback.style.display = 'grid'; };
  artwork.src = url;
}

function updateClock() {
  const now = new Date();
  idleClock.textContent = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: !clock24h });
  idleDate.textContent = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
}

function formatVolume(value) {
  if (!Number.isFinite(Number(value))) return 'VOLUME —';
  const volume = Number(value);
  return `${Number.isInteger(volume) ? volume.toFixed(1) : String(volume)} dB`;
}

function updateDisplayMode(data) {
  const receiver = data.receiver || {};
  const inputCode = String(receiver.inputCode || '').toUpperCase();
  const movieSource = inputCode === 'TV' || inputCode === 'AUX1' || inputCode === 'AUX2';
  document.documentElement.style.setProperty('--movie-dim-level', String(data.settings?.movieDimLevel || 0.12));
  document.body.classList.toggle('movie-dim', receiver.power === 'on' && movieSource);

  if (receiver.power === 'on') {
    standbySince = 0;
    blankUntilTouch = false;
  } else if (!standbySince) {
    standbySince = Date.now();
  }

  const blankAfter = Math.max(0, Number(data.settings?.standbyBlankSeconds || 300) * 1000);
  if (receiver.power !== 'on' && blankAfter > 0 && Date.now() - standbySince >= blankAfter) blankUntilTouch = true;
  screenBlanker.classList.toggle('active', blankUntilTouch);
  screenBlanker.setAttribute('aria-hidden', String(!blankUntilTouch));
}

function updateIdleDisplay(data) {
  const receiver = data.receiver || {};
  const hasTrackInfo = data.hasTrackInfo === true;
  idleDelayMs = Math.max(0, Number(data.settings?.idleTimeoutSeconds || 60) * 1000);
  clock24h = data.settings?.clock24h !== false;
  if (hasTrackInfo) lastTrackInfoAt = Date.now();

  idleInput.textContent = receiver.power === 'on' ? (receiver.sourceDisplayName || receiver.input || 'MARANTZ') : 'MARANTZ';
  const inputCode = String(receiver.inputCode || '').toUpperCase();
  idleSourceIcon.className = 'idle-source-icon';
  if (inputCode === '8K' || inputCode === 'PHONO') idleSourceIcon.classList.add('show-record');
  else if (inputCode === 'CD') idleSourceIcon.classList.add('show-cd');
  else if (inputCode === 'NET') idleSourceIcon.classList.add('show-heos');

  idlePower.textContent = receiver.power === 'on' ? (receiver.muted ? 'MUTED' : 'RECEIVER ON') : 'STANDBY';
  idleVolume.textContent = receiver.power === 'on' ? formatVolume(receiver.volume) : '';
  const metadataExpired = !hasTrackInfo && (lastTrackInfoAt === 0 || Date.now() - lastTrackInfoAt >= idleDelayMs);
  const showIdle = receiver.power !== 'on' || metadataExpired;
  document.body.classList.toggle('show-idle', showIdle);
  idleScreen.setAttribute('aria-hidden', String(!showIdle));
  nowPlayingScreen.setAttribute('aria-hidden', String(showIdle));
  powerTarget.classList.toggle('enabled', receiver.power !== 'on');
  updateDisplayMode(data);
}

function render(data) {
  latest = data;
  const receiver = data.receiver || {};
  const inputCode = String(receiver.inputCode || '').toUpperCase();
  const network = inputCode === 'NET';
  song.textContent = network ? (data.song || 'Now playing') : (receiver.sourceDisplayName || receiver.input || 'MARANTZ');
  artist.textContent = network ? (data.artist || '') : (receiver.input || '');
  album.textContent = network ? (data.album || '') : '';
  showArtwork(network ? data.imageUrl : '');
  const playing = data.state === 'play';
  playPause.dataset.action = playing ? 'pause' : 'play';
  playPause.textContent = playing ? 'Ⅱ' : '▶';
  localTickPosition = Number(data.current) || 0;
  localTickStarted = Date.now();
  updateProgress(network ? localTickPosition : 0, network ? Number(data.duration) || 0 : 0);
  connection.textContent = 'CONNECTED';
  connection.className = 'connection connected';
  updateIdleDisplay(data);
}

async function refresh() {
  try {
    const response = await fetch('/api/status', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    render(await response.json());
  } catch {
    connection.textContent = 'RECONNECTING';
    connection.className = 'connection error';
  }
}

async function sendAction(buttonOrAction) {
  const action = typeof buttonOrAction === 'string' ? buttonOrAction : buttonOrAction.dataset.action;
  const button = typeof buttonOrAction === 'string' ? null : buttonOrAction;
  if (!action) return;
  if (button) { button.disabled = true; button.classList.add('pressed'); }
  try {
    const response = await fetch(`/api/control/${encodeURIComponent(action)}`, { method: 'POST', cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Command failed');
    if (action === 'mute' && typeof result.muted === 'boolean') muteButton.textContent = result.muted ? 'UNMUTE' : 'MUTE';
    setTimeout(refresh, action.startsWith('power-') ? 700 : 350);
  } catch {
    connection.textContent = 'CONTROL ERROR';
    connection.className = 'connection error';
  } finally {
    if (button) setTimeout(() => { button.disabled = false; button.classList.remove('pressed'); }, 180);
  }
}

function cancelPowerHold() {
  clearTimeout(powerTimer);
  cancelAnimationFrame(powerAnimation);
  powerTimer = null;
  powerStartedAt = 0;
  powerProgressBar.style.width = '0%';
  standbyTagline.textContent = 'BECAUSE MUSIC MATTERS';
  powerTarget.classList.remove('holding');
}

function animatePowerHold() {
  if (!powerStartedAt) return;
  const percent = Math.min(100, (Date.now() - powerStartedAt) / POWER_HOLD_MS * 100);
  powerProgressBar.style.width = `${percent}%`;
  if (percent < 100) powerAnimation = requestAnimationFrame(animatePowerHold);
}

function startPowerHold(event) {
  if (latest?.receiver?.power === 'on') return;
  event.preventDefault();
  powerStartedAt = Date.now();
  standbyTagline.textContent = 'POWERING ON';
  powerTarget.classList.add('holding');
  animatePowerHold();
  powerTimer = setTimeout(async () => {
    powerTimer = null;
    await sendAction('power-on');
    cancelPowerHold();
  }, POWER_HOLD_MS);
}

powerTarget.addEventListener('pointerdown', startPowerHold);
powerTarget.addEventListener('pointerup', cancelPowerHold);
powerTarget.addEventListener('pointercancel', cancelPowerHold);
powerTarget.addEventListener('pointerleave', cancelPowerHold);

function openSettings() {
  if (latest?.marantzWebUrl) window.open(latest.marantzWebUrl, '_blank', 'noopener');
}
$('settingsButton').addEventListener('click', openSettings);
$('settingsButtonPlaying').addEventListener('click', openSettings);

document.addEventListener('pointerdown', () => {
  if (blankUntilTouch) {
    blankUntilTouch = false;
    standbySince = Date.now();
    screenBlanker.classList.remove('active');
  }
}, true);

document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (button) sendAction(button);
});

setInterval(() => {
  if (latest?.state === 'play') {
    updateProgress(localTickPosition + (Date.now() - localTickStarted) / 1000, Number(latest.duration) || 0);
  }
}, 500);

updateClock();
setInterval(updateClock, 1000);
refresh();
setInterval(refresh, 750);
