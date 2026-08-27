'use strict';

const tidalScreen = document.getElementById('tidalScreen');
const tidalBack = document.getElementById('tidalBack');
const tidalSearchForm = document.getElementById('tidalSearchForm');
const tidalSearchInput = document.getElementById('tidalSearchInput');
const tidalStatus = document.getElementById('tidalStatus');
const tidalResults = document.getElementById('tidalResults');

function setTidalOpen(open) {
  document.body.classList.toggle("show-tidal", open);
  tidalScreen.setAttribute("aria-hidden", String(!open));
  if (!open) tidalSearchInput.blur();
}

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
let tidalAlbumPage = 0;
const tidalAlbumPageSize = 50;
let tidalAlbumTotal = 0;
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

  tidalTrackActionSelection = { cid, mid, name: name || 'Track' };
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
    setTidalOpen(false);
  }

  try {
    const response = await fetch(
      '/api/tidal/track/action?cid=' + encodeURIComponent(selection.cid) +
      '&mid=' + encodeURIComponent(selection.mid) +
      '&action=' + encodeURIComponent(action),
      { cache: 'no-store' }
    );
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
      setTidalOpen(false);
    }
  } catch (error) {
    tidalStatus.textContent = error.message;
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

const tidalHistory = [];


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

  const artwork = document.createElement('span');
  artwork.className = 'tidal-artist-artwork';

  if (item.imageUrl) {
    const image = document.createElement('img');
    image.src = item.imageUrl;
    image.alt = '';
    image.addEventListener('error', () => image.remove());
    artwork.appendChild(image);
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
     item.type === 'album') &&
    item.artist
  ) {
    const artist = document.createElement('span');
    artist.className = 'tidal-browse-artist';
    artist.textContent = tidalDisplayName(item.artist);
    text.appendChild(artist);
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

  tidalAlphabet.querySelectorAll('button').forEach(button => {
    button.classList.toggle(
      'active',
      button.dataset.letter === tidalArtistLetter
    );
  });
}

tidalAlphabet.addEventListener('click', event => {
  const button = event.target.closest('button[data-letter]');
  if (!button) return;

  tidalArtistLetter = button.dataset.letter || 'ALL';
  renderFilteredArtists();
});

function renderAlbumPager() {
  const totalPages = Math.max(
    1,
    Math.ceil(tidalAlbumTotal / tidalAlbumPageSize)
  );

  const pager = document.createElement('div');
  pager.className = 'tidal-album-pager';

  const previous = document.createElement('button');
  previous.type = 'button';
  previous.dataset.albumPageAction = 'previous';
  previous.textContent = 'PREVIOUS';
  previous.disabled = tidalAlbumPage <= 0;

  const label = document.createElement('div');
  label.className = 'tidal-album-page-label';
  label.textContent =
    `PAGE ${tidalAlbumPage + 1} OF ${totalPages}`;

  const next = document.createElement('button');
  next.type = 'button';
  next.dataset.albumPageAction = 'next';
  next.textContent = 'NEXT';
  next.disabled = tidalAlbumPage >= totalPages - 1;

  pager.append(previous, label, next);
  tidalResults.appendChild(pager);
}

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

