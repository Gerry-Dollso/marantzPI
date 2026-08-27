'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const serverPath = path.join(root, 'server.js');
const uiPath = path.join(root, 'public', 'tidal-ui.js');
const cssPath = path.join(root, 'public', 'tidal-ui.css');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function backup(file, suffix) {
  const target = file + suffix;
  if (!fs.existsSync(target)) fs.copyFileSync(file, target);
}

let server = read(serverPath);
let ui = read(uiPath);
let css = read(cssPath);

if (server.includes("url.pathname === '/api/tidal/track/action'")) {
  throw new Error('Pi TIDAL track-action proxy already appears to be applied');
}
if (ui.includes('tidalTrackActionOverlay')) {
  throw new Error('TIDAL playlist track menu already appears to be applied');
}
if (css.includes('.tidal-track-action-overlay')) {
  throw new Error('TIDAL playlist track menu CSS already appears to be applied');
}

const serverAnchor = "        if (req.method === 'GET' && url.pathname === '/api/tidal/playlist/play') {\n";
if (!server.includes(serverAnchor)) {
  throw new Error('Expected Pi playlist proxy anchor not found; refusing to edit server.js');
}

const serverBlock = `        if (req.method === 'GET' && url.pathname === '/api/tidal/track/action') {\n          const cid = url.searchParams.get('cid') || '';\n          const mid = url.searchParams.get('mid') || '';\n          const action = url.searchParams.get('action') || '';\n\n          const result = await mediaBackendRequest(\n            '/api/tidal/track/action?cid=' + encodeURIComponent(cid) +\n            '&mid=' + encodeURIComponent(mid) +\n            '&action=' + encodeURIComponent(action),\n            'GET',\n            60000\n          );\n\n          return sendJson(res, 200, result);\n        }\n\n`;
server = server.replace(serverAnchor, serverBlock + serverAnchor);

const stateAnchor = "let tidalCurrentPlaylistCid = '';\n\n";
if (!ui.includes(stateAnchor)) {
  throw new Error('Expected TIDAL state anchor not found; refusing to edit tidal-ui.js');
}

const menuCode = `let tidalTrackActionSelection = null;\n\nconst tidalTrackActionOverlay = document.createElement('div');\ntidalTrackActionOverlay.className = 'tidal-track-action-overlay';\ntidalTrackActionOverlay.setAttribute('aria-hidden', 'true');\n\nconst tidalTrackActionPanel = document.createElement('div');\ntidalTrackActionPanel.className = 'tidal-track-action-panel';\n\nconst tidalTrackActionTitle = document.createElement('div');\ntidalTrackActionTitle.className = 'tidal-track-action-title';\ntidalTrackActionTitle.textContent = 'TRACK OPTIONS';\n\nconst tidalTrackActionName = document.createElement('div');\ntidalTrackActionName.className = 'tidal-track-action-name';\n\nconst tidalTrackActionButtons = document.createElement('div');\ntidalTrackActionButtons.className = 'tidal-track-action-buttons';\n\n[\n  ['play-now', 'PLAY NOW'],\n  ['play-next', 'PLAY NEXT'],\n  ['add-end', 'ADD TO END'],\n  ['play-from-here', 'PLAY FROM HERE'],\n  ['play-only', 'PLAY ONLY'],\n  ['cancel', 'CANCEL']\n].forEach(([action, label]) => {\n  const button = document.createElement('button');\n  button.type = 'button';\n  button.dataset.trackAction = action;\n  button.textContent = label;\n  if (action === 'cancel') button.className = 'tidal-track-action-cancel';\n  tidalTrackActionButtons.appendChild(button);\n});\n\ntidalTrackActionPanel.append(\n  tidalTrackActionTitle,\n  tidalTrackActionName,\n  tidalTrackActionButtons\n);\ntidalTrackActionOverlay.appendChild(tidalTrackActionPanel);\ntidalScreen.appendChild(tidalTrackActionOverlay);\n\nfunction currentTidalContainerCid() {\n  const current = tidalHistory[tidalHistory.length - 1];\n  return String(current?.cid || '');\n}\n\nfunction currentTidalContainerIsPlaylist() {\n  return currentTidalContainerCid().startsWith('LIBPLAYLIST-');\n}\n\nfunction closeTidalTrackActionMenu() {\n  tidalTrackActionSelection = null;\n  tidalTrackActionOverlay.classList.remove('open');\n  tidalTrackActionOverlay.setAttribute('aria-hidden', 'true');\n}\n\nfunction openTidalTrackActionMenu(button, name) {\n  const cid = currentTidalContainerCid();\n  const mid = String(button?.dataset?.mid || '');\n\n  if (!cid || !mid) {\n    tidalStatus.textContent = 'Track options unavailable';\n    return;\n  }\n\n  tidalTrackActionSelection = { cid, mid, name: name || 'Track' };\n  tidalTrackActionName.textContent = name || 'Track';\n  tidalTrackActionOverlay.classList.add('open');\n  tidalTrackActionOverlay.setAttribute('aria-hidden', 'false');\n}\n\nasync function runTidalTrackAction(action, actionButton) {\n  const selection = tidalTrackActionSelection;\n  if (!selection) return;\n\n  if (action === 'cancel') {\n    closeTidalTrackActionMenu();\n    return;\n  }\n\n  actionButton.disabled = true;\n  actionButton.classList.add('loading');\n\n  try {\n    const response = await fetch(\n      '/api/tidal/track/action?cid=' + encodeURIComponent(selection.cid) +\n      '&mid=' + encodeURIComponent(selection.mid) +\n      '&action=' + encodeURIComponent(action),\n      { cache: 'no-store' }\n    );\n    const result = await response.json();\n\n    if (!response.ok || result.ok === false) {\n      throw new Error(result.error || 'Track action failed');\n    }\n\n    const statusByAction = {\n      'play-now': 'Playing',\n      'play-next': 'Queued next',\n      'add-end': 'Added to end',\n      'play-from-here': 'Playing from',\n      'play-only': 'Playing only'\n    };\n\n    closeTidalTrackActionMenu();\n    tidalStatus.textContent =\n      (statusByAction[action] || 'Updated') + ' — ' + selection.name;\n\n    if (['play-now', 'play-from-here', 'play-only'].includes(action)) {\n      setTidalOpen(false);\n    }\n  } catch (error) {\n    tidalStatus.textContent = error.message;\n    actionButton.disabled = false;\n    actionButton.classList.remove('loading');\n  }\n}\n\ntidalTrackActionOverlay.addEventListener('click', event => {\n  const button = event.target.closest('[data-track-action]');\n  if (!button) return;\n  runTidalTrackAction(button.dataset.trackAction, button);\n});\n\n`;
ui = ui.replace(stateAnchor, stateAnchor + menuCode);

