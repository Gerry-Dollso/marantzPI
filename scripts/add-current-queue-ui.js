'use strict';

const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'public', 'index.html');
const original = fs.readFileSync(target, 'utf8');
const checkOnly = process.argv.includes('--check');

const cssAnchor = '  <link rel="stylesheet" href="/tidal-ui.css?v=1">';
const headerAnchor = '        <div id="sourceHeading" class="heading">NOW PLAYING</div>';
const screenAnchor = '    <section id="tidalScreen" class="tidal-screen" aria-hidden="true">';
const scriptAnchor = '  <script src="/tidal-ui.js?v=3"></script>';

const required = [cssAnchor, headerAnchor, screenAnchor, scriptAnchor];
for (const anchor of required) {
  if (!original.includes(anchor)) {
    throw new Error(`Expected index.html anchor not found: ${anchor}`);
  }
}

for (const marker of ['id="queueOpen"', 'id="queueScreen"', '/queue-ui.css', '/queue-ui.js']) {
  if (original.includes(marker)) {
    throw new Error(`Current Queue UI marker already exists: ${marker}`);
  }
}

let updated = original;
updated = updated.replace(
  cssAnchor,
  `${cssAnchor}\n  <link rel="stylesheet" href="/queue-ui.css?v=1">`
);
updated = updated.replace(
  headerAnchor,
  `${headerAnchor}\n        <button id="queueOpen" class="queue-open-button" type="button">QUEUE</button>`
);
updated = updated.replace(
  screenAnchor,
  `    <section id="queueScreen" class="queue-screen" aria-hidden="true">\n      <header class="queue-header">\n        <button id="queueBack" class="queue-back" type="button">BACK</button>\n        <h1>CURRENT QUEUE</h1>\n        <div id="queueCount" class="queue-count">— TRACKS</div>\n      </header>\n      <div id="queueStatus" class="queue-status"></div>\n      <div id="queueList" class="queue-list" aria-live="polite"></div>\n    </section>\n\n${screenAnchor}`
);
updated = updated.replace(
  scriptAnchor,
  `${scriptAnchor}\n  <script src="/queue-ui.js?v=1"></script>`
);

if (updated === original) {
  throw new Error('No change produced; refusing to write index.html');
}

if (checkOnly) {
  console.log('Current Queue UI wiring anchors validated; no files changed');
  process.exit(0);
}

fs.writeFileSync(target, updated);
console.log('Added Current Queue UI wiring to public/index.html');
