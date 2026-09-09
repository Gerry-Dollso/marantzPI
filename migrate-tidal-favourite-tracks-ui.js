'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const targets = {
  'server.js': '5910d15c56e942c701a96abdab4239aa25f44414',
  'public/tidal-ui.js': '330416d4a63c80f78e40a4c71e2c10877e066fff'
};

function gitBlobSha(content) {
  const body = Buffer.from(content, 'utf8');
  const header = Buffer.from(`blob ${body.length}\0`, 'utf8');
  return crypto.createHash('sha1').update(header).update(body).digest('hex');
}

function replaceExactlyOnce(content, before, after, label) {
  const first = content.indexOf(before);
  const last = content.lastIndexOf(before);
  if (first === -1) {
    throw new Error(`${label}: expected source block was not found`);
  }
  if (first !== last) {
    throw new Error(`${label}: expected source block is not unique`);
  }
  return content.slice(0, first) + after + content.slice(first + before.length);
}

const root = process.cwd();
const original = {};

for (const [relativePath, expectedSha] of Object.entries(targets)) {
  const fullPath = path.join(root, relativePath);
  const content = fs.readFileSync(fullPath, 'utf8');
  const actualSha = gitBlobSha(content);
  if (actualSha !== expectedSha) {
    throw new Error(
      `${relativePath}: guard failed; expected ${expectedSha}, found ${actualSha}`
    );
  }
  original[relativePath] = content;
}

let server = original['server.js'];
let ui = original['public/tidal-ui.js'];

server = replaceExactlyOnce(
  server,
  `    }\n\n  if (req.method === 'GET' && url.pathname === '/api/tidal/artist/albums') {`,
  `    }\n\n      if (req.method === 'GET' && url.pathname === '/api/tidal/favourite-tracks') {\n        const result = await mediaBackendRequest(\n          '/api/tidal/favourite-tracks',\n          'GET',\n          40000\n        );\n\n        return sendJson(res, 200, result);\n      }\n\n  if (req.method === 'GET' && url.pathname === '/api/tidal/artist/albums') {`,
  'server.js Favourite Tracks proxy insertion'
);

ui = replaceExactlyOnce(
  ui,
  `  if (item.type === 'personalised-song' && item.album) {`,
  `  if ((item.type === 'personalised-song' || item.showAlbum) && item.album) {`,
  'tidal-ui.js album display condition'
);

ui = replaceExactlyOnce(
  ui,
  `async function loadTidalTrackPage(page = 0) {\n  tidalShowAlbumArtists = true;\n  tidalTrackPage = Math.max(0, page);\n\n  const start = tidalTrackPage * tidalTrackPageSize;\n\n  tidalStatus.textContent = 'Loading Tracks…';\n  tidalResults.replaceChildren();\n  setTidalAlphabetVisible(false);\n\n  try {\n    const response = await fetch(\n      '/api/tidal/browse?cid=' +\n      encodeURIComponent('My Music-Tracks') +\n      '&start=' + start +\n      '&limit=' + tidalTrackPageSize,\n      { cache: 'no-store' }\n    );\n\n    const result = await response.json();\n\n    if (!response.ok || result.ok === false) {\n      throw new Error(result.error || 'Could not load tracks');\n    }\n\n    const items = Array.isArray(result.items)\n      ? result.items\n      : [];\n\n\n    tidalTrackTotal = Number(result.count) || items.length;\n\n    tidalResults.replaceChildren();\n\n    items.forEach(item => {\n      tidalResults.appendChild(makeBrowseButton(item));\n    });\n\n    renderTrackPager();\n\n    const totalPages = Math.max(\n      1,\n      Math.ceil(tidalTrackTotal / tidalTrackPageSize)\n    );\n\n    tidalStatus.textContent =\n      \`Tracks — \${tidalTrackTotal} items — Page \${tidalTrackPage + 1} of \${totalPages}\`;\n\n    tidalResults.scrollTop = 0;\n  } catch (error) {\n    tidalStatus.textContent = error.message;\n  }\n}`,
  `async function loadTidalTrackPage(page = 0) {\n  tidalShowAlbumArtists = true;\n  tidalTrackPage = 0;\n\n  tidalStatus.textContent = 'Loading Tracks…';\n  tidalResults.replaceChildren();\n  setTidalAlphabetVisible(false);\n\n  try {\n    const response = await fetch(\n      '/api/tidal/favourite-tracks',\n      { cache: 'no-store' }\n    );\n\n    const result = await response.json();\n\n    if (!response.ok || result.ok === false) {\n      throw new Error(result.error || 'Could not load tracks');\n    }\n\n    const tracks = Array.isArray(result.tracks)\n      ? result.tracks\n      : [];\n\n    const items = tracks.map(track => ({\n      cid: 'My Music-Tracks',\n      type: 'song',\n      name: track.title,\n      artist: track.artist,\n      album: track.album,\n      imageUrl: track.artwork,\n      mid: String(track.id || ''),\n      albumId: String(track.albumId || ''),\n      container: false,\n      playable: true,\n      showAlbum: true\n    }));\n\n    tidalTrackTotal = items.length;\n    renderPlaylistItems(items, 'Tracks');\n    tidalResults.scrollTop = 0;\n  } catch (error) {\n    tidalStatus.textContent = error.message;\n  }\n}`,
  'tidal-ui.js Favourite Tracks loader replacement'
);

ui = replaceExactlyOnce(
  ui,
  `  tidalScreen.classList.add("browsing");\n  setTidalKeyboardOpen(false);\n  tidalSearchInput.blur();\n\n  tidalStatus.textContent = \`Loading \${title || 'TIDAL'}…\`;`,
  `  tidalScreen.classList.add("browsing");\n  setTidalKeyboardOpen(false);\n  tidalSearchInput.blur();\n\n  if (cid === 'My Music-Tracks') {\n    await loadTidalTrackPage(0);\n    return;\n  }\n\n  tidalStatus.textContent = \`Loading \${title || 'TIDAL'}…\`;`,
  'tidal-ui.js My Music-Tracks browse routing'
);

const outputs = {
  'server.js': server,
  'public/tidal-ui.js': ui
};

for (const [relativePath, content] of Object.entries(outputs)) {
  const fullPath = path.join(root, relativePath);
  const tempPath = `${fullPath}.favourite-tracks-migration.tmp`;
  fs.writeFileSync(tempPath, content, 'utf8');
  fs.renameSync(tempPath, fullPath);
}

for (const [relativePath, content] of Object.entries(outputs)) {
  console.log(`${relativePath}: ${gitBlobSha(content)}`);
}
console.log('Favourite Tracks UI migration applied.');
