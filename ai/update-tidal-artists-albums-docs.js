#!/usr/bin/env node
'use strict';

const fs = require('fs');
const crypto = require('crypto');

const README = 'README.md';
const CHANGELOG = 'CHANGELOG.md';

function sha1(text) {
  return crypto.createHash('sha1').update(text).digest('hex');
}

const readme = fs.readFileSync(README, 'utf8');
const changelog = fs.readFileSync(CHANGELOG, 'utf8');

if (!readme.includes('750de76 — Remove Favourite Tracks UI migration helper') ||
    !readme.includes('Next migration target: My Music Artists, Albums and Playlists.')) {
  throw new Error('README.md is not at the expected pre-Artists/Albums documentation state; refusing to write');
}
if (!changelog.includes('## 2026-09-13 — Official TIDAL Favourite Tracks UI migration') ||
    !changelog.includes('Next migration target is My Music Artists, Albums and Playlists')) {
  throw new Error('CHANGELOG.md is not at the expected pre-Artists/Albums documentation state; refusing to write');
}

let nextReadme = readme.replace(
  '750de76 — Remove Favourite Tracks UI migration helper',
  '497e6a5 — Remove Artists and Albums UI migration helper'
).replace(
  '9ba3b6f — Remove Favourite Tracks action fix helper',
  'dbe79a6 — Remove Artists and Albums documentation helper'
).replace(
  'Next migration target: My Music Artists, Albums and Playlists. Their browse/display paths still use the older HEOS-oriented library path and should be converted to the same faster, richer official-TIDAL UI pattern while keeping HEOS as playback transport.',
  `## Official TIDAL Artists and Albums UI checkpoint — 13 Sep 2026\n\nMy Music -> Artists and My Music -> Albums now use the HP backend's official-TIDAL-backed catalogue endpoints for their top-level display while retaining the existing HEOS CID-driven drill-ins and playback paths. Artists uses \`/api/tidal/favourite-artists\`; Albums uses \`/api/tidal/favourite-albums\`. The Pi preserves/generated \`LIBARTIST-<id>\` and \`LIBALBUM-<id>\` CIDs, so selecting an artist or album continues into the already-tested HEOS navigation/playback routes.\n\nArtists has 393 official relationship references, 392 live official artist resources and 392 matching HEOS artist IDs. Official artist ID \`32968323\` was directly checked and returns 404, so it is omitted from the live UI. Albums has 1,535 official relationship references and the same 1,535-ID set in HEOS; official rich metadata resolves 1,482 albums, leaving 53 unresolved references. Three sampled unresolved album IDs (\`1441435\`, \`69720620\`, \`308597115\`) were directly checked and each returned 404; do not claim that every unresolved album was individually 404-tested.\n\nTouchscreen acceptance passed Artists artwork/A-Z navigation and artist drill-in, Albums artwork/artist/A-Z navigation and album drill-in, PLAY RANDOM through the existing HEOS album route, and ordinary album-track PLAY NOW. The HP prewarms the official catalogues sequentially in the accepted order Artists -> Albums -> Tracks.\n\nProduction checkpoints:\n\n\`\`\`text\n998589b — Use official TIDAL Artists and Albums UI\n497e6a5 — Remove Artists and Albums UI migration helper\n\nBackend:\n2ba75d0 — Add official TIDAL Artists and Albums catalogues\nf4e1476 — Remove Artists and Albums migration helpers\ndbe79a6 — Remove Artists and Albums documentation helper\n\`\`\`\n\nNext migration target: ordinary My Music Playlists. These playlists are visible directly through HEOS as \`LIBPLAYLIST-*\`, so first reconcile the official TIDAL user-playlist collection against those HEOS containers. Do not reopen the personalised My Mix/Birthday resolver work unless new evidence specifically requires it.`
);

const changelogEntry = `## 2026-09-13 — Official TIDAL Artists and Albums UI migration\n\n- Migrated My Music -> Artists and My Music -> Albums top-level display to the HP backend's official-TIDAL-backed catalogue endpoints while retaining existing HEOS CID-driven drill-ins and playback.\n- Artists now displays 392 live official resources from 393 relationship references. The HEOS artist collection contains the same 392 live IDs; official ID \`32968323\` was directly verified as 404 and is omitted.\n- Albums now displays 1,482 rich official resources from 1,535 relationship references. HEOS contains the same full 1,535-ID relationship set; 53 official metadata resources remain unresolved. Three sampled unresolved IDs (\`1441435\`, \`69720620\`, \`308597115\`) were directly verified as 404.\n- Preserved/generated \`LIBARTIST-<id>\` and \`LIBALBUM-<id>\` CIDs so the existing HEOS artist/album drill-ins and playback routes remain unchanged.\n- Live touchscreen acceptance passed Artists artwork/A-Z/drill-in, Albums artwork/artist/A-Z/drill-in, PLAY RANDOM, and ordinary album-track PLAY NOW.\n- Companion backend prewarm is sequential Artists -> Albums -> Tracks.\n- Removed the temporary Pi migration helper after the production source checkpoint was pushed.\n- Next migration target is ordinary My Music Playlists. Reconcile official user playlists directly against HEOS \`LIBPLAYLIST-*\`; do not conflate this with personalised My Mix/Birthday resolver work.\n\nCheckpoint sequence:\n\n\`\`\`text\n998589b — Use official TIDAL Artists and Albums UI\n497e6a5 — Remove Artists and Albums UI migration helper\n\nCompanion backend:\n2ba75d0 — Add official TIDAL Artists and Albums catalogues\nf4e1476 — Remove Artists and Albums migration helpers\ndbe79a6 — Remove Artists and Albums documentation helper\n\`\`\`\n\n`;

const marker = '## 2026-09-13 — Official TIDAL Favourite Tracks UI migration';
const nextChangelog = changelog.replace(marker, changelogEntry + marker);

fs.writeFileSync(README, nextReadme);
fs.writeFileSync(CHANGELOG, nextChangelog);

console.log('README.md:', sha1(nextReadme));
console.log('CHANGELOG.md:', sha1(nextChangelog));
console.log('Artists/Albums Pi documentation applied; no service restart performed.');
