'use strict';

const fs = require('fs');

function replaceOnce(text, before, after, label) {
  const count = text.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one source block, found ${count}`);
  return text.replace(before, after);
}

const readmePath = 'README.md';
const changelogPath = 'CHANGELOG.md';
let readme = fs.readFileSync(readmePath, 'utf8');
let changelog = fs.readFileSync(changelogPath, 'utf8');

readme = replaceOnce(
  readme,
  `Current tested functional checkpoint:\n\n\`\`\`text\n1e810ed — Remove ordinary Playlists UI migration helper\n\`\`\`\n\nCompanion backend checkpoint:\n\n\`\`\`text\n0f6bf7b — Remove ordinary Playlists migration helpers\n\`\`\``,
  `Current cleaned/pushed Pi checkpoint:\n\n\`\`\`text\n1758311 — Remove TIDAL swipe return migration helper\n\`\`\`\n\nLatest tested production UI checkpoints:\n\n\`\`\`text\n36bd317 — Restore TIDAL browse with Now Playing swipe\n84170a5 — Sort TIDAL Artists alphabetically\n\`\`\`\n\nCompanion backend current cleaned/pushed checkpoint:\n\n\`\`\`text\nb83b443 — Remove official TIDAL catalogue README updater\n\`\`\``,
  'README current checkpoints'
);

const currentStateNeedle = `This checkpoint includes the current rich personalised TIDAL/My Mixes UI and playback controls, the official-TIDAL-backed 594-track Favourite Tracks UI, protected TIDAL resume behaviour, deterministic suppression of transient HEOS queue metadata during queue replacement, explicit AVR \`unknown\` handling, reduced AVR port-23 connection churn, and the production personalised-artwork path tested 10/10 from a cold backend cache. Treat older \`v3-development\`, \`v3\`, and stable branches as historical/reference branches unless deliberately restoring or comparing them.\n`;
const currentStateAfter = `${currentStateNeedle}\n## 2026-09-14 — Artist ordering and TIDAL Now Playing swipe return\n\n- My Music -> Artists now sorts the complete official-TIDAL-backed artist list alphabetically, case-insensitively, before the existing ALL/A-Z filtering. No other TIDAL lists were re-ordered. Live touchscreen acceptance confirmed ALL and A-Z behaviour.\n- When TIDAL itself sends the user to Now Playing through PLAY NOW, PLAY FROM HERE or PLAY ONLY, the Chromium swipe-back gesture now restores the exact preserved TIDAL browse screen. The TIDAL DOM/history is only hidden during playback, so the prior playlist/track-list context and scroll position remain available.\n- The swipe return is deliberately armed only by those TIDAL track actions. Swiping on PHONO/CD/other MarantzPi input screens remains trapped/no-op, and the existing native browser-back behaviour from the external SR8015 HTTPS setup page is unchanged because MarantzPi JavaScript is not running there.\n- Manual use of the TIDAL NOW PLAYING button does not arm swipe-return. The global kiosk-history guard in \`public/app.js\` was not weakened.\n- Live acceptance passed TIDAL playlist -> PLAY NOW -> Now Playing -> swipe-back to the exact previous track list, plus a non-TIDAL input swipe test that correctly did nothing.\n\nCheckpoint sequence:\n\n\`\`\`text\n84170a5 — Sort TIDAL Artists alphabetically\n7de1701 — Remove TIDAL Artists sort migration helper\n36bd317 — Restore TIDAL browse with Now Playing swipe\n1758311 — Remove TIDAL swipe return migration helper\n\`\`\`\n`;
readme = replaceOnce(readme, currentStateNeedle, currentStateAfter, 'README latest UI section insertion');

