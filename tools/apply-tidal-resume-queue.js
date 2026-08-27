'use strict';

const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'server.js');
let source = fs.readFileSync(serverPath, 'utf8');

if (source.includes('lastTidalResume')) {
  throw new Error('TIDAL resume logic already appears to be applied');
}

const stateAnchor = `let heosProgressReconnectTimer = null;\n`;
if (!source.includes(stateAnchor)) {
  throw new Error('Expected HEOS state anchor not found; refusing to edit');
}
source = source.replace(
  stateAnchor,
  stateAnchor +
    `let lastTidalResume = null;\n` +
    `let tidalResumeNeeded = false;\n`
);

const imageAnchor = `  const imageUrl = String(media.image_url || '').trim();\n`;
if (!source.includes(imageAnchor)) {
  throw new Error('Expected HEOS image anchor not found; refusing to edit');
}
source = source.replace(
  imageAnchor,
  `  let imageUrl = String(media.image_url || '').trim();\n`
);

const statusAnchor = `  const hasTrackInfo = isNetPlayback && Boolean(song || artist || album);\n\n  return {\n`;
if (!source.includes(statusAnchor)) {
  throw new Error('Expected status return anchor not found; refusing to edit');
}

const statusReplacement = `  const hasTrackInfo = isNetPlayback && Boolean(song || artist || album);\n\n` +
`  const mediaMid = String(media.mid || '').trim();\n` +
`  const mediaQid = Number(media.qid);\n` +
`  const playbackState = String(state.state || 'unknown');\n\n` +
`  if (\n` +
`    isNetPlayback &&\n` +
`    playbackSource === 'tidal' &&\n` +
`    mediaMid &&\n` +
`    Number.isFinite(mediaQid) &&\n` +
`    (playbackState === 'play' || playbackState === 'pause')\n` +
`  ) {\n` +
`    lastTidalResume = {\n` +
`      mid: mediaMid,\n` +
`      qid: mediaQid,\n` +
`      song,\n` +
`      artist,\n` +
`      album,\n` +
`      imageUrl,\n` +
`      position: Math.max(0, heosProgressCurrentMs / 1000),\n` +
`      rememberedAt: Date.now()\n` +
`    };\n` +
`    tidalResumeNeeded = false;\n` +
`  } else if (!isNetPlayback && lastTidalResume) {\n` +
`    tidalResumeNeeded = true;\n` +
`  }\n\n` +
`  if (\n` +
`    isNetPlayback &&\n` +
`    tidalResumeNeeded &&\n` +
`    playbackState === 'stop' &&\n` +
`    lastTidalResume\n` +
`  ) {\n` +
`    song = String(lastTidalResume.song || song);\n` +
`    artist = String(lastTidalResume.artist || artist);\n` +
`    album = String(lastTidalResume.album || album);\n` +
`    imageUrl = String(lastTidalResume.imageUrl || imageUrl);\n` +
`  }\n\n` +
`  return {\n`;

source = source.replace(statusAnchor, statusReplacement);

const controlAnchor = `async function heosControl(action) {\n  const pid = encodeURIComponent(config.playerId);\n  const commands = {\n`;
if (!source.includes(controlAnchor)) {
  throw new Error('Expected HEOS control anchor not found; refusing to edit');
}

