'use strict';

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'public', 'tidal-ui.js');
let text = fs.readFileSync(file, 'utf8');

function replaceOnce(before, after, label) {
  const count = text.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected exactly one anchor, found ${count}`);
  }
  text = text.replace(before, after);
}

replaceOnce(
`tidalResults.addEventListener('click', async event => {
  const personalisedPlaylistAction = event.target.closest(
    '[data-personalised-playlist-action]'
  );
  if (personalisedPlaylistAction) {
    const action = personalisedPlaylistAction.dataset.personalisedPlaylistAction;
    const id = String(personalisedPlaylistAction.dataset.personalisedPlaylistId || '');

    if (!id) {
      tidalStatus.textContent = 'My Mix cannot be played';
      return;
    }

    personalisedPlaylistAction.classList.add('loading');
    personalisedPlaylistAction.disabled = true;
    setTidalOpen(false);

    try {
      const response = await fetch(
        '/api/tidal/personalised/playlist/play?id=' + encodeURIComponent(id) +
        '&shuffle=' + (action === 'shuffle-all' ? '1' : '0'),
        { cache: 'no-store' }
      );
      const result = await response.json();

      if (!response.ok || result.ok === false) {
        throw new Error(result.error || 'Could not play My Mix');
      }
    } catch (error) {
      tidalStatus.textContent = error.message;
      personalisedPlaylistAction.classList.remove('loading');
      personalisedPlaylistAction.disabled = false;
      setTidalOpen(true);
    }
    return;
  }

    const trackPageButton`,
`tidalPersonalisedControls.addEventListener('click', async event => {
  const personalisedPlaylistAction = event.target.closest(
    '[data-personalised-playlist-action]'
  );
  if (!personalisedPlaylistAction) return;

  const action = personalisedPlaylistAction.dataset.personalisedPlaylistAction;
  const id = String(personalisedPlaylistAction.dataset.personalisedPlaylistId || '');

  if (!id) {
    tidalStatus.textContent = 'My Mix cannot be played';
    return;
  }

  personalisedPlaylistAction.classList.add('loading');
  personalisedPlaylistAction.disabled = true;
  setTidalOpen(false);

  try {
    const response = await fetch(
      '/api/tidal/personalised/playlist/play?id=' + encodeURIComponent(id) +
      '&shuffle=' + (action === 'shuffle-all' ? '1' : '0'),
      { cache: 'no-store' }
    );
    const result = await response.json();

    if (!response.ok || result.ok === false) {
      throw new Error(result.error || 'Could not play My Mix');
    }
  } catch (error) {
    tidalStatus.textContent = error.message;
    personalisedPlaylistAction.classList.remove('loading');
    personalisedPlaylistAction.disabled = false;
    setTidalOpen(true);
  }
});

tidalResults.addEventListener('click', async event => {
    const trackPageButton`,
'personalised controls click handler placement'
);

fs.writeFileSync(file, text);
console.log('Applied guarded My Mix control listener fix');
