'use strict';

const tidalArtistOriginalBrowse = browseTidal;
let tidalArtistBiographyOpen = false;
let tidalArtistCategoryOpen = false;
let tidalArtistCurrentDetails = null;
let tidalArtistRequestToken = 0;
let tidalArtistCurrentView = { type: 'landing', category: '' };
const tidalArtistViewHistory = [];

function tidalArtistIdFromCid(cid) {
  const match = String(cid || '').match(/^LIBARTIST-(\d+)$/);
  return match ? match[1] : '';
}

function resetTidalArtistPage() {
  tidalArtistBiographyOpen = false;
  tidalArtistViewHistory.length = 0;
  tidalArtistCurrentView = { type: 'landing', category: '' };
  tidalArtistCategoryOpen = false;
  tidalArtistCurrentDetails = null;
  tidalScreen.classList.remove('artist-page');
}

function tidalArtistCompactNumber(value) {
  const number = Number(value) || 0;
  if (number < 1000) return String(number);
  if (number < 1000000) return (number / 1000).toFixed(number >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'K';
  return (number / 1000000).toFixed(number >= 10000000 ? 0 : 1).replace(/\.0$/, '') + 'M';
}

function tidalArtistArtwork(url, className = 'tidal-artist-card-art') {
  const artwork = document.createElement('span');
  artwork.className = className;
  if (url) {
    const image = document.createElement('img');
    image.src = url;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => image.remove());
    artwork.appendChild(image);
  }
  return artwork;
}

function tidalArtistCardCopy(name, meta = '') {
  const copy = document.createElement('span');
  copy.className = 'tidal-artist-card-copy';
  const title = document.createElement('span');
  title.className = 'tidal-artist-card-name';
  title.textContent = tidalDisplayName(name) || 'Unknown';
  copy.appendChild(title);
  if (meta) {
    const detail = document.createElement('span');
    detail.className = 'tidal-artist-card-meta';
    detail.textContent = tidalDisplayName(meta);
    copy.appendChild(detail);
  }
  return copy;
}

function tidalArtistReleaseButton(item) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tidal-artist-release';
  button.dataset.artistAlbumCid = item.cid || item.heosCid || (item.albumId ? 'LIBALBUM-' + item.albumId : '');
  const name = item.name || item.title || 'Album';
  button.append(tidalArtistArtwork(item.imageUrl), tidalArtistCardCopy(name, item.artist || item.releaseDate || ''));
  return button;
}

function tidalArtistRelatedButton(item) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tidal-artist-related';
  button.dataset.artistRelatedCid = item.heosCid || (item.id ? 'LIBARTIST-' + item.id : '');
  button.append(tidalArtistArtwork(item.imageUrl), tidalArtistCardCopy(item.name || 'Artist', item.fans ? tidalArtistCompactNumber(item.fans) + ' fans' : ''));
  return button;
}

function tidalArtistTopTrackButton(track, artistId) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tidal-artist-top-track';
  button.dataset.artistTopTrack = 'yes';
  button.dataset.artistTracksCid = 'LIBARTIST-Tracks-' + artistId;
  button.dataset.mid = String(track.id || '');
  button.append(tidalArtistArtwork(track.imageUrl), tidalArtistCardCopy(track.title || 'Track', track.album || ''));
  return button;
}

function tidalArtistHeading(title, category = '') {
  if (!category) {
    const heading = document.createElement('h3');
    heading.className = 'tidal-artist-section-title';
    heading.textContent = title;
    return heading;
  }
  const heading = document.createElement('h3');
  heading.className = 'tidal-artist-section-title tidal-artist-section-link';
  heading.appendChild(document.createTextNode(title));
  const seeAll = document.createElement('button');
  seeAll.type = 'button';
  seeAll.dataset.artistCategory = category;
  seeAll.className = 'tidal-artist-more';
  seeAll.setAttribute('aria-label', 'Show all ' + title);
  seeAll.textContent = '›';
  heading.appendChild(seeAll);
  return heading;
}

