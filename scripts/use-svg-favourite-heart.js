'use strict';

const fs = require('fs');
const path = require('path');

const checkOnly = process.argv.includes('--check');
const root = path.resolve(__dirname, '..');
const appPath = path.join(root, 'public', 'app.js');
const cssPath = path.join(root, 'public', 'favourite-heart-ui.css');

let app = fs.readFileSync(appPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');

function exactlyOnce(source, needle, label) {
  const count = source.split(needle).length - 1;
  if (count !== 1) throw new Error(`Expected exactly one ${label}, found ${count}`);
}

const textAnchor = "  tidalFavouriteHeart.textContent = '♡';";
const cssAnchor = `.tidal-favourite-heart.favourite {
  color: #ff3b3b;
}`;

const svgLine = `  tidalFavouriteHeart.innerHTML = '<svg class="favourite-heart-icon" viewBox="0 0 32 29" aria-hidden="true"><path d="M16 27.2 3.5 15.1C-4.2 7.7 6.7-3.7 14.6 3.8L16 5.2l1.4-1.4c7.9-7.5 18.8 3.9 11.1 11.3L16 27.2Z"/></svg>';`;

const svgCss = `.tidal-favourite-heart .favourite-heart-icon {
  display: block;
  width: 32px;
  height: 29px;
  overflow: visible;
}
.tidal-favourite-heart .favourite-heart-icon path {
  fill: transparent;
  stroke: rgba(255, 255, 255, 0.88);
  stroke-width: 1.8;
  stroke-linejoin: round;
}
.tidal-favourite-heart.favourite .favourite-heart-icon path {
  fill: #ff3b3b;
  stroke: #ff3b3b;
}`;

const already = app.includes('class="favourite-heart-icon"') && css.includes('.favourite-heart-icon path');
if (already) {
  console.log(checkOnly ? 'OK: identical-shape SVG favourite heart already present' : 'No change: identical-shape SVG favourite heart already present');
  process.exit(0);
}

exactlyOnce(app, textAnchor, 'heart text render anchor');
exactlyOnce(css, cssAnchor, 'favourite heart CSS anchor');

app = app.replace(textAnchor, svgLine);
css = css.replace(cssAnchor, svgCss);

if (checkOnly) {
  console.log('OK: guarded identical-shape SVG favourite heart patch can be applied cleanly');
  process.exit(0);
}

fs.writeFileSync(appPath, app);
fs.writeFileSync(cssPath, css);
console.log('Updated favourite heart to one identical SVG shape for outline and filled states');
