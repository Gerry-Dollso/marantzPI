# marantzPI

Touchscreen controller and now-playing display for the Marantz SR8015 / HEOS system.

## Current known-good state

Active deployed/development branch:

```text
housekeeping-2026-08-21
```

Current tested functional checkpoint:

```text
300be7a — Fix personalised TIDAL artwork loading
```

This checkpoint includes the current rich personalised TIDAL/My Mixes UI and playback controls, protected TIDAL resume behaviour, deterministic suppression of transient HEOS queue metadata during queue replacement, explicit AVR `unknown` handling, reduced AVR port-23 connection churn, and the production personalised-artwork path tested 10/10 from a cold backend cache. Treat older `v3-development`, `v3`, and stable branches as historical/reference branches unless deliberately restoring or comparing them.

## Personalised TIDAL artwork checkpoint — 1 Sep 2026

Landing-card artwork no longer loads each complete personalised playlist. The Pi now calls the dedicated backend `/api/tidal/personalised/artwork?id=...` endpoint, which returns up to four distinct official TIDAL artwork URLs from the first playlist page only. Artwork enrichment is deliberately sequential (`concurrency = 1`) to avoid bursts. A failed card gets one retry after a 2-second delay; successful cards make no extra request.

The backend artwork cache is independent of the full-playlist cache and lives for 30 minutes. A warm full personalised-playlist cache can also satisfy artwork without another TIDAL API call. The final production path was tested 10/10 with warm caches and again 10/10 after restarting the HP backend to force a genuinely cold in-memory cache. The temporary artwork diagnostics and migration helpers were removed before checkpointing.

Pi checkpoint:

```text
300be7a — Fix personalised TIDAL artwork loading
```

Companion backend checkpoint:

```text
2c8ac84 — Add lightweight personalised TIDAL artwork
```

PLAY FROM HERE remains the next planned personalised-playlist feature; it has not been implemented yet.

## AVR status/resume resilience checkpoint — 1 Sep 2026

A post-standby failure was reproduced where the SR8015 remained physically on and HEOS port 1255 stayed responsive, but AVR control/status on TCP port 23 accepted connections without returning responses. The Pi correctly exposed this as receiver power `unknown`; because the last confirmed display state was standby, the touchscreen could remain on its standby/Powering on screen until the AVR was power-cycled.

The Pi no longer interprets an unanswered `ZM?` query as standby. Receiver power is `on` only for `ZMON`, `standby` only for `ZMOFF`, and otherwise `unknown`. TIDAL resume state is changed only from positive evidence: confirmed standby, or confirmed AVR-on with a known non-NET input. An `unknown` power/input state must not erase or incorrectly arm remembered TIDAL resume state. Physical-panel state management likewise ignores `power === 'unknown'` and preserves the last confirmed state.

The queue-replacement transition guard now uses the personalised playback response's deterministic `firstMid`. During a My Mix/queue replacement, the Pi holds the last confirmed TIDAL metadata until that expected MID appears, with a 10-second safety timeout. This prevents real but temporary HEOS intermediate queue entries from flashing on Now Playing or overwriting `lastTidalResume`.

Inspection also found that the touchscreen polls `/api/status` every 750 ms and the former `getReceiverStatus()` implementation opened six separate, parallel AVR port-23 connections on every poll (`ZM?`, `SI?`, `MV?`, `MU?`, `Z2?`, `Z3?`). That was roughly eight new AVR TCP connections per second during normal operation and is a strong plausible contributor to the port-23 interface wedging around standby/wake, although it is not claimed as independently proven root cause.

At checkpoint `ed38288`, `getReceiverStatus()` uses one short-lived port-23 connection per status poll, sends all six read-only queries over that socket, collects only the required response families, and closes when all six are received or after the existing bounded timeout. Missing responses continue to degrade safely to `unknown`/null semantics rather than being treated as confirmed standby. Live testing completed three ordinary standby -> wake cycles without reproducing the previous port-23 wedge; receiver status returned normally to `power: "on"`, NET/TIDAL and the correct volume/zone state after each wake.

Checkpoint sequence:

```text
9ba1038 — Fix AVR unknown state and protect TIDAL resume
9975380 — Preserve TIDAL resume across confirmed standby
3fa8988 — Suppress transient HEOS queue metadata
ed38288 — Reduce AVR status polling connection churn
```

## Personalised TIDAL / My Mixes checkpoint — 31 Aug 2026

