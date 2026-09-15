# Changelog

## 2026-09-15 — TIDAL Now Playing favourite heart

- Added the production Now Playing TIDAL favourite heart. Pi checkpoint: `4e7743e — Add TIDAL favourite heart to Now Playing`.
- The Pi preserves a known official TIDAL track ID when our TIDAL UI launches playback and exposes it as `tidalTrackId` only while the associated HEOS MID still matches. If no preserved official ID exists, live TIDAL `tidalMid` is only a candidate; the HP performs exact official metadata validation and fails closed if it is not a valid official track ID. This preserves the personalised replacement boundary demonstrated by The Sugarcubes — Birthday.
- Heart status is driven by the existing Now Playing `render(data)` cycle and only resynchronises when track identity changes. No second `/api/status` poller was added. Pi proxies status/add/remove to the HP backend; favourite membership and writes remain official-TIDAL operations, never HEOS reconciliation.
- Accepted UI: heart at the right of the progress area, `bottom:48px`; identical 32×29 SVG geometry in both states; non-favourite grey outline `rgba(255,255,255,0.45)`; favourite solid red `#ff3b3b`.
- Controlled end-to-end Aquarius tests passed add and remove through Pi/HP/official TIDAL. Backend latency work reduced official writes from about 35 seconds to roughly 0.3 seconds and immediate post-write status to roughly 0.2 seconds. Backend checkpoint is `6c7e2fe`; its two-minute recent-mutation overlay does not replace the canonical Favourite Tracks collection.
- Task 2 is complete. Next agreed task is TIDAL landing/home artwork cleanup; richer artist page follows.

This file records project-level milestones and known-good checkpoints. Git history remains the detailed source for individual code changes.

## 2026-09-15 — Read-only Current Queue

- Added a Pi-local read-only `GET /api/queue` endpoint using the existing HEOS queue reader plus `get_now_playing_media`. The endpoint returns normalized qid, mid, albumId, song, artist, album and imageUrl fields and marks the current row without changing playback.
- Live reconnaissance established that Current Queue must represent the **physical HEOS queue currently loaded**, not the source/canonical collection length. Favourite Tracks rolling playback was observed at 10 rows then 15 after a five-track low-water append; a 125-track ordinary playlist exposed 50 physical rows; My Mix 2 exposed 24 rows initially and later 40.
- Added a QUEUE button to Now Playing and a dedicated full-screen CURRENT QUEUE view with artwork, title, artist, album, physical track count and NOW PLAYING highlighting.
- Added a 5-second `/api/queue` refresh only while Current Queue is open. Live testing caught that the first deployed UI loaded only once; the corrected implementation was then verified to move the NOW PLAYING highlight automatically on a natural track transition. Manual scroll position is preserved during background refreshes and the current row is centred only when the screen first opens.
- Preserved the intentional TIDAL retained-queue/resume design: an AVR-off state does not by itself invalidate the queue viewer.
- Kept the feature deliberately read-only. No queue selection, remove, reorder, sort or clear mutation was introduced, and the HP backend remains outside this UI path.
- Live touchscreen acceptance passed the queue screen, physical queue rendering and automatic current-row refresh. Production working tree was clean after push.

Checkpoint sequence:

```text
41e8ab0 — Add read-only Current Queue API
1796f6c — Add read-only Current Queue UI
```

## 2026-09-14 — Artist ordering and TIDAL Now Playing swipe return

- Sorted the complete official-TIDAL-backed My Music Artists list alphabetically before applying the existing ALL/A-Z filter. The change is isolated to Artists; Albums, Playlists, Tracks and personalised lists retain their existing ordering. Live touchscreen acceptance passed.
- Restored a deliberately narrow Chromium swipe-back path from TIDAL-triggered Now Playing. PLAY NOW, PLAY FROM HERE and PLAY ONLY arm a one-shot return to the preserved TIDAL browse screen; the existing global browser-history trap remains unchanged.
- Manual TIDAL NOW PLAYING does not arm the gesture. Non-TIDAL MarantzPi input screens remain swipe-trapped/no-op, and native back navigation from the external SR8015 setup page remains unchanged.
- Live acceptance passed return to the exact previous playlist track list and a non-TIDAL input no-op test.
- Temporary guarded migration helpers were removed after both production changes were accepted and pushed.

Checkpoint sequence:

```text
84170a5 — Sort TIDAL Artists alphabetically
7de1701 — Remove TIDAL Artists sort migration helper
36bd317 — Restore TIDAL browse with Now Playing swipe
1758311 — Remove TIDAL swipe return migration helper
```

## 2026-09-14 — Official TIDAL ordinary Playlists UI migration

