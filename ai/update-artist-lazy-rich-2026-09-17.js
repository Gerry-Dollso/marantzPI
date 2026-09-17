'use strict';

const fs = require('fs');

function replaceExact(path, before, after) {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes(before)) throw new Error(`${path}: expected source block not found`);
  fs.writeFileSync(path, source.replace(before, after));
}

replaceExact(
  'server.js',
  "      if (req.method === 'GET' && url.pathname === '/api/tidal/artist-details') {\n      const id = String(url.searchParams.get('id') || '').trim();\n      if (/^\\d+$/.test(id) === false) return sendJson(res, 400, { ok: false, error: 'Invalid artist id' });\n      const result = await mediaBackendRequest('/api/tidal/artist-details?id=' + encodeURIComponent(id), 'GET', 40000);\n      return sendJson(res, 200, result);\n    }\n",
  "      if (req.method === 'GET' && url.pathname === '/api/tidal/artist-details') {\n      const id = String(url.searchParams.get('id') || '').trim();\n      if (/^\\d+$/.test(id) === false) return sendJson(res, 400, { ok: false, error: 'Invalid artist id' });\n      const result = await mediaBackendRequest('/api/tidal/artist-details?id=' + encodeURIComponent(id), 'GET', 40000);\n      return sendJson(res, 200, result);\n    }\n\n    if (req.method === 'GET' && url.pathname === '/api/tidal/artist-top-tracks') {\n      const id = String(url.searchParams.get('id') || '').trim();\n      if (/^\\d+$/.test(id) === false) return sendJson(res, 400, { ok: false, error: 'Invalid artist id' });\n      const result = await mediaBackendRequest('/api/tidal/artist-top-tracks?id=' + encodeURIComponent(id), 'GET', 40000);\n      return sendJson(res, 200, result);\n    }\n\n    if (req.method === 'GET' && url.pathname === '/api/tidal/artist-biography') {\n      const id = String(url.searchParams.get('id') || '').trim();\n      if (/^\\d+$/.test(id) === false) return sendJson(res, 400, { ok: false, error: 'Invalid artist id' });\n      const result = await mediaBackendRequest('/api/tidal/artist-biography?id=' + encodeURIComponent(id), 'GET', 40000);\n      return sendJson(res, 200, result);\n    }\n"
);

replaceExact(
  'public/tidal-artist-ui.js',
  "    renderTidalArtistPage(result);\n  } catch (error) {",
  "    renderTidalArtistPage(result);\n    const richRequests = [\n      fetch('/api/tidal/artist-top-tracks?id=' + encodeURIComponent(artistId), { cache: 'no-store' })\n        .then(async response => {\n          const rich = await response.json();\n          if (!response.ok || rich.ok === false) throw new Error(rich.error || 'Could not load Artist Top Tracks');\n          if (requestToken !== tidalArtistRequestToken || String(tidalArtistCurrentDetails?.artist?.id || '') !== String(artistId)) return;\n          tidalArtistCurrentDetails = { ...tidalArtistCurrentDetails, topTracks: Array.isArray(rich.tracks) ? rich.tracks : [] };\n          if (!tidalArtistBiographyOpen && !tidalArtistCategoryOpen) renderTidalArtistPage(tidalArtistCurrentDetails);\n        }),\n      fetch('/api/tidal/artist-biography?id=' + encodeURIComponent(artistId), { cache: 'no-store' })\n        .then(async response => {\n          const rich = await response.json();\n          if (!response.ok || rich.ok === false) throw new Error(rich.error || 'Could not load Artist biography');\n          if (requestToken !== tidalArtistRequestToken || String(tidalArtistCurrentDetails?.artist?.id || '') !== String(artistId)) return;\n          tidalArtistCurrentDetails = { ...tidalArtistCurrentDetails, biography: rich.biography || null };\n          if (!tidalArtistBiographyOpen && !tidalArtistCategoryOpen) renderTidalArtistPage(tidalArtistCurrentDetails);\n        })\n    ];\n    Promise.allSettled(richRequests).then(results => {\n      results.forEach(outcome => {\n        if (outcome.status === 'rejected') console.warn('TIDAL Artist rich data load failed:', outcome.reason?.message || outcome.reason);\n      });\n    });\n  } catch (error) {"
);

replaceExact('public/index.html', '/tidal-artist-ui.js?v=2', '/tidal-artist-ui.js?v=3');

console.log('Added guarded lazy Artist Top Tracks and biography loading');
