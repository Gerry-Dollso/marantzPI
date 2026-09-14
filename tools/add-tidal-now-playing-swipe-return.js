'use strict';

const fs = require('fs');
const path = 'public/tidal-ui.js';
let source = fs.readFileSync(path, 'utf8');

const replacements = [
  {
    old: `function setTidalOpen(open) {\n  document.body.classList.toggle("show-tidal", open);\n  tidalScreen.setAttribute("aria-hidden", String(!open));\n  if (!open) tidalSearchInput.blur();\n}\n\ntidalNowPlaying?.addEventListener('click', () => {\n  closeTidalTrackActionMenu?.();\n  setTidalOpen(false);\n});`,
    replacement: `let tidalSwipeReturnArmed = false;\n\nfunction setTidalOpen(open) {\n  if (open) tidalSwipeReturnArmed = false;\n  document.body.classList.toggle("show-tidal", open);\n  tidalScreen.setAttribute("aria-hidden", String(!open));\n  if (!open) tidalSearchInput.blur();\n}\n\nwindow.addEventListener('popstate', () => {\n  if (!tidalSwipeReturnArmed) return;\n  if (document.body.classList.contains('show-tidal')) return;\n  if (nowPlayingScreen?.getAttribute('aria-hidden') === 'true') return;\n  if (latest?.playbackSource !== 'tidal') return;\n\n  tidalSwipeReturnArmed = false;\n  closeTidalTrackActionMenu?.();\n  setTidalOpen(true);\n});\n\ntidalNowPlaying?.addEventListener('click', () => {\n  closeTidalTrackActionMenu?.();\n  setTidalOpen(false);\n});`
  },
  {
    old: `  if (action === 'play-from-here') {\n    closeTidalTrackActionMenu();\n    setTidalOpen(false);\n  }`,
    replacement: `  if (action === 'play-from-here') {\n    closeTidalTrackActionMenu();\n    tidalSwipeReturnArmed = true;\n    setTidalOpen(false);\n  }`
  },
  {
    old: `    if (['play-now', 'play-from-here', 'play-only'].includes(action)) {\n      setTidalOpen(false);\n    }`,
    replacement: `    if (['play-now', 'play-from-here', 'play-only'].includes(action)) {\n      tidalSwipeReturnArmed = true;\n      setTidalOpen(false);\n    }`
  }
];

for (const { old, replacement } of replacements) {
  if (source.includes(replacement)) {
    throw new Error('Change already appears to be applied; refusing to run twice.');
  }
  const matches = source.split(old).length - 1;
  if (matches !== 1) {
    throw new Error(`Guard failed: expected exactly one source block, found ${matches}.`);
  }
  source = source.replace(old, replacement);
}

fs.writeFileSync(path, source);
console.log('public/tidal-ui.js: armed swipe-back return from TIDAL-triggered Now Playing');
console.log('Swipe remains trapped on other MarantzPi input screens.');
console.log('No backend or playback request code was modified.');
