'use strict';

const tidalScreen = document.getElementById('tidalScreen');
const tidalBack = document.getElementById('tidalBack');
const tidalNowPlaying = document.getElementById('tidalNowPlaying');
const tidalSearchForm = document.getElementById('tidalSearchForm');
const tidalSearchInput = document.getElementById('tidalSearchInput');
const tidalStatus = document.getElementById('tidalStatus');
const tidalResults = document.getElementById('tidalResults');

const tidalPersonalisedControls = document.createElement('div');
tidalPersonalisedControls.className = 'tidal-personalised-controls';
tidalPersonalisedControls.hidden = true;

const tidalPersonalisedPlayAll = document.createElement('button');
tidalPersonalisedPlayAll.type = 'button';
tidalPersonalisedPlayAll.dataset.personalisedPlaylistAction = 'play-all';
tidalPersonalisedPlayAll.textContent = 'PLAY ALL';

const tidalPersonalisedShuffleAll = document.createElement('button');
tidalPersonalisedShuffleAll.type = 'button';
tidalPersonalisedShuffleAll.dataset.personalisedPlaylistAction = 'shuffle-all';
tidalPersonalisedShuffleAll.textContent = 'SHUFFLE ALL';

tidalPersonalisedControls.append(
  tidalPersonalisedPlayAll,
  tidalPersonalisedShuffleAll
);
tidalSearchForm.insertAdjacentElement('afterend', tidalPersonalisedControls);

function setTidalPersonalisedChrome(mode = 'normal', playlistId = '') {
  const root = mode === 'root';
  const playlist = mode === 'playlist';

  tidalSearchForm.hidden = !root;
  tidalPersonalisedControls.hidden = !playlist;
  tidalScreen.classList.toggle('tidal-search-hidden', !root);
  tidalScreen.classList.toggle('tidal-personalised-playlist', playlist);

  const id = playlist ? String(playlistId || '') : '';
  tidalPersonalisedPlayAll.dataset.personalisedPlaylistId = id;
  tidalPersonalisedShuffleAll.dataset.personalisedPlaylistId = id;

  tidalPersonalisedPlayAll.disabled = false;
  tidalPersonalisedShuffleAll.disabled = false;
  tidalPersonalisedPlayAll.classList.remove('loading');
  tidalPersonalisedShuffleAll.classList.remove('loading');
}

let tidalSwipeReturnArmed = false;

function setTidalOpen(open) {
  if (open) tidalSwipeReturnArmed = false;
  document.body.classList.toggle("show-tidal", open);
  tidalScreen.setAttribute("aria-hidden", String(!open));
  if (!open) tidalSearchInput.blur();
}

window.addEventListener('popstate', () => {
  if (!tidalSwipeReturnArmed) return;
  if (document.body.classList.contains('show-tidal')) return;
  if (nowPlayingScreen?.getAttribute('aria-hidden') === 'true') return;
  if (latest?.playbackSource !== 'tidal') return;

  tidalSwipeReturnArmed = false;
  closeTidalTrackActionMenu?.();
  setTidalOpen(true);
});

tidalNowPlaying?.addEventListener('click', () => {
  closeTidalTrackActionMenu?.();
  setTidalOpen(false);
});

function tidalDisplayName(value) {
  const text = String(value || '');

  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

const tidalShortcuts = document.getElementById('tidalShortcuts');
const tidalAlphabet = document.getElementById('tidalAlphabet');
let tidalArtistItems = [];
let tidalArtistLetter = 'ALL';
let tidalAlbumItems = [];
let tidalAlbumLetter = 'ALL';
let tidalTrackPage = 0;
const tidalTrackPageSize = 50;
let tidalTrackTotal = 0;
let tidalShowAlbumArtists = false;
let tidalCurrentPlaylistCid = '';

let tidalTrackActionSelection = null;

const tidalTrackActionOverlay = document.createElement('div');
tidalTrackActionOverlay.className = 'tidal-track-action-overlay';
tidalTrackActionOverlay.setAttribute('aria-hidden', 'true');

const tidalTrackActionPanel = document.createElement('div');
tidalTrackActionPanel.className = 'tidal-track-action-panel';

const tidalTrackActionTitle = document.createElement('div');
tidalTrackActionTitle.className = 'tidal-track-action-title';
tidalTrackActionTitle.textContent = 'TRACK OPTIONS';

const tidalTrackActionName = document.createElement('div');
tidalTrackActionName.className = 'tidal-track-action-name';

const tidalTrackActionButtons = document.createElement('div');
tidalTrackActionButtons.className = 'tidal-track-action-buttons';

[
  ['play-now', 'PLAY NOW'],
  ['play-next', 'PLAY NEXT'],
  ['add-end', 'ADD TO END'],
  ['play-from-here', 'PLAY FROM HERE'],
  ['play-only', 'PLAY ONLY'],
  ['cancel', 'CANCEL']
].forEach(([action, label]) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.trackAction = action;
  button.textContent = label;
  if (action === 'cancel') button.className = 'tidal-track-action-cancel';
  tidalTrackActionButtons.appendChild(button);
});

tidalTrackActionPanel.append(
  tidalTrackActionTitle,
  tidalTrackActionName,
  tidalTrackActionButtons
);
tidalTrackActionOverlay.appendChild(tidalTrackActionPanel);
tidalScreen.appendChild(tidalTrackActionOverlay);

function currentTidalContainerCid() {
  const current = tidalHistory[tidalHistory.length - 1];
  return String(current?.cid || '');
}

function currentTidalContainerIsPlaylist() {
  return currentTidalContainerCid().startsWith('LIBPLAYLIST-');
}

function currentTidalContainerIsTrackList() {
  const cid = currentTidalContainerCid();
  return (
    cid === 'My Music-Tracks' ||
    cid.startsWith('LIBPLAYLIST-') ||
    cid.startsWith('LIBARTIST-Tracks-')
  );
}

function closeTidalTrackActionMenu() {
  tidalTrackActionSelection = null;
  tidalTrackActionOverlay.classList.remove('open');
  tidalTrackActionOverlay.setAttribute('aria-hidden', 'true');
}

