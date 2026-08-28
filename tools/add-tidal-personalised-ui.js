'use strict';

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'public', 'tidal-ui.js');
let source = fs.readFileSync(file, 'utf8');

if (source.includes('async function loadTidalPersonalised()')) {
  console.log('Personalised TIDAL UI already present; no change needed.');
  process.exit(0);
}

const rootMarker = "const TIDAL_UI_ROOT_CID = 'My Music';\nconst TIDAL_UI_ROOT_TITLE = 'My Music';";
if (!source.includes(rootMarker)) {
  throw new Error('Expected TIDAL root marker not found; refusing to edit tidal-ui.js');
}
source = source.replace(rootMarker, rootMarker + "\nconst TIDAL_PERSONALISED_CID = '__personalised__';\nconst TIDAL_PERSONALISED_PLAYLIST_PREFIX = '__personalised_playlist__:';");

const browseMarker = 'async function browseTidal(cid, title, pushHistory = true) {';
if (!source.includes(browseMarker)) {
  throw new Error('Expected browseTidal marker not found; refusing to edit tidal-ui.js');
}

const functions = `function makeTidalPersonalisedPlaylistButton(playlist) {
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
}

async function loadTidalPersonalised(pushHistory = true) {
  if (pushHistory) {
    tidalHistory.push({ cid: TIDAL_PERSONALISED_CID, title: 'For You' });
  }

  tidalScreen.classList.add('browsing');
  setTidalKeyboardOpen(false);
  tidalSearchInput.blur();
  setTidalAlphabetVisible(false);
  tidalStatus.textContent = 'Loading For You…';
  tidalResults.replaceChildren();

  try {
    const response = await fetch('/api/tidal/personalised', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || result.ok === false) {
      throw new Error(result.error || 'Could not load personalised TIDAL');
    }

    const playlists = Array.isArray(result.playlists) ? result.playlists : [];
    tidalStatus.textContent = 'For You — ' + playlists.length + ' playlists';
    playlists.forEach(playlist => {
      tidalResults.appendChild(makeTidalPersonalisedPlaylistButton(playlist));
    });
    tidalResults.scrollTop = 0;
  } catch (error) {
    tidalStatus.textContent = error.message;
  }
}

async function loadTidalPersonalisedPlaylist(id, title, pushHistory = true) {
  const playlistId = String(id || '').trim();
  if (!/^[a-zA-Z0-9]+$/.test(playlistId)) {
    tidalStatus.textContent = 'Invalid personalised playlist';
    return;
  }

  if (pushHistory) {
    tidalHistory.push({
      cid: TIDAL_PERSONALISED_PLAYLIST_PREFIX + playlistId,
      title: title || 'Playlist'
    });
  }

  tidalScreen.classList.add('browsing');
  setTidalKeyboardOpen(false);
  tidalSearchInput.blur();
  setTidalAlphabetVisible(false);
  tidalStatus.textContent = 'Loading ' + (title || 'playlist') + '…';
  tidalResults.replaceChildren();

  try {
    const response = await fetch(
      '/api/tidal/personalised/playlist?id=' + encodeURIComponent(playlistId),
      { cache: 'no-store' }
    );
    const result = await response.json();
    if (!response.ok || result.ok === false) {
      throw new Error(result.error || 'Could not load personalised playlist');
    }

    const tracks = Array.isArray(result.tracks) ? result.tracks : [];
    tidalResults.replaceChildren();
    tracks.forEach(track => {
      tidalResults.appendChild(makeBrowseButton({
        type: 'personalised-song',
        name: track.title,
        artist: track.artist,
        imageUrl: track.artwork,
        mid: track.id,
        albumId: track.albumId
      }));
    });
    tidalStatus.textContent = (result.playlist?.name || title || 'Playlist') +
      ' — ' + tracks.length + ' tracks';
    tidalResults.scrollTop = 0;
  } catch (error) {
    tidalStatus.textContent = error.message;
  }
}

`;
source = source.replace(browseMarker, functions + browseMarker);

const shortcutMarker = "tidalShortcuts.addEventListener('click', event => {";
if (!source.includes(shortcutMarker)) {
  throw new Error('Expected shortcut handler not found; refusing to edit tidal-ui.js');
}
source = source.replace(shortcutMarker, `tidalShortcuts.addEventListener('click', event => {
  const personalised = event.target.closest('[data-tidal-personalised]');
  if (personalised) {
    loadTidalPersonalised();
    return;
  }
`);

const resultClickMarker = "  const button = event.target.closest('.tidal-artist');\n  if (!button) return;";
if (!source.includes(resultClickMarker)) {
  throw new Error('Expected result click marker not found; refusing to edit tidal-ui.js');
}
source = source.replace(resultClickMarker, `  const button = event.target.closest('.tidal-artist');
  if (!button) return;

  if (button.dataset.personalisedPlaylistId) {
    const label = button.querySelector('.tidal-artist-name');
    loadTidalPersonalisedPlaylist(
      button.dataset.personalisedPlaylistId,
      label ? label.textContent.trim() : 'Playlist'
    );
    return;
  }

  if (button.dataset.type === 'personalised-song') {
    tidalStatus.textContent = 'Personalised track playback is not enabled yet';
    return;
  }`);

const backMarker = "    browseTidal(previous.cid, previous.title, false);\n    return;";
if (!source.includes(backMarker)) {
  throw new Error('Expected back-navigation marker not found; refusing to edit tidal-ui.js');
}
source = source.replace(backMarker, `    if (previous.cid === TIDAL_PERSONALISED_CID) {
      loadTidalPersonalised(false);
    } else if (previous.cid.startsWith(TIDAL_PERSONALISED_PLAYLIST_PREFIX)) {
      loadTidalPersonalisedPlaylist(
        previous.cid.slice(TIDAL_PERSONALISED_PLAYLIST_PREFIX.length),
        previous.title,
        false
      );
    } else {
      browseTidal(previous.cid, previous.title, false);
    }
    return;`);

fs.writeFileSync(file, source);
console.log('Added read-only personalised TIDAL browse UI to tidal-ui.js');
