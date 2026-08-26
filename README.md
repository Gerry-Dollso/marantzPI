# marantzPI

Touchscreen controller and now-playing display for the Marantz SR8015 / HEOS system.

## Current known-good state

Active deployed/development branch:

```text
housekeeping-2026-08-21
```

Known-good functional checkpoint before this documentation update:

```text
3fc0f52 — Add persistent track voice learning
```

This checkpoint includes the completed touchscreen side of persistent TIDAL voice correction/learning. Treat older `v3-development`, `v3`, and stable branches as historical/reference branches unless deliberately restoring or comparing them.

## Current feature set

- Marantz input control using Smart Select mappings for PHONO, CD and TIDAL/HEOS.
- TIDAL library browsing, search, albums, playlists and track playback through the companion media backend.
- TIDAL voice-search fallback surfaced on the touchscreen.
- Touchscreen confirmation/learning for misheard TIDAL artists and tracks; learned mappings are persisted by the HP backend.
- HEOS favourites / internet-radio browser.
- Receiver volume buttons plus touch volume slider.
- HEOS track progress display with tap-to-seek via UPnP AVTransport.
- Zone 2 / Zone 3 power controls and Zone 2 source selection.
- Standby, TV and projector display modes with physical panel power management.
- Direct link to the AVR settings webpage with kiosk-history protection on the local UI.

## Architecture

`server.js` runs locally on the Raspberry Pi and serves the touchscreen UI from `public/`. It talks directly to the AVR for receiver/HEOS status and control. TIDAL library operations and the semantic/voice orchestration layer are handled by the separate `marantz-backend` service on the HP media server.

The Pi remains the physical touchscreen/display/controller. The HP backend is the central media/orchestration service; future local-AI language understanding belongs on the HP side rather than replacing the Pi UI or the deterministic receiver-control layer.

The application runs as the user service:

```text
marantz-display.service
```

## Development workflow

Normal development is Git-based. Large multi-line terminal edits should be avoided where practical because the normal SSH workflow uses Termius on Android and large pastes can be corrupted. Prefer small, sequential, verifiable terminal commands or safe GitHub-side edits.

Before changing code, confirm the checked-out branch and working tree. After JavaScript changes, validate before restarting:

```bash
cd ~/marantz-now-playing
git status -sb
node --check server.js
node --check public/app.js
node --check public/tidal-ui.js
git diff --check
systemctl --user restart marantz-display
systemctl --user is-active marantz-display
```

Do not guess paths, ownership, service scope or configuration values when they can be inspected first. `marantz-display.service` is a user service, not a system-wide service.

`config.json` remains local and is ignored by Git. Never commit credentials, private configuration, logs or diagnostic exports.

## Project scope

This repository is only for the marantzPI / HP backend system. Unrelated computers, repairs, emulation/Batocera systems and other projects are not part of this architecture and must not be used as assumptions when making design decisions.

See `DEBUGGING.md` for diagnostic and recovery commands.
