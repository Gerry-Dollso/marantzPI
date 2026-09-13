'use strict';

const fs = require('fs');
const crypto = require('crypto');

const FILES = {
  ui: 'public/tidal-ui.js',
  server: 'server.js'
};

const EXPECTED = {
  ui: 'e678c86cf71ff1cd70d792e650accef5408191d4',
  server: 'c15e1e3a0e3e3dde0198ba1421e8883754f035b8'
};

function sha1(text) {
  return crypto.createHash('sha1').update(text).digest('hex');
}

function readGuarded(key) {
  const file = FILES[key];
  const text = fs.readFileSync(file, 'utf8');
  const actual = sha1(text);
  if (actual !== EXPECTED[key]) {
    throw new Error(`${file}: guard failed; expected ${EXPECTED[key]}, got ${actual}`);
  }
  return text;
}

function replaceOnce(text, before, after, label) {
  const first = text.indexOf(before);
  if (first < 0) throw new Error(`${label}: expected source block not found`);
  if (text.indexOf(before, first + before.length) >= 0) {
    throw new Error(`${label}: expected source block is not unique`);
  }
  return text.slice(0, first) + after + text.slice(first + before.length);
}

let ui = readGuarded('ui');
let server = readGuarded('server');

const oldAlbumsLoader = `async function loadTidalAlbums() {
  tidalShowAlbumArtists = true;
  tidalStatus.textContent = 'Loading Albums…';
  tidalResults.replaceChildren();
  setTidalAlphabetVisible(false);

  try {
    const response = await fetch(
      '/api/tidal/browse?cid=' + encodeURIComponent('My Music-Albums'),
      { cache: 'no-store' }
    );

    const result = await response.json();

    if (!response.ok || result.ok === false) {
      throw new Error(result.error || 'Could not load albums');
    }

    tidalAlbumItems = Array.isArray(result.items) ? result.items : [];
    tidalAlbumLetter = 'ALL';
    setTidalAlphabetVisible(true);
    renderFilteredAlbums();
    tidalResults.scrollTop = 0;
  } catch (error) {
    tidalStatus.textContent = error.message;
  }
}`;

const newLibraryLoaders = `async function loadTidalArtists() {
  tidalShowAlbumArtists = false;
  tidalStatus.textContent = 'Loading Artists…';
  tidalResults.replaceChildren();
  setTidalAlphabetVisible(false);

  try {
    const response = await fetch(
      '/api/tidal/favourite-artists',
      { cache: 'no-store' }
    );

    const result = await response.json();

    if (!response.ok || result.ok === false) {
      throw new Error(result.error || 'Could not load artists');
    }

    const artists = Array.isArray(result.artists) ? result.artists : [];
    tidalArtistItems = artists.map(artist => ({
      name: artist.name,
      cid: artist.cid,
      type: 'artist',
      container: true,
      playable: false,
      imageUrl: artist.artwork
    }));

    tidalArtistLetter = 'ALL';
    setTidalAlphabetVisible(true);
    renderFilteredArtists();
    tidalResults.scrollTop = 0;
  } catch (error) {
    tidalStatus.textContent = error.message;
  }
}

async function loadTidalAlbums() {
  tidalShowAlbumArtists = true;
  tidalStatus.textContent = 'Loading Albums…';
  tidalResults.replaceChildren();
  setTidalAlphabetVisible(false);

  try {
    const response = await fetch(
      '/api/tidal/favourite-albums',
      { cache: 'no-store' }
    );

    const result = await response.json();

    if (!response.ok || result.ok === false) {
      throw new Error(result.error || 'Could not load albums');
    }

    const albums = Array.isArray(result.albums) ? result.albums : [];
    tidalAlbumItems = albums.map(album => ({
      name: album.title,
      cid: album.cid,
      type: 'album',
      container: true,
      playable: false,
      artist: album.artist,
      imageUrl: album.artwork,
      albumId: String(album.id || '')
    }));

    tidalAlbumLetter = 'ALL';
    setTidalAlphabetVisible(true);
    renderFilteredAlbums();
    tidalResults.scrollTop = 0;
  } catch (error) {
    tidalStatus.textContent = error.message;
  }
}`;

ui = replaceOnce(
  ui,
  oldAlbumsLoader,
  newLibraryLoaders,
  'official Artists/Albums loaders'
);

const oldBrowseSpecialCase = `  if (cid === 'My Music-Albums') {
    tidalScreen.classList.add("browsing");
    setTidalKeyboardOpen(false);
    tidalSearchInput.blur();
    await loadTidalAlbums();
    return;
  }

  tidalScreen.classList.add("browsing");`;

const newBrowseSpecialCase = `  if (cid === 'My Music-Albums') {
    tidalScreen.classList.add("browsing");
    setTidalKeyboardOpen(false);
    tidalSearchInput.blur();
    await loadTidalAlbums();
    return;
  }

  if (cid === 'My Music-Artists') {
    tidalScreen.classList.add("browsing");
    setTidalKeyboardOpen(false);
    tidalSearchInput.blur();
    await loadTidalArtists();
    return;
  }

  tidalScreen.classList.add("browsing");`;

ui = replaceOnce(
  ui,
  oldBrowseSpecialCase,
  newBrowseSpecialCase,
  'Artists browse shortcut'
);

const oldFavouriteTracksProxy = `      if (req.method === 'GET' && url.pathname === '/api/tidal/favourite-tracks') {
        const result = await mediaBackendRequest(
          '/api/tidal/favourite-tracks',
          'GET',
          40000
        );

        return sendJson(res, 200, result);
      }
`;

const newOfficialLibraryProxies = `      if (req.method === 'GET' && url.pathname === '/api/tidal/favourite-artists') {
        const result = await mediaBackendRequest(
          '/api/tidal/favourite-artists',
          'GET',
          40000
        );

        return sendJson(res, 200, result);
      }

      if (req.method === 'GET' && url.pathname === '/api/tidal/favourite-albums') {
        const result = await mediaBackendRequest(
          '/api/tidal/favourite-albums',
          'GET',
          120000
        );

        return sendJson(res, 200, result);
      }

      if (req.method === 'GET' && url.pathname === '/api/tidal/favourite-tracks') {
        const result = await mediaBackendRequest(
          '/api/tidal/favourite-tracks',
          'GET',
          40000
        );

        return sendJson(res, 200, result);
      }
`;

server = replaceOnce(
  server,
  oldFavouriteTracksProxy,
  newOfficialLibraryProxies,
  'official Artists/Albums proxies'
);

fs.writeFileSync(FILES.ui, ui);
fs.writeFileSync(FILES.server, server);

console.log(`${FILES.ui}: ${sha1(ui)}`);
console.log(`${FILES.server}: ${sha1(server)}`);
console.log('Official TIDAL Artists/Albums UI migration applied; no service restart performed.');