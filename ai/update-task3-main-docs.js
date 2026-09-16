const fs = require('fs');

const marker = '<!-- TASK3_TIDAL_LANDING_MIXES_2026_09_16 -->';
const section = marker + '\n## 2026-09-16 — TIDAL landing / Mixes & Radio accepted\n\nTask 3 is production-accepted. The TIDAL landing page now presents six local line-icon shortcuts in a 2×3 layout: Playlists, Artists, Albums, Tracks, Mixes & Radio and Genres. Playlists retains Created by me and Favorited. Genres opens the existing HEOS/TIDAL genre browse surface with live artwork. Videos were deliberately omitted.\n\nMixes & Radio now renders the backend canonical saved-TIDAL MIX collection. The backend selects official saved playlist resources with `playlistType === "MIX"`; the Pi must not reconstruct this shelf using names, hard-coded IDs, HEOS subtraction or the old recommendations list. The acceptance snapshot contained 19 MIX playlists from 53 saved playlist references; counts are snapshots, not constants.\n\nThe Pi uses each MIX playlist\'s official TIDAL artwork directly. It no longer performs the old per-playlist `/api/tidal/personalised/artwork` enrichment requests for this screen. Existing official playlist detail and TIDAL-to-HEOS resolver paths remain responsible for track browsing and playback.\n\nLive touchscreen acceptance passed Genres artwork, TRICKY Artist Radio browse, Turnip Farm Track Radio browse/playback and My Mix 8 playback. Pi production checkpoint: `e98c1e1`; cleanup checkpoint: `d94b55d`; dedicated documentation checkpoint: `2530d9c`. Companion backend canonical production checkpoint: `d075c78`. Detailed Pi record: `docs/TIDAL_LANDING_MIXES_RADIO_2026-09-16.md`.\n\nCurrent Queue, Now Playing favourite heart and TIDAL landing/Mixes & Radio are complete. **Next active task: richer Artist Page.** Now Playing Track Radio remains a later/back-burner task.\n\n';

for (const path of ['README.md', 'CHANGELOG.md']) {
  const old = fs.readFileSync(path, 'utf8');
  if (old.includes(marker)) throw new Error(`${path}: marker already present`);
  const firstBreak = old.indexOf('\n');
  if (firstBreak < 0) throw new Error(`${path}: no heading line`);
  fs.writeFileSync(path, old.slice(0, firstBreak + 1) + '\n' + section + old.slice(firstBreak + 1));
  console.log(`Updated ${path}`);
}
