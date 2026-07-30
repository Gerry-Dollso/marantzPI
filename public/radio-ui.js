'use strict';

const radioScreen = document.getElementById('radioScreen');
const radioGrid = document.getElementById('radioGrid');
const radioList = document.getElementById('radioList');
const radioStatus = document.getElementById('radioStatus');
const radioBack = document.getElementById('radioBack');
const radioAll = document.getElementById('radioAll');

const stationArtwork = {
  'BBC Radio 6 Music': '/logos/bbc-radio-6.svg',
  KEXP: '/logos/kexp.svg',
  'GEM Radio (New Wave)': '/logos/gem-radio.svg',
  'DKFM - Decay (Shoegaze)': '/logos/dkfm-decay.svg',
  'Sensimedia (Hip-Hop)': '/logos/sensimedia.svg',
  'Hip-Hop Gods (USA)': '/logos/hip-hop-gods.svg'
};

let radioFavourites = [];
let showingAllStations = false;
let radioLoaded = false;

let activePointerId = null;
let pointerStartY = 0;
let pointerLastY = 0;
let pointerLastTime = 0;
let pointerVelocity = 0;
let pointerDragging = false;
let suppressStationClickUntil = 0;
let momentumFrame = null;

function setRadioOpen(open) {
  document.body.classList.toggle('show-radio', open);
  radioScreen.setAttribute('aria-hidden', String(!open));
}

function stationInitials(name) {
  return String(name || 'Radio')
    .replace(/\([^)]*\)/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map(word => word[0])
    .join('')
    .toUpperCase();
}

function makeStationArtwork(station) {
  const badge = document.createElement('span');
  badge.className = 'radio-station-badge';

  const artworkUrl = station.imageUrl || stationArtwork[station.name];

  if (!artworkUrl) {
    badge.textContent = stationInitials(station.name);
    return badge;
  }

  const image = document.createElement('img');
  image.className = 'radio-station-logo';
  image.alt = '';
  image.src = artworkUrl;
  image.addEventListener('error', () => {
    image.remove();
    badge.textContent = stationInitials(station.name);
  });

  badge.classList.add('has-logo');
  badge.appendChild(image);
  return badge;
}

function makeStationButton(station, compact = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = compact ? 'radio-list-item' : 'radio-tile';
  button.dataset.mid = station.mid;
  button.dataset.name = station.name;

  const badge = makeStationArtwork(station);

  const label = document.createElement('span');
  label.className = 'radio-station-name';
  label.textContent = station.name;

  button.append(badge, label);
  button.addEventListener('click', event => {
    if (Date.now() < suppressStationClickUntil) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    playStation(button, station);
  });
  return button;
}

function renderRadio() {
  radioGrid.replaceChildren();
  radioList.replaceChildren();

  if (!radioFavourites.length) {
    radioStatus.textContent = 'No HEOS favourites found';
    radioStatus.hidden = false;
    radioAll.hidden = true;
    return;
  }

  radioStatus.hidden = true;
  radioAll.hidden = false;
  radioAll.textContent = showingAllStations ? 'TOP STATIONS' : 'MORE…';

  if (showingAllStations) {
    radioGrid.hidden = true;
    radioList.hidden = false;
    radioFavourites.forEach(station => {
      radioList.appendChild(makeStationButton(station, true));
    });
  } else {
    radioList.hidden = true;
    radioGrid.hidden = false;
    radioFavourites.slice(0, 6).forEach(station => {
      radioGrid.appendChild(makeStationButton(station));
    });
  }
}

