'use strict';

const fs = require('fs');
function replaceExact(path, before, after) {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes(before)) throw new Error(`${path}: expected source block not found`);
  fs.writeFileSync(path, source.replace(before, after));
}
replaceExact('public/tidal-artist-ui.js', "let tidalArtistCurrentDetails = null;", "let tidalArtistCurrentDetails = null;\nlet tidalArtistRequestToken = 0;");
replaceExact('public/tidal-artist-ui.js', "  seeAll.textContent = 'SEE ALL ›';", "  seeAll.className = 'tidal-artist-more';\n  seeAll.setAttribute('aria-label', 'Show all ' + title);\n  seeAll.textContent = '›';");
replaceExact('public/tidal-artist-ui.js', "category, 4);", "category, 3);");
replaceExact('public/tidal-artist-ui.js', "async function loadTidalArtistLanding(artistId, title) {\n  tidalScreen.classList.add('artist-page', 'browsing');", "async function loadTidalArtistLanding(artistId, title) {\n  const requestToken = ++tidalArtistRequestToken;\n  tidalScreen.classList.add('artist-page', 'browsing');");
replaceExact('public/tidal-artist-ui.js', "    renderTidalArtistPage(result);\n  } catch (error) {\n    tidalStatus.textContent = error.message;", "    if (requestToken !== tidalArtistRequestToken) return;\n    renderTidalArtistPage(result);\n  } catch (error) {\n    if (requestToken !== tidalArtistRequestToken) return;\n    tidalStatus.textContent = error.message;");
replaceExact('public/tidal-artist-ui.js', "  if (!artistId) {\n    resetTidalArtistPage();", "  if (!artistId) {\n    tidalArtistRequestToken += 1;\n    resetTidalArtistPage();");
replaceExact('public/tidal-artist-ui.css', ".tidal-artist-section-link { display: flex; align-items: center; justify-content: space-between; cursor: pointer; }\n.tidal-artist-section-link span { margin-right: 10px; font-size: 10px; letter-spacing: 0.1em; opacity: 0.72; }", ".tidal-artist-section-link { display: flex; align-items: center; justify-content: space-between; }\n.tidal-artist-more { width: 42px; height: 30px; margin: -7px 0 -7px 10px; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; font-size: 24px; line-height: 30px; text-align: right; opacity: 0.72; }");
replaceExact('public/tidal-artist-ui.css', "  overflow-y: auto;\n  overflow-x: hidden;\n  overscroll-behavior: contain;\n  touch-action: pan-y;", "  overflow: hidden;");
replaceExact('public/tidal-artist-ui.css', "  display: grid; grid-auto-flow: column; grid-auto-columns: minmax(220px, 1fr);\n  gap: 10px; overflow-x: auto; overflow-y: hidden; padding-bottom: 3px;\n  scrollbar-width: none; touch-action: pan-x;", "  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));\n  gap: 10px; overflow: hidden; padding-bottom: 3px;");
replaceExact('public/index.html', '/tidal-artist-ui.css?v=1', '/tidal-artist-ui.css?v=2');
replaceExact('public/index.html', '/tidal-artist-ui.js?v=1', '/tidal-artist-ui.js?v=2');
console.log('Updated 8-inch Artist landing layout, compact controls and navigation guard');
