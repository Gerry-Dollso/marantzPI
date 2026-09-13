const fs = require('fs');
const crypto = require('crypto');

const file = 'README.md';
const expectedSha = 'a2d522287e807fe7eb12a15a327582a8bb81b417';

function gitBlobSha(text) {
  const body = Buffer.from(text, 'utf8');
  return crypto.createHash('sha1')
    .update(Buffer.from(`blob ${body.length}\0`))
    .update(body)
    .digest('hex');
}

const text = fs.readFileSync(file, 'utf8');
const actualSha = gitBlobSha(text);
if (actualSha !== expectedSha) {
  throw new Error(`${file} guard failed: expected ${expectedSha}, got ${actualSha}`);
}

const oldText = `The HP begins playback with the first selected MID and appends the rest sequentially in the background. For Shuffle All, the HP randomises the complete favourites list before starting the first track, so the resulting queue order represents the entire collection.\nThe Pi proxy allows up to 180 seconds for the full-library queue-building request. This long HTTP allowance does not mean\nthe user waits for 180 seconds before hearing music: live testing showed playback begins from the first selected track while the queue continues growing quietly behind it. The HP now\nalso cancels and drains a superseded long Favourite Tracks build before a newer TIDAL playback action takes over, preventing an abandoned builder from interfering with later album/track playback.`;

const newText = `The HP uses the accepted rolling Favourite Tracks queue architecture rather than attempting to build all 594 HEOS queue rows at once. It starts playback from an initial 10-track buffer, replenishes 5 tracks whenever fewer than 5 remain ahead, and keeps HEOS shuffle disabled. For SHUFFLE ALL, the backend shuffles the canonical 594-track order once before the rolling session starts, so playback follows one fixed full-library shuffle order.\n\nA persistent HEOS event connection drives debounced queue reconciliation by qid/count, with bounded tail verification before replenishment. External queue divergence fails closed, and a newer playback request supersedes the older rolling generation so stale work cannot continue modifying the queue.`;

const first = text.indexOf(oldText);
if (first < 0 || text.indexOf(oldText, first + oldText.length) >= 0) {
  throw new Error('Expected exactly one stale Favourite Tracks playback block');
}

const updated = text.slice(0, first) + newText + text.slice(first + oldText.length);
fs.writeFileSync(file, updated);

console.log(`README.md: ${gitBlobSha(updated)}`);
console.log('Favourite Tracks rolling playback documentation corrected.');