function tidalArtistSection(title, items, makeButton, className, category = '', previewLimit = 0) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const section = document.createElement('section');
  section.className = 'tidal-artist-section';
  const row = document.createElement('div');
  row.className = className;
  const visibleItems = previewLimit > 0 ? items.slice(0, previewLimit) : items;
  visibleItems.forEach(item => row.appendChild(makeButton(item)));
  section.append(tidalArtistHeading(title, category), row);
  return section;
}

function captureTidalArtistView() {
  if (!tidalArtistCurrentDetails) return null;
  return {
    details: tidalArtistCurrentDetails,
    type: tidalArtistCurrentView.type,
    category: tidalArtistCurrentView.category,
    scrollTop: tidalResults.scrollTop,
    historyLength: tidalHistory.length
  };
}

function pushTidalArtistView() {
  const state = captureTidalArtistView();
  if (state) tidalArtistViewHistory.push(state);
}

function restoreTidalArtistView(state) {
  if (!state) return;
  tidalHistory.length = Math.min(tidalHistory.length, state.historyLength);
  tidalArtistCurrentDetails = state.details;
  if (state.type === 'category') renderTidalArtistCategory(state.details, state.category);
  else if (state.type === 'biography') renderTidalArtistBiography(state.details);
  else renderTidalArtistPage(state.details);
  tidalResults.scrollTop = state.scrollTop;
}

function renderTidalArtistBiography(details) {
  const biography = details?.biography;
  if (!biography?.text) return;
  tidalArtistBiographyOpen = true;
  tidalArtistCategoryOpen = false;
  tidalArtistCurrentView = { type: 'biography', category: '' };
  tidalResults.replaceChildren();
  const view = document.createElement('article');
  view.className = 'tidal-artist-biography';
  const label = document.createElement('div');
  label.className = 'tidal-artist-label';
  label.textContent = 'BIOGRAPHY';
  const title = document.createElement('h2');
  title.textContent = details.artist?.name || 'Artist';
  const text = document.createElement('p');
  text.textContent = biography.text;
  const source = document.createElement('div');
  source.className = 'tidal-artist-bio-source';
  source.append('SOURCE: ');
  if (biography.sourceUrl) {
    const link = document.createElement('a');
    link.href = biography.sourceUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = biography.source || 'Wikipedia';
    source.appendChild(link);
  } else source.append(biography.source || 'Wikipedia');
  view.append(label, title, text, source);
  tidalResults.appendChild(view);
  tidalResults.scrollTop = 0;
}

function tidalArtistCategoryConfig(details, category) {
  const artistId = String(details.artist?.id || '');
  const configs = {
    albums: ['ALBUMS', details.albums, tidalArtistReleaseButton],
    singles: ['EPS & SINGLES', details.singles, tidalArtistReleaseButton],
    appears: ['APPEARS ON', details.appearsOn, tidalArtistReleaseButton],
    similar: ['FANS ALSO LIKED', details.similarArtists, tidalArtistRelatedButton],
    tracks: ['TOP TRACKS', details.topTracks, item => tidalArtistTopTrackButton(item, artistId)]
  };
  return configs[category] || null;
}

function renderTidalArtistCategory(details, category) {
  const config = tidalArtistCategoryConfig(details, category);
  if (!config) return;
  tidalArtistBiographyOpen = false;
  tidalArtistCategoryOpen = true;
  tidalArtistCurrentView = { type: 'category', category };
  tidalResults.replaceChildren();
  const view = document.createElement('div');
  view.className = 'tidal-artist-category-page';
  const label = document.createElement('div');
  label.className = 'tidal-artist-label';
  label.textContent = details.artist?.name || 'ARTIST';
  const title = document.createElement('h2');
  title.textContent = config[0];
  const grid = document.createElement('div');
  grid.className = 'tidal-artist-category-grid';
  config[1].forEach(item => grid.appendChild(config[2](item)));
  view.append(label, title, grid);
  tidalResults.appendChild(view);
  tidalResults.scrollTop = 0;
}

