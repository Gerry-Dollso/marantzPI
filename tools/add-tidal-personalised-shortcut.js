'use strict';

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'public', 'index.html');
let source = fs.readFileSync(file, 'utf8');

if (source.includes('data-tidal-personalised')) {
  console.log('Personalised TIDAL shortcut already present; no change needed.');
  process.exit(0);
}

const marker = '      <div id="tidalShortcuts" class="tidal-shortcuts">\n';
if (!source.includes(marker)) {
  throw new Error('Expected TIDAL shortcuts marker not found; refusing to edit index.html');
}

source = source.replace(
  marker,
  marker + '        <button type="button" data-tidal-personalised="1">FOR YOU</button>\n'
);

source = source.replace(
  '<script src="/tidal-ui.js?v=1"></script>',
  '<script src="/tidal-ui.js?v=2"></script>'
);

fs.writeFileSync(file, source);
console.log('Added FOR YOU shortcut and bumped tidal-ui cache version');
