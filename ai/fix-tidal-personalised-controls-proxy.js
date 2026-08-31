'use strict';

const fs = require('fs');
const path = require('path');

function edit(relativePath, changes) {
  const file = path.join(__dirname, '..', relativePath);
  let text = fs.readFileSync(file, 'utf8');

  for (const change of changes) {
    const count = text.split(change.before).length - 1;
    if (count !== 1) {
      throw new Error(`${relativePath} / ${change.label}: expected exactly one anchor, found ${count}`);
    }
    text = text.replace(change.before, change.after);
  }

  fs.writeFileSync(file, text);
}

edit('public/tidal-ui.js', [
  {
    label: 'personalised chrome creation',
    before: `const tidalStatus = document.getElementById('tidalStatus');\nconst tidalResults = document.getElementById('tidalResults');`,
    after: `const tidalStatus = document.getElementById('tidalStatus');\nconst tidalResults = document.getElementById('tidalResults');\n\nconst tidalPersonalisedControls = document.createElement('div');\ntidalPersonalisedControls.className = 'tidal-personalised-controls';\ntidalPersonalisedControls.hidden = true;\n\nconst tidalPersonalisedPlayAll = document.createElement('button');\ntidalPersonalisedPlayAll.type = 'button';\ntidalPersonalisedPlayAll.dataset.personalisedPlaylistAction = 'play-all';\ntidalPersonalisedPlayAll.textContent = 'PLAY ALL';\n\nconst tidalPersonalisedShuffleAll = document.createElement('button');\ntidalPersonalisedShuffleAll.type = 'button';\ntidalPersonalisedShuffleAll.dataset.personalisedPlaylistAction = 'shuffle-all';\ntidalPersonalisedShuffleAll.textContent = 'SHUFFLE ALL';\n\ntidalPersonalisedControls.append(\n  tidalPersonalisedPlayAll,\n  tidalPersonalisedShuffleAll\n);\ntidalSearchForm.insertAdjacentElement('afterend', tidalPersonalisedControls);\n\nfunction setTidalPersonalisedChrome(mode = 'normal', playlistId = '') {\n  const personalised = mode === 'landing' || mode === 'playlist';\n  const playlist = mode === 'playlist';\n\n  tidalSearchForm.hidden = personalised;\n  tidalPersonalisedControls.hidden = !playlist;\n\n  const id = playlist ? String(playlistId || '') : '';\n  tidalPersonalisedPlayAll.dataset.personalisedPlaylistId = id;\n  tidalPersonalisedShuffleAll.dataset.personalisedPlaylistId = id;\n}`
  },
  {
    label: 'hide search on personalised landing',
    before: `async function loadTidalPersonalised(pushHistory = true) {\n  if (pushHistory) {`,
    after: `async function loadTidalPersonalised(pushHistory = true) {\n  setTidalPersonalisedChrome('landing');\n\n  if (pushHistory) {`
  },
  {
    label: 'show personalised controls on playlist',
    before: `async function loadTidalPersonalisedPlaylist(id, title, pushHistory = true) {\n  const playlistId = String(id || '').trim();`,
    after: `async function loadTidalPersonalisedPlaylist(id, title, pushHistory = true) {\n  const playlistId = String(id || '').trim();`
  },
  {
    label: 'activate personalised playlist chrome after validation',
    before: `  if (!/^[a-zA-Z0-9]+$/.test(playlistId)) {\n    tidalStatus.textContent = 'Invalid personalised playlist';\n    return;\n  }\n\n  if (pushHistory) {`,
    after: `  if (!/^[a-zA-Z0-9]+$/.test(playlistId)) {\n    tidalStatus.textContent = 'Invalid personalised playlist';\n    return;\n  }\n\n  setTidalPersonalisedChrome('playlist', playlistId);\n\n  if (pushHistory) {`
  },
  {
    label: 'remove duplicate in-results personalised controls',
    before: `    const controls = document.createElement('div');\n    controls.className = 'tidal-playlist-controls';\n\n    const playAll = document.createElement('button');\n    playAll.type = 'button';\n    playAll.dataset.personalisedPlaylistAction = 'play-all';\n    playAll.dataset.personalisedPlaylistId = playlistId;\n    playAll.textContent = 'PLAY ALL';\n\n    const shuffleAll = document.createElement('button');\n    shuffleAll.type = 'button';\n    shuffleAll.dataset.personalisedPlaylistAction = 'shuffle-all';\n    shuffleAll.dataset.personalisedPlaylistId = playlistId;\n    shuffleAll.textContent = 'SHUFFLE ALL';\n\n    controls.append(playAll, shuffleAll);\n    tidalResults.appendChild(controls);\n\n`,
    after: ``
  },
  {
    label: 'restore normal chrome for standard browse',
    before: `async function browseTidal(cid, title, pushHistory = true) {\n  if (cid !== 'My Music-Albums') {`,
    after: `async function browseTidal(cid, title, pushHistory = true) {\n  setTidalPersonalisedChrome('normal');\n\n  if (cid !== 'My Music-Albums') {`
  },
  {
    label: 'restore normal chrome for search',
    before: `async function searchTidal(query) {\n  setTidalKeyboardOpen(false);`,
    after: `async function searchTidal(query) {\n  setTidalPersonalisedChrome('normal');\n  setTidalKeyboardOpen(false);`
  }
]);

edit('public/tidal-ui.css', [
  {
    label: 'personalised controls styling',
    before: `.tidal-search input::placeholder {\n  color: rgba(255,255,255,0.42);\n}\n`,
    after: `.tidal-search input::placeholder {\n  color: rgba(255,255,255,0.42);\n}\n\n.tidal-search[hidden],\n.tidal-personalised-controls[hidden] {\n  display: none;\n}\n\n.tidal-personalised-controls {\n  display: grid;\n  grid-template-columns: repeat(2, 1fr);\n  gap: 12px;\n  margin-top: 8px;\n}\n\n.tidal-personalised-controls button {\n  height: 48px;\n  border: 1px solid rgba(255,255,255,0.24);\n  border-radius: 10px;\n  background: rgba(255,255,255,0.08);\n  color: inherit;\n  font: inherit;\n  font-size: 13px;\n  font-weight: 700;\n  letter-spacing: 0.1em;\n}\n`
  }
]);

edit('server.js', [
  {
    label: 'personalised playlist playback proxy',
    before: `    if (req.method === 'GET' && url.pathname === '/api/tidal/play-resolved') {`,
    after: `    if (\n      req.method === 'GET' &&\n      url.pathname === '/api/tidal/personalised/playlist/play'\n    ) {\n      const id = String(url.searchParams.get('id') || '').trim();\n      const shuffle = url.searchParams.get('shuffle') === '1' ? '1' : '0';\n\n      if (!/^[a-zA-Z0-9]+$/.test(id)) {\n        return sendJson(res, 400, { ok: false, error: 'Invalid playlist id' });\n      }\n\n      const result = await mediaBackendRequest(\n        '/api/tidal/personalised/playlist/play?id=' + encodeURIComponent(id) +\n        '&shuffle=' + shuffle,\n        'GET',\n        60000\n      );\n\n      return sendJson(res, 200, result);\n    }\n\n    if (req.method === 'GET' && url.pathname === '/api/tidal/play-resolved') {`
  }
]);

console.log('Applied guarded personalised controls proxy and chrome migration');
