'use strict';

const fs = require('fs');
const path = require('path');

const jsFile = path.join(__dirname, '..', 'public', 'tidal-ui.js');
const cssFile = path.join(__dirname, '..', 'public', 'tidal-ui.css');
let js = fs.readFileSync(jsFile, 'utf8');
let css = fs.readFileSync(cssFile, 'utf8');

function replaceOnce(text, before, after, label) {
  const count = text.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected exactly one anchor, found ${count}`);
  }
  return text.replace(before, after);
}

js = replaceOnce(
  js,
`  if (\n    (tidalShowAlbumArtists ||\n     item.type === 'song' ||\n     item.type === 'album') &&\n    item.artist\n  ) {\n    const artist = document.createElement('span');\n    artist.className = 'tidal-browse-artist';\n    artist.textContent = tidalDisplayName(item.artist);\n    text.appendChild(artist);\n  }\n\n  button.append(artwork, text);`,
`  if (\n    (tidalShowAlbumArtists ||\n     item.type === 'song' ||\n     item.type === 'album' ||\n     item.type === 'personalised-song') &&\n    item.artist\n  ) {\n    const artist = document.createElement('span');\n    artist.className = 'tidal-browse-artist';\n    artist.textContent = tidalDisplayName(item.artist);\n    text.appendChild(artist);\n  }\n\n  if (item.type === 'personalised-song' && item.album) {\n    const album = document.createElement('span');\n    album.className = 'tidal-browse-album';\n    album.textContent = tidalDisplayName(item.album);\n    text.appendChild(album);\n  }\n\n  button.append(artwork, text);`,
  'browse metadata renderer'
);

js = replaceOnce(
  js,
`        artist: track.artist,\n        imageUrl: track.artwork,\n        mid: track.id,\n        albumId: track.albumId`,
`        artist: track.artist,\n        album: track.album,\n        imageUrl: track.artwork,\n        mid: track.id,\n        albumId: track.albumId`,
  'personalised track mapping'
);

css = replaceOnce(
  css,
`.tidal-browse-artist {\n  margin-top: 3px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  font-size: 12px;\n  opacity: 0.62;\n}`,
`.tidal-browse-artist {\n  margin-top: 3px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  font-size: 12px;\n  opacity: 0.72;\n}\n\n.tidal-browse-album {\n  margin-top: 1px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  font-size: 11px;\n  opacity: 0.48;\n}`,
  'browse metadata styles'
);

fs.writeFileSync(jsFile, js);
fs.writeFileSync(cssFile, css);
console.log('Applied guarded richer My Mix track metadata migration');
