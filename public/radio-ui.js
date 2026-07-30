'use strict';

const radioScreen = document.getElementById('radioScreen');
const radioGrid = document.getElementById('radioGrid');
const radioList = document.getElementById('radioList');
const radioStatus = document.getElementById('radioStatus');
const radioBack = document.getElementById('radioBack');
const radioAll = document.getElementById('radioAll');

let radioFavourites = [];
let showingAllStations = false;
let radioLoaded = false;

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

function makeStationButton(station, compact = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = compact ? 'radio-list-item' : 'radio-tile';
  button.dataset.mid = station.mid;
  button.dataset.name = station.name;

  const badge = document.createElement('span');
  badge.className = 'radio-station-badge';
  badge.textContent = stationInitials(station.name);

  const label = document.createElement('span');
  label.className = 'radio-station-name';
  label.textContent = station.name;

  button.append(badge, label);
  button.addEventListener('click', () => playStation(button, station));
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
  radioAll.textContent = showingAllStations ? 'TOP STATIONS' : 'ALL STATIONS';

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
  setRadioOpen(false);
});

radioAll.addEventListener('click', () => {
  showingAllStations = !showingAllStations;
  renderRadio();
});
