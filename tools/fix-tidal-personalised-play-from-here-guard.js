'use strict';

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'public', 'tidal-ui.js');
let source = fs.readFileSync(file, 'utf8');

const doneMarker = `  if (selection.personalised && action === 'play-from-here') {
    tidalStatus.textContent = 'Play From Here is not available for My Mixes yet';
    return;
  }

  actionButton.disabled = true;`;
if (source.includes(doneMarker)) {
  console.log('Personalised Play From Here guard already placed safely; no change needed.');
  process.exit(0);
}

const oldGuard = `  actionButton.disabled = true;
  actionButton.classList.add('loading');

  if (action === 'play-from-here') {
    closeTidalTrackActionMenu();
    setTidalOpen(false);
  }

  try {
    if (selection.personalised && action === 'play-from-here') {
      throw new Error('Play From Here is not available for My Mixes yet');
    }

    const actionUrl = selection.personalised`;

const newGuard = `  if (selection.personalised && action === 'play-from-here') {
    tidalStatus.textContent = 'Play From Here is not available for My Mixes yet';
    return;
  }

  actionButton.disabled = true;
  actionButton.classList.add('loading');

  if (action === 'play-from-here') {
    closeTidalTrackActionMenu();
    setTidalOpen(false);
  }

  try {
    const actionUrl = selection.personalised`;

if (source.split(oldGuard).length - 1 !== 1) {
  throw new Error('Expected exactly one personalised Play From Here guard block');
}

source = source.replace(oldGuard, newGuard);
fs.writeFileSync(file, source);
console.log('Moved personalised Play From Here guard before UI close/loading state');
