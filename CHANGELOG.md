# Changelog

This file records project-level milestones and known-good checkpoints. Git history remains the detailed source for individual code changes.

## 2026-08-27 — TIDAL browser Now Playing shortcut

- Added a `NOW PLAYING` button to the top-right of the TIDAL browser header, opposite the existing `BACK` button.
- The shortcut is deliberately UI-only: it closes the TIDAL overlay and immediately exposes the existing shared HEOS/NET Now Playing screen without sending an AVR source command, reapplying Smart Select, changing the queue or interrupting playback.
- Unlike `BACK`, the shortcut does not unwind or clear TIDAL browser history. Reopening TIDAL returns to the browser location that was left.
- Live-tested from nested TIDAL browser views with uninterrupted playback and retained navigation state.

Checkpoint:

```text
a0747d0 — Add TIDAL Now Playing shortcut
```

Current tested functional checkpoint:

```text
a0747d0 — Add TIDAL Now Playing shortcut
```

## 2026-08-27 — Now Playing artist and album navigation

- Added canonical TIDAL artist navigation from Now Playing. Tapping the displayed artist name sends the current TIDAL MID through the Pi proxy to the HP metadata endpoint, resolves the canonical TIDAL artist ID, and opens the existing `LIBARTIST-<id>` artist page without affecting playback.
- Deliberately avoided name-only artist matching after live search showed multiple distinct TIDAL artists can share the same visible name.
- Added `tidalMid` to the Pi status payload and made the remembered MID take priority while TIDAL resume is armed, preventing stale stopped HEOS metadata from resolving the wrong artist after a source change.
- Added album navigation from Now Playing using the canonical HEOS/TIDAL `album_id`. Tapping the displayed album opens the existing `LIBALBUM-<id>` track page, including its normal PLAY ALL behaviour, without interrupting playback.
- Added remembered album ID alongside the TIDAL resume metadata so album navigation remains correct after leaving NET/powering off even when HEOS stopped metadata is stale.
- Both artist and album links are exposed only for genuine TIDAL playback and use the existing TIDAL browser/navigation stack, with My Music as the navigation root.
- Live-tested artist navigation, album navigation, Back behaviour, uninterrupted playback, and the stopped/resume source-switch case.

Tested checkpoints:

```text
822dc35 — Browse TIDAL artist from now playing
4e40553 — Browse TIDAL album from now playing
```

## 2026-08-27 — TIDAL queue resume after leaving NET

- Investigated HEOS behaviour after leaving TIDAL/NET for another AVR source or powering the AVR off.
- Confirmed HEOS retains the existing queue but can report misleading stopped Now Playing state after returning to NET: live testing showed the previous track metadata paired with an incorrect `qid=1`, while the same MID still existed at its real queue position.
- Confirmed manually that `player/play_queue` against the real retained QID resumes the intended track rather than queue item 1.
- Added Pi-side memory of the last genuine TIDAL MID/QID and track metadata while NET/TIDAL is active.
- When a TIDAL resume is armed, Now Playing displays the remembered track rather than stale stopped metadata returned by HEOS.
- On the next Play, the Pi resolves the remembered MID against the retained HEOS queue and explicitly selects the matching QID before continuing playback.
- Queue lookup is paginated with correct HEOS start/end ranges so retained queues longer than 50 items are supported.
- Deliberately chose restart-from-track-beginning semantics rather than attempting exact elapsed-position restoration. After a source change or power cycle, pressing Play restarts the last TIDAL track from 0:00 and then continues through the retained queue normally.
- Verified both source-switch and AVR power-off/on scenarios on the live system.

Checkpoint:

```text
922b855 — Resume last TIDAL queue track after leaving NET
```

## 2026-08-27 — TIDAL artist navigation, queue controls and My Music root

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
- Changed the touchscreen TIDAL entry point so HEOS `My Music` is now the effective UI root rather than the unused higher-level shortcut screen.
- Back navigation now closes TIDAL from the My Music root, while child views unwind normally toward My Music.
- Search history is rooted at My Music, so Back from search returns to My Music and cannot expose the old higher-level screen.

Tested checkpoints during this work:

```text
f6ce7a0 — Browse full TIDAL artist sections
025c87a — Avoid reapplying HEOS Smart Select while on NET
0597193 — Add TIDAL playlist track action menu
c656e8d — Return to now playing for TIDAL play from here
a865638 — Add TIDAL artist track controls
f93602b — Make My Music the TIDAL navigation root
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
