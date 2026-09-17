'use strict';

const fs = require('fs');

function replaceExact(path, before, after) {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes(before)) throw new Error(`Guard failed in ${path}`);
  if (source.indexOf(before) !== source.lastIndexOf(before)) throw new Error(`Guard matched more than once in ${path}`);
  fs.writeFileSync(path, source.replace(before, after));
}

replaceExact(
  'server.js',
  `    if (req.method === 'GET' && url.pathname === '/api/tidal/artist-biography') {\n`,
  `    if (req.method === 'GET' && url.pathname === '/api/tidal/artist-releases') {\n      const id = String(url.searchParams.get('id') || '').trim();\n      const category = String(url.searchParams.get('category') || '').trim();\n      if (/^\\d+$/.test(id) === false) return sendJson(res, 400, { ok: false, error: 'Invalid artist id' });\n      if (!['albums', 'singles', 'appears'].includes(category)) return sendJson(res, 400, { ok: false, error: 'Invalid artist category' });\n      const result = await mediaBackendRequest('/api/tidal/artist-releases?id=' + encodeURIComponent(id) + '&category=' + encodeURIComponent(category), 'GET', 40000);\n      return sendJson(res, 200, result);\n    }\n\n    if (req.method === 'GET' && url.pathname === '/api/tidal/artist-biography') {\n`
);

replaceExact(
  'public/tidal-artist-ui.js',
  `  const topTracks = tidalArtistSection('TOP TRACKS', details.topTracks, track => tidalArtistTopTrackButton(track, artistId), 'tidal-artist-top-tracks', 'tracks');\n`,
  `  const topTracks = tidalArtistSection('TOP TRACKS', details.topTracks, track => tidalArtistTopTrackButton(track, artistId), 'tidal-artist-top-tracks', 'tracks', 4);\n`
);

replaceExact(
  'public/tidal-artist-ui.js',
  `  const category = event.target.closest('[data-artist-category]');\n  if (category) {\n    event.preventDefault(); event.stopImmediatePropagation();\n    if (tidalArtistCurrentDetails) renderTidalArtistCategory(tidalArtistCurrentDetails, category.dataset.artistCategory);\n    return;\n  }\n`,
  `  const category = event.target.closest('[data-artist-category]');\n  if (category) {\n    event.preventDefault(); event.stopImmediatePropagation();\n    const categoryName = String(category.dataset.artistCategory || '');\n    const details = tidalArtistCurrentDetails;\n    if (!details) return;\n    if (!['albums', 'singles', 'appears'].includes(categoryName)) {\n      renderTidalArtistCategory(details, categoryName);\n      return;\n    }\n    const artistId = String(details.artist?.id || '');\n    const requestToken = tidalArtistRequestToken;\n    tidalArtistBiographyOpen = false;\n    tidalArtistCategoryOpen = true;\n    tidalResults.replaceChildren();\n    const loading = document.createElement('div');\n    loading.className = 'tidal-loading';\n    loading.textContent = 'Loading…';\n    tidalResults.appendChild(loading);\n    fetch('/api/tidal/artist-releases?id=' + encodeURIComponent(artistId) + '&category=' + encodeURIComponent(categoryName), { cache: 'no-store' })\n      .then(async response => {\n        const rich = await response.json();\n        if (!response.ok || rich.ok === false) throw new Error(rich.error || 'Could not load Artist releases');\n        if (requestToken !== tidalArtistRequestToken || String(tidalArtistCurrentDetails?.artist?.id || '') !== artistId) return;\n        const releases = Array.isArray(rich.releases) ? rich.releases : [];\n        const key = categoryName === 'albums' ? 'albums' : categoryName === 'singles' ? 'singles' : 'appearsOn';\n        tidalArtistCurrentDetails = { ...tidalArtistCurrentDetails, [key]: releases };\n        renderTidalArtistCategory(tidalArtistCurrentDetails, categoryName);\n      })\n      .catch(error => {\n        if (requestToken !== tidalArtistRequestToken || String(tidalArtistCurrentDetails?.artist?.id || '') !== artistId) return;\n        tidalResults.replaceChildren();\n        const failed = document.createElement('div');\n        failed.className = 'tidal-loading';\n        failed.textContent = error.message || 'Could not load Artist releases';\n        tidalResults.appendChild(failed);\n      });\n    return;\n  }\n`
);

replaceExact(
  'public/index.html',
  `  <script src="/tidal-artist-ui.js?v=3"></script>\n`,
  `  <script src="/tidal-artist-ui.js?v=4"></script>\n`
);

console.log('Added guarded full Artist category loading');
