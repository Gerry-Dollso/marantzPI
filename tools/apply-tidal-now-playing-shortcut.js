'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const indexPath = path.join(root, 'public', 'index.html');
const cssPath = path.join(root, 'public', 'tidal-ui.css');
const jsPath = path.join(root, 'public', 'tidal-ui.js');

let html = fs.readFileSync(indexPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');
let js = fs.readFileSync(jsPath, 'utf8');

if (html.includes('id="tidalNowPlaying"')) {
  throw new Error('TIDAL Now Playing shortcut already appears to be applied');
}
if (js.includes("getElementById('tidalNowPlaying')")) {
  throw new Error('TIDAL Now Playing shortcut JS already appears to be applied');
}

const htmlAnchor = `        <div></div>\n      </header>`;
if (!html.includes(htmlAnchor)) {
  throw new Error('Expected empty TIDAL header slot not found');
}
html = html.replace(
  htmlAnchor,
  `        <button id="tidalNowPlaying" class="tidal-now-playing" type="button">NOW PLAYING</button>\n      </header>`
);

const cssAnchor = `.tidal-back,\n.tidal-search button {`;
if (!css.includes(cssAnchor)) {
  throw new Error('Expected TIDAL button style anchor not found');
}
css = css.replace(
  cssAnchor,
  `.tidal-back,\n.tidal-now-playing,\n.tidal-search button {`
);

const jsAnchor = `const tidalBack = document.getElementById('tidalBack');\n`;
if (!js.includes(jsAnchor)) {
  throw new Error('Expected TIDAL Back element anchor not found');
}
js = js.replace(
  jsAnchor,
  jsAnchor + `const tidalNowPlaying = document.getElementById('tidalNowPlaying');\n`
);

const setOpenAnchor = `function tidalDisplayName(value) {\n`;
if (!js.includes(setOpenAnchor)) {
  throw new Error('Expected TIDAL display-name anchor not found');
}
js = js.replace(
  setOpenAnchor,
  `tidalNowPlaying?.addEventListener('click', () => {\n` +
  `  closeTidalTrackActionMenu?.();\n` +
  `  setTidalOpen(false);\n` +
  `});\n\n` +
  setOpenAnchor
);

for (const [file, content] of [
  [indexPath, html],
  [cssPath, css],
  [jsPath, js]
]) {
  const backup = file + '.before-tidal-now-playing-shortcut';
  if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
  fs.writeFileSync(file, content);
}

console.log('Applied guarded TIDAL Now Playing shortcut migration');
console.log('Backups created with .before-tidal-now-playing-shortcut suffix');
