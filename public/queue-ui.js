'use strict';

(() => {
  const openButton = document.getElementById('queueOpen');
  const screen = document.getElementById('queueScreen');
  const backButton = document.getElementById('queueBack');
  const count = document.getElementById('queueCount');
  const status = document.getElementById('queueStatus');
  const list = document.getElementById('queueList');

  if (!openButton || !screen || !backButton || !count || !status || !list) return;

  let requestGeneration = 0;

  function setOpen(open) {
    document.body.classList.toggle('show-queue', open);
    screen.setAttribute('aria-hidden', String(!open));
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

    const position = makeText(
      'queue-position',
      item.current ? 'NOW PLAYING' : (item.qid ? `#${item.qid}` : '')
    );

    row.append(artwork, text, position);
    return row;
  }

  function renderQueue(data) {
    const items = Array.isArray(data?.items) ? data.items : [];
    count.textContent = `${items.length} ${items.length === 1 ? 'TRACK' : 'TRACKS'}`;
    list.replaceChildren();

    if (!items.length) {
      status.textContent = 'QUEUE EMPTY';
      return;
    }

    status.textContent = '';
    items.forEach(item => list.appendChild(makeRow(item)));

    const current = list.querySelector('.queue-row.current');
    if (current) {
      requestAnimationFrame(() => {
        current.scrollIntoView({ block: 'center', behavior: 'auto' });
      });
    } else {
      list.scrollTop = 0;
    }
  }

  async function loadQueue() {
    const generation = ++requestGeneration;
    count.textContent = '— TRACKS';
    status.textContent = 'LOADING QUEUE…';
    list.replaceChildren();

    try {
      const response = await fetch('/api/queue', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Queue unavailable');
      if (generation !== requestGeneration) return;
      renderQueue(data);
    } catch (error) {
      if (generation !== requestGeneration) return;
      count.textContent = '— TRACKS';
      status.textContent = String(error?.message || 'QUEUE UNAVAILABLE').toUpperCase();
    }
  }

  openButton.addEventListener('click', () => {
    setOpen(true);
    loadQueue();
  });

  backButton.addEventListener('click', () => {
    requestGeneration += 1;
    setOpen(false);
  });
})();
