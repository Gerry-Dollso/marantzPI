'use strict';

const fs = require('fs');
const path = require('path');

const uiPath = path.join(__dirname, '..', 'public', 'tidal-ui.js');
let source = fs.readFileSync(uiPath, 'utf8');

if (source.includes('currentTidalContainerIsTrackList')) {
  throw new Error('Artist track controls already appear to be applied');
}

const playlistFn = `function currentTidalContainerIsPlaylist() {\n  return currentTidalContainerCid().startsWith('LIBPLAYLIST-');\n}\n`;
const trackListFn = `function currentTidalContainerIsPlaylist() {\n  return currentTidalContainerCid().startsWith('LIBPLAYLIST-');\n}\n\nfunction currentTidalContainerIsTrackList() {\n  const cid = currentTidalContainerCid();\n  return (\n    cid.startsWith('LIBPLAYLIST-') ||\n    cid.startsWith('LIBARTIST-Tracks-')\n  );\n}\n`;

if (!source.includes(playlistFn)) {
  throw new Error('Expected playlist-container helper not found; refusing to edit');
}
source = source.replace(playlistFn, trackListFn);

const renderBranch = `    } else if (String(cid).startsWith('LIBPLAYLIST-')) {\n      setTidalAlphabetVisible(false);\n      renderPlaylistItems(items, title);\n    } else {\n`;
const renderReplacement = `    } else if (\n      String(cid).startsWith('LIBPLAYLIST-') ||\n      String(cid).startsWith('LIBARTIST-Tracks-')\n    ) {\n      setTidalAlphabetVisible(false);\n      renderPlaylistItems(items, title);\n    } else {\n`;

if (!source.includes(renderBranch)) {
  throw new Error('Expected playlist render branch not found; refusing to edit');
}
source = source.replace(renderBranch, renderReplacement);

const playControls = `    playTidalPlaylist(\n      tidalCurrentPlaylistCid,\n      '',\n      action === 'shuffle-all',\n      playlistAction\n    );\n`;
const playControlsReplacement = `    playTidalPlaylist(\n      currentTidalContainerCid(),\n      '',\n      action === 'shuffle-all',\n      playlistAction\n    );\n`;

if (!source.includes(playControls)) {
  throw new Error('Expected playlist control handler not found; refusing to edit');
}
source = source.replace(playControls, playControlsReplacement);

const songCondition = `    if (currentTidalContainerIsPlaylist()) {\n      openTidalTrackActionMenu(button, name);\n      return;\n    }\n`;
const songReplacement = `    if (currentTidalContainerIsTrackList()) {\n      openTidalTrackActionMenu(button, name);\n      return;\n    }\n`;

if (!source.includes(songCondition)) {
  throw new Error('Expected playlist song-action condition not found; refusing to edit');
}
source = source.replace(songCondition, songReplacement);

const backup = uiPath + '.before-tidal-artist-track-actions';
if (!fs.existsSync(backup)) fs.copyFileSync(uiPath, backup);

fs.writeFileSync(uiPath, source);
console.log('Applied guarded TIDAL artist track controls migration');
console.log('Backup:', backup);
