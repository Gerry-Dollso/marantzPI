'use strict';

const fs = require('fs');
const path = require('path');

const checkOnly = process.argv.includes('--check');
const root = path.resolve(__dirname, '..');
const serverPath = path.join(root, 'server.js');
const appPath = path.join(root, 'public', 'app.js');
const indexPath = path.join(root, 'public', 'index.html');
const cssPath = path.join(root, 'public', 'favourite-heart-ui.css');

let server = fs.readFileSync(serverPath, 'utf8');
let app = fs.readFileSync(appPath, 'utf8');
let index = fs.readFileSync(indexPath, 'utf8');

function exactlyOnce(source, needle, label) {
  const count = source.split(needle).length - 1;
  if (count !== 1) throw new Error(`Expected exactly one ${label}, found ${count}`);
}

const serverStateAnchor = 'let tidalQueueTransition = null;\n';
const personalisedResultAnchor = '        if (tidalQueueTransition === transition) {\n          transition.expectedMid = String(result.firstMid || "");';
const resolvedResultAnchor = "      const result = await mediaBackendRequest(\n        '/api/tidal/play-resolved?id=' + encodeURIComponent(id) +\n        '&action=' + encodeURIComponent(action),\n        'GET',\n        60000\n      );\n\n      return sendJson(res, 200, result);";
const favouriteTracksRouteAnchor = "      if (req.method === 'GET' && url.pathname === '/api/tidal/favourite-tracks') {";
const statusReturnAnchor = '    tidalAlbumId: playbackSource === \'tidal\'\n      ? String(';

const appElementAnchor = "const connection = document.getElementById('connection');\n";
const appStateAnchor = "let clock24h = true;\n";
const renderAnchor = '  const receiver = data.receiver || {};\n';
const receiverSettingsAnchor = 'receiverSettings?.addEventListener("click", () => {';
const indexCssAnchor = '  <link rel="stylesheet" href="/queue-ui.css?v=1">\n';
const indexHeaderAnchor = '        <div id="sourceHeading" class="heading">NOW PLAYING</div>\n        <button id="queueOpen" class="queue-open-button" type="button">QUEUE</button>';

const already = server.includes("url.pathname === '/api/tidal/favourite-track-status'") &&
  server.includes('tidalTrackId:') && app.includes('syncTidalFavouriteHeart(data)') &&
  index.includes('id="tidalFavouriteHeart"');
if (already) {
  console.log(checkOnly ? 'OK: Now Playing TIDAL favourite heart already present' : 'No change: Now Playing TIDAL favourite heart already present');
  process.exit(0);
}

[
  [server, serverStateAnchor, 'server state anchor'],
  [server, personalisedResultAnchor, 'personalised playback result anchor'],
  [server, resolvedResultAnchor, 'resolved playback result anchor'],
  [server, favouriteTracksRouteAnchor, 'favourite tracks route anchor'],
  [server, statusReturnAnchor, 'status return anchor'],
  [app, appElementAnchor, 'app element anchor'],
  [app, appStateAnchor, 'app state anchor'],
  [app, renderAnchor, 'render anchor'],
  [app, receiverSettingsAnchor, 'receiver settings anchor'],
  [index, indexCssAnchor, 'index CSS anchor'],
  [index, indexHeaderAnchor, 'index header anchor']
].forEach(([source, needle, label]) => exactlyOnce(source, needle, label));
if (fs.existsSync(cssPath)) throw new Error('favourite-heart-ui.css already exists unexpectedly');

server = server.replace(serverStateAnchor, serverStateAnchor + `let tidalOfficialTrackHint = null;\n\nfunction rememberOfficialTidalTrack(officialId, heosMid) {\n  const id = String(officialId || '').trim();\n  const mid = String(heosMid || '').trim();\n  tidalOfficialTrackHint = id && mid ? { officialId: id, heosMid: mid } : null;\n}\n`);

server = server.replace(
  personalisedResultAnchor,
  `        if (startTrackId && result.firstMid) {\n          rememberOfficialTidalTrack(startTrackId, result.firstMid);\n        }\n\n` + personalisedResultAnchor
);

server = server.replace(
  resolvedResultAnchor,
  resolvedResultAnchor.replace(
    '\n\n      return sendJson(res, 200, result);',
    `\n\n      if ((action === 'play-now' || action === 'play-only') && result.firstMid) {\n        rememberOfficialTidalTrack(id, result.firstMid);\n      }\n\n      return sendJson(res, 200, result);`
  )
);

server = server.replace(
  statusReturnAnchor,
  `    tidalTrackId: playbackSource === 'tidal' &&\n      tidalOfficialTrackHint &&\n      String(tidalOfficialTrackHint.heosMid) === String(mediaMid)\n        ? String(tidalOfficialTrackHint.officialId)\n        : '',\n` + statusReturnAnchor
);

const proxyRoutes = `      if (req.method === 'GET' && url.pathname === '/api/tidal/favourite-track-status') {\n        const id = String(url.searchParams.get('id') || '').trim();\n        if (!id || id.length > 256) {\n          return sendJson(res, 400, { ok: false, error: 'Track id is required' });\n        }\n        const result = await mediaBackendRequest(\n          '/api/tidal/favourite-track-status?id=' + encodeURIComponent(id),\n          'GET',\n          40000\n        );\n        return sendJson(res, 200, result);\n      }\n\n      if ((req.method === 'POST' || req.method === 'DELETE') && url.pathname === '/api/tidal/favourite-track') {\n        const id = String(url.searchParams.get('id') || '').trim();\n        if (!id || id.length > 256) {\n          return sendJson(res, 400, { ok: false, error: 'Track id is required' });\n        }\n        const result = await mediaBackendRequest(\n          '/api/tidal/favourite-track?id=' + encodeURIComponent(id),\n          req.method,\n          120000\n        );\n        return sendJson(res, 200, result);\n      }\n\n`;
server = server.replace(favouriteTracksRouteAnchor, proxyRoutes + favouriteTracksRouteAnchor);

