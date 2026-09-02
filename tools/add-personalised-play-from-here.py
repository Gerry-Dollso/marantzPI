from pathlib import Path

server_path = Path('server.js')
ui_path = Path('public/tidal-ui.js')
server = server_path.read_text()
ui = ui_path.read_text()

server_old = """      const id = String(url.searchParams.get('id') || '').trim();
      const shuffle = url.searchParams.get('shuffle') === '1' ? '1' : '0';

      if (!/^[a-zA-Z0-9]+$/.test(id)) {
        return sendJson(res, 400, { ok: false, error: 'Invalid playlist id' });
      }

      startTidalQueueTransition();
"""
server_new = """      const id = String(url.searchParams.get('id') || '').trim();
      const startTrackId = String(url.searchParams.get('start') || '').trim();
      const shuffle = url.searchParams.get('shuffle') === '1' ? '1' : '0';

      if (!/^[a-zA-Z0-9]+$/.test(id)) {
        return sendJson(res, 400, { ok: false, error: 'Invalid playlist id' });
      }
      if (startTrackId && !/^\\d+$/.test(startTrackId)) {
        return sendJson(res, 400, { ok: false, error: 'Invalid start track id' });
      }
      if (startTrackId && shuffle === '1') {
        return sendJson(res, 400, {
          ok: false,
          error: 'Play From Here cannot be combined with shuffle'
        });
      }

      startTidalQueueTransition();
"""

server_url_old = """          '/api/tidal/personalised/playlist/play?id=' + encodeURIComponent(id) +
          '&shuffle=' + shuffle,
"""
server_url_new = """          '/api/tidal/personalised/playlist/play?id=' + encodeURIComponent(id) +
          '&shuffle=' + shuffle +
          (startTrackId ? '&start=' + encodeURIComponent(startTrackId) : ''),
"""

ui_block_old = """  if (selection.personalised && action === 'play-from-here') {
    tidalStatus.textContent = 'Play From Here is not available for My Mixes yet';
    return;
  }

"""

ui_url_old = """    const actionUrl = selection.personalised
      ? '/api/tidal/play-resolved?id=' + encodeURIComponent(selection.mid) +
        '&action=' + encodeURIComponent(action)
      : '/api/tidal/track/action?cid=' + encodeURIComponent(selection.cid) +
        '&mid=' + encodeURIComponent(selection.mid) +
        '&action=' + encodeURIComponent(action);
"""
ui_url_new = """    let actionUrl;
    if (selection.personalised && action === 'play-from-here') {
      if (!selection.cid.startsWith(TIDAL_PERSONALISED_PLAYLIST_PREFIX)) {
        throw new Error('My Mix playlist context is unavailable');
      }
      const playlistId = selection.cid.slice(TIDAL_PERSONALISED_PLAYLIST_PREFIX.length);
      if (!/^[a-zA-Z0-9]+$/.test(playlistId)) {
        throw new Error('My Mix playlist context is invalid');
      }
      actionUrl =
        '/api/tidal/personalised/playlist/play?id=' + encodeURIComponent(playlistId) +
        '&start=' + encodeURIComponent(selection.mid) +
        '&shuffle=0';
    } else if (selection.personalised) {
      actionUrl =
        '/api/tidal/play-resolved?id=' + encodeURIComponent(selection.mid) +
        '&action=' + encodeURIComponent(action);
    } else {
      actionUrl =
        '/api/tidal/track/action?cid=' + encodeURIComponent(selection.cid) +
        '&mid=' + encodeURIComponent(selection.mid) +
        '&action=' + encodeURIComponent(action);
    }
"""

replacements = [
    ('server parameter anchor', server_old, server_new, 'server'),
    ('server backend URL anchor', server_url_old, server_url_new, 'server'),
    ('UI unavailable block', ui_block_old, '', 'ui'),
    ('UI action URL anchor', ui_url_old, ui_url_new, 'ui'),
]

for label, old, new, target in replacements:
    text = server if target == 'server' else ui
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label} count was {count}, expected 1')
    text = text.replace(old, new, 1)
    if target == 'server':
        server = text
    else:
        ui = text

server_path.write_text(server)
ui_path.write_text(ui)
print('Inserted guarded personalised Play From Here wiring into Pi server and TIDAL UI')