function openTidalTrackActionMenu(button, name) {
  const cid = currentTidalContainerCid();
  const mid = String(button?.dataset?.mid || '');

  if (!cid || !mid) {
    tidalStatus.textContent = 'Track options unavailable';
    return;
  }

  tidalTrackActionSelection = {
    cid,
    mid,
    name: name || 'Track',
    personalised: button?.dataset?.type === 'personalised-song'
  };
  tidalTrackActionName.textContent = name || 'Track';
  tidalTrackActionOverlay.classList.add('open');
  tidalTrackActionOverlay.setAttribute('aria-hidden', 'false');
}

async function runTidalTrackAction(action, actionButton) {
  const selection = tidalTrackActionSelection;
  if (!selection) return;

  if (action === 'cancel') {
    closeTidalTrackActionMenu();
    return;
  }

  actionButton.disabled = true;
  actionButton.classList.add('loading');

  if (action === 'play-from-here') {
    closeTidalTrackActionMenu();
    tidalSwipeReturnArmed = true;
    setTidalOpen(false);
  }

  try {
    let actionUrl;
    if (selection.personalised && action === 'play-from-here') {
      if (!selection.cid.startsWith(TIDAL_PERSONALISED_PLAYLIST_PREFIX)) {
        throw new Error('My Mix playlist context is unavailable');
      }
      const playlistId = selection.cid.slice(TIDAL_PERSONALISED_PLAYLIST_PREFIX.length);
      if (!/^[a-zA-Z0-9]+$/.test(playlistId)) {
        throw new Error('My Mix playlist context is invalid');
      }
      actionUrl =
        '/api/tidal/personalised/playlist/play?id=' + encodeURIComponent(playlistId) +
        '&start=' + encodeURIComponent(selection.mid) +
        '&shuffle=0';
    } else if (selection.personalised) {
      actionUrl =
        '/api/tidal/play-resolved?id=' + encodeURIComponent(selection.mid) +
        '&action=' + encodeURIComponent(action);
    } else {
      actionUrl =
        '/api/tidal/track/action?cid=' + encodeURIComponent(selection.cid) +
        '&mid=' + encodeURIComponent(selection.mid) +
        '&action=' + encodeURIComponent(action);
    }

    const response = await fetch(actionUrl, { cache: 'no-store' });
    const result = await response.json();

    if (!response.ok || result.ok === false) {
      throw new Error(result.error || 'Track action failed');
    }

    const statusByAction = {
      'play-now': 'Playing',
      'play-next': 'Queued next',
      'add-end': 'Added to end',
      'play-from-here': 'Playing from',
      'play-only': 'Playing only'
    };

    closeTidalTrackActionMenu();
    tidalStatus.textContent =
      (statusByAction[action] || 'Updated') + ' — ' + selection.name;

    if (['play-now', 'play-from-here', 'play-only'].includes(action)) {
      tidalSwipeReturnArmed = true;
      setTidalOpen(false);
    }
  } catch (error) {
    tidalStatus.textContent = error.message;
  } finally {
    actionButton.disabled = false;
    actionButton.classList.remove('loading');
  }
}

tidalTrackActionOverlay.addEventListener('click', event => {
  const button = event.target.closest('[data-track-action]');
  if (!button) return;
  runTidalTrackAction(button.dataset.trackAction, button);
});


function buildTidalAlphabet() {
  tidalAlphabet.replaceChildren();

  const all = document.createElement('button');
  all.type = 'button';
  all.dataset.letter = 'ALL';
  all.textContent = 'ALL';
  all.className = 'tidal-letter-all';
  tidalAlphabet.appendChild(all);

  const left = 'ABCDEFGHIJKLM';
  const right = 'NOPQRSTUVWXYZ';

  for (let i = 0; i < 13; i++) {
    [left[i], right[i]].forEach(letter => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.letter = letter;
      button.textContent = letter;
      tidalAlphabet.appendChild(button);
    });
  }
}

buildTidalAlphabet();

const TIDAL_UI_ROOT_CID = 'My Music';
const TIDAL_UI_ROOT_TITLE = 'My Music';
const TIDAL_PERSONALISED_CID = '__personalised__';
const TIDAL_PERSONALISED_PLAYLIST_PREFIX = '__personalised_playlist__:';

const tidalHistory = [];

function saveCurrentTidalScrollPosition() {
  const current = tidalHistory[tidalHistory.length - 1];
  if (current) current.scrollTop = tidalResults.scrollTop;
}

function restoreTidalScrollPosition(entry) {
  const scrollTop = Number(entry?.scrollTop) || 0;
  requestAnimationFrame(() => { tidalResults.scrollTop = scrollTop; });
}


const TIDAL_CATEGORY_ICONS = {
  'My Music-Playlists': '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 10h22v28H13zM18 17h12M18 23h12M18 29h7"/><path d="M29 27v7.5a3.5 3.5 0 1 1-2-3.1V27h7"/></svg>',
  'My Music-Artists': '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="17" r="7"/><path d="M12 38c1.8-7.2 6-11 12-11s10.2 3.8 12 11"/></svg>',
  'My Music-Albums': '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="15"/><circle cx="24" cy="24" r="4"/><path d="M24 9v11M39 24H28"/></svg>',
  'My Music-Tracks': '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M20 13v22a5 5 0 1 1-3-4.6V17l18-4v18a5 5 0 1 1-3-4.6V9z"/></svg>',
  '__personalised__': '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="3"/><path d="M17.5 17.5a9.2 9.2 0 0 0 0 13M30.5 17.5a9.2 9.2 0 0 1 0 13M12 12a17 17 0 0 0 0 24M36 12a17 17 0 0 1 0 24"/></svg>',
  'Genres': '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="15"/><circle cx="24" cy="24" r="4"/><path d="M14 15l7 6M34 15l-7 6M14 33l7-6M34 33l-7-6"/></svg>',
  'My Music-Playlists-Created by me': '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 10h22v28H13zM18 18h12M18 24h9M18 30h6"/><path d="M31 28v8M27 32h8"/></svg>',
  'My Music-Playlists-Favorited': '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 37S10 29 10 19.5C10 14 16.5 11 24 18c7.5-7 14-4 14 1.5C38 29 24 37 24 37z"/></svg>'
};

