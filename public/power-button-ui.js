'use strict';

// Keep standby-screen wake protection unchanged, but make the visible
// POWER button respond more quickly. Capture-phase handlers replace the
// older hold gesture in app.js without touching the playback logic.
(() => {
  const button = document.getElementById('connection');
  if (!button) return;

  const HOLD_MS = 750;
  const MOVE_TOLERANCE = 18;

  let timer = null;
  let startX = 0;
  let startY = 0;
  let triggered = false;

  function clearHold() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    button.classList.remove('holding');
  }

  function stopOriginalHandler(event) {
    event.stopImmediatePropagation();
  }

  button.addEventListener('pointerdown', event => {
    stopOriginalHandler(event);

    if (document.body.classList.contains('show-idle')) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    event.preventDefault();
    clearHold();

    triggered = false;
    startX = event.clientX;
    startY = event.clientY;
    button.classList.add('holding');

    try {
      button.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is optional.
    }

    timer = setTimeout(async () => {
      timer = null;
      triggered = true;
      button.classList.remove('holding');
      button.classList.add('powering-off');
      button.textContent = 'STANDBY';

      try {
        await requestControl('power-off');
        setTimeout(refresh, 400);
      } catch {
        button.classList.remove('powering-off');
        button.classList.add('error');
        button.textContent = 'ERROR';
      }
    }, HOLD_MS);
  }, true);

  button.addEventListener('pointermove', event => {
    stopOriginalHandler(event);
    if (!timer) return;

    if (Math.hypot(event.clientX - startX, event.clientY - startY) > MOVE_TOLERANCE) {
      clearHold();
    }
  }, true);

  for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(eventName, event => {
      stopOriginalHandler(event);
      if (!triggered) clearHold();
    }, true);
  }
})();
