'use strict';

// Temporary recovery guard: keep the main application visible regardless of
// stale AVR power reports. This deliberately disables the standby/dashboard
// overlay so playback controls remain usable while the standby state logic is
// being repaired.
function forceMainApplicationVisible() {
  document.body.classList.remove(
    'show-idle',
    'show-standby',
    'show-tv-idle',
    'standby-holding',
    'standby-waking'
  );

  const idleScreen = document.getElementById('idleScreen');
  const nowPlayingScreen = document.getElementById('nowPlayingScreen');

  if (idleScreen) {
    idleScreen.setAttribute('aria-hidden', 'true');
    idleScreen.style.pointerEvents = 'none';
    idleScreen.style.opacity = '0';
    idleScreen.style.visibility = 'hidden';
  }

  if (nowPlayingScreen) {
    nowPlayingScreen.setAttribute('aria-hidden', 'false');
    nowPlayingScreen.style.pointerEvents = 'auto';
    nowPlayingScreen.style.opacity = '1';
    nowPlayingScreen.style.visibility = 'visible';
  }
}

forceMainApplicationVisible();
setInterval(forceMainApplicationVisible, 100);
