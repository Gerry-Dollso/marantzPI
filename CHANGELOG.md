# Changelog

This file records project-level milestones and known-good checkpoints. Git history remains the detailed source for individual code changes.

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
