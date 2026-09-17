'use strict';

const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'server.js');
let source = fs.readFileSync(target, 'utf8');

const helperAnchor = "\nasync function handleAutomaticSmartSelect(receiver) {";
const routeAnchor = "    if (req.method === 'GET' && url.pathname === '/api/instance-id') {\n      return sendJson(res, 200, { instanceId: serverInstanceId });\n    }\n";

if (!source.includes(helperAnchor)) throw new Error('mediaBackendRequest helper anchor not found');
if (!source.includes(routeAnchor)) throw new Error('server route anchor not found');
if (source.includes('function proxyMediaBackendBinary(') || source.includes("url.pathname.startsWith('/api/tidal/artwork/')")) {
  throw new Error('TIDAL artwork proxy already appears to be installed');
}

const helper = `
function proxyMediaBackendBinary(req, res, pathname, timeoutMs = 15000) {
  const request = http.request(
    {
      host: config.mediaBackendHost || '192.168.50.145',
      port: Number(config.mediaBackendPort) || 3100,
      path: pathname,
      method: req.method,
      timeout: timeoutMs
    },
    response => {
      const headers = {};
      for (const name of ['content-type', 'content-length', 'cache-control', 'etag', 'last-modified']) {
        const value = response.headers[name];
        if (value !== undefined) headers[name] = value;
      }
      res.writeHead(response.statusCode || 502, headers);
      response.pipe(res);
    }
  );

  request.on('timeout', () => request.destroy(new Error('Media backend artwork timeout')));
  request.on('error', error => {
    if (res.headersSent) {
      res.destroy(error);
      return;
    }
    sendJson(res, 502, { ok: false, error: error.message });
  });
  request.end();
}
`;

const route = `

    if (
      (req.method === 'GET' || req.method === 'HEAD') &&
      url.pathname.startsWith('/api/tidal/artwork/')
    ) {
      return proxyMediaBackendBinary(req, res, url.pathname + url.search);
    }`;

source = source.replace(helperAnchor, helper + helperAnchor);
source = source.replace(routeAnchor, routeAnchor + route);
fs.writeFileSync(target, source, 'utf8');
console.log('Installed guarded binary TIDAL artwork proxy in server.js');
