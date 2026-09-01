#!/usr/bin/env python3
from pathlib import Path

root = Path(__file__).resolve().parents[1]
server_path = root / 'server.js'
ui_path = root / 'public' / 'tidal-ui.js'
server = server_path.read_text()
ui = ui_path.read_text()

server_anchor = """    if (\n      req.method === 'GET' &&\n      url.pathname === '/api/tidal/personalised/playlist'\n    ) {\n"""
server_insert = """    if (\n      req.method === 'GET' &&\n      url.pathname === '/api/tidal/personalised/artwork'\n    ) {\n      const id = String(url.searchParams.get('id') || '').trim();\n      if (!/^[a-zA-Z0-9]+$/.test(id)) {\n        return sendJson(res, 400, { ok: false, error: 'Invalid playlist id' });\n      }\n\n      const result = await mediaBackendRequest(\n        '/api/tidal/personalised/artwork?id=' + encodeURIComponent(id),\n        'GET',\n        15000\n      );\n\n      return sendJson(res, 200, result);\n    }\n\n""" + server_anchor

old_ui = """function setTidalPersonalisedArtwork(button, tracks) {\n  const artwork = button?.querySelector('.tidal-personalised-artwork');\n  if (!artwork) return;\n\n  const urls = [];\n  for (const track of tracks || []) {\n    const url = String(track?.artwork || '').trim();\n    if (!url || urls.includes(url)) continue;\n    urls.push(url);\n    if (urls.length === 4) break;\n  }\n\n  if (!urls.length) {\n    artwork.textContent = 'NO ART';\n    return;\n  }\n\n  artwork.replaceChildren();\n  artwork.classList.toggle('single', urls.length === 1);\n\n  urls.forEach(url => {\n    const image = document.createElement('img');\n    image.src = url;\n    image.alt = '';\n    image.addEventListener('error', () => {\n      image.removeAttribute('src');\n      image.alt = 'ERR';\n      image.style.background = '#8b0000';\n    });\n    artwork.appendChild(image);\n  });\n}\n\nasync function loadTidalPersonalisedArtwork(playlist, button) {\n  const playlistId = String(playlist?.id || '').trim();\n  if (!playlistId || !button?.isConnected) return;\n\n  try {\n    const response = await fetch(\n      '/api/tidal/personalised/playlist?id=' + encodeURIComponent(playlistId),\n      { cache: 'no-store' }\n    );\n    const result = await response.json();\n    if (!response.ok) {\n      const artwork = button?.querySelector('.tidal-personalised-artwork');\n      if (artwork) artwork.textContent = 'HTTP ' + response.status + ': ' + String(result.error || 'unknown');\n      return;\n    }\n    if (result.ok === false) {\n      const artwork = button?.querySelector('.tidal-personalised-artwork');\n      if (artwork) artwork.textContent = 'API ERR';\n      return;\n    }\n    if (!button.isConnected) return;\n    setTidalPersonalisedArtwork(\n      button,\n      Array.isArray(result.tracks) ? result.tracks : []\n    );\n  } catch {\n    const artwork = button?.querySelector('.tidal-personalised-artwork');\n    if (artwork) artwork.textContent = 'FETCH ERR';\n  }\n}\n\nasync function enrichTidalPersonalisedArtwork(entries, concurrency = 1) {\n"""
new_ui = """function setTidalPersonalisedArtwork(button, urls) {\n  const artwork = button?.querySelector('.tidal-personalised-artwork');\n  if (!artwork) return;\n\n  const uniqueUrls = [];\n  for (const value of urls || []) {\n    const url = String(value || '').trim();\n    if (!url || uniqueUrls.includes(url)) continue;\n    uniqueUrls.push(url);\n    if (uniqueUrls.length === 4) break;\n  }\n\n  if (!uniqueUrls.length) return;\n\n  artwork.replaceChildren();\n  artwork.classList.toggle('single', uniqueUrls.length === 1);\n\n  uniqueUrls.forEach(url => {\n    const image = document.createElement('img');\n    image.src = url;\n    image.alt = '';\n    image.loading = 'lazy';\n    artwork.appendChild(image);\n  });\n}\n\nasync function loadTidalPersonalisedArtwork(playlist, button) {\n  const playlistId = String(playlist?.id || '').trim();\n  if (!playlistId || !button?.isConnected) return;\n\n  try {\n    const response = await fetch(\n      '/api/tidal/personalised/artwork?id=' + encodeURIComponent(playlistId),\n      { cache: 'no-store' }\n    );\n    const result = await response.json();\n    if (!response.ok || result.ok === false || !button.isConnected) return;\n\n    setTidalPersonalisedArtwork(\n      button,\n      Array.isArray(result.artwork) ? result.artwork : []\n    );\n  } catch {\n    // Artwork enrichment is optional; keep the card usable without it.\n  }\n}\n\nasync function enrichTidalPersonalisedArtwork(entries, concurrency = 1) {\n"""

if server.count(server_anchor) != 1:
    raise SystemExit(f'Expected one server anchor, found {server.count(server_anchor)}')
if '/api/tidal/personalised/artwork' in server:
    raise SystemExit('Server artwork proxy already exists')
if ui.count(old_ui) != 1:
    raise SystemExit(f'Expected one diagnostic UI block, found {ui.count(old_ui)}')

server = server.replace(server_anchor, server_insert, 1)
ui = ui.replace(old_ui, new_ui, 1)
server_path.write_text(server)
ui_path.write_text(ui)
print('Applied personalised artwork client migration')
