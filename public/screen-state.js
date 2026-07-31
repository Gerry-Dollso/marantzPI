'use strict';

// Single display-state policy for marantzPI.
// app.js remains the only /api/status poller and the only owner of controls.
// There is no separate no-signal or TV-idle screen:
//   standby -> standby screen
//   on      -> active input screen
//   unknown -> preserve the current screen until a valid state arrives
(() => {
  updateIdleDisplay = function updateScreenState(data) {
    const receiver = data?.receiver || {};
    const power = String(receiver.power || 'unknown').toLowerCase();

    clock24h = data?.settings?.clock24h !== false;

    if (power === 'unknown') {
      return;
    }

    const inputCode = String(receiver.inputCode || '').toUpperCase();
    const isStandby = power === 'standby';

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
    document.body.classList.remove('show-tv-idle');

    if (!isStandby) {
      document.body.classList.remove(
        'standby-holding',
        'standby-waking'
      );
    }

    idleScreen.setAttribute('aria-hidden', String(!isStandby));
    nowPlayingScreen.setAttribute('aria-hidden', String(isStandby));
  };
})();