function tidalCategoryIcon(cid) {
  return TIDAL_CATEGORY_ICONS[String(cid || '')] || '';
}

function makeBrowseButton(item) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tidal-artist tidal-browse-item';
  button.dataset.cid =
    item.cid ||
    (item.type === 'song' ? tidalCurrentPlaylistCid : '');
  button.dataset.type = item.type || '';
  button.dataset.container = item.container ? 'yes' : 'no';
  button.dataset.playable = item.playable ? 'yes' : 'no';
  button.dataset.mid = item.mid || '';
  button.dataset.albumId = item.albumId || '';
  if (item.type === 'personalised') button.dataset.tidalPersonalised = 'yes';

  const artwork = document.createElement('span');
  artwork.className = 'tidal-artist-artwork';

  if (item.imageUrl) {
    const image = document.createElement('img');
    image.src = item.imageUrl;
    image.alt = '';
    image.addEventListener('error', () => image.remove());
    artwork.appendChild(image);
  }
  else {
    const icon = tidalCategoryIcon(item.cid);
    if (icon) {
      artwork.classList.add('tidal-category-icon');
      artwork.innerHTML = icon;
    }
  }

  const text = document.createElement('span');
  text.className = 'tidal-browse-text';

  const name = document.createElement('span');
  name.className = 'tidal-artist-name';
  name.textContent = tidalDisplayName(item.name) || 'Unknown';
  text.appendChild(name);

  if (
    (tidalShowAlbumArtists ||
     item.type === 'song' ||
     item.type === 'album' ||
     item.type === 'personalised-song') &&
    item.artist
  ) {
    const artist = document.createElement('span');
    artist.className = 'tidal-browse-artist';
    artist.textContent = tidalDisplayName(item.artist);
    text.appendChild(artist);
  }

  if ((item.type === 'personalised-song' || item.showAlbum) && item.album) {
    const album = document.createElement('span');
    album.className = 'tidal-browse-album';
    album.textContent = tidalDisplayName(item.album);
    text.appendChild(album);
  }

  button.append(artwork, text);
  return button;
}

function setTidalAlphabetVisible(visible) {
  tidalAlphabet.classList.toggle('open', visible);
  tidalAlphabet.setAttribute('aria-hidden', String(!visible));
  tidalScreen.classList.toggle('artist-filtering', visible);
}

function renderFilteredArtists() {
  let items = tidalArtistItems;

  if (tidalArtistLetter !== 'ALL') {
    items = tidalArtistItems.filter(item => {
      const name = String(item.name || '').trim().toUpperCase();
      return name.startsWith(tidalArtistLetter);
    });
  }

  tidalResults.replaceChildren();

  tidalStatus.textContent =
    tidalArtistLetter === 'ALL'
      ? `Artists — ${items.length} items`
      : `Artists — ${tidalArtistLetter} — ${items.length} items`;

  items.forEach(item => {
    tidalResults.appendChild(makeBrowseButton(item));
  });

  updateTidalAlphabetActive(tidalArtistLetter);
}

function updateTidalAlphabetActive(letter) {
  tidalAlphabet.querySelectorAll('button').forEach(button => {
    button.classList.toggle(
      'active',
      button.dataset.letter === letter
    );
  });
}

function renderFilteredAlbums() {
  let items = tidalAlbumItems;

  if (tidalAlbumLetter !== 'ALL') {
    items = tidalAlbumItems.filter(item => {
      const name = String(item.name || '').trim().toUpperCase();
      return name.startsWith(tidalAlbumLetter);
    });
  }

  tidalResults.replaceChildren();

  const controls = document.createElement('div');
  controls.className = 'tidal-playlist-controls';

  const random = document.createElement('button');
  random.type = 'button';
  random.dataset.albumAction = 'play-random';
  random.textContent = 'PLAY RANDOM';
  random.disabled = tidalAlbumItems.length === 0;

  controls.appendChild(random);
  tidalResults.appendChild(controls);

  items.forEach(item => {
    tidalResults.appendChild(makeBrowseButton(item));
  });

  tidalStatus.textContent =
    tidalAlbumLetter === 'ALL'
      ? `Albums — ${tidalAlbumItems.length} items`
      : `Albums — ${tidalAlbumLetter} — ${items.length} items`;

  updateTidalAlphabetActive(tidalAlbumLetter);
}

tidalAlphabet.addEventListener('click', event => {
  const button = event.target.closest('button[data-letter]');
  if (!button) return;

  const letter = button.dataset.letter || 'ALL';
  if (currentTidalContainerCid() === 'My Music-Albums') {
    tidalAlbumLetter = letter;
    renderFilteredAlbums();
  } else {
    tidalArtistLetter = letter;
    renderFilteredArtists();
  }
});

function renderPlaylistItems(items, title) {
  tidalResults.replaceChildren();

  const controls = document.createElement('div');
  controls.className = 'tidal-playlist-controls';

  const playAll = document.createElement('button');
  playAll.type = 'button';
  playAll.dataset.playlistAction = 'play-all';
  playAll.textContent = 'PLAY ALL';

  const shuffleAll = document.createElement('button');
  shuffleAll.type = 'button';
  shuffleAll.dataset.playlistAction = 'shuffle-all';
  shuffleAll.textContent = 'SHUFFLE ALL';

  controls.append(playAll, shuffleAll);
  tidalResults.appendChild(controls);

  items.forEach(item => {
    tidalResults.appendChild(makeBrowseButton(item));
  });

  tidalStatus.textContent =
    `${title || 'Playlist'} — ${items.length} tracks`;
}

function renderBrowseItems(items, title) {
  tidalResults.replaceChildren();

  if (!items.length) {
    tidalStatus.textContent = 'Nothing found';
    return;
  }

  tidalStatus.textContent =
    `${title || 'TIDAL'} — ${items.length} item${items.length === 1 ? '' : 's'}`;

  items.forEach(item => {
    tidalResults.appendChild(makeBrowseButton(item));
  });
}

