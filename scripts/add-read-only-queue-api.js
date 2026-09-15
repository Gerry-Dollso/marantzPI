'use strict';

const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'server.js');
const original = fs.readFileSync(target, 'utf8');

const routeAnchor = "    if (req.method === 'GET' && url.pathname === '/api/status') {\n      return sendJson(res, 200, await getStatus());\n    }";

if (!original.includes(routeAnchor)) {
  throw new Error('Expected /api/status route anchor not found; refusing to edit server.js');
}

if (original.includes("url.pathname === '/api/queue'")) {
  throw new Error('/api/queue already exists; refusing to edit server.js');
}

const queueRoute = `    if (req.method === 'GET' && url.pathname === '/api/queue') {
      const pid = encodeURIComponent(config.playerId);
      const [queue, mediaResponse] = await Promise.all([
        getHeosQueueItems(),
        heos(\`player/get_now_playing_media?pid=\${pid}\`)
      ]);
      const media =
        mediaResponse?.heos?.result === 'success'
          ? mediaResponse.payload || {}
          : {};
      const currentQid = String(media.qid || '');
      const currentMid = String(media.mid || '');
      const items = queue.map(item => {
        const qid = String(item?.qid || '');
        const mid = String(item?.mid || '');
        return {
          qid,
          mid,
          albumId: String(item?.album_id || ''),
          song: String(item?.song || ''),
          artist: String(item?.artist || ''),
          album: String(item?.album || ''),
          imageUrl: String(item?.image_url || ''),
          current:
            Boolean(qid) && qid === currentQid &&
            (!currentMid || !mid || mid === currentMid)
        };
      });

      return sendJson(res, 200, {
        count: items.length,
        currentQid,
        currentMid,
        items
      });
    }

${routeAnchor}`;

const updated = original.replace(routeAnchor, queueRoute);

if (updated === original) {
  throw new Error('No change produced; refusing to write server.js');
}

fs.writeFileSync(target, updated);
console.log('Added read-only GET /api/queue route to server.js');
