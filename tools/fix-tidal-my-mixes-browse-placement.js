'use strict';

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'public', 'tidal-ui.js');
let source = fs.readFileSync(file, 'utf8');

const block = `
    if (cid === TIDAL_UI_ROOT_CID) {
      items.push({
        type: 'personalised',
        name: 'My Mixes',
        cid: TIDAL_PERSONALISED_CID,
        container: true,
        playable: false
      });
    }`;

const occurrences = source.split(block).length - 1;
if (occurrences !== 1) {
  throw new Error('Expected exactly one misplaced My Mixes block; found ' + occurrences);
}

source = source.replace(block, '');

const browseStart = source.indexOf('async function browseTidal(cid, title, pushHistory = true) {');
if (browseStart < 0) throw new Error('browseTidal not found');

const marker = `    const items = Array.isArray(result.items)
      ? result.items
      : [];

    if (cid === 'My Music-Artists') {`;
const markerIndex = source.indexOf(marker, browseStart);
if (markerIndex < 0) {
  throw new Error('Expected browseTidal items/render marker not found; refusing to edit');
}

const replacement = `    const items = Array.isArray(result.items)
      ? result.items
      : [];

    if (cid === TIDAL_UI_ROOT_CID) {
      items.push({
        type: 'personalised',
        name: 'My Mixes',
        cid: TIDAL_PERSONALISED_CID,
        container: true,
        playable: false
      });
    }

    if (cid === 'My Music-Artists') {`;

source = source.slice(0, markerIndex) +
  source.slice(markerIndex).replace(marker, replacement);

fs.writeFileSync(file, source);
console.log('Moved My Mixes injection into browseTidal My Music root rendering');
