'use strict';

// Single display-state policy for marantzPI.
// app.js remains the only /api/status poller and owner of shared controls.
//   standby -> standby screen
//   on + TV -> dedicated low-light TV screen
//   on + other input -> active source screen
//   unknown -> preserve the current screen until a valid state arrives
(() => {
  const tvScreen = document.getElementById('tvScreen');
  const projectorScreen = document.getElementById('projectorScreen');

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
    const isProjector = power === 'on' && inputCode === 'AUX1';

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
    document.body.classList.toggle('show-tv-screen', isTv);
    document.body.classList.toggle('show-projector-screen', isProjector);
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
      String(isStandby || isTv || isProjector)
    );

    if (projectorScreen) {
      projectorScreen.setAttribute("aria-hidden", String(!isProjector));
    }

    if (tvScreen) {
      tvScreen.setAttribute('aria-hidden', String(!isTv));
    }
  };
})();
