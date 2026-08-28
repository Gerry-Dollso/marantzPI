'use strict';

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'public', 'tidal-ui.js');
let source = fs.readFileSync(file, 'utf8');

const doneMarker = "selection.personalised\n        ? '/api/tidal/play-resolved?id='";
if (source.includes(doneMarker)) {
  console.log('Personalised TIDAL track actions already present; no change needed.');
  process.exit(0);
}

const oldSelection = `  tidalTrackActionSelection = { cid, mid, name: name || 'Track' };`;
const newSelection = `  tidalTrackActionSelection = {
    cid,
    mid,
    name: name || 'Track',
    personalised: button?.dataset?.type === 'personalised-song'
  };`;

if (source.split(oldSelection).length - 1 !== 1) {
  throw new Error('Expected exactly one track action selection marker');
}
source = source.replace(oldSelection, newSelection);

const oldFetch = `    const response = await fetch(
      '/api/tidal/track/action?cid=' + encodeURIComponent(selection.cid) +
      '&mid=' + encodeURIComponent(selection.mid) +
      '&action=' + encodeURIComponent(action),
      { cache: 'no-store' }
    );`;
const newFetch = `    if (selection.personalised && action === 'play-from-here') {
      throw new Error('Play From Here is not available for My Mixes yet');
    }

    const actionUrl = selection.personalised
      ? '/api/tidal/play-resolved?id=' + encodeURIComponent(selection.mid) +
        '&action=' + encodeURIComponent(action)
      : '/api/tidal/track/action?cid=' + encodeURIComponent(selection.cid) +
        '&mid=' + encodeURIComponent(selection.mid) +
        '&action=' + encodeURIComponent(action);

    const response = await fetch(actionUrl, { cache: 'no-store' });`;

if (source.split(oldFetch).length - 1 !== 1) {
  throw new Error('Expected exactly one track action fetch marker');
}
source = source.replace(oldFetch, newFetch);

const oldBlocked = `  if (button.dataset.type === 'personalised-song') {
    tidalStatus.textContent = 'Personalised track playback is not enabled yet';
    return;
  }

  const label = button.querySelector('.tidal-artist-name');`;
const newBlocked = `  if (button.dataset.type === 'personalised-song') {
    const label = button.querySelector('.tidal-artist-name');
    const name = label ? label.textContent.trim() : '';
    openTidalTrackActionMenu(button, name);
    return;
  }

  const label = button.querySelector('.tidal-artist-name');`;

if (source.split(oldBlocked).length - 1 !== 1) {
  throw new Error('Expected exactly one personalised-song block marker');
}
source = source.replace(oldBlocked, newBlocked);

fs.writeFileSync(file, source);
console.log('Enabled resolved single-track actions for My Mixes tracks');
