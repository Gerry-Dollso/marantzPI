# Changelog

This file records project-level milestones and known-good checkpoints. Git history remains the detailed source for individual code changes.

## 2026-08-27 — Full Favourite Tracks browser and playback

- Removed the old 50-track paging restriction from `My Music-Tracks`.
- The touchscreen now requests and displays the complete favourite-track collection as one continuous playlist-style list. Live HEOS testing reported 576 saved tracks during implementation.
- Added PLAY ALL and SHUFFLE ALL for the complete favourite-track collection rather than only the current 50-track page.
- Reused the existing five-option individual track menu for Favourite Tracks: PLAY NOW, PLAY NEXT, ADD TO END, PLAY FROM HERE and PLAY ONLY.
- `My Music-Tracks` is now classified as a list-style track container alongside `LIBPLAYLIST-*` and `LIBARTIST-Tracks-*`.
- The Pi routes Favourite Tracks PLAY ALL/SHUFFLE ALL to the dedicated HP endpoint `/api/tidal/tracks/play-all?shuffle=0|1` instead of the normal playlist container-play endpoint, because HEOS refuses direct whole-container playback for `My Music-Tracks`.
- The Pi proxy allows a 180-second backend timeout for full-library queue construction. Playback itself begins from the first selected track while the HP continues appending the remainder of the queue in the background.
- Live testing confirmed the queue grows beyond the former 50-track ceiling. Shuffle All produced a random opening order and continued building quietly while playback proceeded.
- The new full-list browser depends on the HP's bounded in-memory browse cache; this is what makes revisiting hundreds of saved tracks practical without restoring pagination.

### Important implementation lesson

The HP backend proved that HEOS requires literal-space `My Music-Tracks` in its CLI commands. Passing `My%20Music-Tracks` can resolve to the wrong TIDAL container. Pi code should therefore continue treating HEOS CIDs as opaque backend identifiers and leave HEOS command-string formatting to the backend rather than assuming ordinary HTTP encoding can be forwarded unchanged.

Checkpoint sequence:

```text
e0adc71 — Add guarded full favourite tracks migration
4d1eeda — Show full TIDAL favourite tracks list
```

Current tested functional checkpoint:

```text
4d1eeda — Show full TIDAL favourite tracks list
```

## 2026-08-27 — TIDAL browser Now Playing shortcut

- Added a `NOW PLAYING` button to the top-right of the TIDAL browser header, opposite the existing `BACK` button.
- The shortcut only closes the TIDAL overlay; it does not send an AVR command, reapply Smart Select, alter the queue or interrupt playback.
- Unlike `BACK`, the shortcut does not unwind TIDAL browser history. Reopening TIDAL returns to the browser location that was left.
- Live-tested from nested TIDAL browser views with uninterrupted playback and retained navigation state.

Checkpoint:

```text
a0747d0 — Add TIDAL Now Playing shortcut
```

## 2026-08-27 — Now Playing artist and album navigation

- Added canonical TIDAL artist navigation from Now Playing. Tapping the artist name resolves the current TIDAL MID through the HP metadata endpoint and opens the canonical `LIBARTIST-<id>` page without affecting playback.
- Avoided name-only artist matching after live search showed multiple distinct TIDAL artists can share the same visible name.
- Added album navigation from Now Playing using HEOS/TIDAL `album_id`; tapping the album opens the existing album track page without interrupting playback.
- Remembered MID/album ID values take priority during the stopped-resume state so stale HEOS metadata does not open the wrong artist or album.

Tested checkpoints:

```text
822dc35 — Browse TIDAL artist from now playing
4e40553 — Browse TIDAL album from now playing
```

## 2026-08-27 — TIDAL queue resume after leaving NET

- Confirmed HEOS retains its queue after leaving TIDAL/NET but can report stale stopped metadata and an incorrect `qid=1`.
- Added Pi-side memory of the last genuine TIDAL MID/QID and track metadata.
- On the next Play, the Pi resolves the remembered MID against the retained queue and explicitly selects the matching QID.
- Deliberately chose restart-from-track-beginning semantics rather than exact elapsed-position restoration.
- Verified both source-switch and AVR power-off/on scenarios live.

Checkpoint:

```text
922b855 — Resume last TIDAL queue track after leaving NET
```

## 2026-08-27 — TIDAL artist navigation, queue controls and My Music root

- Changed artist selection so the touchscreen opens the real HEOS artist root rather than jumping directly to Albums.
- Confirmed/exposed Tracks, Albums, EP n Singles, Other Albums and Similar.
- Guarded Smart Select 3 so reopening/browsing TIDAL while already on NET does not reapply stored AVR state.
- Added playlist individual-track actions and Artist -> Tracks PLAY ALL/SHUFFLE ALL plus the same five-option track menu.
- PLAY NEXT and ADD TO END retain the browser; PLAY NOW, PLAY FROM HERE and PLAY ONLY return to Now Playing.
- Made HEOS `My Music` the touchscreen TIDAL navigation root.

Tested checkpoints:

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
- Clarified architecture: Raspberry Pi remains the touchscreen/display/controller; the HP media server hosts the companion backend and future local-AI language understanding.

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
