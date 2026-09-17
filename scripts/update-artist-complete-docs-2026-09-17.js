const fs = require('fs');

const files = ['README.md', 'CHANGELOG.md'];
const marker = '<!-- ARTIST_PAGE_COMPLETE_2026_09_17 -->';
const anchor = '<!-- TASK3_TIDAL_LANDING_MIXES_2026_09_16 -->';

const block = [
  marker,
  '## 2026-09-17 — Rich TIDAL Artist page production accepted',
  '',
  'The richer Artist Page is complete and accepted on the physical **8-inch 1080p MarantzPi touchscreen**. The governing architecture is **official TIDAL API for what the user sees; HEOS for what the user hears**.',
  '',
  'The Artist landing page is deliberately bounded to **4 genuine popularity-ranked Top Tracks in a fixed 2x2**, **3 Albums**, **3 EPs & Singles** and **3 Appears On**. Biography and Top Tracks load lazily so they do not block the core Artist landing response. Similar Artists and Artist Radio remain available through the established hybrid paths.',
  '',
  'The three release-category controls now load their complete HEOS category on demand through the Pi proxy for /api/tidal/artist-releases, with the HP enriching those exact release identities using official TIDAL metadata/artwork. Releases are not automatically deduplicated merely because titles or artwork look similar; separate TIDAL catalogue versions are legitimate unless identity evidence proves otherwise.',
  '',
  'Top Tracks remains based on the backend full Artist-track crawl, de-duplication and official TIDAL popularity sort. The backend persistently stores the ranked top 10; the landing shows the first four and the full Top Tracks page shows all 10. Biography is independently lazy and persistent; null biography results are valid.',
  '',
  'The Pi artwork proxy is production-tested against the backend persistent artwork cache. The Artist UI uses a request-token/current-Artist guard so late biography, Top Tracks or release responses cannot update a different Artist after navigation.',
  '',
  'Runtime acceptance used The Afghan Whigs, TIDAL Artist ID 672: the full Albums route returned **14/14** releases, from Soft Control through Up In It, with official TIDAL enrichment. The same 14/14 result was proven through the Pi proxy. Physical touchscreen acceptance confirmed each release category opens its complete list and Back restores the intended **3-release / 4-Top-Tracks** landing layout.',
  '',
  'Pi production checkpoints: **05ce9f1 — persistent artwork proxy**, **228cb39 — 8-inch Artist landing layout**, **b141a76 — lazy rich Artist data**, and **c5841e6 — Load full Artist categories on demand**. Companion backend full-category checkpoint: **c1d578f — Add full Artist release loading**.',
  '',
  'The backend sequential Artist cache warmer completed 391 of 392 favourite artists. BODEGA TIDAL ID 3644091 was the single HTTP 429 failure and should not be repeatedly hammered. BODEGA IDs 3644091 and 43627077 are separate TIDAL profiles for the same real-world band and must not be automatically merged.',
  '',
  '**Acceptance rule:** syntax checks, diffs and backend curl tests are not sufficient to call a MarantzPi UI feature complete. Final acceptance requires end-to-end testing on the physical touchscreen. This Artist phase has passed that acceptance.',
  '',
  'Current Queue, Now Playing favourite heart, TIDAL landing/Mixes & Radio and the richer Artist Page are complete. **Now Playing Track Radio remains deliberately on the back burner.**',
  '',
  ''
].join('\n');

for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  if (text.includes(marker)) throw new Error(file + ': completed Artist marker already present');
  if (!text.includes(anchor)) throw new Error(file + ': Task 3 anchor missing');
  text = text.replace(anchor, block + anchor);
  if (file === 'README.md') {
    text = text.replace('1796f6c — Add read-only Current Queue UI', 'c5841e6 — Load full Artist categories on demand');
    text = text.replace('b83b443 — Remove official TIDAL catalogue README updater', 'c1d578f — Add full Artist release loading');
  }
  text = text.replace('Current Queue, Now Playing favourite heart and TIDAL landing/Mixes & Radio are complete. **Next active task: richer Artist Page.** Now Playing Track Radio remains a later/back-burner task.', 'Current Queue, Now Playing favourite heart, TIDAL landing/Mixes & Radio and the richer Artist Page are complete. **Now Playing Track Radio remains deliberately on the back burner.**');
  fs.writeFileSync(file, text);
}

console.log('Updated completed Artist documentation in README and CHANGELOG');