const helperAndControl = `async function getHeosQueueItems() {\n` +
`  const pid = encodeURIComponent(config.playerId);\n` +
`  const pageSize = 50;\n` +
`  const items = [];\n` +
`  let start = 0;\n` +
`  let total = null;\n\n` +
`  while (total === null || start < total) {\n` +
`    const end = start + pageSize - 1;\n` +
`    const response = await heos(\n` +
`      \`player/get_queue?pid=\${pid}&range=\${start},\${end}\`,\n` +
`      5000,\n` +
`      true\n` +
`    );\n\n` +
`    if (response?.heos?.result !== 'success') {\n` +
`      throw new Error(response?.heos?.message || 'Could not read HEOS queue');\n` +
`    }\n\n` +
`    const page = Array.isArray(response.payload) ? response.payload : [];\n` +
`    items.push(...page);\n\n` +
`    const values = params(response);\n` +
`    const parsedCount = Number(values.count);\n` +
`    total = Number.isFinite(parsedCount) ? parsedCount : items.length;\n\n` +
`    if (!page.length) break;\n` +
`    start += page.length;\n` +
`  }\n\n` +
`  return items;\n` +
`}\n\n` +
`async function waitForHeosMid(expectedMid, timeoutMs = 4000) {\n` +
`  const pid = encodeURIComponent(config.playerId);\n` +
`  const deadline = Date.now() + timeoutMs;\n\n` +
`  while (Date.now() < deadline) {\n` +
`    try {\n` +
`      const response = await heos(\n` +
`        \`player/get_now_playing_media?pid=\${pid}\`,\n` +
`        1500\n` +
`      );\n` +
`      const activeMid = String(response?.payload?.mid || '');\n` +
`      if (activeMid === String(expectedMid)) return true;\n` +
`    } catch {\n` +
`      // Retry briefly while HEOS activates the selected queue item.\n` +
`    }\n` +
`    await sleep(120);\n` +
`  }\n\n` +
`  return false;\n` +
`}\n\n` +
`async function resumeRememberedTidalQueue() {\n` +
`  if (!tidalResumeNeeded || !lastTidalResume?.mid) return false;\n\n` +
`  const queue = await getHeosQueueItems();\n` +
`  const rememberedMid = String(lastTidalResume.mid);\n` +
`  const rememberedQid = String(lastTidalResume.qid);\n\n` +
`  const exact = queue.find(item =>\n` +
`    String(item?.mid || '') === rememberedMid &&\n` +
`    String(item?.qid || '') === rememberedQid\n` +
`  );\n` +
`  const match = exact || queue.find(item =>\n` +
`    String(item?.mid || '') === rememberedMid\n` +
`  );\n\n` +
`  if (!match?.qid) return false;\n\n` +
`  const pid = encodeURIComponent(config.playerId);\n` +
`  const response = await heos(\n` +
`    \`player/play_queue?pid=\${pid}&qid=\${encodeURIComponent(match.qid)}\`,\n` +
`    5000,\n` +
`    true\n` +
`  );\n\n` +
`  if (response?.heos?.result !== 'success') {\n` +
`    throw new Error(response?.heos?.message || 'Could not resume HEOS queue');\n` +
`  }\n\n` +
`  const active = await waitForHeosMid(rememberedMid);\n` +
`  if (!active) {\n` +
`    throw new Error('HEOS did not activate remembered TIDAL track');\n` +
`  }\n\n` +
`  const position = Math.max(0, Number(lastTidalResume.position) || 0);\n` +
`  if (position >= 2) {\n` +
`    await seekHeos(Math.floor(position));\n` +
`  }\n\n` +
`  tidalResumeNeeded = false;\n` +
`  lastTidalResume = {\n` +
`    ...lastTidalResume,\n` +
`    qid: Number(match.qid),\n` +
`    rememberedAt: Date.now()\n` +
`  };\n\n` +
`  return true;\n` +
`}\n\n` +
`async function heosControl(action) {\n` +
`  const pid = encodeURIComponent(config.playerId);\n\n` +
`  if (action === 'play' && await resumeRememberedTidalQueue()) {\n` +
`    return { ok: true, resumedQueue: true };\n` +
`  }\n\n` +
`  const commands = {\n`;

source = source.replace(controlAnchor, helperAndControl);

const backup = serverPath + '.before-tidal-resume-queue';
if (!fs.existsSync(backup)) fs.copyFileSync(serverPath, backup);

fs.writeFileSync(serverPath, source);
console.log('Applied guarded TIDAL queue resume migration');
console.log('Backup:', backup);
