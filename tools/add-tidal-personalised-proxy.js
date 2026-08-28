'use strict';

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'server.js');
const source = fs.readFileSync(file, 'utf8');
const marker = "    if (req.method === 'GET' && url.pathname === '/api/tidal/search') {";

if (source.includes("url.pathname === '/api/tidal/personalised'")) {
  console.log('TIDAL personalised proxy routes already present; no change needed.');
  process.exit(0);
}

if (!source.includes(marker)) {
  throw new Error('Expected TIDAL search route marker not found; refusing to edit server.js');
}

const insertion = `    if (req.method === 'GET' && url.pathname === '/api/tidal/personalised') {
      const result = await mediaBackendRequest(
        '/api/tidal/personalised',
        'GET',
        15000
      );

      return sendJson(res, 200, result);
    }

    if (
      req.method === 'GET' &&
      url.pathname === '/api/tidal/personalised/playlist'
    ) {
      const id = String(url.searchParams.get('id') || '').trim();
      if (!/^[a-zA-Z0-9]+$/.test(id)) {
        return sendJson(res, 400, { ok: false, error: 'Invalid playlist id' });
      }

      const result = await mediaBackendRequest(
        '/api/tidal/personalised/playlist?id=' + encodeURIComponent(id),
        'GET',
        40000
      );

      return sendJson(res, 200, result);
    }

`;

fs.writeFileSync(file, source.replace(marker, insertion + marker));
console.log('Added read-only TIDAL personalised proxy routes to server.js');
