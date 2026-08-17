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

const tidalShortcuts = document.getElementById('tidalShortcuts');
const tidalHistory = [];


function makeBrowseButton(item) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tidal-artist tidal-browse-item';
  button.dataset.cid = item.cid || '';
  button.dataset.type = item.type || '';
  button.dataset.container = item.container ? 'yes' : 'no';
  button.dataset.playable = item.playable ? 'yes' : 'no';
  button.dataset.mid = item.mid || '';

  const artwork = document.createElement('span');
  artwork.className = 'tidal-artist-artwork';

  if (item.imageUrl) {
    const image = document.createElement('img');
    image.src = item.imageUrl;
    image.alt = '';
    image.addEventListener('error', () => image.remove());
    artwork.appendChild(image);
  }

  const name = document.createElement('span');
  name.className = 'tidal-artist-name';
  name.textContent = item.name || 'Unknown';

  button.append(artwork, name);
  return button;
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

async function browseTidal(cid, title, pushHistory = true) {
  if (pushHistory) {
    tidalHistory.push({
      cid,
      title
    });
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

    renderBrowseItems(
      Array.isArray(result.items) ? result.items : [],
      title
    );
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
  name.textContent = artist.name || 'Unknown artist';

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

document.addEventListener(
  'click',
  event => {
    const opener = event.target.closest(
      '[data-action="heos"][data-net-source="tidal"]'
    );

    if (!opener) return;

    event.preventDefault();
    event.stopImmediatePropagation();

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
  const playAll = event.target.closest(".tidal-play-all");
  if (playAll) {
    playTidalTrack(playAll.dataset.cid, playAll.dataset.mid, "album", playAll);
    return;
  }

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
  name.textContent = album.name || 'Unknown album';

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
  name.textContent = track.name || 'Unknown track';

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

tidalResults.addEventListener('click', event => {
  const playAll = event.target.closest(".tidal-play-all");
  if (playAll) {
    playTidalTrack(playAll.dataset.cid, playAll.dataset.mid, "album", playAll);
    return;
  }

  const button = event.target.closest('.tidal-artist');
  if (!button || !button.dataset.cid) return;

  const label = button.querySelector('.tidal-artist-name');
  const name = label ? label.textContent.trim() : '';

  if (button.classList.contains('tidal-track')) {
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

  if (button.classList.contains('tidal-browse-item')) {
    if (button.dataset.type === 'artist') {
      loadTidalArtistAlbums(button.dataset.cid, name);
    } else {
      browseTidal(button.dataset.cid, name);
    }
    return;
  }

  loadTidalArtistAlbums(button.dataset.cid, name);
});
