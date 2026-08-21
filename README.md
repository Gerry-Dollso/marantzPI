# marantzPI

Touchscreen controller and now-playing display for a Marantz AVR with HEOS playback.

## Current v3 feature set

- Marantz input control using Smart Select mappings for PHONO, CD and TIDAL/HEOS.
- TIDAL library browsing, search, albums, playlists and track playback through the companion media backend.
- HEOS favourites / internet-radio browser.
- Receiver volume buttons plus touch volume slider.
- HEOS track progress display with tap-to-seek via UPnP AVTransport.
- Zone 2 / Zone 3 power controls and Zone 2 source selection.
- Standby, TV and projector display modes with physical panel power management.
- Direct link to the AVR settings webpage with kiosk-history protection on the local UI.

## Architecture

`server.js` runs locally on the Raspberry Pi and serves the touchscreen UI from `public/`. It talks directly to the AVR for receiver/HEOS status and control. TIDAL library operations are proxied to the separate `marantz-backend` service running on the media server.

The application runs as the user service:

```text
marantz-display.service
```

## Development branch

Active development is on:

```text
v3-development
```

The known-good checkpoint immediately before the 2026-08-21 housekeeping pass is:

```text
99cdb6e — Add touch seek and kiosk history guard
```

## Updating an installation

The normal development workflow is Git-based. After updating the checked-out branch, validate the JavaScript before restarting:

```bash
node --check server.js
node --check public/app.js
node --check public/tidal-ui.js
systemctl --user restart marantz-display
```

`config.json` remains local and is ignored by Git.

See `DEBUGGING.md` for diagnostic and recovery commands.