The touchscreen has an official-API-backed **My Mixes** experience covering My Mix 1-8, My Daily Discovery and My New Arrivals. The landing page renders immediately from the personalised recommendation listing, including TIDAL-provided names and descriptions, then progressively enriches each card with a 2x2 collage built from up to four distinct official TIDAL album covers. Artwork uses the dedicated lightweight first-page backend endpoint, loads sequentially to avoid request bursts, and retries a failed card once after two seconds. Artwork remains optional/fail-soft, so a slow or failed cover request never blocks the card or its navigation.

Inside a personalised playlist, rows show official TIDAL artwork plus track title, artist and album. PLAY ALL and SHUFFLE ALL use the HP backend's resolved personalised queue path. Live My Mix 1 testing starts playback in about 2.34 seconds and builds the remainder in the background; the tested 39-track mix completed 39/39 with zero skips. Individual personalised tracks support PLAY NOW, PLAY NEXT, ADD TO END and PLAY ONLY. PLAY FROM HERE remains deliberately unavailable for My Mixes until its generic queue-tail semantics are implemented.

Related source checkpoints include `ce18540` (richer personalised track metadata), `a7e4970` (personalised playback controls) and `a65f1b5` (rich personalised landing cards).

## Current feature set

- Marantz input control using Smart Select mappings for PHONO, CD and TIDAL/HEOS.
- TIDAL/HEOS Smart Select 3 is only reapplied when the AVR is not already on NET/HEOS, so browsing/changing TIDAL content does not reset manually adjusted listening state.
- TIDAL opens directly into the HEOS `My Music` container, which is treated as the touchscreen TIDAL navigation root.
- Back from child TIDAL views returns toward My Music; Back from My Music closes TIDAL.
- Every TIDAL browser screen has a `NOW PLAYING` shortcut in the top-right opposite `BACK`. It only hides the TIDAL overlay and preserves browser history, playback, queue and AVR state.
- TIDAL library browsing and search through the companion HP backend.
- Artist selection opens the native HEOS artist root with Tracks, Albums, EP n Singles, Other Albums and Similar.
- On TIDAL Now Playing, tapping the artist name opens the canonical TIDAL artist page without interrupting playback.
- Tapping the album title opens the canonical album page without interrupting playback.
- Playlist controls include PLAY ALL and SHUFFLE ALL. Individual playlist tracks expose PLAY NOW, PLAY NEXT, ADD TO END, PLAY FROM HERE and PLAY ONLY.
- Artist -> Tracks has PLAY ALL and SHUFFLE ALL plus the same individual-track queue menu.
- **My Music -> Tracks displays the complete favourite-track collection as one continuous playlist-style list rather than 50-track pages.**
- Favourite Tracks has **PLAY ALL** and **SHUFFLE ALL** over the complete collection, not merely the first/current 50 tracks.
- Favourite Tracks individual entries use the same five-option track menu as playlists and Artist -> Tracks.
- **My Music -> Albums displays the complete saved-album collection as one continuous collection rather than 50-album pages.**
- Albums has the same side **ALL / A-Z** navigation pattern as Artists. Filtering is by album title; the artist remains displayed beneath each album.
- Albums has **PLAY RANDOM**, which chooses from the complete saved-album collection regardless of the currently selected letter and starts the selected album from track 1 through the existing album playback path.
- PLAY RANDOM was live-tested successfully on the touchscreen. The earlier failed attempt was traced to a still-running HP Favourite Tracks queue builder; after the backend lifecycle fix and clean restart, random album playback started correctly.
- PLAY NEXT and ADD TO END retain the browser view. PLAY NOW, PLAY FROM HERE and PLAY ONLY return to Now Playing.
- Albums and EPs/Singles otherwise retain their simpler album playback flow.
- When TIDAL/NET is left for another source or the AVR is powered off, the Pi remembers the last genuine TIDAL track and retained HEOS queue position. Pressing Play restarts that remembered track from the beginning and then continues through the retained queue.
- TIDAL voice-search fallback and persistent touchscreen confirmation/learning remain available.
- HEOS favourites / internet-radio browser.
- Receiver volume controls, touch volume slider and tap-to-seek track progress.
- Zone 2 / Zone 3 controls, standby/TV/projector display modes and physical panel power management.
- Direct link to AVR settings with kiosk-history protection.

## My Music Albums architecture

`My Music-Albums` no longer uses the former 50-item page loader. The Pi requests the complete Albums container and keeps that full result in `tidalAlbumItems` while the browser is open.

The side alphabet control is shared conceptually with Artists but maintains independent album state. `ALL` shows the complete collection; A-Z filters the stored full collection by the first character of the **album title**, not the artist name. Album rows continue to show their artist underneath.

`PLAY RANDOM` deliberately selects from `tidalAlbumItems`, not from the currently filtered subset. A selected letter is therefore only a browsing aid and never changes the random-album population. Once an album is chosen, the Pi fetches its existing album-track endpoint, takes the first playable track and invokes the established album playback path using the album CID and first MID. Tracks inside the selected album are not shuffled.

