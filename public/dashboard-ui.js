'use strict';

const dashboardLastArt = document.getElementById('dashboardLastArt');
const dashboardLastFallback = document.getElementById('dashboardLastFallback');
const dashboardLastTitle = document.getElementById('dashboardLastTitle');
const dashboardLastSubtitle = document.getElementById('dashboardLastSubtitle');
const dashboardLastDetail = document.getElementById('dashboardLastDetail');

const LAST_PLAYED_KEY = 'marantzPI:last-played';
let dashboardLastImage = '';
let dashboardReceiverPowerOn = null;

function cleanDashboardText(value) {
  return String(value || '').trim();
}

function readLastPlayed() {
  try {
    return JSON.parse(localStorage.getItem(LAST_PLAYED_KEY) || 'null');
  } catch {
    return null;
  }
}

function saveLastPlayed(item) {
  try {
    localStorage.setItem(LAST_PLAYED_KEY, JSON.stringify(item));
  } catch {
    // The dashboard still works when kiosk storage is unavailable.
  }
}

function setLastArtwork(url) {
  const imageUrl = cleanDashboardText(url);

  if (!imageUrl) {
    dashboardLastArt.hidden = true;
    dashboardLastFallback.hidden = false;
    dashboardLastImage = '';
    return;
  }

  if (imageUrl === dashboardLastImage) return;
  dashboardLastImage = imageUrl;

  dashboardLastArt.onload = () => {
    dashboardLastArt.hidden = false;
    dashboardLastFallback.hidden = true;
  };

  dashboardLastArt.onerror = () => {
    dashboardLastArt.hidden = true;
    dashboardLastFallback.hidden = false;
  };

  dashboardLastArt.src = imageUrl;
}

function renderLastPlayed(item) {
  if (!item) {
    dashboardLastTitle.textContent = 'Nothing played yet';
    dashboardLastSubtitle.textContent = 'Choose a source below';
    dashboardLastDetail.textContent = '';
    setLastArtwork('');
    return;
  }

  dashboardLastTitle.textContent = item.title || item.source || 'MARANTZ';
  dashboardLastSubtitle.textContent = item.subtitle || '';
  dashboardLastDetail.textContent = item.detail || item.source || '';
  setLastArtwork(item.imageUrl);
}

function lastPlayedFromStatus(data) {
  const receiver = data.receiver || {};
  const inputCode = cleanDashboardText(receiver.inputCode).toUpperCase();
  const inputName = cleanDashboardText(receiver.input) || 'MARANTZ';

  if (receiver.power !== 'on' || inputCode === 'TV') return null;

  if (data.playbackSource === 'internet-radio') {
    const station = cleanDashboardText(data.album) || cleanDashboardText(data.song) || 'Internet Radio';
    const programme = cleanDashboardText(data.song);

    return {
      source: 'RADIO',
      title: station,
      subtitle: programme && programme !== station ? programme : 'Live radio',
      detail: cleanDashboardText(data.artist),
      imageUrl: cleanDashboardText(data.imageUrl)
    };
  }

  if (inputCode === 'NET' && data.hasTrackInfo === true) {
    return {
      source: 'TIDAL',
      title: cleanDashboardText(data.song) || inputName,
      subtitle: cleanDashboardText(data.artist),
      detail: cleanDashboardText(data.album),
      imageUrl: cleanDashboardText(data.imageUrl)
    };
  }

  return {
    source: inputName,
    title: inputName,
    subtitle: inputCode === '8K' ? 'Vinyl' : inputCode === 'CD' ? 'Compact Disc' : 'Selected source',
    detail: '',
    imageUrl: ''
  };
}

function updateDashboardReceiver(data) {
  const receiver = data.receiver || {};
  const powerOn = receiver.power === 'on';
  const idlePowerElement = document.getElementById('idlePower');

  // A genuine wake transition may keep standby-waking while the AVR still
  // reports standby. Clear it only once the AVR has been on, or when it
  // subsequently transitions from on back to standby.
  if (powerOn || dashboardReceiverPowerOn === true) {
    document.body.classList.remove('standby-holding', 'standby-waking');
  }

  dashboardReceiverPowerOn = powerOn;

  idlePowerElement.classList.toggle('dashboard-on', powerOn);
  idlePowerElement.classList.toggle('dashboard-standby', !powerOn);

  const current = lastPlayedFromStatus(data);
  if (current) {
    saveLastPlayed(current);
    renderLastPlayed(current);
  }
}

async function refreshDashboard() {
  try {
    const response = await fetch('/api/status', { cache: 'no-store' });
    if (!response.ok) return;
    updateDashboardReceiver(await response.json());
  } catch {
    // app.js owns the connection error state.
  }
}

renderLastPlayed(readLastPlayed());
refreshDashboard();
setInterval(refreshDashboard, 750);
