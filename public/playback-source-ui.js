'use strict';

const sourceHeading = document.getElementById('sourceHeading');

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

function applyPlaybackSourceUi() {
  if (!sourceStatus) return;

  const playbackSource = sourceStatus.playbackSource || 'other';
  sourceHeading.textContent = sourceLabel(playbackSource);
  document.body.dataset.playbackSource = playbackSource;
  updateNetSourceButtons(playbackSource);
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
