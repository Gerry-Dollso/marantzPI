'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const serverPath = path.join(root, 'server.js');
const appPath = path.join(root, 'public', 'app.js');
const tidalPath = path.join(root, 'public', 'tidal-ui.js');

let server = fs.readFileSync(serverPath, 'utf8');
let app = fs.readFileSync(appPath, 'utf8');
let tidal = fs.readFileSync(tidalPath, 'utf8');

if (server.includes("/api/tidal/metadata/track-artists?")) {
  throw new Error('Pi TIDAL metadata proxy already appears to be applied');
}
if (app.includes('openCurrentTidalArtist')) {
  throw new Error('Now Playing artist link already appears to be applied');
}
if (tidal.includes('openTidalArtistFromNowPlaying')) {
  throw new Error('TIDAL artist navigation helper already appears to be applied');
}

const statusAnchor = `    album,\n    playbackSource,\n`;
if (!server.includes(statusAnchor)) {
  throw new Error('Expected status payload anchor not found');
}
server = server.replace(
  statusAnchor,
  `    album,\n` +
  `    tidalMid: playbackSource === 'tidal'\n` +
  `      ? String(mediaMid || lastTidalResume?.mid || '')\n` +
  `      : '',\n` +
  `    playbackSource,\n`
);

const proxyAnchor = `  if (req.method === 'GET' && req.url.startsWith('/api/tidal/track/action?')) {\n`;
if (!server.includes(proxyAnchor)) {
  throw new Error('Expected TIDAL track action proxy anchor not found');
}
const proxy = `  if (req.method === 'GET' && req.url.startsWith('/api/tidal/metadata/track-artists?')) {\n` +
`    try {\n` +
`      const url = new URL(req.url, 'http://localhost');\n` +
`      const mid = String(url.searchParams.get('mid') || '').trim();\n` +
`      if (!mid) {\n` +
`        return sendJson(res, 400, { error: 'Missing track mid' });\n` +
`      }\n\n` +
`      const result = await mediaBackendRequest(\n` +
`        '/api/tidal/metadata/track-artists?mid=' + encodeURIComponent(mid)\n` +
`      );\n` +
`      return sendJson(res, 200, result);\n` +
`    } catch (error) {\n` +
`      return sendJson(res, 502, { error: error.message });\n` +
`    }\n` +
`  }\n\n`;
server = server.replace(proxyAnchor, proxy + proxyAnchor);

const renderAnchor = `  if (data.playbackSource === 'internet-radio') {\n`;
if (!app.includes(renderAnchor)) {
  throw new Error('Expected app render anchor not found');
}
app = app.replace(
  renderAnchor,
  `  const artistLinkAvailable =\n` +
  `    data.playbackSource === 'tidal' &&\n` +
  `    Boolean(String(data.tidalMid || '').trim()) &&\n` +
  `    Boolean(String(data.artist || '').trim());\n` +
  `  artist.classList.toggle('tidal-artist-link', artistLinkAvailable);\n` +
  `  artist.setAttribute('role', artistLinkAvailable ? 'button' : '');\n` +
  `  artist.setAttribute('aria-label',\n` +
  `    artistLinkAvailable ? 'Browse this artist in TIDAL' : ''\n` +
  `  );\n\n` +
  renderAnchor
);

const listenerAnchor = `receiverSettings?.addEventListener("click", () => {\n`;
if (!app.includes(listenerAnchor)) {
  throw new Error('Expected app listener anchor not found');
}
const artistHandler = `async function openCurrentTidalArtist() {\n` +
`  const mid = String(latest?.tidalMid || '').trim();\n` +
`  const displayedArtist = String(latest?.artist || '').trim();\n` +
`  if (latest?.playbackSource !== 'tidal' || !mid || !displayedArtist) return;\n\n` +
`  artist.classList.add('loading');\n` +
`  try {\n` +
`    const response = await fetch(\n` +
`      '/api/tidal/metadata/track-artists?mid=' + encodeURIComponent(mid),\n` +
`      { cache: 'no-store' }\n` +
`    );\n` +
`    const result = await response.json();\n` +
`    if (!response.ok || result.ok === false) {\n` +
`      throw new Error(result.error || 'Could not resolve TIDAL artist');\n` +
`    }\n\n` +
`    const artists = Array.isArray(result.artists) ? result.artists : [];\n` +
`    const wanted = displayedArtist.toLowerCase();\n` +
`    const selected =\n` +
`      artists.find(item => String(item?.name || '').trim().toLowerCase() === wanted) ||\n` +
`      artists[0];\n\n` +
`    if (!selected?.cid) {\n` +
`      throw new Error('No canonical TIDAL artist found');\n` +
`    }\n\n` +
`    if (typeof openTidalArtistFromNowPlaying !== 'function') {\n` +
`      throw new Error('TIDAL artist browser unavailable');\n` +
`    }\n\n` +
`    await openTidalArtistFromNowPlaying(\n` +
`      selected.cid,\n` +
`      selected.name || displayedArtist\n` +
`    );\n` +
`  } catch (error) {\n` +
`    console.warn('Could not open current TIDAL artist:', error);\n` +
`  } finally {\n` +
`    artist.classList.remove('loading');\n` +
`  }\n` +
`}\n\n` +
`artist?.addEventListener('click', openCurrentTidalArtist);\n\n`;
app = app.replace(listenerAnchor, artistHandler + listenerAnchor);

const tidalAnchor = `async function browseTidal(cid, title, pushHistory = true) {\n`;
if (!tidal.includes(tidalAnchor)) {
  throw new Error('Expected TIDAL browse anchor not found');
}
const tidalHelper = `async function openTidalArtistFromNowPlaying(cid, title) {\n` +
`  const artistCid = String(cid || '').trim();\n` +
`  if (!artistCid.startsWith('LIBARTIST-')) {\n` +
`    throw new Error('Invalid TIDAL artist cid');\n` +
`  }\n\n` +
`  tidalHistory.length = 0;\n` +
`  tidalHistory.push({\n` +
`    cid: TIDAL_UI_ROOT_CID,\n` +
`    title: TIDAL_UI_ROOT_TITLE\n` +
`  });\n` +
`  setTidalOpen(true);\n` +
`  await browseTidal(artistCid, title || 'Artist');\n` +
`}\n\n`;
tidal = tidal.replace(tidalAnchor, tidalHelper + tidalAnchor);

for (const [file, content] of [
  [serverPath, server],
  [appPath, app],
  [tidalPath, tidal]
]) {
  const backup = file + '.before-tidal-now-playing-artist-link';
  if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
  fs.writeFileSync(file, content);
}

console.log('Applied guarded TIDAL Now Playing artist link migration');
console.log('Backups created with .before-tidal-now-playing-artist-link suffix');
