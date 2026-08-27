'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const serverPath = path.join(root, 'server.js');
const uiPath = path.join(root, 'public', 'tidal-ui.js');

let server = fs.readFileSync(serverPath, 'utf8');
let ui = fs.readFileSync(uiPath, 'utf8');

if (server.includes("url.pathname === '/api/tidal/tracks/play-all'")) {
  throw new Error('Favourite Tracks proxy already appears to be applied');
}

const proxyAnchor = `        if (req.method === 'GET' && url.pathname === '/api/tidal/playlist/play') {\n`;
const proxyIndex = server.indexOf(proxyAnchor);
if (proxyIndex < 0) {
  throw new Error('Expected TIDAL playlist play proxy anchor not found');
}

const proxy = `        if (req.method === 'GET' && url.pathname === '/api/tidal/tracks/play-all') {\n` +
`          const shuffle = url.searchParams.get('shuffle') || '0';\n\n` +
`          const result = await mediaBackendRequest(\n` +
`            '/api/tidal/tracks/play-all?shuffle=' + encodeURIComponent(shuffle),\n` +
`            'GET',\n` +
`            180000\n` +
`          );\n\n` +
`          return sendJson(res, 200, result);\n` +
`        }\n\n`;
server = server.slice(0, proxyIndex) + proxy + server.slice(proxyIndex);

const trackListOld = `  return (\n    cid.startsWith('LIBPLAYLIST-') ||\n    cid.startsWith('LIBARTIST-Tracks-')\n  );\n`;
const trackListNew = `  return (\n    cid === 'My Music-Tracks' ||\n    cid.startsWith('LIBPLAYLIST-') ||\n    cid.startsWith('LIBARTIST-Tracks-')\n  );\n`;
if (!ui.includes(trackListOld)) {
  throw new Error('Expected track-list classifier anchor not found');
}
ui = ui.replace(trackListOld, trackListNew);

const playlistCidOld = `  if (String(cid).startsWith('LIBPLAYLIST-')) {\n    tidalCurrentPlaylistCid = cid;\n  }\n`;
const playlistCidNew = `  if (\n    cid === 'My Music-Tracks' ||\n    String(cid).startsWith('LIBPLAYLIST-')\n  ) {\n    tidalCurrentPlaylistCid = cid;\n  }\n`;
if (!ui.includes(playlistCidOld)) {
  throw new Error('Expected current playlist CID anchor not found');
}
ui = ui.replace(playlistCidOld, playlistCidNew);

const pagedBranch = `  if (cid === 'My Music-Tracks') {\n    tidalScreen.classList.add(\"browsing\");\n    setTidalKeyboardOpen(false);\n    tidalSearchInput.blur();\n    await loadTidalTrackPage(0);\n    return;\n  }\n\n`;
if (!ui.includes(pagedBranch)) {
  throw new Error('Expected paged Favourite Tracks branch not found');
}
ui = ui.replace(pagedBranch, '');

const rendererOld = `    } else if (\n      String(cid).startsWith('LIBPLAYLIST-') ||\n      String(cid).startsWith('LIBARTIST-Tracks-')\n    ) {\n`;
const rendererNew = `    } else if (\n      cid === 'My Music-Tracks' ||\n      String(cid).startsWith('LIBPLAYLIST-') ||\n      String(cid).startsWith('LIBARTIST-Tracks-')\n    ) {\n`;
if (!ui.includes(rendererOld)) {
  throw new Error('Expected playlist-style renderer anchor not found');
}
ui = ui.replace(rendererOld, rendererNew);

const playUrlOld = `    let url =\n      '/api/tidal/playlist/play?cid=' +\n      encodeURIComponent(cid) +\n      '&shuffle=' + (shuffle ? '1' : '0');\n\n    if (mid) {\n      url += '&mid=' + encodeURIComponent(mid);\n    }\n`;
const playUrlNew = `    let url;\n\n    if (cid === 'My Music-Tracks' && !mid) {\n      url =\n        '/api/tidal/tracks/play-all?shuffle=' +\n        (shuffle ? '1' : '0');\n    } else {\n      url =\n        '/api/tidal/playlist/play?cid=' +\n        encodeURIComponent(cid) +\n        '&shuffle=' + (shuffle ? '1' : '0');\n\n      if (mid) {\n        url += '&mid=' + encodeURIComponent(mid);\n      }\n    }\n`;
if (!ui.includes(playUrlOld)) {
  throw new Error('Expected playlist playback URL anchor not found');
}
ui = ui.replace(playUrlOld, playUrlNew);

const backups = [
  [serverPath, serverPath + '.before-tidal-full-favourite-tracks'],
  [uiPath, uiPath + '.before-tidal-full-favourite-tracks']
];
for (const [source, backup] of backups) {
  if (!fs.existsSync(backup)) fs.copyFileSync(source, backup);
}

fs.writeFileSync(serverPath, server);
fs.writeFileSync(uiPath, ui);

console.log('Applied guarded full Favourite Tracks UI migration');
console.log('Backups created with .before-tidal-full-favourite-tracks suffix');
