'use strict';

const crypto = require('crypto');
const fs = require('fs');

function blobSha(text) {
  const body = Buffer.from(text, 'utf8');
  const header = Buffer.from(`blob ${body.length}\0`, 'utf8');
  return crypto.createHash('sha1').update(Buffer.concat([header, body])).digest('hex');
}

function edit(file, expected, transform) {
  const before = fs.readFileSync(file, 'utf8');
  const actual = blobSha(before);
  if (actual !== expected) throw new Error(`Refusing to edit ${file}: expected ${expected}, found ${actual}`);
  const after = transform(before);
  if (after === before) throw new Error(`No change made to ${file}`);
  fs.writeFileSync(file, after);
  console.log(`${file}: ${blobSha(after)}`);
}

function replaceExactly(source, oldText, newText, label) {
  const first = source.indexOf(oldText);
  if (first < 0) throw new Error(`Could not locate ${label}`);
  if (source.indexOf(oldText, first + oldText.length) >= 0) throw new Error(`${label} occurred more than once`);
  return source.slice(0, first) + newText + source.slice(first + oldText.length);
}

edit('server.js', 'b64be048b6522b1cb46d236b9d4d41aae13b0463', source => {
  const anchor = `      if (req.method === 'GET' && url.pathname === '/api/tidal/favourite-tracks') {\n`;
  const route = `      if (req.method === 'GET' && url.pathname === '/api/tidal/favourite-playlists') {\n        const result = await mediaBackendRequest(\n          '/api/tidal/favourite-playlists',\n          'GET',\n          40000\n        );\n\n        return sendJson(res, 200, result);\n      }\n\n`;
  return replaceExactly(source, anchor, route + anchor, 'Favourite Tracks proxy anchor');
});

edit('public/tidal-ui.js', '875b08d0e5e837d06dc000327d00a232f99437ad', source => {
  const anchor = `async function loadTidalArtists() {\n`;
  const functions = `async function loadTidalOrdinaryPlaylists(cid, title) {\n  tidalShowAlbumArtists = false;\n  tidalStatus.textContent = 'Loading ' + (title || 'Playlists') + '…';\n  tidalResults.replaceChildren();\n  setTidalAlphabetVisible(false);\n\n  try {\n    const response = await fetch('/api/tidal/favourite-playlists', { cache: 'no-store' });\n    const result = await response.json();\n    if (!response.ok || result.ok === false) {\n      throw new Error(result.error || 'Could not load playlists');\n    }\n\n    if (cid === 'My Music-Playlists') {\n      renderBrowseItems([\n        { name: 'Created by me', cid: 'My Music-Playlists-Created by me', type: 'container', container: true, playable: false },\n        { name: 'Favorited', cid: 'My Music-Playlists-Favorited', type: 'container', container: true, playable: false }\n      ], title || 'Playlists');\n      tidalResults.scrollTop = 0;\n      return;\n    }\n\n    const playlists = cid === 'My Music-Playlists-Created by me'\n      ? result.createdByMe\n      : result.favorited;\n    const items = (Array.isArray(playlists) ? playlists : []).map(playlist => ({\n      name: playlist.name,\n      cid: playlist.cid,\n      type: 'playlist',\n      container: true,\n      playable: true,\n      imageUrl: playlist.artwork\n    }));\n    renderBrowseItems(items, title);\n    tidalResults.scrollTop = 0;\n  } catch (error) {\n    tidalStatus.textContent = error.message;\n  }\n}\n\n`;
  source = replaceExactly(source, anchor, functions + anchor, 'Artists loader anchor');

  const browseAnchor = `  if (cid === 'My Music-Albums') {\n`;
  const playlistBranch = `  if (\n    cid === 'My Music-Playlists' ||\n    cid === 'My Music-Playlists-Created by me' ||\n    cid === 'My Music-Playlists-Favorited'\n  ) {\n    tidalScreen.classList.add("browsing");\n    setTidalKeyboardOpen(false);\n    tidalSearchInput.blur();\n    await loadTidalOrdinaryPlaylists(cid, title);\n    return;\n  }\n\n`;
  return replaceExactly(source, browseAnchor, playlistBranch + browseAnchor, 'Albums browse anchor');
});

console.log('Added Pi proxy and official ordinary Playlists list UI while preserving LIBPLAYLIST drill-in/playback.');
console.log('No playlist playback/action code, personalised My Mix code, AVR control, or backend files were modified.');
