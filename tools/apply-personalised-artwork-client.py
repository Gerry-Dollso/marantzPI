#!/usr/bin/env python3
from pathlib import Path

root = Path(__file__).resolve().parents[1]
server_path = root / 'server.js'
ui_path = root / 'public' / 'tidal-ui.js'
server = server_path.read_text()
ui = ui_path.read_text()

server_anchor = """    if (
      req.method === 'GET' &&
      url.pathname === '/api/tidal/personalised/playlist'
    ) {
"""
server_insert = """    if (
      req.method === 'GET' &&
      url.pathname === '/api/tidal/personalised/artwork'
    ) {
      const id = String(url.searchParams.get('id') || '').trim();
      if (!/^[a-zA-Z0-9]+$/.test(id)) {
        return sendJson(res, 400, { ok: false, error: 'Invalid playlist id' });
      }

      const result = await mediaBackendRequest(
        '/api/tidal/personalised/artwork?id=' + encodeURIComponent(id),
        'GET',
        15000
      );

      return sendJson(res, 200, result);
    }

""" + server_anchor

start_marker = 'function setTidalPersonalisedArtwork(button, tracks) {'
end_marker = 'async function enrichTidalPersonalisedArtwork(entries, concurrency = 1) {'
new_ui = """function setTidalPersonalisedArtwork(button, urls) {
  const artwork = button?.querySelector('.tidal-personalised-artwork');
  if (!artwork) return;

  const uniqueUrls = [];
  for (const value of urls || []) {
    const url = String(value || '').trim();
    if (!url || uniqueUrls.includes(url)) continue;
    uniqueUrls.push(url);
    if (uniqueUrls.length === 4) break;
  }

  if (!uniqueUrls.length) return;

  artwork.replaceChildren();
  artwork.classList.toggle('single', uniqueUrls.length === 1);

  uniqueUrls.forEach(url => {
    const image = document.createElement('img');
    image.src = url;
    image.alt = '';
    image.loading = 'lazy';
    artwork.appendChild(image);
  });
}

async function loadTidalPersonalisedArtwork(playlist, button) {
  const playlistId = String(playlist?.id || '').trim();
  if (!playlistId || !button?.isConnected) return;

  try {
    const response = await fetch(
      '/api/tidal/personalised/artwork?id=' + encodeURIComponent(playlistId),
      { cache: 'no-store' }
    );
    const result = await response.json();
    if (!response.ok || result.ok === false || !button.isConnected) return;

    setTidalPersonalisedArtwork(
      button,
      Array.isArray(result.artwork) ? result.artwork : []
    );
  } catch {
    // Artwork enrichment is optional; keep the card usable without it.
  }
}

""" + end_marker

if server.count(server_anchor) != 1:
    raise SystemExit(f'Expected one server anchor, found {server.count(server_anchor)}')
if '/api/tidal/personalised/artwork' in server:
    raise SystemExit('Server artwork proxy already exists')
if ui.count(start_marker) != 1:
    raise SystemExit(f'Expected one artwork function start, found {ui.count(start_marker)}')
if ui.count(end_marker) != 1:
    raise SystemExit(f'Expected one artwork enrichment marker, found {ui.count(end_marker)}')

start = ui.index(start_marker)
end = ui.index(end_marker, start)
old_block = ui[start:end]
required_diagnostics = [
    "artwork.textContent = 'NO ART';",
    "image.alt = 'ERR';",
    "'/api/tidal/personalised/playlist?id='",
    "artwork.textContent = 'FETCH ERR';"
]
missing = [marker for marker in required_diagnostics if marker not in old_block]
if missing:
    raise SystemExit('Diagnostic UI block did not match expected state: ' + ', '.join(missing))

server = server.replace(server_anchor, server_insert, 1)
ui = ui[:start] + new_ui + ui[end + len(end_marker):]
server_path.write_text(server)
ui_path.write_text(ui)
print('Applied personalised artwork client migration')
