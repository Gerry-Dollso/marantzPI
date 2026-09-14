'use strict';

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'public', 'tidal-ui.js');
const source = fs.readFileSync(file, 'utf8');

const oldBlock = `    tidalArtistItems = artists.map(artist => ({\n      name: artist.name,\n      cid: artist.cid,\n      type: 'artist',\n      container: true,\n      playable: false,\n      imageUrl: artist.artwork\n    }));`;

const newBlock = `    tidalArtistItems = artists\n      .map(artist => ({\n        name: artist.name,\n        cid: artist.cid,\n        type: 'artist',\n        container: true,\n        playable: false,\n        imageUrl: artist.artwork\n      }))\n      .sort((a, b) =>\n        String(a.name || '').localeCompare(\n          String(b.name || ''),\n          undefined,\n          { sensitivity: 'base' }\n        )\n      );`;

const count = source.split(oldBlock).length - 1;
if (count !== 1) {
  throw new Error(`Expected artist mapping block exactly once; found ${count}`);
}

if (source.includes("String(a.name || '').localeCompare")) {
  throw new Error('Artist alphabetical sort already appears to be present');
}

fs.writeFileSync(file, source.replace(oldBlock, newBlock));

console.log('public/tidal-ui.js: Artists display now sorts alphabetically by name');
console.log('Albums, Tracks, Playlists and playback paths were not modified.');
