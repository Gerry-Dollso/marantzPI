'use strict';

const fs = require('fs');
const path = require('path');

const uiFile = path.join(__dirname, '..', 'public', 'tidal-ui.js');
const htmlFile = path.join(__dirname, '..', 'public', 'index.html');
let ui = fs.readFileSync(uiFile, 'utf8');
let html = fs.readFileSync(htmlFile, 'utf8');

if (ui.includes("name: 'My Mixes'")) {
  console.log('My Mixes root integration already present; no change needed.');
  process.exit(0);
}

const renderMarker = "    const items = Array.isArray(result.items)\n      ? result.items\n      : [];";
if (!ui.includes(renderMarker)) {
  throw new Error('Expected browse items marker not found; refusing to edit tidal-ui.js');
}
ui = ui.replace(renderMarker, renderMarker + `

    if (cid === TIDAL_UI_ROOT_CID) {
      items.push({
        type: 'personalised',
        name: 'My Mixes',
        cid: TIDAL_PERSONALISED_CID,
        container: true,
        playable: false
      });
    }`);

const browseClickMarker = "  if (button.classList.contains('tidal-browse-item')) {\n    if (button.dataset.type === 'artist') {";
if (!ui.includes(browseClickMarker)) {
  throw new Error('Expected browse click marker not found; refusing to edit tidal-ui.js');
}
ui = ui.replace(browseClickMarker, `  if (button.classList.contains('tidal-browse-item')) {
    if (button.dataset.type === 'personalised') {
      loadTidalPersonalised();
    } else if (button.dataset.type === 'artist') {`);

ui = ui.replace("{ cid: TIDAL_PERSONALISED_CID, title: 'For You' }", "{ cid: TIDAL_PERSONALISED_CID, title: 'My Mixes' }");
ui = ui.replace("tidalStatus.textContent = 'Loading For You…';", "tidalStatus.textContent = 'Loading My Mixes…';");
ui = ui.replace("throw new Error(result.error || 'Could not load personalised TIDAL');", "throw new Error(result.error || 'Could not load My Mixes');");
ui = ui.replace("tidalStatus.textContent = 'For You — ' + playlists.length + ' playlists';", "tidalStatus.textContent = 'My Mixes — ' + playlists.length + ' playlists';");

html = html.replace('        <button type="button" data-tidal-personalised="1">FOR YOU</button>\n', '');
html = html.replace('<script src="/tidal-ui.js?v=2"></script>', '<script src="/tidal-ui.js?v=3"></script>');

fs.writeFileSync(uiFile, ui);
fs.writeFileSync(htmlFile, html);
console.log('Moved My Mixes into the visible My Music root and removed hidden FOR YOU shortcut');