- Migrated My Music -> Playlists top-level and branch display to the HP backend's official-TIDAL-backed ordinary-playlist endpoint while retaining existing HEOS `LIBPLAYLIST-*` drill-in and playback.
- Preserved the two HEOS categories, Created by me and Favorited. The backend dynamically reconciles the live exact-ID intersection of official TIDAL collection IDs and live HEOS ordinary playlist IDs; no current playlist IDs or personalised Mix/Radio exclusions are hard-coded.
- Acceptance snapshot: 53 official relationship IDs across 3 pages; HEOS 13 Created by me + 21 Favorited = 34 ordinary playlists; all 34 were official, HEOS-only count zero, and the 19 official-only entries were personalised Mixes/Radio. Counts are snapshots rather than fixed invariants.
- Official TIDAL supplies rich metadata/artwork while HEOS supplies branch order and playable `LIBPLAYLIST-*` CIDs. Both USER and EDITORIAL ordinary playlists are valid; playlist type is not used as an exclusion rule.
- Live touchscreen acceptance passed both branches, rich artwork, playlist drill-in, PLAY NOW, PLAY ALL and SHUFFLE ALL.
- Personalised My Mix/Radio and the Sugarcubes/Birthday resolver remain separate; do not reopen that resolver work for ordinary Playlists without new evidence.
- Removed the temporary Pi migration helper after the production source checkpoint was pushed.

Checkpoint sequence:

```text
d2f96e4 — Use official TIDAL ordinary Playlists UI
1e810ed — Remove ordinary Playlists UI migration helper

Companion backend:
43902d1 — Add official TIDAL ordinary Playlists catalogue
0f6bf7b — Remove ordinary Playlists migration helpers
```

## 2026-09-13 — Official TIDAL Artists and Albums UI migration

- Migrated My Music -> Artists and My Music -> Albums top-level display to the HP backend's official-TIDAL-backed catalogue endpoints while retaining existing HEOS CID-driven drill-ins and playback.
- Artists now displays 392 live official resources from 393 relationship references. The HEOS artist collection contains the same 392 live IDs; official ID `32968323` was directly verified as 404 and is omitted.
- Albums now displays 1,482 rich official resources from 1,535 relationship references. HEOS contains the same full 1,535-ID relationship set; 53 official metadata resources remain unresolved. Three sampled unresolved IDs (`1441435`, `69720620`, `308597115`) were directly verified as 404.
- Preserved/generated `LIBARTIST-<id>` and `LIBALBUM-<id>` CIDs so the existing HEOS artist/album drill-ins and playback routes remain unchanged.
- Live touchscreen acceptance passed Artists artwork/A-Z/drill-in, Albums artwork/artist/A-Z/drill-in, PLAY RANDOM, and ordinary album-track PLAY NOW.
- Companion backend prewarm is sequential Artists -> Albums -> Tracks.
- Removed the temporary Pi migration helper after the production source checkpoint was pushed.
- Next migration target is ordinary My Music Playlists. Reconcile official user playlists directly against HEOS `LIBPLAYLIST-*`; do not conflate this with personalised My Mix/Birthday resolver work.

Checkpoint sequence:

```text
998589b — Use official TIDAL Artists and Albums UI
497e6a5 — Remove Artists and Albums UI migration helper

Companion backend:
2ba75d0 — Add official TIDAL Artists and Albums catalogues
f4e1476 — Remove Artists and Albums migration helpers
dbe79a6 — Remove Artists and Albums documentation helper
```

## 2026-09-13 — Official TIDAL Favourite Tracks UI migration

- Migrated My Music -> Tracks display from the older HEOS browse path to the HP backend's official-TIDAL-backed `/api/tidal/favourite-tracks` endpoint through a new Pi proxy.
- The touchscreen now shows the canonical 594-track Favourite Tracks collection as one continuous rich list with official artwork, title, artist and album metadata and no pager.
- Preserved the accepted rolling backend architecture for PLAY ALL, SHUFFLE ALL and PLAY FROM HERE and preserved the existing individual-track action menu.
- End-to-end touchscreen acceptance passed PLAY ALL, SHUFFLE ALL, PLAY FROM HERE, PLAY NOW, PLAY NEXT, ADD TO END and PLAY ONLY. ADD TO END was verified at the actual queue tail.
- Diagnosed ordinary action failures as HEOS CID formatting rather than ID mismatch. Official TIDAL IDs match the reconciled HEOS MIDs; the required fix was to preserve literal-space `My Music-Tracks` in HEOS `browse/add_to_queue` commands instead of sending `My%20Music-Tracks`.
- Removed both temporary guarded migration helpers after production commits were pushed and verified clean.
- Next migration target is My Music Artists, Albums and Playlists: move their display/catalogue paths to the same faster, richer official TIDAL pattern while retaining HEOS playback.

Checkpoint sequence:

```text
27be5d1 — Use official TIDAL Favourite Tracks UI
750de76 — Remove Favourite Tracks UI migration helper

Companion backend:
08a86ce — Fix Favourite Tracks ordinary actions
9ba3b6f — Remove Favourite Tracks action fix helper
```