function renderTidalArtistPage(details) {
  const artist = details.artist || {};
  const artistId = String(artist.id || '');
  tidalArtistCurrentDetails = details;
  tidalArtistBiographyOpen = false;
  tidalArtistCategoryOpen = false;
  tidalArtistCurrentView = { type: 'landing', category: '' };
  tidalScreen.classList.add('artist-page', 'browsing');
  tidalSearchForm.hidden = true;
  tidalPersonalisedControls.hidden = true;
  setTidalKeyboardOpen(false);
  setTidalAlphabetVisible(false);
  tidalResults.replaceChildren();

  const page = document.createElement('div');
  page.className = 'tidal-artist-page';
  const hero = document.createElement('section');
  hero.className = 'tidal-artist-hero';
  hero.appendChild(tidalArtistArtwork(artist.imageUrl, 'tidal-artist-hero-art'));
  const info = document.createElement('div');
  info.className = 'tidal-artist-hero-info';
  const label = document.createElement('div');
  label.className = 'tidal-artist-label';
  label.textContent = 'ARTIST';
  const name = document.createElement('h2');
  name.className = 'tidal-artist-hero-name';
  name.textContent = artist.name || 'Artist';
  const fans = document.createElement('div');
  fans.className = 'tidal-artist-fans';
  fans.textContent = artist.fans ? tidalArtistCompactNumber(artist.fans) + ' FANS' : '';
  info.append(label, name, fans);
  if (details.biography?.teaser) {
    const teaser = document.createElement('p');
    teaser.className = 'tidal-artist-bio-teaser';
    teaser.textContent = details.biography.teaser;
    const readMore = document.createElement('button');
    readMore.type = 'button';
    readMore.className = 'tidal-artist-read-more';
    readMore.dataset.artistBiography = 'yes';
    readMore.textContent = 'READ MORE';
    info.append(teaser, readMore);
  }
  const actions = document.createElement('div');
  actions.className = 'tidal-artist-actions';
  [['play', 'PLAY'], ['shuffle', 'SHUFFLE']].forEach(([mode, text]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.artistPlayback = mode;
    button.dataset.artistTracksCid = 'LIBARTIST-Tracks-' + artistId;
    button.textContent = text;
    actions.appendChild(button);
  });
  const radio = document.createElement('button');
  radio.type = 'button';
  radio.dataset.artistRadio = String(details.radio?.playlistId || '');
  radio.dataset.artistRadioName = details.radio?.name || artist.name || 'Artist Radio';
  radio.textContent = 'RADIO';
  radio.disabled = !details.radio?.playlistId;
  actions.appendChild(radio);
  info.appendChild(actions);
  hero.appendChild(info);
  page.appendChild(hero);

  const topTracks = tidalArtistSection('TOP TRACKS', details.topTracks, track => tidalArtistTopTrackButton(track, artistId), 'tidal-artist-top-tracks', 'tracks', 4);
  if (topTracks) page.appendChild(topTracks);
  const categories = document.createElement('section');
  categories.className = 'tidal-artist-section';
  const categoryRow = document.createElement('div');
  categoryRow.className = 'tidal-artist-category-nav';
  const categoryIcons = {
    albums: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="15"/><circle cx="24" cy="24" r="4"/><path d="M24 9v11M39 24H28"/></svg>',
    singles: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M20 13v22a5 5 0 1 1-3-4.6V17l18-4v18a5 5 0 1 1-3-4.6V9z"/></svg>',
    appears: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="18" cy="18" r="6"/><circle cx="32" cy="20" r="5"/><path d="M8 38c1.5-7 5-11 10-11s8.5 4 10 11M27 30c1.5-2 3.2-3 5-3 4 0 6.7 3.7 8 10"/></svg>',
    similar: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="17" cy="18" r="6"/><circle cx="31" cy="18" r="6"/><path d="M7 38c1.5-7 4.8-11 10-11s8.5 4 10 11M21 38c1.5-7 4.8-11 10-11s8.5 4 10 11"/></svg>'
  };
  [
    ['ALBUMS', 'albums'],
    ['EPS & SINGLES', 'singles'],
    ['APPEARS ON', 'appears'],
    ['FANS ALSO LIKED', 'similar']
  ].forEach(([title, category]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tidal-artist tidal-artist-category-nav-button';
    button.dataset.artistCategory = category;
    const artwork = document.createElement('span');
    artwork.className = 'tidal-artist-artwork tidal-category-icon';
    artwork.innerHTML = categoryIcons[category];
    const text = document.createElement('span');
    text.className = 'tidal-browse-text';
    const name = document.createElement('span');
    name.className = 'tidal-artist-name';
    name.textContent = title;
    text.appendChild(name);
    button.append(artwork, text);
    categoryRow.appendChild(button);
  });
  categories.appendChild(categoryRow);
  page.appendChild(categories);
  tidalResults.appendChild(page);
  tidalResults.scrollTop = 0;
}

