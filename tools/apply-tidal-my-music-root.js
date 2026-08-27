'use strict';

const fs = require('fs');
const path = require('path');

const uiPath = path.join(__dirname, '..', 'public', 'tidal-ui.js');
let source = fs.readFileSync(uiPath, 'utf8');

if (source.includes('TIDAL_UI_ROOT_CID')) {
  throw new Error('My Music TIDAL root already appears to be applied');
}

const stateAnchor = "const tidalHistory = [];\n";
if (!source.includes(stateAnchor)) {
  throw new Error('Expected TIDAL history anchor not found; refusing to edit');
}
source = source.replace(
  stateAnchor,
  "const TIDAL_UI_ROOT_CID = 'My Music';\nconst TIDAL_UI_ROOT_TITLE = 'My Music';\n\n" + stateAnchor
);

const searchHistory = `  tidalScreen.classList.add("browsing");\n  tidalHistory.length = 0;\n  tidalHistory.push({\n    cid: '__search__',\n    title: query\n  });\n`;
const searchHistoryReplacement = `  tidalScreen.classList.add("browsing");\n  tidalHistory.length = 0;\n  tidalHistory.push(\n    { cid: TIDAL_UI_ROOT_CID, title: TIDAL_UI_ROOT_TITLE },\n    { cid: '__search__', title: query }\n  );\n`;
if (!source.includes(searchHistory)) {
  throw new Error('Expected TIDAL search history block not found; refusing to edit');
}
source = source.replace(searchHistory, searchHistoryReplacement);

const openerBlock = `    setTidalOpen(true);\n    tidalHistory.length = 0;\n    tidalScreen.classList.remove("browsing");\n    tidalResults.replaceChildren();\n    tidalStatus.textContent = "Choose a section or search TIDAL";\n`;
const openerReplacement = `    setTidalOpen(true);\n    tidalHistory.length = 0;\n    browseTidal(TIDAL_UI_ROOT_CID, TIDAL_UI_ROOT_TITLE);\n`;
if (!source.includes(openerBlock)) {
  throw new Error('Expected TIDAL opener block not found; refusing to edit');
}
source = source.replace(openerBlock, openerReplacement);

const backBlock = `  if (tidalHistory.length === 1) {\n    tidalHistory.length = 0;\n    tidalScreen.classList.remove("browsing");\n    tidalResults.replaceChildren();\n    tidalStatus.textContent = "Choose a section or search TIDAL";\n    return;\n  }\n\n  setTidalOpen(false);\n`;
const backReplacement = `  if (tidalHistory.length === 1) {\n    tidalHistory.length = 0;\n    setTidalOpen(false);\n    return;\n  }\n\n  setTidalOpen(false);\n`;
if (!source.includes(backBlock)) {
  throw new Error('Expected TIDAL back-root block not found; refusing to edit');
}
source = source.replace(backBlock, backReplacement);

const backup = uiPath + '.before-tidal-my-music-root';
if (!fs.existsSync(backup)) fs.copyFileSync(uiPath, backup);

fs.writeFileSync(uiPath, source);
console.log('Applied guarded My Music TIDAL root migration');
console.log('Backup:', backup);
