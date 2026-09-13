'use strict';

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const targets = {
  'README.md': 'c55d965d70e6b3c365789e0b65e87f480259989c',
  'CHANGELOG.md': '8d558daf364fbca729cbcb309e5f729c46e012f4'
};

function gitBlobSha(content) {
  const body = Buffer.from(content, 'utf8');
  const header = Buffer.from(`blob ${body.length}\0`, 'utf8');
  return crypto.createHash('sha1').update(header).update(body).digest('hex');
}

function replaceExactlyOnce(content, before, after, label) {
  const first = content.indexOf(before);
  const last = content.lastIndexOf(before);
  if (first === -1) throw new Error(`${label}: expected source block was not found`);
  if (first !== last) throw new Error(`${label}: expected source block is not unique`);
  return content.slice(0, first) + after + content.slice(first + before.length);
}

const root = process.cwd();
const original = {};
for (const [relativePath, expectedSha] of Object.entries(targets)) {
  const fullPath = path.join(root, relativePath);
  const content = fs.readFileSync(fullPath, 'utf8');
  const actualSha = gitBlobSha(content);
  if (actualSha !== expectedSha) {
    throw new Error(`${relativePath}: guard failed; expected ${expectedSha}, found ${actualSha}`);
  }
  original[relativePath] = content;
}

let readme = original['README.md'];
let changelog = original['CHANGELOG.md'];

readme = replaceExactlyOnce(
  readme,
  `Current tested functional checkpoint:\n\n\`\`\`text\nbcabd8a — Remove TIDAL track action reuse helper\n\`\`\`\n\nCompanion backend checkpoint:\n\n\`\`\`text\n9ac4924 — Remove strict play from here helper\n\`\`\``,
  `Current tested functional checkpoint:\n\n\`\`\`text\n750de76 — Remove Favourite Tracks UI migration helper\n\`\`\`\n\nCompanion backend checkpoint:\n\n\`\`\`text\n9ba3b6f — Remove Favourite Tracks action fix helper\n\`\`\``,
  'README current checkpoint'
);

const readmeSection = `\n## Official TIDAL Favourite Tracks UI checkpoint — 13 Sep 2026\n\nMy Music -> Tracks is now fully migrated away from HEOS browsing for display. The Pi calls its local \`/api/tidal/favourite-tracks\` proxy, which forwards to the HP backend's official-TIDAL-backed canonical Favourite Tracks endpoint. The live canonical collection is 594 tracks after stale official references are omitted and HEOS duplicate rows are reconciled.\n\nThe touchscreen renders those 594 tracks as one continuous rich list with official TIDAL artwork, title, artist and album metadata. No 50-item pager or HEOS browse wait remains in the Tracks UI. PLAY ALL and SHUFFLE ALL continue to use the accepted rolling Favourite Tracks backend queue builder; individual tracks retain PLAY NOW, PLAY NEXT, ADD TO END, PLAY FROM HERE and PLAY ONLY.\n\nEnd-to-end touchscreen acceptance passed all seven actions: PLAY ALL, SHUFFLE ALL, PLAY FROM HERE, PLAY NOW, PLAY NEXT, ADD TO END and PLAY ONLY. ADD TO END was additionally verified by confirming the selected track was present at the queue tail.\n\nA critical HEOS transport detail was reconfirmed during this migration: ordinary Favourite Tracks queue actions must send the literal-space HEOS CID \`My Music-Tracks\`. URL-encoded \`My%20Music-Tracks\` is rejected by HEOS with \`cannot play\`. Official TIDAL track IDs already match the de-duplicated HEOS MIDs, so no track-ID translation is required for this collection.\n\nProduction checkpoints:\n\n\`\`\`text\n27be5d1 — Use official TIDAL Favourite Tracks UI\n750de76 — Remove Favourite Tracks UI migration helper\n\nBackend:\n08a86ce — Fix Favourite Tracks ordinary actions\n9ba3b6f — Remove Favourite Tracks action fix helper\n\`\`\`\n\nNext migration target: My Music Artists, Albums and Playlists. Their browse/display paths still use the older HEOS-oriented library path and should be converted to the same faster, richer official-TIDAL UI pattern while keeping HEOS as playback transport.\n`;

