# Changelog

This file records project-level milestones and known-good checkpoints. Git history remains the detailed source for individual code changes.

## 2026-09-01 — Personalised TIDAL artwork hardening

- Replaced landing-card artwork enrichment through the full personalised playlist endpoint with the dedicated lightweight `/api/tidal/personalised/artwork?id=...` proxy.
- Landing artwork now consumes up to four distinct official TIDAL artwork URLs returned by the backend rather than loading every playlist page merely to build a collage.
- Reduced artwork enrichment concurrency from three workers to one, avoiding request bursts during a cold My Mixes landing load.
- Added exactly one delayed retry after 2 seconds for a failed artwork request. Successful cards do not make an additional request.
- Removed the temporary visible artwork diagnostics and both one-shot artwork migration helpers before the final checkpoint.
- Live-tested all ten cards successfully with warm caches, then restarted `marantz-backend.service` to clear in-memory caches and repeated the test: all ten cards populated automatically from a genuine cold backend cache.
- PLAY FROM HERE for personalised playlists remains intentionally unimplemented and is the next planned queue feature.

Checkpoint:

```text
300be7a — Fix personalised TIDAL artwork loading
```

Companion backend checkpoint:

```text
2c8ac84 — Add lightweight personalised TIDAL artwork
```

Current tested functional checkpoint:

```text
300be7a — Fix personalised TIDAL artwork loading
```

## 2026-09-01 — AVR status, TIDAL resume and HEOS transition resilience

- Reproduced a post-standby SR8015 failure in which AVR TCP port 23 still accepted connections but stopped returning status/control responses, while HEOS port 1255 remained responsive and playback could continue.
- Corrected receiver power semantics so an unanswered/invalid `ZM?` response is reported as `unknown`, not incorrectly collapsed into standby.
- Protected remembered TIDAL resume state from ambiguous AVR communication failures. Resume state is now changed only by positive evidence: confirmed standby, or confirmed AVR-on with a known non-NET input.
- Physical-panel state management now ignores receiver `power === 'unknown'`, preserving the last confirmed panel state rather than treating communication failure as standby.
- Diagnosed the wrong-track Now Playing flash during personalised queue replacement as real transient HEOS queue metadata. The Pi now uses the backend personalised playback response's deterministic `firstMid` to hold the last confirmed TIDAL metadata until the intended first MID appears, with a 10-second safety timeout. This also prevents transient metadata from overwriting `lastTidalResume`.
- Inspected AVR polling architecture and found `/api/status` is requested every 750 ms while the old `getReceiverStatus()` opened six separate parallel TCP port-23 connections per poll (`ZM?`, `SI?`, `MV?`, `MU?`, `Z2?`, `Z3?`), roughly eight new AVR TCP connections per second.
- Reworked `getReceiverStatus()` to use one short-lived AVR connection per poll, send all six read-only queries on that socket, collect only the required response families, and close when complete or at the bounded timeout. Missing data continues to degrade safely to existing unknown/null semantics.
- The excessive connection churn is recorded as a strong plausible contributor to the AVR port-23 standby/wake wedge, not as independently proven root cause.
- Live testing after the polling change completed three ordinary standby -> wake cycles without reproducing the wedge. Each wake returned complete receiver state (`power: on`, NET/TIDAL, volume and zone state) and the touchscreen left standby normally.

Checkpoint sequence:

```text
9ba1038 — Fix AVR unknown state and protect TIDAL resume
9975380 — Preserve TIDAL resume across confirmed standby
3fa8988 — Suppress transient HEOS queue metadata
ed38288 — Reduce AVR status polling connection churn
```

Current tested functional checkpoint:

```text
ed38288 — Reduce AVR status polling connection churn
```

## 2026-08-31 — Rich personalised TIDAL UI checkpoint

- Completed the touchscreen My Mixes flow for official TIDAL personalised recommendations: My Mix 1-8, My Daily Discovery and My New Arrivals.
- Personalised track rows now retain and display official TIDAL album metadata alongside title, artist and artwork.
- Added PLAY ALL and SHUFFLE ALL controls for personalised playlists through the HP backend's fast resolved/background queue builder. Live My Mix 1 testing began playback in about 2.34 seconds and the background build completed all 39 tracks with zero skips.
- Added official TIDAL recommendation descriptions to the landing cards.
- Added progressive 2x2 artwork collages using up to four distinct official TIDAL album covers from each playlist. Cards render before artwork enrichment; enrichment is limited to three concurrent workers and fails softly.
- Live touchscreen testing confirmed the richer landing-card layout and artwork behaviour.
- Individual personalised tracks support PLAY NOW, PLAY NEXT, ADD TO END and PLAY ONLY. PLAY FROM HERE remains intentionally unavailable for My Mixes for now.

Checkpoint sequence:

```text
ce18540 — Show richer personalised TIDAL track metadata
a7e4970 — Complete personalised TIDAL playback controls
a65f1b5 — Add rich personalised TIDAL landing cards
```

Tested functional checkpoint at this stage:

```text
a65f1b5 — Add rich personalised TIDAL landing cards
```

## 2026-08-28 — Full My Music Albums browser and Play Random

- Removed the old 50-album paging restriction from `My Music-Albums`.
- The touchscreen now requests and displays the complete saved-album collection as one continuous collection.
- Added an `ALL / A-Z` side filter using the same interaction pattern as Artists. Album filtering is deliberately based on **album title**, while the artist remains displayed beneath each album.
- Added **PLAY RANDOM** to Albums.
- PLAY RANDOM always selects from the complete saved-album collection, regardless of the currently selected alphabet filter. The letter filter affects browsing only.
- After choosing an album, the Pi uses the existing album-tracks endpoint, selects track 1 and invokes the established album playback path. The tracks inside the selected album are not shuffled.
- Live touchscreen testing confirmed a random album starts playing correctly.
- An earlier PLAY RANDOM attempt returned a HEOS system error while an old HP Favourite Tracks full-library queue builder was still running. This was diagnosed as backend lifecycle/concurrency interference rather than an Albums implementation fault. After the HP cancellation/drain fix and clean restart, the same Albums PLAY RANDOM path worked normally.

Checkpoint sequence:

```text
6ca4449 — Add My Music Albums UI migration
fc418d2 — Upgrade TIDAL My Music albums browsing
```

Tested functional checkpoint at this stage:

```text
fc418d2 — Upgrade TIDAL My Music albums browsing
```

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

Tested functional checkpoint at this stage:

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
