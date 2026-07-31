'use strict';

const sourceHeading = document.getElementById('sourceHeading');
const RADIO_STORAGE_KEY = 'marantzpi.activeRadioFavourite';

function sourceLabel(playbackSource) {
  const labels = {
    tidal: 'TIDAL',
    'internet-radio': 'LIVE RADIO',
    'other-net': 'NETWORK AUDIO',
    other: 'NOW PLAYING'
  };

  return labels[playbackSource] || 'NOW PLAYING';
}

function cleanHeosText(value) {
  const text = String(value || '').trim();
  return text.toLowerCase() === 'url stream' ? '' : text;
}

function rememberedRadioFavourite() {
  try {
    const value = JSON.parse(localStorage.getItem(RADIO_STORAGE_KEY) || 'null');
    if (!value || !value.name) return null;

    const selectedAt = Number(value.selectedAt) || 0;
    if (Date.now() - selectedAt > 12 * 60 * 60 * 1000) {
      localStorage.removeItem(RADIO_STORAGE_KEY);
      return null;
    }

    return value;
  } catch {
    return null;
  }
}

function normalisePlaybackStatus(data) {
  const receiver = data?.receiver || {};
  const inputCode = String(receiver.inputCode || '').toUpperCase();
  const isNetPlayback = receiver.power === 'on' && inputCode === 'NET';

  if (!isNetPlayback) return data;

  const rememberedRadio = rememberedRadioFavourite();
  const rawValues = [data.song, data.artist, data.album];
  const hasUrlStreamPlaceholder = rawValues.some(
    value => String(value || '').trim().toLowerCase() === 'url stream'
  );

  const isRememberedRadio = Boolean(
    rememberedRadio && hasUrlStreamPlaceholder
  );

  if (data.playbackSource !== 'internet-radio' && !isRememberedRadio) {
    return data;
  }

  const cleanSong = cleanHeosText(data.song);
  const cleanArtist = cleanHeosText(data.artist);
  const cleanAlbum = cleanHeosText(data.album);
  const stationName =
    cleanAlbum || rememberedRadio?.name || cleanSong || 'Internet Radio';
  const programme = cleanSong && cleanSong !== stationName ? cleanSong : '';

  return {
    ...data,
    playbackSource: 'internet-radio',
    song: programme,
    artist: cleanArtist,
    album: stationName,
    hasTrackInfo: true,
    current: 0,
    duration: 0
  };
}

function updateNetSourceButtons(playbackSource) {
  document
    .querySelectorAll('button[data-net-source]')
    .forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.netSource === playbackSource
      );
    });
}

function applyPlaybackSourceUi(data) {
  const playbackSource = data?.playbackSource || 'other';
  sourceHeading.textContent = sourceLabel(playbackSource);
  document.body.dataset.playbackSource = playbackSource;
  updateNetSourceButtons(playbackSource);
}

// app.js remains the sole /api/status poller. This wrapper only normalises
// the status object before the existing renderer uses it.
const renderPlaybackStatus = render;
render = function renderWithPlaybackSource(data) {
  const normalised = normalisePlaybackStatus(data);
  renderPlaybackStatus(normalised);
  applyPlaybackSourceUi(normalised);
};
