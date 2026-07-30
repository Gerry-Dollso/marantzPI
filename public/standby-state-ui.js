'use strict';

// The AVR power poll can briefly lag behind HEOS after wake-up. Do not let
// that stale value leave the standby overlay covering active playback.
let standbyStateWasOn = false;

function standbyStatePowerOn(data) {
  return String(data?.receiver?.power || '').trim().toLowerCase() === 'on';
}

function standbyStatePlaybackActive(data) {
  return (
    String(data?.state || '').trim().toLowerCase() === 'play' ||
    data?.hasTrackInfo === true ||
    Boolean(String(data?.song || '').trim())
  );
}

function releaseStandbyOverlay(data) {
  const receiver = data?.receiver || {};
  const powerOn = standbyStatePowerOn(data);
  const playbackActive = standbyStatePlaybackActive(data);
  const inputCode = String(receiver.inputCode || '').trim().toUpperCase();
  const definitelyAwake = powerOn || playbackActive;

  if (definitelyAwake) {
    document.body.classList.remove(
      'show-standby',
      'standby-holding',
      'standby-waking'
    );

    // TV keeps the dashboard visible; every other awake source should reveal
    // the existing Now Playing/source screen.
    if (powerOn && inputCode === 'TV' && !playbackActive) {
      document.body.classList.add('show-idle', 'show-tv-idle');
    } else {
      document.body.classList.remove('show-idle', 'show-tv-idle');
    }

    const idleScreen = document.getElementById('idleScreen');
    const nowPlayingScreen = document.getElementById('nowPlayingScreen');
    const showDashboard =
      document.body.classList.contains('show-idle');

    idleScreen?.setAttribute('aria-hidden', String(!showDashboard));
    nowPlayingScreen?.setAttribute('aria-hidden', String(showDashboard));
  } else if (standbyStateWasOn) {
    // A genuine on -> standby transition must always reset the wake animation.
    document.body.classList.remove('standby-holding', 'standby-waking');
  }

  standbyStateWasOn = definitelyAwake;
}

async function refreshStandbyState() {
  try {
    const response = await fetch('/api/status', { cache: 'no-store' });
    if (!response.ok) return;
    releaseStandbyOverlay(await response.json());
  } catch {
    // app.js owns the visible connection-error state.
  }
}

refreshStandbyState();
setInterval(refreshStandbyState, 500);
