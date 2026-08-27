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

if (server.includes('tidalAlbumId:')) {
  throw new Error('TIDAL album id already appears to be exposed');
}
if (app.includes('openCurrentTidalAlbum')) {
  throw new Error('Now Playing album link already appears to be applied');
}
if (tidal.includes('openTidalAlbumFromNowPlaying')) {
  throw new Error('TIDAL album navigation helper already appears to be applied');
}

const mediaAnchor = `  const mediaMid = String(media.mid || '').trim();\n`;
if (!server.includes(mediaAnchor)) {
  throw new Error('Expected media MID anchor not found');
}
server = server.replace(
  mediaAnchor,
  `  const mediaMid = String(media.mid || '').trim();\n` +
  `  const mediaAlbumId = String(media.album_id || '').trim();\n`
);

const resumeAnchor = `      album,\n      imageUrl,\n      rememberedAt: Date.now()\n`;
if (!server.includes(resumeAnchor)) {
  throw new Error('Expected TIDAL resume metadata anchor not found');
}
server = server.replace(
  resumeAnchor,
  `      album,\n` +
  `      albumId: mediaAlbumId,\n` +
  `      imageUrl,\n` +
  `      rememberedAt: Date.now()\n`
);

const statusAnchor = `    tidalMid: playbackSource === 'tidal'\n` +
`      ? String(\n` +
`          tidalResumeNeeded && lastTidalResume?.mid\n` +
`            ? lastTidalResume.mid\n` +
`            : mediaMid || ''\n` +
`        )\n` +
`      : '',\n` +
`    playbackSource,\n`;
if (!server.includes(statusAnchor)) {
  throw new Error('Expected current tidalMid status anchor not found');
}
server = server.replace(
  statusAnchor,
  `    tidalMid: playbackSource === 'tidal'\n` +
  `      ? String(\n` +
  `          tidalResumeNeeded && lastTidalResume?.mid\n` +
  `            ? lastTidalResume.mid\n` +
  `            : mediaMid || ''\n` +
  `        )\n` +
  `      : '',\n` +
  `    tidalAlbumId: playbackSource === 'tidal'\n` +
  `      ? String(\n` +
  `          tidalResumeNeeded && lastTidalResume?.albumId\n` +
  `            ? lastTidalResume.albumId\n` +
  `            : mediaAlbumId || ''\n` +
  `        )\n` +
  `      : '',\n` +
  `    playbackSource,\n`
);

const renderAnchor = `  const artistLinkAvailable =\n`;
if (!app.includes(renderAnchor)) {
  throw new Error('Expected artist-link render anchor not found');
}
const albumRender = `  const albumLinkAvailable =\n` +
`    data.playbackSource === 'tidal' &&\n` +
`    Boolean(String(data.tidalAlbumId || '').trim()) &&\n` +
`    Boolean(String(data.album || '').trim());\n` +
`  album.classList.toggle('tidal-album-link', albumLinkAvailable);\n` +
`  if (albumLinkAvailable) {\n` +
`    album.setAttribute('role', 'button');\n` +
`    album.setAttribute('tabindex', '0');\n` +
`    album.setAttribute('aria-label', 'Browse this album in TIDAL');\n` +
`  } else {\n` +
`    album.removeAttribute('role');\n` +
`    album.removeAttribute('tabindex');\n` +
`    album.removeAttribute('aria-label');\n` +
`  }\n\n`;
app = app.replace(renderAnchor, albumRender + renderAnchor);

const handlerAnchor = `async function openCurrentTidalArtist() {\n`;
if (!app.includes(handlerAnchor)) {
  throw new Error('Expected current artist handler anchor not found');
}
const albumHandler = `async function openCurrentTidalAlbum() {\n` +
`  const albumId = String(latest?.tidalAlbumId || '').trim();\n` +
`  const albumName = String(latest?.album || '').trim();\n` +
`  if (latest?.playbackSource !== 'tidal' || !albumId || !albumName) return;\n\n` +
`  album.classList.add('loading');\n` +
`  try {\n` +
`    if (typeof openTidalAlbumFromNowPlaying !== 'function') {\n` +
`      throw new Error('TIDAL album browser unavailable');\n` +
`    }\n` +
`    await openTidalAlbumFromNowPlaying(\n` +
`      'LIBALBUM-' + albumId,\n` +
`      albumName\n` +
`    );\n` +
`  } catch (error) {\n` +
`    console.warn('Could not open current TIDAL album:', error);\n` +
`  } finally {\n` +
`    album.classList.remove('loading');\n` +
`  }\n` +
`}\n\n` +
`album?.addEventListener('click', openCurrentTidalAlbum);\n` +
`album?.addEventListener('keydown', event => {\n` +
`  if (event.key !== 'Enter' && event.key !== ' ') return;\n` +
`  if (!album.classList.contains('tidal-album-link')) return;\n` +
`  event.preventDefault();\n` +
`  openCurrentTidalAlbum();\n` +
`});\n\n`;
app = app.replace(handlerAnchor, albumHandler + handlerAnchor);

const tidalAnchor = `async function openTidalArtistFromNowPlaying(cid, title) {\n`;
if (!tidal.includes(tidalAnchor)) {
  throw new Error('Expected current Now Playing artist helper anchor not found');
}
const tidalHelper = `async function openTidalAlbumFromNowPlaying(cid, title) {\n` +
`  const albumCid = String(cid || '').trim();\n` +
`  if (!/^LIBALBUM-\\d+$/.test(albumCid)) {\n` +
`    throw new Error('Invalid TIDAL album cid');\n` +
`  }\n\n` +
`  tidalHistory.length = 0;\n` +
`  tidalHistory.push({\n` +
`    cid: TIDAL_UI_ROOT_CID,\n` +
`    title: TIDAL_UI_ROOT_TITLE\n` +
`  });\n` +
`  setTidalOpen(true);\n` +
`  tidalScreen.classList.add('browsing');\n` +
`  setTidalKeyboardOpen(false);\n` +
`  tidalSearchInput.blur();\n` +
`  setTidalAlphabetVisible(false);\n` +
`  await loadTidalAlbumTracks(albumCid, title || 'Album');\n` +
`}\n\n`;
tidal = tidal.replace(tidalAnchor, tidalHelper + tidalAnchor);

for (const [file, content] of [
  [serverPath, server],
  [appPath, app],
  [tidalPath, tidal]
]) {
  const backup = file + '.before-tidal-now-playing-album-link';
  if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
  fs.writeFileSync(file, content);
}

console.log('Applied guarded TIDAL Now Playing album link migration');
console.log('Backups created with .before-tidal-now-playing-album-link suffix');
