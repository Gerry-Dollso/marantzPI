'use strict';

(() => {
  const openButton = document.getElementById('queueOpen');
  const screen = document.getElementById('queueScreen');
  const backButton = document.getElementById('queueBack');
  const count = document.getElementById('queueCount');
  const status = document.getElementById('queueStatus');
  const list = document.getElementById('queueList');

  if (!openButton || !screen || !backButton || !count || !status || !list) return;

  const REFRESH_MS = 5000;
  let requestGeneration = 0;
  let refreshTimer = null;
  let requestInFlight = false;
  let scrollToCurrentOnNextRender = false;
  let selectedQid = '';
  let playRequestInFlight = false;

  function stopRefresh() {
    if (!refreshTimer) return;
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }

  function setOpen(open) {
    document.body.classList.toggle('show-queue', open);
    screen.setAttribute('aria-hidden', String(!open));

    stopRefresh();
    if (open) {
      scrollToCurrentOnNextRender = true;
      loadQueue();
      refreshTimer = window.setInterval(loadQueue, REFRESH_MS);
    } else {
      requestGeneration += 1;
    }
  }

  function makeText(className, value) {
    const element = document.createElement('div');
    element.className = className;
    element.textContent = String(value || '');
    return element;
  }

  function makeRow(item) {
    const row = document.createElement('div');
    row.className = 'queue-row';
    if (item.current) row.classList.add('current');
    row.dataset.qid = String(item.qid || '');
    row.dataset.mid = String(item.mid || '');
    if (row.dataset.qid && row.dataset.qid === selectedQid && !item.current) row.classList.add('selected');

    const artwork = document.createElement('div');
    artwork.className = 'queue-artwork';
    if (item.imageUrl) {
      const image = document.createElement('img');
      image.src = item.imageUrl;
      image.alt = '';
      image.addEventListener('error', () => image.remove());
      artwork.appendChild(image);
    }

    const text = document.createElement('div');
    text.className = 'queue-text';
    text.append(
      makeText('queue-song', item.song || 'Unknown track'),
      makeText('queue-artist', item.artist || ''),
      makeText('queue-album', item.album || '')
    );

    const position = item.current
      ? makeText('queue-position', 'NOW PLAYING')
      : document.createElement('button');
    if (!item.current) {
      position.type = 'button';
      position.className = 'queue-play-now';
      position.textContent = row.classList.contains('selected') ? 'PLAY NOW' : (item.qid ? `#${item.qid}` : '');
      position.hidden = !row.classList.contains('selected');
    }

    row.append(artwork, text, position);
    return row;
  }

  function renderQueue(data) {
    const items = Array.isArray(data?.items) ? data.items : [];
    const previousScrollTop = list.scrollTop;
    count.textContent = `${items.length} ${items.length === 1 ? 'TRACK' : 'TRACKS'}`;
    list.replaceChildren();

    if (!items.length) {
      status.textContent = 'QUEUE EMPTY';
      return;
    }

    status.textContent = '';
    items.forEach(item => list.appendChild(makeRow(item)));

    const current = list.querySelector('.queue-row.current');
    if (scrollToCurrentOnNextRender && current) {
      scrollToCurrentOnNextRender = false;
      requestAnimationFrame(() => {
        current.scrollIntoView({ block: 'center', behavior: 'auto' });
      });
    } else {
      scrollToCurrentOnNextRender = false;
      list.scrollTop = previousScrollTop;
    }
  }

  async function loadQueue() {
    if (requestInFlight || !document.body.classList.contains('show-queue')) return;

    const generation = requestGeneration;
    const initialLoad = scrollToCurrentOnNextRender;
    requestInFlight = true;

    if (initialLoad) {
      count.textContent = '— TRACKS';
      status.textContent = 'LOADING QUEUE…';
      list.replaceChildren();
    }

    try {
      const response = await fetch('/api/queue', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Queue unavailable');
      if (generation !== requestGeneration || !document.body.classList.contains('show-queue')) return;
      renderQueue(data);
    } catch (error) {
      if (generation !== requestGeneration || !document.body.classList.contains('show-queue')) return;
      if (initialLoad) {
        count.textContent = '— TRACKS';
        status.textContent = String(error?.message || 'QUEUE UNAVAILABLE').toUpperCase();
      }
    } finally {
      requestInFlight = false;
    }
  }

  list.addEventListener('click', async event => {
    const row = event.target.closest('.queue-row');
    if (!row || row.classList.contains('current')) return;
    const qid = String(row.dataset.qid || '');
    if (!qid) return;

    if (!event.target.closest('.queue-play-now')) {
      selectedQid = selectedQid === qid ? '' : qid;
      loadQueue();
      return;
    }

    if (playRequestInFlight) return;
    playRequestInFlight = true;
    const button = event.target.closest('.queue-play-now');
    button.disabled = true;
    button.textContent = 'PLAYING…';
    try {
      const response = await fetch('/api/queue/play?qid=' + encodeURIComponent(qid), { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Could not play queue item');
      selectedQid = '';
      scrollToCurrentOnNextRender = true;
      await loadQueue();
    } catch (error) {
      status.textContent = String(error?.message || 'COULD NOT PLAY TRACK').toUpperCase();
      button.disabled = false;
      button.textContent = 'PLAY NOW';
    } finally {
      playRequestInFlight = false;
    }
  });

  openButton.addEventListener('click', () => setOpen(true));
  backButton.addEventListener('click', () => setOpen(false));
})();