async function loadTidalOrdinaryPlaylists(cid, title) {
  tidalShowAlbumArtists = false;
  tidalStatus.textContent = 'Loading ' + (title || 'Playlists') + '…';
  tidalResults.replaceChildren();
  setTidalAlphabetVisible(false);

  try {
    const response = await fetch('/api/tidal/favourite-playlists', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || result.ok === false) {
      throw new Error(result.error || 'Could not load playlists');
    }

    if (cid === 'My Music-Playlists') {
      renderBrowseItems([
        { name: 'Created by me', cid: 'My Music-Playlists-Created by me', type: 'container', container: true, playable: false },
        { name: 'Favorited', cid: 'My Music-Playlists-Favorited', type: 'container', container: true, playable: false }
      ], title || 'Playlists');
      tidalResults.scrollTop = 0;
      return;
    }

    const playlists = cid === 'My Music-Playlists-Created by me'
      ? result.createdByMe
      : result.favorited;
    const items = (Array.isArray(playlists) ? playlists : []).map(playlist => ({
      name: playlist.name,
      cid: playlist.cid,
      type: 'playlist',
      container: true,
      playable: true,
      imageUrl: playlist.artwork
    }));
    renderBrowseItems(items, title);
    tidalResults.scrollTop = 0;
  } catch (error) {
    tidalStatus.textContent = error.message;
  }
}

async function loadTidalArtists() {
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
    tidalArtistItems = artists
      .map(artist => ({
        name: artist.name,
        cid: artist.cid,
        type: 'artist',
        container: true,
        playable: false,
        imageUrl: artist.artwork
      }))
      .sort((a, b) =>
        String(a.name || '').localeCompare(
          String(b.name || ''),
          undefined,
          { sensitivity: 'base' }
        )
      );

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
}

function renderTrackPager() {
  const totalPages = Math.max(
    1,
    Math.ceil(tidalTrackTotal / tidalTrackPageSize)
  );

  const pager = document.createElement('div');
  pager.className = 'tidal-album-pager';

  const previous = document.createElement('button');
  previous.type = 'button';
  previous.dataset.trackPageAction = 'previous';
  previous.textContent = 'PREVIOUS';
  previous.disabled = tidalTrackPage <= 0;

  const label = document.createElement('div');
  label.className = 'tidal-album-page-label';
  label.textContent =
    `PAGE ${tidalTrackPage + 1} OF ${totalPages}`;

  const next = document.createElement('button');
  next.type = 'button';
  next.dataset.trackPageAction = 'next';
  next.textContent = 'NEXT';
  next.disabled = tidalTrackPage >= totalPages - 1;

  pager.append(previous, label, next);
  tidalResults.appendChild(pager);
}

async function loadTidalTrackPage(page = 0) {
  tidalShowAlbumArtists = true;
  tidalTrackPage = 0;

  tidalStatus.textContent = 'Loading Tracks…';
  tidalResults.replaceChildren();
  setTidalAlphabetVisible(false);

  try {
    const response = await fetch(
      '/api/tidal/favourite-tracks',
      { cache: 'no-store' }
    );

    const result = await response.json();

    if (!response.ok || result.ok === false) {
      throw new Error(result.error || 'Could not load tracks');
    }

    const tracks = Array.isArray(result.tracks)
      ? result.tracks
      : [];

    const items = tracks.map(track => ({
      cid: 'My Music-Tracks',
      type: 'song',
      name: track.title,
      artist: track.artist,
      album: track.album,
      imageUrl: track.artwork,
      mid: String(track.id || ''),
      albumId: String(track.albumId || ''),
      container: false,
      playable: true,
      showAlbum: true
    }));

    tidalTrackTotal = items.length;
    renderPlaylistItems(items, 'Tracks');
    tidalResults.scrollTop = 0;
  } catch (error) {
    tidalStatus.textContent = error.message;
  }
}

async function openTidalAlbumFromNowPlaying(cid, title) {
  const albumCid = String(cid || '').trim();
  if (!/^LIBALBUM-\d+$/.test(albumCid)) {
    throw new Error('Invalid TIDAL album cid');
  }

  tidalHistory.length = 0;
  tidalHistory.push({
    cid: TIDAL_UI_ROOT_CID,
    title: TIDAL_UI_ROOT_TITLE
  });
  setTidalOpen(true);
  tidalScreen.classList.add('browsing');
  setTidalKeyboardOpen(false);
  tidalSearchInput.blur();
  setTidalAlphabetVisible(false);
  await loadTidalAlbumTracks(albumCid, title || 'Album');
}

async function openTidalArtistFromNowPlaying(cid, title) {
  const artistCid = String(cid || '').trim();
  if (!artistCid.startsWith('LIBARTIST-')) {
    throw new Error('Invalid TIDAL artist cid');
  }

  tidalHistory.length = 0;
  tidalHistory.push({
    cid: TIDAL_UI_ROOT_CID,
    title: TIDAL_UI_ROOT_TITLE
  });
  setTidalOpen(true);
  await browseTidal(artistCid, title || 'Artist');
}

