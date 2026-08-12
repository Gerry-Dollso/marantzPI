'use strict';

// Single display-state policy for marantzPI.
// app.js remains the only /api/status poller and owner of shared controls.
//   standby -> standby screen
//   on + TV -> dedicated low-light TV screen
//   on + other input -> active source screen
//   unknown -> preserve the current screen until a valid state arrives
(() => {
  const tvScreen = document.getElementById('tvScreen');
  const standbyBlanker = document.getElementById('standbyBlanker');

  const STANDBY_BLANK_MS = 5 * 60 * 1000;
  let standbyStartedAt = 0;
  let standbyBlankTimer = null;

  function clearStandbyBlankTimer() {
    if (standbyBlankTimer) {
      clearTimeout(standbyBlankTimer);
      standbyBlankTimer = null;
    }
  }

  function showStandbyBlanker() {
    document.body.classList.add('standby-blanked');
    standbyBlanker?.setAttribute('aria-hidden', 'false');
  }

  function hideStandbyBlanker() {
    document.body.classList.remove('standby-blanked');
    standbyBlanker?.setAttribute('aria-hidden', 'true');
  }

  function scheduleStandbyBlank() {
    clearStandbyBlankTimer();

    const elapsed = Date.now() - standbyStartedAt;
    const remaining = Math.max(0, STANDBY_BLANK_MS - elapsed);

    standbyBlankTimer = setTimeout(() => {
      standbyBlankTimer = null;
      if (document.body.classList.contains('show-standby')) {
        showStandbyBlanker();
      }
    }, remaining);
  }

  standbyBlanker?.addEventListener('pointerdown', event => {
    event.preventDefault();
    event.stopPropagation();

    // First touch only wakes the display. It never powers on the AVR.
    hideStandbyBlanker();
    standbyStartedAt = Date.now();
    scheduleStandbyBlank();
  });

  updateIdleDisplay = function updateScreenState(data) {
    const receiver = data?.receiver || {};
    const power = String(receiver.power || 'unknown').toLowerCase();

    clock24h = data?.settings?.clock24h !== false;

    if (power === 'unknown') {
      return;
    }

    const inputCode = String(receiver.inputCode || '').toUpperCase();
    const isStandby = power === 'standby';
    const isTv = power === 'on' && inputCode === 'TV';

    idleInput.textContent = isStandby
      ? 'MARANTZ'
      : receiver.input || 'MARANTZ';

    idleSourceIcon.className = 'idle-source-icon';

    if (inputCode === '8K') {
      idleSourceIcon.classList.add('show-record');
    } else if (inputCode === 'CD') {
      idleSourceIcon.classList.add('show-cd');
    } else if (inputCode === 'NET') {
      idleSourceIcon.classList.add('show-heos');
    }

    idlePower.textContent = isStandby
      ? 'STANDBY'
      : receiver.muted
        ? 'MUTED'
        : 'RECEIVER ON';

    idleVolume.textContent = isStandby
      ? ''
      : formatVolume(receiver.volume);

    document.body.classList.toggle('show-idle', isStandby);
    document.body.classList.toggle('show-standby', isStandby);

    if (isStandby) {
      if (!standbyStartedAt) {
        standbyStartedAt = Date.now();
      }
      scheduleStandbyBlank();
    } else {
      standbyStartedAt = 0;
      clearStandbyBlankTimer();
      hideStandbyBlanker();
    }

    document.body.classList.toggle('show-tv-screen', isTv);
    document.body.classList.remove('show-tv-idle');

    if (!isStandby) {
      document.body.classList.remove(
        'standby-holding',
        'standby-waking'
      );
    }

    idleScreen.setAttribute('aria-hidden', String(!isStandby));
    nowPlayingScreen.setAttribute(
      'aria-hidden',
      String(isStandby || isTv)
    );

    if (tvScreen) {
      tvScreen.setAttribute('aria-hidden', String(!isTv));
    }
  };
})();