async function loadTidalArtistLanding(artistId, title) {
  const requestToken = ++tidalArtistRequestToken;
  tidalScreen.classList.add('artist-page', 'browsing');
  tidalSearchForm.hidden = true;
  tidalPersonalisedControls.hidden = true;
  setTidalKeyboardOpen(false);
  tidalSearchInput.blur();
  setTidalAlphabetVisible(false);
  tidalStatus.textContent = 'Loading ' + (title || 'artist') + '…';
  tidalResults.replaceChildren();
  try {
    const response = await fetch('/api/tidal/artist-details?id=' + encodeURIComponent(artistId), { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || result.ok === false) throw new Error(result.error || 'Could not load artist');
    if (requestToken !== tidalArtistRequestToken) return;
    renderTidalArtistPage(result);
    const richRequests = [
      fetch('/api/tidal/artist-top-tracks?id=' + encodeURIComponent(artistId), { cache: 'no-store' })
        .then(async response => {
          const rich = await response.json();
          if (!response.ok || rich.ok === false) throw new Error(rich.error || 'Could not load Artist Top Tracks');
          if (requestToken !== tidalArtistRequestToken || String(tidalArtistCurrentDetails?.artist?.id || '') !== String(artistId)) return;
          tidalArtistCurrentDetails = { ...tidalArtistCurrentDetails, topTracks: Array.isArray(rich.tracks) ? rich.tracks : [] };
          if (!tidalArtistBiographyOpen && !tidalArtistCategoryOpen) renderTidalArtistPage(tidalArtistCurrentDetails);
        }),
      fetch('/api/tidal/artist-biography?id=' + encodeURIComponent(artistId), { cache: 'no-store' })
        .then(async response => {
          const rich = await response.json();
          if (!response.ok || rich.ok === false) throw new Error(rich.error || 'Could not load Artist biography');
          if (requestToken !== tidalArtistRequestToken || String(tidalArtistCurrentDetails?.artist?.id || '') !== String(artistId)) return;
          tidalArtistCurrentDetails = { ...tidalArtistCurrentDetails, biography: rich.biography || null };
          if (!tidalArtistBiographyOpen && !tidalArtistCategoryOpen) renderTidalArtistPage(tidalArtistCurrentDetails);
        })
    ];
    Promise.allSettled(richRequests).then(results => {
      results.forEach(outcome => {
        if (outcome.status === 'rejected') console.warn('TIDAL Artist rich data load failed:', outcome.reason?.message || outcome.reason);
      });
    });
  } catch (error) {
    if (requestToken !== tidalArtistRequestToken) return;
    tidalStatus.textContent = error.message;
  }
}

browseTidal = async function(cid, title, pushHistory = true) {
  const artistId = tidalArtistIdFromCid(cid);
  if (!artistId) {
    tidalArtistRequestToken += 1;
    resetTidalArtistPage();
    return tidalArtistOriginalBrowse(cid, title, pushHistory);
  }
  setTidalPersonalisedChrome('normal');
  if (pushHistory) tidalHistory.push({ cid, title });
  await loadTidalArtistLanding(artistId, title);
};

tidalResults.addEventListener('click', event => {
  const category = event.target.closest('[data-artist-category]');
  if (category) {
    event.preventDefault(); event.stopImmediatePropagation();
    const categoryName = String(category.dataset.artistCategory || '');
    const details = tidalArtistCurrentDetails;
    if (!details) return;
    pushTidalArtistView();
    if (!['albums', 'singles', 'appears'].includes(categoryName)) {
      renderTidalArtistCategory(details, categoryName);
      return;
    }
    const artistId = String(details.artist?.id || '');
    const requestToken = tidalArtistRequestToken;
    tidalArtistBiographyOpen = false;
    tidalArtistCategoryOpen = true;
    tidalResults.replaceChildren();
    const loading = document.createElement('div');
    loading.className = 'tidal-loading';
    loading.textContent = 'Loading…';
    tidalResults.appendChild(loading);
    fetch('/api/tidal/artist-releases?id=' + encodeURIComponent(artistId) + '&category=' + encodeURIComponent(categoryName), { cache: 'no-store' })
      .then(async response => {
        const rich = await response.json();
        if (!response.ok || rich.ok === false) throw new Error(rich.error || 'Could not load Artist releases');
        if (requestToken !== tidalArtistRequestToken || String(tidalArtistCurrentDetails?.artist?.id || '') !== artistId) return;
        const releases = Array.isArray(rich.releases) ? rich.releases : [];
        const key = categoryName === 'albums' ? 'albums' : categoryName === 'singles' ? 'singles' : 'appearsOn';
        tidalArtistCurrentDetails = { ...tidalArtistCurrentDetails, [key]: releases };
        renderTidalArtistCategory(tidalArtistCurrentDetails, categoryName);
      })
      .catch(error => {
        if (requestToken !== tidalArtistRequestToken || String(tidalArtistCurrentDetails?.artist?.id || '') !== artistId) return;
        tidalResults.replaceChildren();
        const failed = document.createElement('div');
        failed.className = 'tidal-loading';
        failed.textContent = error.message || 'Could not load Artist releases';
        tidalResults.appendChild(failed);
      });
    return;
  }
  const biography = event.target.closest('[data-artist-biography]');
  if (biography) {
    event.preventDefault(); event.stopImmediatePropagation();
    if (tidalArtistCurrentDetails) { pushTidalArtistView(); renderTidalArtistBiography(tidalArtistCurrentDetails); }
    return;
  }
  const playback = event.target.closest('[data-artist-playback]');
  if (playback) {
    event.preventDefault(); event.stopImmediatePropagation();
    playTidalPlaylist(playback.dataset.artistTracksCid, '', playback.dataset.artistPlayback === 'shuffle', playback);
    return;
  }
  const radio = event.target.closest('[data-artist-radio]');
  if (radio) {
    event.preventDefault(); event.stopImmediatePropagation();
    const id = String(radio.dataset.artistRadio || '');
    if (id) { tidalScreen.classList.remove('artist-page'); loadTidalPersonalisedPlaylist(id, radio.dataset.artistRadioName || 'Artist Radio'); }
    return;
  }
  const album = event.target.closest('[data-artist-album-cid]');
  if (album) {
    event.preventDefault(); event.stopImmediatePropagation();
    const copy = album.querySelector('.tidal-artist-card-name');
    pushTidalArtistView();
    tidalScreen.classList.remove('artist-page');
    loadTidalAlbumTracks(album.dataset.artistAlbumCid, copy?.textContent || 'Album');
    return;
  }
  const related = event.target.closest('[data-artist-related-cid]');
  if (related) {
    event.preventDefault(); event.stopImmediatePropagation();
    const copy = related.querySelector('.tidal-artist-card-name');
    pushTidalArtistView();
    browseTidal(related.dataset.artistRelatedCid, copy?.textContent || 'Artist');
    return;
  }
  const track = event.target.closest('[data-artist-top-track]');
  if (track) {
    event.preventDefault(); event.stopImmediatePropagation();
    const copy = track.querySelector('.tidal-artist-card-name');
    tidalTrackActionSelection = { cid: track.dataset.artistTracksCid, mid: String(track.dataset.mid || ''), name: copy?.textContent || 'Track', personalised: false };
    tidalTrackActionName.textContent = tidalTrackActionSelection.name;
    tidalTrackActionOverlay.classList.add('open');
    tidalTrackActionOverlay.setAttribute('aria-hidden', 'false');
  }
}, true);

tidalBack.addEventListener('click', event => {
  if (tidalArtistViewHistory.length === 0) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  restoreTidalArtistView(tidalArtistViewHistory.pop());
}, true);
