'use strict';

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'server.js');
let source = fs.readFileSync(file, 'utf8');

const routeMarker = "url.pathname === '/api/tidal/play-resolved'";
if (source.includes(routeMarker)) {
  console.log('TIDAL resolved playback proxy already present; no change needed.');
  process.exit(0);
}

const marker = `    if (req.method === 'GET' && url.pathname === '/api/tidal/search') {`;
const count = source.split(marker).length - 1;
if (count !== 1) {
  throw new Error('Expected exactly one TIDAL search route marker; found ' + count);
}

const block = `    if (req.method === 'GET' && url.pathname === '/api/tidal/play-resolved') {
      const id = String(url.searchParams.get('id') || '').trim();
      const action = String(url.searchParams.get('action') || '').trim();
      const allowedActions = new Set([
        'play-now',
        'play-next',
        'add-end',
        'play-only'
      ]);

      if (!/^\\d+$/.test(id)) {
        return sendJson(res, 400, { ok: false, error: 'Invalid track id' });
      }

      if (!allowedActions.has(action)) {
        return sendJson(res, 400, { ok: false, error: 'Invalid track action' });
      }

      const result = await mediaBackendRequest(
        '/api/tidal/play-resolved?id=' + encodeURIComponent(id) +
        '&action=' + encodeURIComponent(action),
        'GET',
        60000
      );

      return sendJson(res, 200, result);
    }

`;

source = source.replace(marker, block + marker);
fs.writeFileSync(file, source);
console.log('Added validated /api/tidal/play-resolved proxy to Pi server');
