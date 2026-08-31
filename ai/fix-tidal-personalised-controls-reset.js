const fs = require('fs');

const path = 'public/tidal-ui.js';
let source = fs.readFileSync(path, 'utf8');

const anchor = `  const id = playlist ? String(playlistId || '') : '';\n  tidalPersonalisedPlayAll.dataset.personalisedPlaylistId = id;\n  tidalPersonalisedShuffleAll.dataset.personalisedPlaylistId = id;\n}`;

const replacement = `  const id = playlist ? String(playlistId || '') : '';\n  tidalPersonalisedPlayAll.dataset.personalisedPlaylistId = id;\n  tidalPersonalisedShuffleAll.dataset.personalisedPlaylistId = id;\n\n  tidalPersonalisedPlayAll.disabled = false;\n  tidalPersonalisedShuffleAll.disabled = false;\n  tidalPersonalisedPlayAll.classList.remove('loading');\n  tidalPersonalisedShuffleAll.classList.remove('loading');\n}`;

const matches = source.split(anchor).length - 1;
if (matches !== 1) {
  throw new Error(`Expected exactly one personalised chrome anchor, found ${matches}`);
}

source = source.replace(anchor, replacement);
fs.writeFileSync(path, source);
console.log('Applied guarded My Mix control reset fix');
