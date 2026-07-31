'use strict';

// Stabilise the existing display state without adding another status poll.
// app.js remains the sole owner of /api/status. This layer only filters
// transient power readings and prevents the old TV-idle rule from showing
// the standby screen while the receiver is powered on.
(() => {
  const CONFIRM_OFF_MS = 1600;

  let pendingOffSince = 0;
  let confirmedStandby = false;
  let confirmationTimer = null;
  let applyingState = false;

  function receiverIsOn() {
    return latest?.receiver?.power === 'on';
  }

  function applyNormalDisplay() {
    applyingState = true;

    document.body.classList.remove(
      'show-idle',
      'show-standby',
      'show-tv-idle',
      'standby-holding',
      'standby-waking'
    );

    idleScreen.setAttribute('aria-hidden', 'true');
    nowPlayingScreen.setAttribute('aria-hidden', 'false');

    applyingState = false;
  }

  function applyConfirmedStandby() {
    applyingState = true;

    document.body.classList.add('show-idle', 'show-standby');
    document.body.classList.remove('show-tv-idle');

    idleScreen.setAttribute('aria-hidden', 'false');
    nowPlayingScreen.setAttribute('aria-hidden', 'true');

    applyingState = false;
  }

  function cancelPendingOff() {
    pendingOffSince = 0;
    confirmedStandby = false;

    if (confirmationTimer) {
      clearTimeout(confirmationTimer);
      confirmationTimer = null;
    }
  }

  function confirmOffAfterDelay() {
    if (confirmationTimer) return;

    const remaining = Math.max(
      0,
      CONFIRM_OFF_MS - (Date.now() - pendingOffSince)
    );

    confirmationTimer = setTimeout(() => {
      confirmationTimer = null;

      if (receiverIsOn()) {
        cancelPendingOff();
        applyNormalDisplay();
        return;
      }

      confirmedStandby = true;
      applyConfirmedStandby();
    }, remaining);
  }

  function stabiliseDisplayState() {
    if (applyingState || !latest?.receiver) return;

    if (receiverIsOn()) {
      cancelPendingOff();
      applyNormalDisplay();
      return;
    }

    if (confirmedStandby) {
      applyConfirmedStandby();
      return;
    }

    if (!pendingOffSince) {
      pendingOffSince = Date.now();
    }

    // Keep the active display visible until the off state persists.
    applyNormalDisplay();
    confirmOffAfterDelay();
  }

  const observer = new MutationObserver(stabiliseDisplayState);

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
  });

  stabiliseDisplayState();
})();