readme = replaceExactlyOnce(
  readme,
  `This checkpoint includes the current rich personalised TIDAL/My Mixes UI and playback controls, protected TIDAL resume behaviour, deterministic suppression of transient HEOS queue metadata during queue replacement, explicit AVR \`unknown\` handling, reduced AVR port-23 connection churn, and the production personalised-artwork path tested 10/10 from a cold backend cache. Treat older \`v3-development\`, \`v3\`, and stable branches as historical/reference branches unless deliberately restoring or comparing them.\n`,
  `This checkpoint includes the current rich personalised TIDAL/My Mixes UI and playback controls, the official-TIDAL-backed 594-track Favourite Tracks UI, protected TIDAL resume behaviour, deterministic suppression of transient HEOS queue metadata during queue replacement, explicit AVR \`unknown\` handling, reduced AVR port-23 connection churn, and the production personalised-artwork path tested 10/10 from a cold backend cache. Treat older \`v3-development\`, \`v3\`, and stable branches as historical/reference branches unless deliberately restoring or comparing them.\n${readmeSection}`,
  'README checkpoint summary insertion'
);

readme = replaceExactlyOnce(
  readme,
  `The HP backend's bounded in-memory browse cache removes the need for that UI restriction. The Pi now requests the full \`My Music-Tracks\` container and renders it with the existing playlist-style list renderer. On subsequent visits the HP can return the cached full list immediately while refreshing it against HEOS in the background.`,
  `The Tracks display no longer depends on the HEOS browse cache. The Pi now requests \`/api/tidal/favourite-tracks\`, backed by the HP's canonical official TIDAL Favourite Tracks cache, and renders the complete 594-track collection with official artwork, title, artist and album metadata. HEOS remains the playback transport rather than the display/catalogue authority for this screen.`,
  'README Favourite Tracks architecture update'
);

const changelogEntry = `## 2026-09-13 — Official TIDAL Favourite Tracks UI migration\n\n- Migrated My Music -> Tracks display from the older HEOS browse path to the HP backend's official-TIDAL-backed \`/api/tidal/favourite-tracks\` endpoint through a new Pi proxy.\n- The touchscreen now shows the canonical 594-track Favourite Tracks collection as one continuous rich list with official artwork, title, artist and album metadata and no pager.\n- Preserved the accepted rolling backend architecture for PLAY ALL, SHUFFLE ALL and PLAY FROM HERE and preserved the existing individual-track action menu.\n- End-to-end touchscreen acceptance passed PLAY ALL, SHUFFLE ALL, PLAY FROM HERE, PLAY NOW, PLAY NEXT, ADD TO END and PLAY ONLY. ADD TO END was verified at the actual queue tail.\n- Diagnosed ordinary action failures as HEOS CID formatting rather than ID mismatch. Official TIDAL IDs match the reconciled HEOS MIDs; the required fix was to preserve literal-space \`My Music-Tracks\` in HEOS \`browse/add_to_queue\` commands instead of sending \`My%20Music-Tracks\`.\n- Removed both temporary guarded migration helpers after production commits were pushed and verified clean.\n- Next migration target is My Music Artists, Albums and Playlists: move their display/catalogue paths to the same faster, richer official TIDAL pattern while retaining HEOS playback.\n\nCheckpoint sequence:\n\n\`\`\`text\n27be5d1 — Use official TIDAL Favourite Tracks UI\n750de76 — Remove Favourite Tracks UI migration helper\n\nCompanion backend:\n08a86ce — Fix Favourite Tracks ordinary actions\n9ba3b6f — Remove Favourite Tracks action fix helper\n\`\`\`\n\n`;

changelog = replaceExactlyOnce(
  changelog,
  `This file records project-level milestones and known-good checkpoints. Git history remains the detailed source for individual code changes.\n\n`,
  `This file records project-level milestones and known-good checkpoints. Git history remains the detailed source for individual code changes.\n\n${changelogEntry}`,
  'CHANGELOG entry insertion'
);

for (const [relativePath, content] of Object.entries({ 'README.md': readme, 'CHANGELOG.md': changelog })) {
  const fullPath = path.join(root, relativePath);
  const tempPath = `${fullPath}.docs-update.tmp`;
  fs.writeFileSync(tempPath, content, 'utf8');
  fs.renameSync(tempPath, fullPath);
  console.log(`${relativePath}: ${gitBlobSha(content)}`);
}
console.log('Favourite Tracks documentation update applied.');
