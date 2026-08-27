# marantzPI

Touchscreen controller and now-playing display for the Marantz SR8015 / HEOS system.

## Current known-good state

Active deployed/development branch:

```text
housekeeping-2026-08-21
```

Current tested functional checkpoint:

```text
922b855 — Resume last TIDAL queue track after leaving NET
```

This checkpoint includes the current TIDAL My Music root navigation, artist navigation, playlist/artist track queue controls, guarded HEOS Smart Select behaviour, retained TIDAL queue resume behaviour, and the existing persistent TIDAL voice correction/learning touchscreen flow. Treat older `v3-development`, `v3`, and stable branches as historical/reference branches unless deliberately restoring or comparing them.

## Current feature set

- Marantz input control using Smart Select mappings for PHONO, CD and TIDAL/HEOS.
- TIDAL/HEOS Smart Select 3 is only reapplied when the AVR is not already on NET/HEOS, so browsing/changing TIDAL content does not reset a manually adjusted listening volume or other Smart Select-stored AVR settings.
- TIDAL opens directly into the HEOS `My Music` container, which is treated as the touchscreen TIDAL navigation root. The unused higher-level HEOS choices such as What's New and Genres are not exposed in normal navigation.
- Back from child TIDAL views returns toward My Music; Back from the My Music root closes TIDAL. Back from search returns to My Music rather than exposing the old higher-level shortcut screen.
- TIDAL library browsing and search through the companion media backend.
- Artist selection opens the HEOS artist root rather than jumping directly to Albums. Current artist sections exposed by HEOS are Tracks, Albums, EP n Singles, Other Albums and Similar; selecting a Similar artist recursively opens the same artist structure.
- Playlist controls include PLAY ALL and SHUFFLE ALL. Tapping an individual playlist track opens HEOS-style queue options: PLAY NOW, PLAY NEXT, ADD TO END, PLAY FROM HERE and PLAY ONLY.
- Artist -> Tracks has PLAY ALL and SHUFFLE ALL plus the same individual-track queue options as playlists.
- PLAY NEXT and ADD TO END retain the current browser view. PLAY NOW, PLAY FROM HERE and PLAY ONLY return to Now Playing; Play From Here returns immediately while the HP backend finishes rebuilding the remaining queue.
- Albums and EPs/Singles deliberately retain their existing simpler album playback behaviour; this track-option UI is not applied to them.
- When TIDAL/NET is left for another AVR source or the AVR is powered off, the Pi remembers the last genuine TIDAL track and retained HEOS queue position. While resume is armed, Now Playing uses that remembered metadata rather than unreliable stale stopped HEOS metadata. Pressing Play explicitly finds that MID in the retained queue and restarts the remembered track from the beginning, after which HEOS continues normally through the remaining queue. Restart-from-track-beginning is the deliberate resume policy; exact elapsed-position restoration is not attempted.
- TIDAL voice-search fallback surfaced on the touchscreen.
- Touchscreen confirmation/learning for misheard TIDAL artists and tracks; learned mappings are persisted by the HP backend.
- HEOS favourites / internet-radio browser.
- Receiver volume buttons plus touch volume slider.
- HEOS track progress display with tap-to-seek via UPnP AVTransport.
- Zone 2 / Zone 3 power controls and Zone 2 source selection.
- Standby, TV and projector display modes with physical panel power management.
- Direct link to the AVR settings webpage with kiosk-history protection on the local UI.

## TIDAL architecture notes

`server.js` on the Pi proxies TIDAL library/queue requests to the HP backend while continuing to handle local touchscreen/display and direct AVR responsibilities.

For touchscreen navigation, HEOS `My Music` is intentionally treated as the TIDAL UI root. Do not restore the older higher-level shortcut/root screen unless there is a deliberate requirement for those HEOS sections.

Artist browsing should remain CID-driven. The current HEOS artist root already provides useful native structure and metadata:

```text
LIBARTIST-<id>
  -> Tracks
  -> Albums
  -> EP n Singles
  -> Other Albums
  -> Similar
```

Do not collapse artist navigation back to an Albums-only shortcut.

The shared track-action UI is intentionally limited to list-style containers where queue semantics are appropriate: playlists and `LIBARTIST-Tracks-*`. Album/EP playback remains separate.

TIDAL resume must not trust `get_now_playing_media.qid` after leaving NET: live testing showed HEOS can retain the previous track metadata while incorrectly reporting `qid=1`. Resume therefore remembers the last genuine TIDAL MID and resolves that MID against the retained HEOS queue before issuing `play_queue`. The chosen user-facing policy is to restart that last track from 0:00 rather than attempting unreliable cross-source/power elapsed-position restoration.

Longer-term rich/Roon-like artist UI work should build on these proven containers and on metadata confirmed by the HP backend rather than designing around assumed TIDAL fields.

## Architecture

`server.js` runs locally on the Raspberry Pi and serves the touchscreen UI from `public/`. It talks directly to the AVR for receiver/HEOS status and control. TIDAL library operations and the semantic/voice orchestration layer are handled by the separate `marantz-backend` service on the HP media server.

The Pi remains the physical touchscreen/display/controller. The HP backend is the central media/orchestration service; local-AI language understanding belongs on the HP side rather than replacing the Pi UI or the deterministic receiver-control layer.

The application runs as the user service:

```text
marantz-display.service
```

## Development workflow

Normal development is Git-based. Large multi-line terminal edits should be avoided where practical because the normal SSH workflow uses Termius on Android and large pastes can be corrupted. Prefer small, sequential, verifiable terminal commands, safe GitHub-side edits, or guarded one-shot migration helpers where a multi-file change must be applied to a live checkout.

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
