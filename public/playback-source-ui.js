'use strict';

const sourceHeading = document.getElementById('sourceHeading');
const sourceSong = document.getElementById('song');
const sourceArtist = document.getElementById('artist');
const sourceAlbum = document.getElementById('album');

let sourceStatus = null;

function sourceLabel(playbackSource) {
  const labels = {
    tidal: 'TIDAL',
    'internet-radio': 'INTERNET RADIO',
    'other-net': 'NETWORK AUDIO',
    other: 'NOW PLAYING'
  };

  return labels[playbackSource] || 'NOW PLAYING';
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

function setText(element, value) {
  if (element && element.textContent !== value) {
    element.textContent = value;
  }
}

function applyPlaybackSourceUi() {
  if (!sourceStatus) return;

  const playbackSource = sourceStatus.playbackSource || 'other';
  setText(sourceHeading, sourceLabel(playbackSource));
  document.body.dataset.playbackSource = playbackSource;
  updateNetSourceButtons(playbackSource);

  if (playbackSource === 'internet-radio') {
    const station = String(sourceStatus.album || '').trim();
    const programme = String(sourceStatus.song || '').trim();
    const presenter = String(sourceStatus.artist || '').trim();

    setText(sourceSong, station || programme || 'Internet Radio');
    setText(sourceArtist, programme || presenter || 'LIVE RADIO');
    setText(sourceAlbum, programme && presenter ? presenter : '');
  }
}

async function refreshPlaybackSourceUi() {
  try {
    const response = await fetch('/api/status', { cache: 'no-store' });
    if (!response.ok) return;

    sourceStatus = await response.json();
    applyPlaybackSourceUi();
  } catch {
    // The main application owns connection-error handling.
  }
}

refreshPlaybackSourceUi();
setInterval(refreshPlaybackSourceUi, 1000);
