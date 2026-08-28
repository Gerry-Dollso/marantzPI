'use strict';

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'public', 'tidal-ui.js');
let text = fs.readFileSync(file, 'utf8');

function replaceOnce(before, after, label) {
  const count = text.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected exactly one anchor, found ${count}`);
  }
  text = text.replace(before, after);
}

replaceOnce(
`let tidalArtistItems = [];
let tidalArtistLetter = 'ALL';
let tidalAlbumPage = 0;
const tidalAlbumPageSize = 50;
let tidalAlbumTotal = 0;`,
`let tidalArtistItems = [];
let tidalArtistLetter = 'ALL';
let tidalAlbumItems = [];
let tidalAlbumLetter = 'ALL';`,
'album state'
);

replaceOnce(
`function renderFilteredArtists() {
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
      ? \`Artists — \${items.length} items\`
      : \`Artists — \${tidalArtistLetter} — \${items.length} items\`;

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
    \`PAGE \${tidalAlbumPage + 1} OF \${totalPages}\`;

  const next = document.createElement('button');
  next.type = 'button';
  next.dataset.albumPageAction = 'next';
  next.textContent = 'NEXT';
  next.disabled = tidalAlbumPage >= totalPages - 1;

  pager.append(previous, label, next);
  tidalResults.appendChild(pager);
}`,
`function renderFilteredArtists() {
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
      ? \`Artists — \${items.length} items\`
      : \`Artists — \${tidalArtistLetter} — \${items.length} items\`;

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
      ? \`Albums — \${tidalAlbumItems.length} items\`
      : \`Albums — \${tidalAlbumLetter} — \${items.length} items\`;

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
});`,
'alphabet and album renderer'
);

const albumLoaderStart = text.indexOf('async function loadTidalAlbumPage(page = 0) {');
const trackPagerStart = text.indexOf('function renderTrackPager()', albumLoaderStart);
if (albumLoaderStart < 0 || trackPagerStart < 0) {
  throw new Error('album loader: anchors not found');
}
text = text.slice(0, albumLoaderStart) +
`async function loadTidalAlbums() {
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
}

` + text.slice(trackPagerStart);

replaceOnce(
`    await loadTidalAlbumPage(0);`,
`    await loadTidalAlbums();`,
'album browse route'
);

replaceOnce(
`  const pageButton = event.target.closest('[data-album-page-action]');
  if (pageButton) {
    const action = pageButton.dataset.albumPageAction;

    if (action === 'previous') {
      loadTidalAlbumPage(tidalAlbumPage - 1);
    } else if (action === 'next') {
      loadTidalAlbumPage(tidalAlbumPage + 1);
    }

    return;
  }

  const playlistAction`,
`  const albumAction = event.target.closest('[data-album-action]');
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

  const playlistAction`,
'album click handler'
);

fs.writeFileSync(file, text);
console.log('Updated public/tidal-ui.js');