const roadmapBefore = `## Near-term TIDAL roadmap\n\n- Replace the older HEOS-oriented shortcuts with faster, richer official-TIDAL equivalents where the official API can provide the catalogue/UI metadata while HEOS remains playback transport.\n- Add TIDAL favourite/like controls for tracks, albums and artists.\n- Add a touchscreen Current Queue view. The first version should be read-only, show the current track and upcoming queue with available artwork/title/artist/album metadata, and provide direct visibility into PLAY FROM HERE / PLAY NEXT / ADD TO END results. Later queue mutation such as play-this-track, remove, reorder or clear can be considered separately.\n- Longer-term backend opportunities already preserved in the backend handover include listening history/recently played and richer discovery.\n`;
const roadmapAfter = `## Near-term TIDAL roadmap\n\nThe next work is intentionally ordered so each feature can be researched and accepted without destabilising the working playback stack:\n\n1. **Current Queue:** add a Now Playing link to a queue screen showing the live HEOS queue. Start with read-only queue reconciliation, then add explicitly tested selection/editing controls such as play-this-track, remove and reorder/sort only after the live queue model and interactions with rolling/background queue builders are understood.\n2. **Now Playing favourite heart:** show whether the canonical TIDAL track is in the user's collection and allow add/remove only after a read-only membership path and safe official-TIDAL mutation contract are proven. Never infer canonical TIDAL identity from a HEOS MID where personalised/replacement resolution may differ.\n3. **TIDAL landing artwork:** remove the generic empty artwork boxes on category rows or replace them with deliberate appropriate imagery; do not leave blank placeholder boxes.\n4. **Richer artist page:** remove/fill blank category artwork slots and add an official-TIDAL artist hero image plus biography/description where the developer API actually exposes supported metadata. Preserve the existing HEOS-backed category drill-ins/playback.\n\nLonger-term backend opportunities already preserved in the backend handover include listening history/recently played, diagnostics and richer discovery.\n`;
readme = replaceOnce(readme, roadmapBefore, roadmapAfter, 'README near-term roadmap');

const changelogHeader = `# Changelog\n\nThis file records project-level milestones and known-good checkpoints. Git history remains the detailed source for individual code changes.\n\n`;
const changelogEntry = `## 2026-09-14 — Artist ordering and TIDAL Now Playing swipe return\n\n- Sorted the complete official-TIDAL-backed My Music Artists list alphabetically before applying the existing ALL/A-Z filter. The change is isolated to Artists; Albums, Playlists, Tracks and personalised lists retain their existing ordering. Live touchscreen acceptance passed.\n- Restored a deliberately narrow Chromium swipe-back path from TIDAL-triggered Now Playing. PLAY NOW, PLAY FROM HERE and PLAY ONLY arm a one-shot return to the preserved TIDAL browse screen; the existing global browser-history trap remains unchanged.\n- Manual TIDAL NOW PLAYING does not arm the gesture. Non-TIDAL MarantzPi input screens remain swipe-trapped/no-op, and native back navigation from the external SR8015 setup page remains unchanged.\n- Live acceptance passed return to the exact previous playlist track list and a non-TIDAL input no-op test.\n- Temporary guarded migration helpers were removed after both production changes were accepted and pushed.\n\nCheckpoint sequence:\n\n\`\`\`text\n84170a5 — Sort TIDAL Artists alphabetically\n7de1701 — Remove TIDAL Artists sort migration helper\n36bd317 — Restore TIDAL browse with Now Playing swipe\n1758311 — Remove TIDAL swipe return migration helper\n\`\`\`\n\n`;
if (changelog.includes('## 2026-09-14 — Artist ordering and TIDAL Now Playing swipe return')) {
  throw new Error('CHANGELOG: latest entry already present');
}
changelog = replaceOnce(changelog, changelogHeader, changelogHeader + changelogEntry, 'CHANGELOG header');

fs.writeFileSync(readmePath, readme);
fs.writeFileSync(changelogPath, changelog);
console.log('README.md: updated current checkpoints, latest swipe/sort acceptance and next-task roadmap');
console.log('CHANGELOG.md: added 14 Sep artist-sort and swipe-return checkpoint');
console.log('No production JavaScript, CSS, HTML, backend or playback code was modified.');
