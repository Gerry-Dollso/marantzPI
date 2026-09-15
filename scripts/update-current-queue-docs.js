'use strict';

const fs = require('fs');

function replaceExact(text, before, after, label) {
  if (!text.includes(before)) throw new Error(`Missing ${label} anchor`);
  if (text.indexOf(before) !== text.lastIndexOf(before)) throw new Error(`Ambiguous ${label} anchor`);
  return text.replace(before, after);
}

let readme = fs.readFileSync('README.md', 'utf8');
readme = replaceExact(readme,
`Current cleaned/pushed Pi checkpoint:\n\n\`\`\`text\n1758311 — Remove TIDAL swipe return migration helper\n\`\`\``,
`Current cleaned/pushed Pi checkpoint:\n\n\`\`\`text\n1796f6c — Add read-only Current Queue UI\n\`\`\`\n\nCurrent Queue API checkpoint:\n\n\`\`\`text\n41e8ab0 — Add read-only Current Queue API\n\`\`\``,
'README checkpoint');

readme = replaceExact(readme,
`## Near-term TIDAL roadmap\n\nThe next work is intentionally ordered so each feature can be researched and accepted without destabilising the working playback stack:\n\n1. **Current Queue:** add a Now Playing link to a queue screen showing the live HEOS queue. Start with read-only queue reconciliation, then add explicitly tested selection/editing controls such as play-this-track, remove and reorder/sort only after the live queue model and interactions with rolling/background queue builders are understood.\n2. **Now Playing favourite heart:**`,
`## 2026-09-15 — Read-only Current Queue\n\nCurrent Queue is now production-accepted on the Pi. A QUEUE control on Now Playing opens a dedicated full-screen CURRENT QUEUE view backed by the Pi-local read-only \`GET /api/queue\` endpoint. The endpoint reuses the existing HEOS queue reader and current-media query; it does not mutate playback or involve the HP backend.\n\nThe screen displays the **physical queue currently materialised by HEOS**, not an inferred source/canonical total. Live reconnaissance proved that Favourite Tracks rolling playback initially materialises 10 rows and appends 5 at the low-water point, an ordinary 125-track Created-by-me playlist exposed 50 physical rows, and My Mix 2 exposed 24 rows initially and later 40. Therefore a displayed count such as \`50 TRACKS\` means 50 current physical HEOS queue rows, never \`50 of 125\` unless HEOS itself provides that source total through a separately proven contract.\n\nRows expose HEOS artwork, title, artist, album, qid, mid and album_id. The current row is identified by current-media qid/mid and marked NOW PLAYING. The queue refreshes every 5 seconds only while the screen is open, preserves manual scroll position during refreshes, and stops polling when BACK closes the screen. Opening the screen centres the current row. Retained queue state while the AVR is off or after leaving NET is intentional because MarantzPi already preserves TIDAL queue/resume state; do not invalidate Current Queue merely because the receiver is off.\n\nCurrent Queue is deliberately **read-only**. No play-selected, remove, move, sort, clear or other queue mutation controls were added, and the user does not currently consider queue editing a priority. If mutation is revisited later, investigate it as a separate feature against ordinary HEOS playback, Favourite Tracks rolling playback and personalised/background queue builders rather than complicating this accepted viewer.\n\nProduction checkpoints:\n\n\`\`\`text\n41e8ab0 — Add read-only Current Queue API\n1796f6c — Add read-only Current Queue UI\n\`\`\`\n\n## Near-term TIDAL roadmap\n\nThe next work is intentionally ordered so each feature can be researched and accepted without destabilising the working playback stack:\n\n1. **Now Playing favourite heart:**`,
'README Current Queue roadmap');

readme = replaceExact(readme,
`- Every TIDAL browser screen has a \`NOW PLAYING\` shortcut in the top-right opposite \`BACK\`. It only hides the TIDAL overlay and preserves browser history, playback, queue and AVR state.`,
`- Every TIDAL browser screen has a \`NOW PLAYING\` shortcut in the top-right opposite \`BACK\`. It only hides the TIDAL overlay and preserves browser history, playback, queue and AVR state.\n- Now Playing has a read-only **QUEUE** control that opens the dedicated CURRENT QUEUE screen. It displays the physical HEOS queue with artwork/title/artist/album metadata, marks the current row, refreshes every 5 seconds while open, and never mutates the queue.`,
'README feature list');

fs.writeFileSync('README.md', readme);

let changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
const changelogAnchor = `This file records project-level milestones and known-good checkpoints. Git history remains the detailed source for individual code changes.\n`;
const changelogEntry = `\n## 2026-09-15 — Read-only Current Queue\n\n- Added a Pi-local read-only \`GET /api/queue\` endpoint using the existing HEOS queue reader plus \`get_now_playing_media\`. The endpoint returns normalized qid, mid, albumId, song, artist, album and imageUrl fields and marks the current row without changing playback.\n- Live reconnaissance established that Current Queue must represent the **physical HEOS queue currently loaded**, not the source/canonical collection length. Favourite Tracks rolling playback was observed at 10 rows then 15 after a five-track low-water append; a 125-track ordinary playlist exposed 50 physical rows; My Mix 2 exposed 24 rows initially and later 40.\n- Added a QUEUE button to Now Playing and a dedicated full-screen CURRENT QUEUE view with artwork, title, artist, album, physical track count and NOW PLAYING highlighting.\n- Added a 5-second \`/api/queue\` refresh only while Current Queue is open. Live testing caught that the first deployed UI loaded only once; the corrected implementation was then verified to move the NOW PLAYING highlight automatically on a natural track transition. Manual scroll position is preserved during background refreshes and the current row is centred only when the screen first opens.\n- Preserved the intentional TIDAL retained-queue/resume design: an AVR-off state does not by itself invalidate the queue viewer.\n- Kept the feature deliberately read-only. No queue selection, remove, reorder, sort or clear mutation was introduced, and the HP backend remains outside this UI path.\n- Live touchscreen acceptance passed the queue screen, physical queue rendering and automatic current-row refresh. Production working tree was clean after push.\n\nCheckpoint sequence:\n\n\`\`\`text\n41e8ab0 — Add read-only Current Queue API\n1796f6c — Add read-only Current Queue UI\n\`\`\`\n`;
if (!changelog.includes(changelogAnchor)) throw new Error('Missing CHANGELOG intro anchor');
if (changelog.includes('## 2026-09-15 — Read-only Current Queue')) throw new Error('Current Queue changelog entry already exists');
changelog = changelog.replace(changelogAnchor, changelogAnchor + changelogEntry);
fs.writeFileSync('CHANGELOG.md', changelog);

console.log('Updated README.md and CHANGELOG.md for accepted Current Queue work');