app = app.replace(appElementAnchor, appElementAnchor + "const tidalFavouriteHeart = document.getElementById('tidalFavouriteHeart');\n");
app = app.replace(appStateAnchor, appStateAnchor + `let tidalFavouriteHeartKey = '';\nlet tidalFavouriteHeartState = null;\nlet tidalFavouriteHeartRequest = 0;\n`);

const heartFunctions = `\nfunction renderTidalFavouriteHeart() {\n  if (!tidalFavouriteHeart) return;\n  const available = Boolean(tidalFavouriteHeartKey);\n  tidalFavouriteHeart.hidden = !available;\n  tidalFavouriteHeart.disabled = !available || tidalFavouriteHeartState === null;\n  tidalFavouriteHeart.classList.toggle('favourite', tidalFavouriteHeartState === true);\n  tidalFavouriteHeart.textContent = tidalFavouriteHeartState === true ? '♥' : '♡';\n  tidalFavouriteHeart.setAttribute(\n    'aria-label',\n    tidalFavouriteHeartState === true ? 'Remove from TIDAL favourites' : 'Add to TIDAL favourites'\n  );\n}\n\nasync function syncTidalFavouriteHeart(data) {\n  const id = data?.playbackSource === 'tidal'\n    ? String(data.tidalTrackId || data.tidalMid || '').trim()\n    : '';\n  if (id === tidalFavouriteHeartKey) return;\n\n  tidalFavouriteHeartKey = id;\n  tidalFavouriteHeartState = null;\n  const request = ++tidalFavouriteHeartRequest;\n  renderTidalFavouriteHeart();\n  if (!id) return;\n\n  try {\n    const response = await fetch(\n      '/api/tidal/favourite-track-status?id=' + encodeURIComponent(id),\n      { cache: 'no-store' }\n    );\n    const result = await response.json();\n    if (!response.ok || result.ok === false) throw new Error(result.error || 'Favourite status unavailable');\n    if (request !== tidalFavouriteHeartRequest || id !== tidalFavouriteHeartKey) return;\n    tidalFavouriteHeartKey = String(result.id || id);\n    tidalFavouriteHeartState = result.favourite === true;\n    renderTidalFavouriteHeart();\n  } catch {\n    if (request !== tidalFavouriteHeartRequest || id !== tidalFavouriteHeartKey) return;\n    tidalFavouriteHeartKey = '';\n    tidalFavouriteHeartState = null;\n    renderTidalFavouriteHeart();\n  }\n}\n\nasync function toggleTidalFavouriteHeart() {\n  const id = tidalFavouriteHeartKey;\n  if (!id || tidalFavouriteHeartState === null) return;\n  const wanted = !tidalFavouriteHeartState;\n  tidalFavouriteHeart.disabled = true;\n  try {\n    const response = await fetch(\n      '/api/tidal/favourite-track?id=' + encodeURIComponent(id),\n      { method: wanted ? 'POST' : 'DELETE', cache: 'no-store' }\n    );\n    const result = await response.json();\n    if (!response.ok || result.ok === false) throw new Error(result.error || 'Favourite update failed');\n    if (id !== tidalFavouriteHeartKey) return;\n    tidalFavouriteHeartState = result.favourite === true;\n  } catch (error) {\n    console.warn('TIDAL favourite update failed:', error);\n  } finally {\n    renderTidalFavouriteHeart();\n  }\n}\n\ntidalFavouriteHeart?.addEventListener('click', toggleTidalFavouriteHeart);\n\n`;
app = app.replace(receiverSettingsAnchor, heartFunctions + receiverSettingsAnchor);
app = app.replace(renderAnchor, renderAnchor + '  void syncTidalFavouriteHeart(data);\n');

index = index.replace(indexCssAnchor, indexCssAnchor + '  <link rel="stylesheet" href="/favourite-heart-ui.css?v=1">\n');
index = index.replace(
  indexHeaderAnchor,
  '        <div id="sourceHeading" class="heading">NOW PLAYING</div>\n        <button id="tidalFavouriteHeart" class="tidal-favourite-heart" type="button" aria-label="TIDAL favourite" hidden>♡</button>\n        <button id="queueOpen" class="queue-open-button" type="button">QUEUE</button>'
);

const css = `.tidal-favourite-heart {\n  appearance: none;\n  border: 0;\n  background: transparent;\n  color: rgba(255, 255, 255, 0.72);\n  font-size: 2rem;\n  line-height: 1;\n  padding: 0 0.35rem;\n  min-width: 2.6rem;\n  cursor: pointer;\n}\n\n.tidal-favourite-heart.favourite {\n  color: #fff;\n}\n\n.tidal-favourite-heart:disabled {\n  opacity: 0.45;\n}\n\n.tidal-favourite-heart[hidden] {\n  display: none !important;\n}\n`;

if (checkOnly) {
  console.log('OK: guarded Now Playing TIDAL favourite heart patch can be applied cleanly');
  process.exit(0);
}

fs.writeFileSync(serverPath, server);
fs.writeFileSync(appPath, app);
fs.writeFileSync(indexPath, index);
fs.writeFileSync(cssPath, css);
console.log('Updated Pi with official TIDAL Now Playing favourite heart');
