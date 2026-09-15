'use strict';

const fs = require('fs');
const path = require('path');

const checkOnly = process.argv.includes('--check');
const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'public', 'index.html');
const cssPath = path.join(root, 'public', 'favourite-heart-ui.css');

let index = fs.readFileSync(indexPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');

const oldHeart = '        <button id="tidalFavouriteHeart" class="tidal-favourite-heart" type="button" aria-label="TIDAL favourite" hidden>♡</button>\n';
const progressAnchor = '      <div class="progress-section">\n        <div id="progressTrack" class="progress-track">';
const newProgress = '      <div class="progress-section">\n        <button id="tidalFavouriteHeart" class="tidal-favourite-heart" type="button" aria-label="TIDAL favourite" hidden>♡</button>\n        <div id="progressTrack" class="progress-track">';
const cssAnchor = '.tidal-favourite-heart {\n  appearance: none;';

const alreadyMoved = index.includes(newProgress) && css.includes('position: absolute;') && css.includes('bottom: 34px;');
if (alreadyMoved) {
  console.log(checkOnly ? 'OK: favourite heart already positioned above duration' : 'No change: favourite heart already positioned above duration');
  process.exit(0);
}

function exactlyOnce(source, needle, label) {
  const count = source.split(needle).length - 1;
  if (count !== 1) throw new Error(`Expected exactly one ${label}, found ${count}`);
}

exactlyOnce(index, oldHeart, 'header favourite heart');
exactlyOnce(index, progressAnchor, 'progress section anchor');
exactlyOnce(css, cssAnchor, 'favourite heart CSS anchor');

index = index.replace(oldHeart, '');
index = index.replace(progressAnchor, newProgress);
css = css.replace(
  cssAnchor,
  '.progress-section {\n  position: relative;\n}\n\n' +
  '.tidal-favourite-heart {\n  position: absolute;\n  right: 0;\n  bottom: 34px;\n  z-index: 2;\n  appearance: none;'
);

if (checkOnly) {
  console.log('OK: guarded favourite heart relocation can be applied cleanly');
  process.exit(0);
}

fs.writeFileSync(indexPath, index);
fs.writeFileSync(cssPath, css);
console.log('Moved Now Playing TIDAL favourite heart above track duration');