const songBlock = `  if (\n    button.classList.contains('tidal-browse-item') &&\n    button.dataset.type === 'song'\n  ) {\n    if (button.dataset.albumId) {\n`;
if (!ui.includes(songBlock)) {
  throw new Error('Expected song click anchor not found; refusing to edit tidal-ui.js');
}

const songReplacement = `  if (\n    button.classList.contains('tidal-browse-item') &&\n    button.dataset.type === 'song'\n  ) {\n    if (currentTidalContainerIsPlaylist()) {\n      openTidalTrackActionMenu(button, name);\n      return;\n    }\n\n    if (button.dataset.albumId) {\n`;
ui = ui.replace(songBlock, songReplacement);

const cssAppend = `\n\n.tidal-track-action-overlay {\n  position: absolute;\n  inset: 0;\n  z-index: 30;\n  display: none;\n  align-items: center;\n  justify-content: center;\n  padding: 28px;\n  box-sizing: border-box;\n  background: rgba(0,0,0,0.78);\n}\n\n.tidal-track-action-overlay.open {\n  display: flex;\n}\n\n.tidal-track-action-panel {\n  width: min(680px, 100%);\n  padding: 20px;\n  box-sizing: border-box;\n  border: 1px solid rgba(255,255,255,0.28);\n  border-radius: 18px;\n  background: #161616;\n  box-shadow: 0 18px 60px rgba(0,0,0,0.55);\n}\n\n.tidal-track-action-title {\n  text-align: center;\n  font-size: 12px;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  opacity: 0.65;\n}\n\n.tidal-track-action-name {\n  margin: 7px 0 16px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  text-align: center;\n  font-size: 20px;\n  font-weight: 700;\n}\n\n.tidal-track-action-buttons {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 10px 12px;\n}\n\n.tidal-track-action-buttons button {\n  height: 54px;\n  border: 1px solid rgba(255,255,255,0.24);\n  border-radius: 12px;\n  background: rgba(255,255,255,0.08);\n  color: #f4f4f4;\n  font: inherit;\n  font-size: 13px;\n  font-weight: 700;\n  letter-spacing: 0.08em;\n}\n\n.tidal-track-action-buttons .tidal-track-action-cancel {\n  grid-column: 1 / -1;\n  height: 46px;\n  opacity: 0.75;\n}\n`;
css += cssAppend;

backup(serverPath, '.before-tidal-playlist-track-menu');
backup(uiPath, '.before-tidal-playlist-track-menu');
backup(cssPath, '.before-tidal-playlist-track-menu');

fs.writeFileSync(serverPath, server);
fs.writeFileSync(uiPath, ui);
fs.writeFileSync(cssPath, css);

console.log('Applied guarded TIDAL playlist track menu migration');
console.log('Backups created with .before-tidal-playlist-track-menu suffix');