Guarded migration checkpoint:

```text
6ca4449 — Add My Music Albums UI migration
fc418d2 — Upgrade TIDAL My Music albums browsing
```

## Favourite Tracks architecture

The old `My Music-Tracks` paging workaround existed because a full HEOS browse of hundreds of favourites was too slow. That workaround split Tracks into 50-item pages, which made browsing tolerable but meant a simple PLAY ALL/SHUFFLE ALL operation could only act on the current page.

The HP backend's bounded in-memory browse cache removes the need for that UI restriction. The Pi now requests the full `My Music-Tracks` container and renders it with the existing playlist-style list renderer. On subsequent visits the HP can return the cached full list immediately while refreshing it against HEOS in the background.

For playback, the Pi proxies full-library requests to the HP endpoint:

```text
/api/tidal/tracks/play-all?shuffle=0|1
```

The HP begins playback with the first selected MID and appends the rest sequentially in the background. For Shuffle All, the HP randomises the complete favourites list before starting the first track, so the resulting queue order represents the entire collection.

The Pi proxy allows up to 180 seconds for the full-library queue-building request. This long HTTP allowance does not mean the user waits for 180 seconds before hearing music: live testing showed playback begins from the first selected track while the queue continues growing quietly behind it. The HP now also cancels and drains a superseded long Favourite Tracks build before a newer TIDAL playback action takes over, preventing an abandoned builder from interfering with later album/track playback.

Do not restore the old `loadTidalTrackPage()` special case for `My Music-Tracks` unless there is a deliberate reason to reintroduce paging. Favourite Tracks is now intentionally classified as a track-list container alongside playlists and `LIBARTIST-Tracks-*`.

## Critical HEOS CID rule

The HP backend discovered during live Favourite Tracks testing that HEOS distinguishes literal-space `My Music-*` CIDs from URL-encoded forms in its command protocol. `My Music-Tracks` must reach HEOS with its literal space; `My%20Music-Tracks` can be interpreted as the wrong TIDAL container.

This is implemented on the HP side, but it is important architectural context for future Pi/backend work: do not assume normal HTTP URL encoding rules can be passed unchanged into HEOS CLI command strings.

## TIDAL architecture notes

`server.js` on the Pi proxies TIDAL library/queue and metadata requests to the HP backend while continuing to handle local touchscreen/display and direct AVR responsibilities.

For touchscreen navigation, HEOS `My Music` is intentionally treated as the TIDAL UI root. Do not restore the older higher-level shortcut/root screen unless deliberately required.

TIDAL browser `BACK` and `NOW PLAYING` have different semantics. `BACK` unwinds TIDAL navigation; `NOW PLAYING` only hides the TIDAL overlay and preserves navigation history.

Artist browsing should remain CID-driven:

```text
LIBARTIST-<id>
  -> Tracks
  -> Albums
  -> EP n Singles
  -> Other Albums
  -> Similar
```

Now Playing navigation must use canonical identifiers rather than visible labels where available. Artist navigation uses the current TIDAL track MID and HP metadata endpoint; album navigation uses HEOS `album_id`.

The shared track-action UI applies to list-style containers: `My Music-Tracks`, playlists and `LIBARTIST-Tracks-*`. Album/EP playback remains separate.

TIDAL resume must not trust `get_now_playing_media.qid` after leaving NET. The Pi remembers the last genuine MID, resolves it against the retained queue, and restarts that track from 0:00 when Play is pressed. Receiver communication failure must remain distinct from confirmed standby/source changes: `unknown` AVR state is not positive evidence that TIDAL was left.

## Architecture

`server.js` runs locally on the Raspberry Pi and serves the touchscreen UI from `public/`. It talks directly to the AVR for receiver/HEOS status and control. TIDAL library operations, full-library Favourite Tracks queue construction, canonical TIDAL metadata and semantic/voice orchestration are handled by the separate `marantz-backend` service on the HP media server.

The Pi remains the physical touchscreen/display/controller. The HP backend is the central media/orchestration service.

The application runs as the user service:

```text
marantz-display.service
```

## Development workflow

Normal development is Git-based. Large multi-line terminal edits should be avoided where practical because the normal SSH workflow uses Termius on Android and large pastes can be corrupted. Prefer small, sequential, verifiable terminal commands, safe GitHub-side edits, or guarded one-shot migration helpers.

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

This repository is only for the marantzPI / HP backend system. Unrelated computers, repairs, emulation/Batocera systems and other projects are not part of this architecture.

See `DEBUGGING.md` for diagnostic and recovery commands.