async function loadTidalAlbumPage(page = 0) {
  tidalShowAlbumArtists = true;
  tidalAlbumPage = Math.max(0, page);

  const start = tidalAlbumPage * tidalAlbumPageSize;

  tidalStatus.textContent = 'Loading Albums…';
  tidalResults.replaceChildren();
  setTidalAlphabetVisible(false);

  try {
    const response = await fetch(
      '/api/tidal/browse?cid=' +
      encodeURIComponent('My Music-Albums') +
      '&start=' + start +
      '&limit=' + tidalAlbumPageSize,
      { cache: 'no-store' }
    );

    const result = await response.json();

    if (!response.ok || result.ok === false) {
      throw new Error(result.error || 'Could not load albums');
    }

    const items = Array.isArray(result.items)
      ? result.items
      : [];

    tidalAlbumTotal = Number(result.count) || items.length;

    tidalResults.replaceChildren();

    items.forEach(item => {
      tidalResults.appendChild(makeBrowseButton(item));
    });

    renderAlbumPager();

    const totalPages = Math.max(
      1,
      Math.ceil(tidalAlbumTotal / tidalAlbumPageSize)
    );

    tidalStatus.textContent =
      `Albums — ${tidalAlbumTotal} items — Page ${tidalAlbumPage + 1} of ${totalPages}`;

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
  tidalTrackPage = Math.max(0, page);

  const start = tidalTrackPage * tidalTrackPageSize;

  tidalStatus.textContent = 'Loading Tracks…';
  tidalResults.replaceChildren();
  setTidalAlphabetVisible(false);

  try {
    const response = await fetch(
      '/api/tidal/browse?cid=' +
      encodeURIComponent('My Music-Tracks') +
      '&start=' + start +
      '&limit=' + tidalTrackPageSize,
      { cache: 'no-store' }
    );

    const result = await response.json();

    if (!response.ok || result.ok === false) {
      throw new Error(result.error || 'Could not load tracks');
    }

    const items = Array.isArray(result.items)
      ? result.items
      : [];

    tidalTrackTotal = Number(result.count) || items.length;

    tidalResults.replaceChildren();

    items.forEach(item => {
      tidalResults.appendChild(makeBrowseButton(item));
    });

    renderTrackPager();

    const totalPages = Math.max(
      1,
      Math.ceil(tidalTrackTotal / tidalTrackPageSize)
    );

    tidalStatus.textContent =
      `Tracks — ${tidalTrackTotal} items — Page ${tidalTrackPage + 1} of ${totalPages}`;

    tidalResults.scrollTop = 0;
  } catch (error) {
    tidalStatus.textContent = error.message;
  }
}

async function browseTidal(cid, title, pushHistory = true) {
  if (cid !== 'My Music-Albums') {
    tidalShowAlbumArtists = false;
  }

  if (String(cid).startsWith('LIBPLAYLIST-')) {
    tidalCurrentPlaylistCid = cid;
  }

  if (pushHistory) {
    tidalHistory.push({
      cid,
      title
    });
  }

  if (cid === 'My Music-Albums') {
    tidalScreen.classList.add("browsing");
    setTidalKeyboardOpen(false);
    tidalSearchInput.blur();
    await loadTidalAlbumPage(0);
    return;
  }

  if (cid === 'My Music-Tracks') {
    tidalScreen.classList.add("browsing");
    setTidalKeyboardOpen(false);
    tidalSearchInput.blur();
    await loadTidalTrackPage(0);
    return;
  }

  tidalScreen.classList.add("browsing");
  setTidalKeyboardOpen(false);
  tidalSearchInput.blur();

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

    if (cid === 'My Music-Artists') {
      tidalArtistItems = items;
      tidalArtistLetter = 'ALL';
      setTidalAlphabetVisible(true);
      renderFilteredArtists();
    } else if (String(cid).startsWith('LIBPLAYLIST-')) {
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
  setTidalKeyboardOpen(false);
  tidalSearchInput.blur();

  tidalScreen.classList.add("browsing");
  tidalHistory.length = 0;
  tidalHistory.push({
    cid: '__search__',
    title: query
  });

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
    tidalScreen.classList.remove("browsing");
    tidalResults.replaceChildren();
    tidalStatus.textContent = "Choose a section or search TIDAL";
  },
  true
);

tidalBack.addEventListener('click', () => {
  if (tidalHistory.length > 1) {
    tidalHistory.pop();
    const previous = tidalHistory[tidalHistory.length - 1];
    browseTidal(previous.cid, previous.title, false);
    return;
  }

  if (tidalHistory.length === 1) {
    tidalHistory.length = 0;
    tidalScreen.classList.remove("browsing");
    tidalResults.replaceChildren();
    tidalStatus.textContent = "Choose a section or search TIDAL";
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
    let url =
      '/api/tidal/playlist/play?cid=' +
      encodeURIComponent(cid) +
      '&shuffle=' + (shuffle ? '1' : '0');

    if (mid) {
      url += '&mid=' + encodeURIComponent(mid);
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

  const pageButton = event.target.closest('[data-album-page-action]');
  if (pageButton) {
    const action = pageButton.dataset.albumPageAction;

    if (action === 'previous') {
      loadTidalAlbumPage(tidalAlbumPage - 1);
    } else if (action === 'next') {
      loadTidalAlbumPage(tidalAlbumPage + 1);
    }

    return;
  }

  const playlistAction = event.target.closest('[data-playlist-action]');
  if (playlistAction) {
    const action = playlistAction.dataset.playlistAction;

    playTidalPlaylist(
      tidalCurrentPlaylistCid,
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
    loadTidalAlbumTracks(button.dataset.cid, name);
    return;
  }

  if (
    button.classList.contains('tidal-browse-item') &&
    button.dataset.type === 'song'
  ) {
    if (currentTidalContainerIsPlaylist()) {
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
    if (button.dataset.type === 'artist') {
      browseTidal(button.dataset.cid, name);
    } else if (button.dataset.type === 'album') {
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
