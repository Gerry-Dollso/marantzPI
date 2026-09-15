const fs = require('fs');
function prependAfterTitle(path, title, section) {
  const s = fs.readFileSync(path, 'utf8');
  if (s.includes('## 2026-09-15 — TIDAL Now Playing favourite heart')) return;
  if (!s.startsWith(title + '\n')) throw new Error(`${path}: title guard failed`);
  fs.writeFileSync(path, title + '\n\n' + section.trim() + '\n\n' + s.slice(title.length + 2));
}
const section = `## 2026-09-15 — TIDAL Now Playing favourite heart

- Added the production Now Playing TIDAL favourite heart. Pi checkpoint: \`4e7743e — Add TIDAL favourite heart to Now Playing\`.
- The Pi preserves a known official TIDAL track ID when our TIDAL UI launches playback and exposes it as \`tidalTrackId\` only while the associated HEOS MID still matches. If no preserved official ID exists, live TIDAL \`tidalMid\` is only a candidate; the HP performs exact official metadata validation and fails closed if it is not a valid official track ID. This preserves the personalised replacement boundary demonstrated by The Sugarcubes — Birthday.
- Heart status is driven by the existing Now Playing \`render(data)\` cycle and only resynchronises when track identity changes. No second \`/api/status\` poller was added. Pi proxies status/add/remove to the HP backend; favourite membership and writes remain official-TIDAL operations, never HEOS reconciliation.
- Accepted UI: heart at the right of the progress area, \`bottom:48px\`; identical 32×29 SVG geometry in both states; non-favourite grey outline \`rgba(255,255,255,0.45)\`; favourite solid red \`#ff3b3b\`.
- Controlled end-to-end Aquarius tests passed add and remove through Pi/HP/official TIDAL. Backend latency work reduced official writes from about 35 seconds to roughly 0.3 seconds and immediate post-write status to roughly 0.2 seconds. Backend checkpoint is \`6c7e2fe\`; its two-minute recent-mutation overlay does not replace the canonical Favourite Tracks collection.
- Task 2 is complete. Next agreed task is TIDAL landing/home artwork cleanup; richer artist page follows.
`;
prependAfterTitle('README.md', '# marantzPI', section);
prependAfterTitle('CHANGELOG.md', '# Changelog', section);
console.log('Updated Pi README and CHANGELOG for accepted Task 2');
