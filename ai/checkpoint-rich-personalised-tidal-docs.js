'use strict';

const fs = require('fs');

function replaceOnce(source, oldText, newText, label) {
  const count = source.split(oldText).length - 1;
  if (count !== 1) throw new Error(`Expected exactly one ${label} anchor, found ${count}`);
  return source.replace(oldText, newText);
}

let readme = fs.readFileSync('README.md', 'utf8');
readme = replaceOnce(
  readme,
  'fc418d2 — Upgrade TIDAL My Music albums browsing',
  'a65f1b5 — Add rich personalised TIDAL landing cards',
  'README checkpoint'
);
readme = replaceOnce(
  readme,
  '## Current feature set',
  `## Personalised TIDAL / My Mixes checkpoint — 31 Aug 2026\n\nThe touchscreen now has an official-API-backed **My Mixes** experience covering My Mix 1-8, My Daily Discovery and My New Arrivals. The landing page renders immediately from the personalised recommendation listing, including TIDAL-provided names and descriptions, then progressively enriches each card with a 2x2 collage built from up to four distinct official TIDAL album covers. Artwork enrichment uses limited concurrency and is optional/fail-soft, so a slow or failed cover request never blocks the card or its navigation.\n\nInside a personalised playlist, rows show official TIDAL artwork plus track title, artist and album. PLAY ALL and SHUFFLE ALL use the HP backend's resolved personalised queue path. Live My Mix 1 testing starts playback in about 2.34 seconds and builds the remainder in the background; the tested 39-track mix completed 39/39 with zero skips. Individual personalised tracks support PLAY NOW, PLAY NEXT, ADD TO END and PLAY ONLY. PLAY FROM HERE remains deliberately unavailable for My Mixes until its generic queue-tail semantics are implemented.\n\nCurrent tested Pi checkpoint:\n\n\`\`\`text\na65f1b5 — Add rich personalised TIDAL landing cards\n\`\`\`\n\nRelated source checkpoints include \`ce18540\` (richer personalised track metadata) and \`a7e4970\` (personalised Play All/Shuffle All controls).\n\n## Current feature set`,
  'README feature heading'
);
fs.writeFileSync('README.md', readme);

let changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
changelog = replaceOnce(
  changelog,
  'This file records project-level milestones and known-good checkpoints. Git history remains the detailed source for individual code changes.',
  `This file records project-level milestones and known-good checkpoints. Git history remains the detailed source for individual code changes.\n\n## 2026-08-31 — Rich personalised TIDAL UI checkpoint\n\n- Completed the touchscreen My Mixes flow for official TIDAL personalised recommendations: My Mix 1-8, My Daily Discovery and My New Arrivals.\n- Personalised track rows now retain and display official TIDAL album metadata alongside title, artist and artwork.\n- Added PLAY ALL and SHUFFLE ALL controls for personalised playlists through the HP backend's fast resolved/background queue builder. Live My Mix 1 testing began playback in about 2.34 seconds and the background build completed all 39 tracks with zero skips.\n- Added official TIDAL recommendation descriptions to the landing cards.\n- Added progressive 2x2 artwork collages using up to four distinct official TIDAL album covers from each playlist. Cards render before artwork enrichment; enrichment is limited to three concurrent workers and fails softly.\n- Live touchscreen testing confirmed the richer landing-card layout and artwork behaviour.\n- Individual personalised tracks support PLAY NOW, PLAY NEXT, ADD TO END and PLAY ONLY. PLAY FROM HERE remains intentionally unavailable for My Mixes for now.\n\nCheckpoint sequence:\n\n\`\`\`text\nce18540 — Show richer personalised TIDAL track metadata\na7e4970 — Complete personalised TIDAL playback controls\na65f1b5 — Add rich personalised TIDAL landing cards\n\`\`\`\n\nCurrent tested functional checkpoint:\n\n\`\`\`text\na65f1b5 — Add rich personalised TIDAL landing cards\n\`\`\``,
  'CHANGELOG intro'
);
fs.writeFileSync('CHANGELOG.md', changelog);

console.log('Applied guarded rich personalised TIDAL Pi checkpoint documentation');
