#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parents[1] / 'public' / 'tidal-ui.js'
text = path.read_text()

old = """async function loadTidalPersonalisedArtwork(playlist, button) {
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
"""

new = """async function loadTidalPersonalisedArtwork(playlist, button) {
  const playlistId = String(playlist?.id || '').trim();
  if (!playlistId || !button?.isConnected) return;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(
        '/api/tidal/personalised/artwork?id=' + encodeURIComponent(playlistId),
        { cache: 'no-store' }
      );
      const result = await response.json();
      if (!response.ok || result.ok === false) throw new Error('Artwork request failed');
      if (!button.isConnected) return;

      setTidalPersonalisedArtwork(
        button,
        Array.isArray(result.artwork) ? result.artwork : []
      );
      return;
    } catch {
      if (attempt === 1 || !button.isConnected) return;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}
"""

if text.count(old) != 1:
    raise SystemExit(f'Expected one production artwork loader, found {text.count(old)}')

path.write_text(text.replace(old, new, 1))
print('Applied personalised artwork retry migration')