async function loadRadioFavourites(force = false) {
  if (radioLoaded && !force) return;

  radioStatus.hidden = false;
  radioStatus.textContent = 'Loading favourites…';

  try {
    const response = await fetch('/api/radio/favourites', {
      cache: 'no-store'
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Could not load favourites');
    }

    radioFavourites = Array.isArray(result.favourites)
      ? result.favourites
      : [];
    radioLoaded = true;
    renderRadio();
  } catch (error) {
    radioStatus.hidden = false;
    radioStatus.textContent = error.message;
  }
}

async function playStation(button, station) {
  const buttons = radioScreen.querySelectorAll('button');
  buttons.forEach(item => {
    item.disabled = true;
  });

  button.classList.add('loading');
  radioStatus.hidden = false;
  radioStatus.textContent = `Starting ${station.name}…`;

  try {
    const query = new URLSearchParams({
      mid: station.mid,
      name: station.name
    });

    const response = await fetch(`/api/radio/play?${query}`, {
      method: 'POST',
      cache: 'no-store'
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Could not start station');
    }

    radioStatus.textContent = `Playing ${station.name}`;
    setTimeout(() => setRadioOpen(false), 500);
  } catch (error) {
    radioStatus.textContent = error.message;
  } finally {
    button.classList.remove('loading');
    buttons.forEach(item => {
      item.disabled = false;
    });
  }
}

function stopRadioMomentum() {
  if (momentumFrame !== null) {
    cancelAnimationFrame(momentumFrame);
    momentumFrame = null;
  }
}

function startRadioMomentum() {
  stopRadioMomentum();

  function step() {
    if (Math.abs(pointerVelocity) < 0.02) {
      momentumFrame = null;
      return;
    }

    const previousScrollTop = radioList.scrollTop;
    radioList.scrollTop += pointerVelocity * 16;
    pointerVelocity *= 0.92;

    if (radioList.scrollTop === previousScrollTop) {
      momentumFrame = null;
      return;
    }

    momentumFrame = requestAnimationFrame(step);
  }

  momentumFrame = requestAnimationFrame(step);
}

radioList.addEventListener('pointerdown', event => {
  if (!showingAllStations || activePointerId !== null) return;

  stopRadioMomentum();
  activePointerId = event.pointerId;
  pointerStartY = event.clientY;
  pointerLastY = event.clientY;
  pointerLastTime = performance.now();
  pointerVelocity = 0;
  pointerDragging = false;

  radioList.setPointerCapture(event.pointerId);
  event.preventDefault();
});

radioList.addEventListener('pointermove', event => {
  if (event.pointerId !== activePointerId) return;

  const now = performance.now();
  const deltaY = pointerLastY - event.clientY;
  const elapsed = Math.max(1, now - pointerLastTime);

  if (Math.abs(event.clientY - pointerStartY) >= 8) {
    pointerDragging = true;
  }

  if (pointerDragging) {
    radioList.scrollTop += deltaY;
    pointerVelocity = deltaY / elapsed;
  }

  pointerLastY = event.clientY;
  pointerLastTime = now;
  event.preventDefault();
});

function finishRadioPointer(event) {
  if (event.pointerId !== activePointerId) return;

  if (radioList.hasPointerCapture(event.pointerId)) {
    radioList.releasePointerCapture(event.pointerId);
  }

  if (pointerDragging) {
    suppressStationClickUntil = Date.now() + 500;
    startRadioMomentum();
  }

  activePointerId = null;
  pointerDragging = false;
}

radioList.addEventListener('pointerup', finishRadioPointer);
radioList.addEventListener('pointercancel', finishRadioPointer);
radioList.addEventListener('lostpointercapture', event => {
  if (event.pointerId === activePointerId) {
    activePointerId = null;
    pointerDragging = false;
  }
});

document.addEventListener(
  'click',
  event => {
    const opener = event.target.closest('[data-radio-open]');
    if (!opener) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    showingAllStations = false;
    setRadioOpen(true);
    renderRadio();
    loadRadioFavourites(true);
  },
  true
);

radioBack.addEventListener('click', () => {
  stopRadioMomentum();
  setRadioOpen(false);
});

radioAll.addEventListener('click', () => {
  stopRadioMomentum();
  showingAllStations = !showingAllStations;
  renderRadio();
});
