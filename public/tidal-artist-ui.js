'use strict';

const tidalArtistOriginalBrowse = browseTidal;
let tidalArtistBiographyOpen = false;
let tidalArtistCategoryOpen = false;
let tidalArtistCurrentDetails = null;

function tidalArtistIdFromCid(cid) {
  const match = String(cid || '').match(/^LIBARTIST-(\d+)$/);
  return match ? match[1] : '';
}

function resetTidalArtistPage() {
  tidalArtistBiographyOpen = false;
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
  const heading = document.createElement('button');
  heading.type = 'button';
  heading.className = 'tidal-artist-section-title tidal-artist-section-link';
  heading.dataset.artistCategory = category;
  heading.append(document.createTextNode(title), Object.assign(document.createElement('span'), { textContent: 'SEE ALL ›' }));
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

function renderTidalArtistBiography(details) {
  const biography = details?.biography;
  if (!biography?.text) return;
  tidalArtistBiographyOpen = true;
  tidalArtistCategoryOpen = false;
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

  const topTracks = tidalArtistSection('TOP TRACKS', details.topTracks, track => tidalArtistTopTrackButton(track, artistId), 'tidal-artist-top-tracks', 'tracks');
  if (topTracks) page.appendChild(topTracks);
  [
    ['ALBUMS', details.albums, 'albums', tidalArtistReleaseButton],
    ['EPS & SINGLES', details.singles, 'singles', tidalArtistReleaseButton],
    ['APPEARS ON', details.appearsOn, 'appears', tidalArtistReleaseButton],
    ['FANS ALSO LIKED', details.similarArtists, 'similar', tidalArtistRelatedButton]
  ].forEach(([title, items, category, maker]) => {
    const section = tidalArtistSection(title, items, maker, category === 'similar' ? 'tidal-artist-related-row' : 'tidal-artist-release-row', category, 4);
    if (section) page.appendChild(section);
  });
  tidalResults.appendChild(page);
  tidalResults.scrollTop = 0;
}

async function loadTidalArtistLanding(artistId, title) {
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
    renderTidalArtistPage(result);
  } catch (error) {
    tidalStatus.textContent = error.message;
  }
}

browseTidal = async function(cid, title, pushHistory = true) {
  const artistId = tidalArtistIdFromCid(cid);
  if (!artistId) {
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
    if (tidalArtistCurrentDetails) renderTidalArtistCategory(tidalArtistCurrentDetails, category.dataset.artistCategory);
    return;
  }
  const biography = event.target.closest('[data-artist-biography]');
  if (biography) {
    event.preventDefault(); event.stopImmediatePropagation();
    if (tidalArtistCurrentDetails) renderTidalArtistBiography(tidalArtistCurrentDetails);
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
    tidalScreen.classList.remove('artist-page');
    loadTidalAlbumTracks(album.dataset.artistAlbumCid, copy?.textContent || 'Album');
    return;
  }
  const related = event.target.closest('[data-artist-related-cid]');
  if (related) {
    event.preventDefault(); event.stopImmediatePropagation();
    const copy = related.querySelector('.tidal-artist-card-name');
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
  if ((!tidalArtistBiographyOpen && !tidalArtistCategoryOpen) || !tidalArtistCurrentDetails) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  renderTidalArtistPage(tidalArtistCurrentDetails);
}, true);