## 2026-09-02 — Personalised TIDAL PLAY FROM HERE

- Added PLAY FROM HERE to official-API-backed My Mix/personalised track actions. The Pi sends the personalised playlist ID plus the exact official selected track ID to the backend rather than falling back to a generic HEOS container action.
- The backend validates that the selected official track belongs to the fetched personalised playlist, rejects PLAY FROM HERE combined with shuffle, slices the queue from the selected track onward, and preserves the existing deterministic resolver, first-track `aid=4`, background `aid=3` queue builder and generation-cancellation design.
- Hardened selected-first semantics: when PLAY FROM HERE is requested, the selected first track must resolve and queue safely. Resolution ambiguity/failure returns fail-closed instead of silently starting the following track. Later tracks retain the normal safe-skip behaviour used by the background builder.
- Fixed the shared track-action button lifecycle so successful actions clear their disabled/loading state in `finally`, making PLAY FROM HERE and other actions using the same handler reusable on subsequent menu openings.
- Live touchscreen acceptance confirmed the exact selected track starts, PLAY FROM HERE remains available on repeated use, and selecting the final track produces the correct queue boundary: NEXT does not start an unrelated track.
- A Current Queue touchscreen view is now a planned follow-up so queue contents can be inspected directly; initial scope should be read-only before considering queue editing.

Pi implementation/checkpoint sequence includes:

```text
beaa458 — Enable My Mix play from here
041b035 — Make TIDAL track actions reusable
bcabd8a — Remove TIDAL track action reuse helper
```

Companion backend final checkpoint:

```text
9ac4924 — Remove strict play from here helper
```

Current tested Pi source checkpoint:

```text
bcabd8a — Remove TIDAL track action reuse helper
```

## 2026-09-02 — AVR/HEOS network-path recovery investigation

- During ReSpeaker voice testing, voice-started IDLES playback succeeded but the Pi Now Playing screen fell back to `UNKNOWN`. A live `/api/status` proved HEOS metadata remained healthy (`Heel / Heal`, IDLES, Brutalism, artwork and progress) while the AVR status path had failed completely: receiver power/input were `unknown`, volume was null, and `hasTrackInfo` was false because NET could no longer be confirmed.
- Direct SR8015 TCP/23 tests from both the Pi and HP established TCP connections but initially returned zero response bytes to `SI?`. HEOS port 1255 remained responsive.
- The fault was isolated conservatively before changing code: `marantz-display.service` and `marantz-backend.service` were stopped; `marantz-ai.service` was identified as the llama.cpp model server; no HP or Pi TCP connections to the AVR were present in `ss`, and repeated short-lived port-23 activity was not observed. Both HP and Pi were rebooted and direct `SI?` remained silent with the AVR fully on.
- AVR troubleshooting included ordinary power/reboot, the firmware update that occurred during troubleshooting, toggling Network Control, and a dedicated Network Settings reset. None by itself restored the silent TCP/23 command response.
- The Network Settings reset temporarily left HEOS external services unavailable: direct `browse/get_music_sources` showed Amazon, Deezer, Qobuz, SoundCloud, TIDAL and TuneIn as `available:false` while local HEOS sources remained available. The HEOS app and AVR web interface still showed the account signed in, so `available:false` must not be treated as proof of account logout.
- A subsequent cold wall-power cycle included the AVR, Pi and, importantly, the physical network switch serving the AVR. After this, TIDAL and Internet Radio menus returned and TCP/23 began returning data again.
- Literal byte capture with `od` proved the recovered TCP/23 stream contained clean CR-terminated Marantz protocol responses/status messages including `SINET`, `ZMON`, `MV48`, `MVMAX 80`, `MUOFF`, `Z2OFF` and `Z3OFF`. Termius had made the CR-only stream look visually garbled/overwritten; inspect literal bytes when terminal rendering is ambiguous.
- The live Pi `/api/status` then returned healthy AVR state again: `power:on`, `input:TIDAL`, `inputCode:NET`, volume `-32`, mute false. Touchscreen TIDAL/Internet Radio and normal operation were subsequently confirmed working.
- No production code was changed for this incident. The network switch/path is now a serious suspect because recovery occurred only after the cold power cycle that included it, but this is **not a proven root cause** because multiple devices were cold-cycled together. Do not describe the earlier Pi port-23 connection churn, the network switch, firmware, or voice/ReSpeaker as independently proven causes.
- If this symptom recurs, first preserve the fault and distinguish layers: direct HEOS 1255 metadata, direct AVR TCP/23 byte response, `/api/status`, current sockets from both Pi and HP, and network-switch state. Avoid factory-resetting the AVR or modifying production code before those checks.

Current tested functional source checkpoint remains:

```text
300be7a — Fix personalised TIDAL artwork loading
```

Companion backend source checkpoint remains:

```text
2c8ac84 — Add lightweight personalised TIDAL artwork
```

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
