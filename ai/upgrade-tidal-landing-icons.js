'use strict';

const fs = require('fs');

const jsPath = 'public/tidal-ui.js';
const cssPath = 'public/tidal-ui.css';
const htmlPath = 'public/index.html';

let js = fs.readFileSync(jsPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');
let html = fs.readFileSync(htmlPath, 'utf8');

const marker = "function makeBrowseButton(item) {";
const helper = String.raw`const TIDAL_CATEGORY_ICONS = {
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

`;
if (!js.includes('const TIDAL_CATEGORY_ICONS =')) {
  if (!js.includes(marker)) throw new Error('makeBrowseButton marker not found');
  js = js.replace(marker, helper + marker);
}

const artworkNeedle = `  if (item.imageUrl) {
    const image = document.createElement('img');
    image.src = item.imageUrl;
    image.alt = '';
    image.addEventListener('error', () => image.remove());
    artwork.appendChild(image);
  }
`;
const artworkReplacement = artworkNeedle + `  else {
    const icon = tidalCategoryIcon(item.cid);
    if (icon) {
      artwork.classList.add('tidal-category-icon');
      artwork.innerHTML = icon;
    }
  }
`;
if (!js.includes("artwork.classList.add('tidal-category-icon')")) {
  if (!js.includes(artworkNeedle)) throw new Error('artwork marker not found');
  js = js.replace(artworkNeedle, artworkReplacement);
}

const datasetNeedle = `  button.dataset.albumId = item.albumId || '';
`;
const datasetReplacement = datasetNeedle + `  if (item.type === 'personalised') button.dataset.tidalPersonalised = 'yes';
`;
if (!js.includes("button.dataset.tidalPersonalised = 'yes'")) {
  if (!js.includes(datasetNeedle)) throw new Error('dataset marker not found');
  js = js.replace(datasetNeedle, datasetReplacement);
}

const personalisedNeedle = `      items.push({
        type: 'personalised',
        name: 'My Mixes',
        cid: TIDAL_PERSONALISED_CID,
        container: true,
        playable: false
      });
`;
const personalisedReplacement = `      items.push({
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
`;
if (!js.includes("name: 'Mixes & Radio'")) {
  if (!js.includes(personalisedNeedle)) throw new Error('personalised root marker not found');
  js = js.replace(personalisedNeedle, personalisedReplacement);
}

const historyNeedle = `    tidalHistory.push({ cid: TIDAL_PERSONALISED_CID, title: 'My Mixes' });`;
if (js.includes(historyNeedle)) {
  js = js.replace(historyNeedle, `    tidalHistory.push({ cid: TIDAL_PERSONALISED_CID, title: 'Mixes & Radio' });`);
}
js = js.replace(`tidalStatus.textContent = 'Loading My Mixes…';`, `tidalStatus.textContent = 'Loading Mixes & Radio…';`);
js = js.replace(`throw new Error(result.error || 'Could not load My Mixes');`, `throw new Error(result.error || 'Could not load Mixes & Radio');`);
js = js.replace(`tidalStatus.textContent = 'My Mixes — ' + playlists.length + ' playlists';`, `tidalStatus.textContent = 'Mixes & Radio — ' + playlists.length + ' playlists';`);

const cssBlock = String.raw`
.tidal-artist-artwork.tidal-category-icon {
  display: grid;
  place-items: center;
  background: rgba(255,255,255,0.07);
}

.tidal-category-icon svg {
  width: 36px;
  height: 36px;
  fill: none;
  stroke: rgba(255,255,255,0.86);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
`;
if (!css.includes('.tidal-category-icon svg')) css += cssBlock;

html = html.replace('/tidal-ui.js?v=3', '/tidal-ui.js?v=4');

fs.writeFileSync(jsPath, js);
fs.writeFileSync(cssPath, css);
fs.writeFileSync(htmlPath, html);
console.log('Updated TIDAL landing icons, Mixes & Radio label, Genres shortcut, and cache version.');
