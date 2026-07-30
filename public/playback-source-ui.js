'use strict';

const sourceHeading = document.getElementById('sourceHeading');
const sourceSong = document.getElementById('song');
const sourceArtist = document.getElementById('artist');
const sourceAlbum = document.getElementById('album');

let sourceStatus = null;
let applyingSourceUi = false;

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

function applyPlaybackSourceUi() {
  if (!sourceStatus || applyingSourceUi) return;

  applyingSourceUi = true;

  const playbackSource = sourceStatus.playbackSource || 'other';
  sourceHeading.textContent = sourceLabel(playbackSource);
  document.body.dataset.playbackSource = playbackSource;
  updateNetSourceButtons(playbackSource);

  if (playbackSource === 'internet-radio') {
    const station = String(sourceStatus.album || '').trim();
    const programme = String(sourceStatus.song || '').trim();
    const presenter = String(sourceStatus.artist || '').trim();

    sourceSong.textContent = station || programme || 'Internet Radio';
    sourceArtist.textContent = programme || presenter || 'LIVE RADIO';
    sourceAlbum.textContent = programme && presenter ? presenter : '';
  }

  applyingSourceUi = false;
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

const metadataObserver = new MutationObserver(() => {
  if (sourceStatus) {
    applyPlaybackSourceUi();
  }
});

metadataObserver.observe(document.querySelector('.metadata'), {
  childList: true,
  subtree: true,
  characterData: true
});

refreshPlaybackSourceUi();
setInterval(refreshPlaybackSourceUi, 1000);
