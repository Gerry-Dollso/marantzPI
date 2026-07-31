'use strict';

(() => {
  const tvScreen = document.getElementById('tvScreen');
  const tvPower = document.getElementById('tvPower');

  if (!tvScreen || !tvPower) return;

  const HOLD_MS = 1000;
  const MOVE_TOLERANCE = 18;

  let powerTimer = null;
  let powerStartX = 0;
  let powerStartY = 0;

  function cancelPowerHold() {
    if (powerTimer) {
      clearTimeout(powerTimer);
      powerTimer = null;
    }

    tvPower.classList.remove('holding');
  }

  tvPower.addEventListener('pointerdown', event => {
    if (!document.body.classList.contains('show-tv-screen')) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    event.preventDefault();
    cancelPowerHold();

    powerStartX = event.clientX;
    powerStartY = event.clientY;
    tvPower.classList.add('holding');

    try {
      tvPower.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is optional.
    }

    powerTimer = setTimeout(async () => {
      powerTimer = null;
      tvPower.classList.remove('holding');
      tvPower.classList.add('powering-off');

      try {
        await requestControl('power-off');
        setTimeout(refresh, 500);
      } catch {
        tvPower.classList.remove('powering-off');
        tvPower.classList.add('error');
      }
    }, HOLD_MS);
  });

  tvPower.addEventListener('pointermove', event => {
    if (!powerTimer) return;

    if (
      Math.hypot(
        event.clientX - powerStartX,
        event.clientY - powerStartY
      ) > MOVE_TOLERANCE
    ) {
      cancelPowerHold();
    }
  });

  tvPower.addEventListener('pointerup', cancelPowerHold);
  tvPower.addEventListener('pointercancel', cancelPowerHold);
  tvPower.addEventListener('lostpointercapture', cancelPowerHold);

  tvScreen.addEventListener('pointerdown', event => {
    const button = event.target.closest('.tv-inputs button');
    if (!button) return;

    button.classList.add('tv-pressed');
  });

  function clearPressed(event) {
    const button = event.target.closest?.('.tv-inputs button');
    if (!button) return;

    setTimeout(() => button.classList.remove('tv-pressed'), 180);
  }

  tvScreen.addEventListener('pointerup', clearPressed);
  tvScreen.addEventListener('pointercancel', clearPressed);
})();
