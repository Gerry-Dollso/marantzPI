'use strict';

const fs = require('fs');

const jsPath = 'public/tidal-ui.js';
const cssPath = 'public/tidal-ui.css';

let js = fs.readFileSync(jsPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');

const oldButton = `function makeTidalPersonalisedPlaylistButton(playlist) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tidal-artist tidal-browse-item';
  button.dataset.personalisedPlaylistId = String(playlist.id || '');

  const artwork = document.createElement('span');
  artwork.className = 'tidal-artist-artwork';

  const text = document.createElement('span');
  text.className = 'tidal-browse-text';

  const name = document.createElement('span');
  name.className = 'tidal-artist-name';
  name.textContent = playlist.name || 'TIDAL playlist';
  text.appendChild(name);

  button.append(artwork, text);
  return button;
}`;

const newButton = `function makeTidalPersonalisedPlaylistButton(playlist) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tidal-artist tidal-browse-item tidal-personalised-card';
  button.dataset.personalisedPlaylistId = String(playlist.id || '');

  const artwork = document.createElement('span');
  artwork.className = 'tidal-artist-artwork tidal-personalised-artwork';

  const text = document.createElement('span');
  text.className = 'tidal-browse-text';

  const name = document.createElement('span');
  name.className = 'tidal-artist-name';
  name.textContent = playlist.name || 'TIDAL playlist';
  text.appendChild(name);

  const description = String(playlist.description || '').trim();
  if (description) {
    const descriptionNode = document.createElement('span');
    descriptionNode.className = 'tidal-personalised-description';
    descriptionNode.textContent = description;
    text.appendChild(descriptionNode);
  }

  button.append(artwork, text);
  return button;
}

function setTidalPersonalisedArtwork(button, tracks) {
  const artwork = button?.querySelector('.tidal-personalised-artwork');
  if (!artwork) return;

  const urls = [];
  for (const track of tracks || []) {
    const url = String(track?.artwork || '').trim();
    if (!url || urls.includes(url)) continue;
    urls.push(url);
    if (urls.length === 4) break;
  }

  if (!urls.length) return;

  artwork.replaceChildren();
  artwork.classList.toggle('single', urls.length === 1);

  urls.forEach(url => {
    const image = document.createElement('img');
    image.src = url;
    image.alt = '';
    image.loading = 'lazy';
    artwork.appendChild(image);
  });
}

async function loadTidalPersonalisedArtwork(playlist, button) {
  const playlistId = String(playlist?.id || '').trim();
  if (!playlistId || !button?.isConnected) return;

  try {
    const response = await fetch(
      '/api/tidal/personalised/playlist?id=' + encodeURIComponent(playlistId),
      { cache: 'no-store' }
    );
    const result = await response.json();
    if (!response.ok || result.ok === false || !button.isConnected) return;

    setTidalPersonalisedArtwork(
      button,
      Array.isArray(result.tracks) ? result.tracks : []
    );
  } catch {
    // Artwork enrichment is optional; keep the card usable without it.
  }
}

async function enrichTidalPersonalisedArtwork(entries, concurrency = 3) {
  let next = 0;

  async function worker() {
    while (next < entries.length) {
      const index = next++;
      const entry = entries[index];
      await loadTidalPersonalisedArtwork(entry.playlist, entry.button);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, entries.length) },
    () => worker()
  );
  await Promise.all(workers);
}`;

const oldRender = `    const playlists = Array.isArray(result.playlists) ? result.playlists : [];
    tidalStatus.textContent = 'My Mixes — ' + playlists.length + ' playlists';
    playlists.forEach(playlist => {
      tidalResults.appendChild(makeTidalPersonalisedPlaylistButton(playlist));
    });
    tidalResults.scrollTop = 0;`;

const newRender = `    const playlists = Array.isArray(result.playlists) ? result.playlists : [];
    tidalStatus.textContent = 'My Mixes — ' + playlists.length + ' playlists';

    const artworkEntries = [];
    playlists.forEach(playlist => {
      const button = makeTidalPersonalisedPlaylistButton(playlist);
      tidalResults.appendChild(button);
      artworkEntries.push({ playlist, button });
    });

    tidalResults.scrollTop = 0;
    void enrichTidalPersonalisedArtwork(artworkEntries);`;

const cssAnchor = `.tidal-artist-artwork img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}
`;

const cssInsert = `.tidal-artist-artwork img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.tidal-personalised-artwork {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 1px;
}

.tidal-personalised-artwork.single {
  display: block;
}

.tidal-personalised-artwork img {
  min-width: 0;
  min-height: 0;
}

.tidal-personalised-description {
  display: -webkit-box;
  margin-top: 3px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-size: 11px;
  line-height: 1.18;
  opacity: 0.62;
}
`;

for (const [label, source, anchor] of [
  ['button', js, oldButton],
  ['render', js, oldRender],
  ['css', css, cssAnchor]
]) {
  const count = source.split(anchor).length - 1;
  if (count !== 1) {
    throw new Error(`Guard failed for ${label}: expected 1 anchor, found ${count}`);
  }
}

js = js.replace(oldButton, newButton).replace(oldRender, newRender);
css = css.replace(cssAnchor, cssInsert);

fs.writeFileSync(jsPath, js);
fs.writeFileSync(cssPath, css);
console.log('Applied guarded personalised TIDAL landing-card migration');