function makeTidalPersonalisedPlaylistButton(playlist) {
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

function setTidalPersonalisedArtwork(button, urls) {
  const artwork = button?.querySelector('.tidal-personalised-artwork');
  if (!artwork) return;

  const uniqueUrls = [];
  for (const value of urls || []) {
    const url = String(value || '').trim();
    if (!url || uniqueUrls.includes(url)) continue;
    uniqueUrls.push(url);
    if (uniqueUrls.length === 4) break;
  }

  if (!uniqueUrls.length) return;

  artwork.replaceChildren();
  artwork.classList.toggle('single', uniqueUrls.length === 1);

  uniqueUrls.forEach(url => {
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

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(
        '/api/tidal/personalised/artwork?id=' + encodeURIComponent(playlistId),
        { cache: 'no-store' }
      );
      const result = await response.json();
      if (!response.ok || result.ok === false) throw new Error('Artwork request failed');
      if (!button.isConnected) return;

      setTidalPersonalisedArtwork(
        button,
        Array.isArray(result.artwork) ? result.artwork : []
      );
      return;
    } catch {
      if (attempt === 1 || !button.isConnected) return;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

async function enrichTidalPersonalisedArtwork(entries, concurrency = 1) {
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
}

async function loadTidalPersonalised(pushHistory = true) {
  setTidalPersonalisedChrome('landing');

  if (pushHistory) {
    tidalHistory.push({ cid: TIDAL_PERSONALISED_CID, title: 'Mixes & Radio' });
  }

  tidalScreen.classList.add('browsing');
  setTidalKeyboardOpen(false);
  tidalSearchInput.blur();
  setTidalAlphabetVisible(false);
  tidalStatus.textContent = 'Loading Mixes & Radio…';
  tidalResults.replaceChildren();

  try {
    const response = await fetch('/api/tidal/personalised', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || result.ok === false) {
      throw new Error(result.error || 'Could not load Mixes & Radio');
    }

    const playlists = Array.isArray(result.playlists) ? result.playlists : [];

    const personalisedSortRank = name => {
      const title = String(name || '').trim();
      const lower = title.toLowerCase();

      if (lower === 'my new arrivals' || lower === 'new arrivals') return 0;
      if (lower === 'my daily discovery' || lower === 'daily discovery') return 1;

      const mix = lower.match(/^my mix ([1-8])$/);
      if (mix) return 1 + Number(mix[1]);

      if (lower === 'my most listened' || lower === 'most listened') return 10;
      return 11;
    };

    playlists.sort((a, b) => {
      const aRank = personalisedSortRank(a?.name);
      const bRank = personalisedSortRank(b?.name);
      if (aRank !== bRank) return aRank - bRank;

      return String(a?.name || '').localeCompare(
        String(b?.name || ''),
        undefined,
        { sensitivity: 'base' }
      );
    });

    tidalStatus.textContent = 'Mixes & Radio — ' + playlists.length + ' playlists';

    playlists.forEach(playlist => {
      const button = makeTidalPersonalisedPlaylistButton(playlist);
      tidalResults.appendChild(button);
      if (playlist.artwork) {
        setTidalPersonalisedArtwork(button, [playlist.artwork]);
      }
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

  setTidalPersonalisedChrome('playlist', playlistId);

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
        album: track.album,
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

async function browseTidal(cid, title, pushHistory = true) {
  setTidalPersonalisedChrome(
    cid === TIDAL_UI_ROOT_CID ? 'root' : 'normal'
  );

  if (cid !== 'My Music-Albums') {
    tidalShowAlbumArtists = false;
  }

  if (
    cid === 'My Music-Tracks' ||
    String(cid).startsWith('LIBPLAYLIST-')
  ) {
    tidalCurrentPlaylistCid = cid;
  }

  if (pushHistory) {
    saveCurrentTidalScrollPosition();
    tidalHistory.push({
      cid,
      title,
      scrollTop: 0
    });
  }

  if (
    cid === 'My Music-Playlists' ||
    cid === 'My Music-Playlists-Created by me' ||
    cid === 'My Music-Playlists-Favorited'
  ) {
    tidalScreen.classList.add("browsing");
    setTidalKeyboardOpen(false);
    tidalSearchInput.blur();
    await loadTidalOrdinaryPlaylists(cid, title);
    return;
  }

  if (cid === 'My Music-Albums') {
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

  tidalScreen.classList.add("browsing");
  setTidalKeyboardOpen(false);
  tidalSearchInput.blur();

  if (cid === 'My Music-Tracks') {
    await loadTidalTrackPage(0);
    return;
  }

  tidalStatus.textContent = `Loading ${title || 'TIDAL'}…`;
  tidalResults.replaceChildren();

  try {
    const response = await fetch(
      '/api/tidal/browse?cid=' + encodeURIComponent(cid),
      { cache: 'no-store' }
    );

    const result = await response.json();

    if (!response.ok || result.ok === false) {
      throw new Error(result.error || 'Could not browse TIDAL');
    }

    const items = Array.isArray(result.items)
      ? result.items
      : [];

    if (cid === TIDAL_UI_ROOT_CID) {
      items.push({
        type: 'personalised',
        name: 'Mixes & Radio',
        cid: TIDAL_PERSONALISED_CID,
        container: true,
        playable: false
      });
      items.push({
        type: 'genre',
        name: 'Genres',
        cid: 'Genres',
        container: true,
        playable: false
      });
    }

    if (cid === 'My Music-Artists') {
      tidalArtistItems = items;
      tidalArtistLetter = 'ALL';
      setTidalAlphabetVisible(true);
      renderFilteredArtists();
    } else if (
      cid === 'My Music-Tracks' ||
      String(cid).startsWith('LIBPLAYLIST-') ||
      String(cid).startsWith('LIBARTIST-Tracks-')
    ) {
      setTidalAlphabetVisible(false);
      renderPlaylistItems(items, title);
    } else {
      setTidalAlphabetVisible(false);
      renderBrowseItems(items, title);
    }
  } catch (error) {
    tidalStatus.textContent = error.message;
  }
}

tidalShortcuts.addEventListener('click', event => {
  const personalised = event.target.closest('[data-tidal-personalised]');
  if (personalised) {
    loadTidalPersonalised();
    return;
  }

  const button = event.target.closest('[data-tidal-cid]');
  if (!button) return;

  browseTidal(
    button.dataset.tidalCid,
    button.textContent.trim()
  );
});

function makeArtistButton(artist) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tidal-artist';
  button.dataset.cid = artist.cid || '';

  const artwork = document.createElement('span');
  artwork.className = 'tidal-artist-artwork';

  if (artist.imageUrl) {
    const image = document.createElement('img');
    image.src = artist.imageUrl;
    image.alt = '';
    image.addEventListener('error', () => {
      image.remove();
    });
    artwork.appendChild(image);
  }

  const name = document.createElement('span');
  name.className = 'tidal-artist-name';
  name.textContent = tidalDisplayName(artist.name) || 'Unknown artist';

  button.append(artwork, name);
  return button;
}

function renderArtists(artists) {
  tidalResults.replaceChildren();

  if (!artists.length) {
    tidalStatus.textContent = 'No artists found';
    return;
  }

  tidalStatus.textContent =
    `${artists.length} artist${artists.length === 1 ? '' : 's'} found`;

  artists.forEach(artist => {
    tidalResults.appendChild(makeArtistButton(artist));
  });
}

async function searchTidal(query) {
  setTidalPersonalisedChrome('normal');
  setTidalKeyboardOpen(false);
  tidalSearchInput.blur();

  tidalScreen.classList.add("browsing");
  tidalHistory.length = 0;
  tidalHistory.push(
    { cid: TIDAL_UI_ROOT_CID, title: TIDAL_UI_ROOT_TITLE },
    { cid: '__search__', title: query }
  );

  tidalStatus.textContent = 'Searching TIDAL…';
  tidalResults.replaceChildren();

  try {
    const response = await fetch(
      '/api/tidal/search?q=' + encodeURIComponent(query),
      { cache: 'no-store' }
    );

    const result = await response.json();

    if (!response.ok || result.ok === false) {
      throw new Error(result.error || 'TIDAL search failed');
    }

    const artists = Array.isArray(result.artists)
      ? result.artists
      : [];

    const wanted = query.trim().toLowerCase();

    artists.sort((a, b) => {
      const aName = String(a.name || '').trim().toLowerCase();
      const bName = String(b.name || '').trim().toLowerCase();

      const rank = name => {
        if (name === wanted) return 0;
        if (name.startsWith(wanted)) return 1;
        if (name.includes(wanted)) return 2;
        return 3;
      };

      const difference = rank(aName) - rank(bName);

      if (difference !== 0) return difference;

      return aName.localeCompare(bName);
    });

    renderArtists(artists);
  } catch (error) {
    tidalStatus.textContent = error.message;
  }
}

let tidalVoiceSearchLastId = 0;
let tidalPendingVoiceLearn = null;

async function learnTidalVoiceSelection(
  type,
  cid,
  name,
  mid = ''
) {
  const request = tidalPendingVoiceLearn;

  if (!request || !request.id || !cid || !name) return;

  tidalPendingVoiceLearn = null;

  const response = await fetch(
    '/api/tidal/voice-learn?id=' +
    encodeURIComponent(request.id) +
    '&name=' +
    encodeURIComponent(name) +
    '&cid=' +
    encodeURIComponent(cid) +
    '&type=' +
    encodeURIComponent(type || '') +
    '&mid=' +
    encodeURIComponent(mid || ''),
    { method: 'POST', cache: 'no-store' }
  );

  const result = await response.json();

  if (!response.ok || result.ok === false) {
    throw new Error(
      result.error || 'Could not learn voice correction'
    );
  }
}

async function pollTidalVoiceSearch() {
  try {
    const response = await fetch(
      '/api/tidal/voice-search?after=' +
      encodeURIComponent(tidalVoiceSearchLastId),
      { cache: 'no-store' }
    );

    const result = await response.json();
    const request = result && result.request;

    if (
      !response.ok ||
      result.ok === false ||
      !result.pending ||
      !request ||
      !request.id
    ) {
      return;
    }

    tidalVoiceSearchLastId = Number(request.id);

    tidalPendingVoiceLearn = request;

    const query = String(request.query || '').trim();
    if (!query) return;

    setTidalOpen(true);
    tidalSearchInput.value = query;
    await searchTidal(query);
  } catch {
    // Voice-search fallback is optional; normal TIDAL UI remains available.
  }
}

setInterval(pollTidalVoiceSearch, 1500);
pollTidalVoiceSearch();

document.addEventListener(
  'click',
  event => {
    const opener = event.target.closest(
      '[data-action="heos"][data-net-source="tidal"]'
    );

    if (!opener) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    fetch('/api/control/heos', {
      method: 'POST',
      cache: 'no-store'
    }).catch(() => {});

    setTidalOpen(true);
    tidalHistory.length = 0;
    browseTidal(TIDAL_UI_ROOT_CID, TIDAL_UI_ROOT_TITLE);
  },
  true
);

tidalBack.addEventListener('click', () => {
  if (tidalHistory.length > 1) {
    tidalHistory.pop();
    const previous = tidalHistory[tidalHistory.length - 1];
    if (previous.cid === TIDAL_PERSONALISED_CID) {
      loadTidalPersonalised(false);
    } else if (previous.cid.startsWith(TIDAL_PERSONALISED_PLAYLIST_PREFIX)) {
      loadTidalPersonalisedPlaylist(
        previous.cid.slice(TIDAL_PERSONALISED_PLAYLIST_PREFIX.length),
        previous.title,
        false
      );
    } else {
      browseTidal(previous.cid, previous.title, false).then(() => restoreTidalScrollPosition(previous));
    }
    return;
  }

  if (tidalHistory.length === 1) {
    tidalHistory.length = 0;
    setTidalOpen(false);
    return;
  }

  setTidalOpen(false);
});

tidalSearchForm.addEventListener('submit', event => {
  event.preventDefault();

  const query = tidalSearchInput.value.trim();

  if (!query) {
    tidalStatus.textContent = 'Enter an artist name';
    return;
  }

  searchTidal(query);
});

const tidalKeyboard = document.getElementById('tidalKeyboard');

function setTidalKeyboardOpen(open) {
  tidalKeyboard.classList.toggle('open', open);
  tidalKeyboard.setAttribute('aria-hidden', String(!open));
  tidalScreen.classList.toggle('keyboard-open', open);
}

function runTidalKeyboardSearch() {
  const query = tidalSearchInput.value.trim();

  if (!query) {
    tidalStatus.textContent = 'Enter an artist name';
    return;
  }

  setTidalKeyboardOpen(false);
  tidalSearchInput.blur();
  searchTidal(query);
}

tidalSearchInput.addEventListener('focus', () => {
  setTidalKeyboardOpen(true);
});

tidalSearchInput.addEventListener('click', () => {
  setTidalKeyboardOpen(true);
});

tidalKeyboard.addEventListener('pointerdown', event => {
  event.preventDefault();
});

tidalKeyboard.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;

  const key = button.dataset.key;
  const action = button.dataset.keyAction;

  if (key !== undefined) {
    tidalSearchInput.value += key;
    tidalSearchInput.focus();
    return;
  }

  if (action === 'backspace') {
    tidalSearchInput.value = tidalSearchInput.value.slice(0, -1);
    tidalSearchInput.focus();
    return;
  }

  if (action === 'clear') {
    tidalSearchInput.value = '';
    tidalSearchInput.focus();
    return;
  }

  if (action === 'search') {
    runTidalKeyboardSearch();
  }
});

function makeAlbumButton(album) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tidal-artist tidal-album';
  button.dataset.cid = album.cid || '';

  const artwork = document.createElement('span');
  artwork.className = 'tidal-artist-artwork';

  if (album.imageUrl) {
    const image = document.createElement('img');
    image.src = album.imageUrl;
    image.alt = '';
    image.addEventListener('error', () => image.remove());
    artwork.appendChild(image);
  }

  const name = document.createElement('span');
  name.className = 'tidal-artist-name';
  name.textContent = tidalDisplayName(album.name) || 'Unknown album';

  button.append(artwork, name);
  return button;
}

function renderAlbums(albums, artistName) {
  tidalResults.replaceChildren();

  if (!albums.length) {
    tidalStatus.textContent = 'No albums found';
    return;
  }

  tidalStatus.textContent =
    `${artistName || 'Artist'} — ${albums.length} album${albums.length === 1 ? '' : 's'}`;

  albums.forEach(album => {
    tidalResults.appendChild(makeAlbumButton(album));
  });
}

async function loadTidalArtistAlbums(cid, artistName) {
  tidalStatus.textContent = `Loading ${artistName || 'artist'}…`;
  tidalResults.replaceChildren();

  try {
    const response = await fetch(
      '/api/tidal/artist/albums?cid=' + encodeURIComponent(cid),
      { cache: 'no-store' }
    );

    const result = await response.json();

    if (!response.ok || result.ok === false) {
      throw new Error(result.error || 'Could not load albums');
    }

    renderAlbums(
      Array.isArray(result.albums) ? result.albums : [],
      artistName
    );
  } catch (error) {
    tidalStatus.textContent = error.message;
  }
}

function makeTrackButton(track) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tidal-artist tidal-track';
  button.dataset.cid = 'LIBALBUM-' + (track.albumId || '');
  button.dataset.mid = track.mid || '';

  const artwork = document.createElement('span');
  artwork.className = 'tidal-artist-artwork';

  if (track.imageUrl) {
    const image = document.createElement('img');
    image.src = track.imageUrl;
    image.alt = '';
    image.addEventListener('error', () => image.remove());
    artwork.appendChild(image);
  }

  const name = document.createElement('span');
  name.className = 'tidal-artist-name';
  name.textContent = tidalDisplayName(track.name) || 'Unknown track';

  button.append(artwork, name);
  return button;
}

function renderTracks(tracks, albumName) {
  tidalResults.replaceChildren();

  if (!tracks.length) {
    tidalStatus.textContent = 'No tracks found';
    return;
  }

  tidalStatus.textContent =
    `${albumName || 'Album'} — ${tracks.length} track${tracks.length === 1 ? '' : 's'}`;

  const playAll = document.createElement("button");
  playAll.type = "button";
  playAll.className = "tidal-play-all";
  playAll.textContent = "PLAY ALL";
  const firstTrack = tracks[0];
  playAll.dataset.cid = "LIBALBUM-" + (firstTrack.albumId || "");
  playAll.dataset.mid = firstTrack.mid || "";
  tidalResults.appendChild(playAll);
  tracks.forEach(track => {
    tidalResults.appendChild(makeTrackButton(track));
  });
}

async function loadTidalAlbumTracks(cid, albumName) {
  tidalStatus.textContent = `Loading ${albumName || 'album'}…`;
  tidalResults.replaceChildren();

  try {
    const response = await fetch(
      '/api/tidal/album/tracks?cid=' + encodeURIComponent(cid),
      { cache: 'no-store' }
    );

    const result = await response.json();

    if (!response.ok || result.ok === false) {
      throw new Error(result.error || 'Could not load tracks');
    }

    renderTracks(
      Array.isArray(result.tracks) ? result.tracks : [],
      albumName
    );
  } catch (error) {
    tidalStatus.textContent = error.message;
  }
}

async function playTidalPlaylist(cid, mid = '', shuffle = false, button = null) {
  if (!cid) {
    tidalStatus.textContent = 'Playlist cannot be played';
    return;
  }

  if (button) {
    button.classList.add('loading');
    button.disabled = true;
  }

  setTidalOpen(false);

  try {
    let url;

    if (cid === 'My Music-Tracks' && !mid) {
      url =
        '/api/tidal/tracks/play-all?shuffle=' +
        (shuffle ? '1' : '0');
    } else {
      url =
        '/api/tidal/playlist/play?cid=' +
        encodeURIComponent(cid) +
        '&shuffle=' + (shuffle ? '1' : '0');

      if (mid) {
        url += '&mid=' + encodeURIComponent(mid);
      }
    }

    const response = await fetch(url, { cache: 'no-store' });
    const result = await response.json();

    if (!response.ok || result.ok === false) {
      throw new Error(result.error || 'Could not play playlist');
    }
  } catch (error) {
    tidalStatus.textContent = error.message;

    if (button) {
      button.classList.remove('loading');
      button.disabled = false;
    }
  }
}

async function playTidalTrack(cid, mid, trackName, button) {
  if (!cid || !mid) {
    tidalStatus.textContent = 'Track cannot be played';
    return;
  }

  tidalStatus.textContent = `Playing ${trackName || 'track'}…`;
  button.classList.add('loading');
  button.disabled = true;
  setTidalOpen(false);

  try {
    const response = await fetch(
      '/api/tidal/play?cid=' + encodeURIComponent(cid) +
      '&mid=' + encodeURIComponent(mid),
      { cache: 'no-store' }
    );

    const result = await response.json();

    if (!response.ok || result.ok === false) {
      throw new Error(result.error || 'Could not play track');
    }

    tidalStatus.textContent = `Playing ${trackName || 'track'}`;

  } catch (error) {
    tidalStatus.textContent = error.message;
    button.classList.remove('loading');
    button.disabled = false;
  }

}

tidalPersonalisedControls.addEventListener('click', async event => {
  const personalisedPlaylistAction = event.target.closest(
    '[data-personalised-playlist-action]'
  );
  if (!personalisedPlaylistAction) return;

  const action = personalisedPlaylistAction.dataset.personalisedPlaylistAction;
  const id = String(personalisedPlaylistAction.dataset.personalisedPlaylistId || '');

  if (!id) {
    tidalStatus.textContent = 'My Mix cannot be played';
    return;
  }

  personalisedPlaylistAction.classList.add('loading');
  personalisedPlaylistAction.disabled = true;
  setTidalOpen(false);

  try {
    const response = await fetch(
      '/api/tidal/personalised/playlist/play?id=' + encodeURIComponent(id) +
      '&shuffle=' + (action === 'shuffle-all' ? '1' : '0'),
      { cache: 'no-store' }
    );
    const result = await response.json();

    if (!response.ok || result.ok === false) {
      throw new Error(result.error || 'Could not play My Mix');
    }
  } catch (error) {
    tidalStatus.textContent = error.message;
    personalisedPlaylistAction.classList.remove('loading');
    personalisedPlaylistAction.disabled = false;
    setTidalOpen(true);
  }
});

tidalResults.addEventListener('click', async event => {
    const trackPageButton = event.target.closest('[data-track-page-action]');
    if (trackPageButton) {
      const action = trackPageButton.dataset.trackPageAction;

      if (action === 'previous') {
        loadTidalTrackPage(tidalTrackPage - 1);
      } else if (action === 'next') {
        loadTidalTrackPage(tidalTrackPage + 1);
      }

      return;
    }

  const albumAction = event.target.closest('[data-album-action]');
  if (albumAction) {
    if (albumAction.dataset.albumAction === 'play-random') {
      if (!tidalAlbumItems.length) {
        tidalStatus.textContent = 'No albums available';
        return;
      }

      const album = tidalAlbumItems[
        Math.floor(Math.random() * tidalAlbumItems.length)
      ];
      const cid = String(album?.cid || '');
      const name = tidalDisplayName(album?.name) || 'album';

      if (!cid) {
        tidalStatus.textContent = 'Random album cannot be played';
        return;
      }

      albumAction.classList.add('loading');
      albumAction.disabled = true;

      try {
        const response = await fetch(
          '/api/tidal/album/tracks?cid=' + encodeURIComponent(cid),
          { cache: 'no-store' }
        );
        const result = await response.json();
        const tracks = Array.isArray(result.tracks) ? result.tracks : [];
        const firstTrack = tracks[0];

        if (!response.ok || result.ok === false || !firstTrack?.mid) {
          throw new Error(result.error || 'Could not play random album');
        }

        await playTidalTrack(
          cid,
          firstTrack.mid,
          name,
          albumAction
        );
      } catch (error) {
        tidalStatus.textContent = error.message;
        albumAction.classList.remove('loading');
        albumAction.disabled = false;
      }
    }
    return;
  }

  const playlistAction = event.target.closest('[data-playlist-action]');
  if (playlistAction) {
    const action = playlistAction.dataset.playlistAction;

    playTidalPlaylist(
      currentTidalContainerCid(),
      '',
      action === 'shuffle-all',
      playlistAction
    );
    return;
  }

  const playAll = event.target.closest(".tidal-play-all");
  if (playAll) {
    playTidalTrack(playAll.dataset.cid, playAll.dataset.mid, "album", playAll);
    return;
  }

  const button = event.target.closest('.tidal-artist');
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
    const label = button.querySelector('.tidal-artist-name');
    const name = label ? label.textContent.trim() : '';
    openTidalTrackActionMenu(button, name);
    return;
  }

  const label = button.querySelector('.tidal-artist-name');
  const name = label ? label.textContent.trim() : '';

  if (button.classList.contains('tidal-track')) {
    if (tidalPendingVoiceLearn) {
      try {
        await learnTidalVoiceSelection(
          'track',
          button.dataset.cid,
          name,
          button.dataset.mid
        );
      } catch (error) {
        tidalStatus.textContent = error.message;
        return;
      }
    }

    playTidalTrack(
      button.dataset.cid,
      button.dataset.mid,
      name,
      button
    );
    return;
  }

  if (button.classList.contains('tidal-album')) {
    saveCurrentTidalScrollPosition();
    tidalHistory.push({ cid: button.dataset.cid, title: name, scrollTop: 0 });
    loadTidalAlbumTracks(button.dataset.cid, name);
    return;
  }

  if (
    button.classList.contains('tidal-browse-item') &&
    button.dataset.type === 'song'
  ) {
    if (currentTidalContainerIsTrackList()) {
      openTidalTrackActionMenu(button, name);
      return;
    }

    if (button.dataset.albumId) {
      playTidalPlaylist(
        'LIBALBUM-' + button.dataset.albumId,
        button.dataset.mid,
        false,
        button
      );
    } else {
      playTidalPlaylist(
        button.dataset.cid,
        button.dataset.mid,
        false,
        button
      );
    }
    return;
  }

  if (button.classList.contains('tidal-browse-item')) {
    if (button.dataset.type === 'personalised') {
      loadTidalPersonalised();
    } else if (button.dataset.type === 'artist') {
      browseTidal(button.dataset.cid, name);
    } else if (button.dataset.type === 'album') {
      saveCurrentTidalScrollPosition();
      tidalHistory.push({ cid: button.dataset.cid, title: name, scrollTop: 0 });
      loadTidalAlbumTracks(button.dataset.cid, name);
    } else {
      browseTidal(button.dataset.cid, name);
    }
    return;
  }

  if (
    tidalPendingVoiceLearn &&
    tidalPendingVoiceLearn.type !== 'title'
  ) {
    try {
      await learnTidalVoiceSelection(
        'artist',
        button.dataset.cid,
        name
      );
    } catch (error) {
      tidalStatus.textContent = error.message;
      return;
    }
  }

  browseTidal(button.dataset.cid, name);
});
