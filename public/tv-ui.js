'use strict';

(() => {
  const tvScreen = document.getElementById('tvScreen');
  const tvPower = document.getElementById('tvPower');
  const projectorScreen = document.getElementById('projectorScreen');
  const projectorPower = document.getElementById('projectorPower');

  function addPowerHandler(button, screenClass) {
    if (!button) return;

    button.addEventListener('click', async event => {
      if (!document.body.classList.contains(screenClass)) return;

      event.preventDefault();
      event.stopPropagation();
      button.classList.add('powering-off');

      try {
        await requestControl('power-off');
        setTimeout(refresh, 500);
      } catch {
        button.classList.remove('powering-off');
        button.classList.add('error');
      }
    });
  }

  function addPressedHandler(screen) {
    if (!screen) return;

    screen.addEventListener('pointerdown', event => {
      const button = event.target.closest('.tv-inputs button');
      if (!button) return;

      button.classList.add('tv-pressed');
    });

    function clearPressed(event) {
      const button = event.target.closest?.('.tv-inputs button');
      if (!button) return;

      setTimeout(() => button.classList.remove('tv-pressed'), 180);
    }

    screen.addEventListener('pointerup', clearPressed);
    screen.addEventListener('pointercancel', clearPressed);
  }

  addPowerHandler(tvPower, 'show-tv-screen');
  addPowerHandler(projectorPower, 'show-projector-screen');

  addPressedHandler(tvScreen);
  addPressedHandler(projectorScreen);
})();
