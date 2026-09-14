'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const readmePath = path.join(root, 'README.md');
const changelogPath = path.join(root, 'CHANGELOG.md');
const readme = fs.readFileSync(readmePath, 'utf8');
const changelog = fs.readFileSync(changelogPath, 'utf8');

const oldCheckpoint = `Current tested functional checkpoint:\n\n\`\`\`text\n497e6a5 — Remove Artists and Albums UI migration helper\n\`\`\``;
const newCheckpoint = `Current tested functional checkpoint:\n\n\`\`\`text\n1e810ed — Remove ordinary Playlists UI migration helper\n\`\`\``;
const oldBackendCheckpoint = `Companion backend checkpoint:\n\n\`\`\`text\ndbe79a6 — Remove Artists and Albums documentation helper\n\`\`\``;
const newBackendCheckpoint = `Companion backend checkpoint:\n\n\`\`\`text\n0f6bf7b — Remove ordinary Playlists migration helpers\n\`\`\``;
const oldNext = 'Next migration target: ordinary My Music Playlists. These playlists are visible directly through HEOS as `LIBPLAYLIST-*`, so first reconcile the official TIDAL user-playlist collection against those HEOS containers. Do not reopen the personalised My Mix/Birthday resolver work unless new evidence specifically requires it.';
const playlistSection = `## Official TIDAL ordinary Playlists UI checkpoint — 14 Sep 2026\n\nMy Music -> Playlists now uses the HP backend's official-TIDAL-backed ordinary-playlist catalogue for its top-level and branch display while preserving the existing HEOS-backed \`LIBPLAYLIST-*\` drill-in and playback paths. The top level retains the two familiar branches, Created by me and Favorited.\n\nThe catalogue is deliberately dynamic. The backend takes the live exact-ID intersection of the official TIDAL user-playlist collection and the live HEOS Created by me/Favorited playlist rows. It does not hard-code today's playlist IDs and it does not maintain a blacklist of personalised Mix/Radio IDs. If an ordinary playlist is created/favourited and appears on both sides it can appear automatically; if it is removed from either side it drops out of the intersection.\n\nThe accepted reconciliation snapshot contained 53 official relationship IDs across 3 pages and 34 ordinary HEOS playlists: 13 Created by me and 21 Favorited. All 34 HEOS ordinary IDs were present officially, giving zero HEOS-only IDs. The 19 official-only entries were personalised Mixes/Radio and were excluded naturally by the intersection. These counts are an acceptance snapshot, not permanent library constants.\n\nOfficial TIDAL supplies rich playlist metadata and artwork; HEOS supplies grouping/order and the deterministic playable \`LIBPLAYLIST-<id>\` CID. Both USER and EDITORIAL ordinary playlists are valid, so do not filter by playlist type. The Pi proxies \`/api/tidal/favourite-playlists\`; opening a \`LIBPLAYLIST-*\` item continues through the existing HEOS track-list path.\n\nLive touchscreen acceptance passed both branches, rich artwork, opening 1980s Alternative Rock Classics, PLAY NOW, PLAY ALL and SHUFFLE ALL. Personalised My Mix/Radio remains a separate resolver architecture; do not reopen the Sugarcubes/Birthday work for ordinary Playlists without new evidence.\n\nProduction checkpoints:\n\n\`\`\`text\nd2f96e4 — Use official TIDAL ordinary Playlists UI\n1e810ed — Remove ordinary Playlists UI migration helper\n\nBackend:\n43902d1 — Add official TIDAL ordinary Playlists catalogue\n0f6bf7b — Remove ordinary Playlists migration helpers\n\`\`\``;

function exactlyOnce(text, needle, label) {
  const count = text.split(needle).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly once, found ${count}`);
}

exactlyOnce(readme, oldCheckpoint, 'README current checkpoint guard');
exactlyOnce(readme, oldBackendCheckpoint, 'README backend checkpoint guard');
exactlyOnce(readme, oldNext, 'README obsolete next-target guard');
if (readme.includes('## Official TIDAL ordinary Playlists UI checkpoint — 14 Sep 2026')) throw new Error('README playlist section already exists');

let newReadme = readme.replace(oldCheckpoint, newCheckpoint).replace(oldBackendCheckpoint, newBackendCheckpoint).replace(oldNext, playlistSection);
fs.writeFileSync(readmePath, newReadme);

const marker = '## 2026-09-13 — Official TIDAL Artists and Albums UI migration';
exactlyOnce(changelog, marker, 'CHANGELOG insertion guard');
if (changelog.includes('## 2026-09-14 — Official TIDAL ordinary Playlists UI migration')) throw new Error('CHANGELOG playlist entry already exists');
const changelogEntry = `## 2026-09-14 — Official TIDAL ordinary Playlists UI migration\n\n- Migrated My Music -> Playlists top-level and branch display to the HP backend's official-TIDAL-backed ordinary-playlist endpoint while retaining existing HEOS \`LIBPLAYLIST-*\` drill-in and playback.\n- Preserved the two HEOS categories, Created by me and Favorited. The backend dynamically reconciles the live exact-ID intersection of official TIDAL collection IDs and live HEOS ordinary playlist IDs; no current playlist IDs or personalised Mix/Radio exclusions are hard-coded.\n- Acceptance snapshot: 53 official relationship IDs across 3 pages; HEOS 13 Created by me + 21 Favorited = 34 ordinary playlists; all 34 were official, HEOS-only count zero, and the 19 official-only entries were personalised Mixes/Radio. Counts are snapshots rather than fixed invariants.\n- Official TIDAL supplies rich metadata/artwork while HEOS supplies branch order and playable \`LIBPLAYLIST-*\` CIDs. Both USER and EDITORIAL ordinary playlists are valid; playlist type is not used as an exclusion rule.\n- Live touchscreen acceptance passed both branches, rich artwork, playlist drill-in, PLAY NOW, PLAY ALL and SHUFFLE ALL.\n- Personalised My Mix/Radio and the Sugarcubes/Birthday resolver remain separate; do not reopen that resolver work for ordinary Playlists without new evidence.\n- Removed the temporary Pi migration helper after the production source checkpoint was pushed.\n\nCheckpoint sequence:\n\n\`\`\`text\nd2f96e4 — Use official TIDAL ordinary Playlists UI\n1e810ed — Remove ordinary Playlists UI migration helper\n\nCompanion backend:\n43902d1 — Add official TIDAL ordinary Playlists catalogue\n0f6bf7b — Remove ordinary Playlists migration helpers\n\`\`\`\n\n`;
fs.writeFileSync(changelogPath, changelog.replace(marker, changelogEntry + marker));

console.log('README.md: updated current checkpoint and ordinary Playlists status');
console.log('CHANGELOG.md: added 14 Sep ordinary Playlists migration milestone');
console.log('No source/runtime files modified.');
