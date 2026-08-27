# Changelog

This file records project-level milestones and known-good checkpoints. Git history remains the detailed source for individual code changes.

## 2026-08-27 — TIDAL artist navigation and queue controls

- Changed artist selection so the touchscreen now opens the real HEOS artist root instead of jumping directly to Albums.
- Confirmed and exposed the HEOS artist sections `Tracks`, `Albums`, `EP n Singles`, `Other Albums` and `Similar`.
- Confirmed Similar Artists returns real `LIBARTIST-*` containers with artwork and that selecting a similar artist recursively opens the same artist structure.
- Added a guard around TIDAL/HEOS Smart Select 3: if `SI?` already reports `SINET`, reopening/browsing TIDAL no longer sends `MSSMART3`. This prevents a Smart Select-stored volume/Audyssey/speaker state from being reapplied every time the user changes TIDAL content.
- Preserved Smart Select 3 behaviour when switching into TIDAL from another AVR source.
- Added an individual playlist-track action menu with `PLAY NOW`, `PLAY NEXT`, `ADD TO END`, `PLAY FROM HERE` and `PLAY ONLY`.
- Verified the queue actions live against the SR8015/HEOS backend.
- `PLAY NEXT` and `ADD TO END` keep the playlist browser open; `PLAY NOW`, `PLAY FROM HERE` and `PLAY ONLY` return to Now Playing.
- Corrected Play From Here so the touchscreen returns to Now Playing immediately while the HP finishes rebuilding the remaining queue.
- Added `PLAY ALL` and `SHUFFLE ALL` to Artist -> Tracks and reused the same five-option individual-track menu there.
- Kept Albums and EPs/Singles deliberately unchanged; their existing album playback flow remains separate from list-style queue actions.

Tested checkpoints during this work:

```text
f6ce7a0 — Browse full TIDAL artist sections
025c87a — Avoid reapplying HEOS Smart Select while on NET
0597193 — Add TIDAL playlist track action menu
c656e8d — Return to now playing for TIDAL play from here
a865638 — Add TIDAL artist track controls
```

Current tested functional checkpoint:

```text
a865638 — Add TIDAL artist track controls
```

## 2026-08-26 — Pre-local-AI documentation baseline

- Confirmed active branch as `housekeeping-2026-08-21`.
- Recorded `3fc0f52` (`Add persistent track voice learning`) as the known-good functional checkpoint before documentation-only updates.
- Updated project documentation so older `v3-development` recovery information is no longer presented as current.
- Clarified architecture: Raspberry Pi remains the touchscreen/display/controller; the HP media server hosts the companion backend and is the intended home for future local-AI language understanding.
- Clarified that unrelated computer repair, Batocera/emulation and other hardware projects are outside this project's scope.

## 2026-08-24 — Persistent TIDAL voice learning

- Added touchscreen artist voice learning.
- Added persistent track/title voice-learning flow.
- Added safe TIDAL voice-search fallback rather than blindly accepting unsafe matches.
- Confirmed learned corrections can turn repeated speech-recognition errors into direct playback on subsequent requests.

Known-good functional checkpoint:

```text
3fc0f52 — Add persistent track voice learning
```

## 2026-08-23 — Backend routing and voice fallback

- Routed AUX touchscreen control through the media backend.
- Added TIDAL voice-search fallback to the touchscreen.

## Historical baseline

The pre-housekeeping checkpoint remains useful for historical diagnosis only:

```text
99cdb6e — Add touch seek and kiosk history guard
```

It is not the current recovery target.
