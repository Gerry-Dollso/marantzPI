## 2026-09-19 — Artist release navigation and Back-state acceptance

The Artist landing page no longer enumerates release previews during initial load. It keeps the existing four-track Top Tracks preview and presents four browse-card destinations: **Albums**, **EPs & Singles**, **Appears On**, and **Fans Also Liked**. Release categories load only when selected; Fans Also Liked uses the already-loaded similar-artist data. This keeps Artist landing latency independent of release-catalogue size while retaining the established rich hero, biography, Play/Shuffle/Radio and Top Tracks experience.

Artist navigation now has view-level history. Back from an album returns to the release category that launched it; Back from a related artist returns to Fans Also Liked; landing/category/biography views restore their previous scroll position and Artist-page styling. General TIDAL browse history also stores scroll position. Physical touchscreen acceptance confirmed that Back from a favourite Artist returns to the same position in the Artists list, and Back from a favourite Album returns to the same position in Albums rather than incorrectly returning to the TIDAL landing page.

The Queue button is now visible only while TIDAL is the playback source; physical touchscreen testing confirmed TIDAL -> CD/PHONO -> TIDAL visibility changes correctly.

Accepted Pi checkpoints include **9321fde** (category navigation), **e4d635a/e5e737d** (TIDAL browse-card styling/two-column layout), **bb540f3/db6162e** (Artist view history, scroll and styling restoration), **dab6372** (TIDAL-only Queue button), and **de04f4d** (general Artist/Album Back history correction). This phase is closed and physically accepted.


## Status reconciliation cadence — 19 Sep 2026

The touchscreen's unconditional `/api/status` reconciliation interval is 5 seconds. This replaces the inherited 750 ms cadence after an architecture/load audit found no current feature requiring sub-second background polling. Touchscreen controls retain explicit fast refreshes, playback progress remains locally interpolated every 500 ms, and the 5-second poll remains the fallback for external AVR/HEOS changes. This reduces continuous AVR port-23 and HEOS connection churn without changing `getStatus()` semantics or the accepted standby/wake, TIDAL-resume, queue-transition, Smart Select, zone, or physical-panel logic.

Natural track transitions no longer wait for that 5-second fallback. The existing persistent HEOS event socket recognises `event/player_now_playing_changed`; because the SR8015 emits several such events around one boundary, the Pi treats the following near-zero progress event as the settled transition, increments a Pi-local generation counter, and the browser checks only that local counter every 500 ms. A generation change triggers one normal status refresh. This local check creates no additional AVR, HEOS-network or TIDAL polling. Physical touchscreen acceptance showed new-track metadata updating in about 1–2 seconds.

Pi-initiated main-zone source changes retain the existing 350 ms refresh and add one 1000 ms settling refresh. This handles the case where the first refresh sees an AVR/HEOS source transition before NET/TIDAL metadata has settled, without restoring fast continuous polling. External remote/front-panel changes continue to rely on the 5-second reconciliation fallback. Physical touchscreen acceptance found the remaining source-return delay livable; do not add more source-event complexity without new evidence.
# marantzPI

## 2026-09-18 — Raspberry Pi memory/OOM and replacement-board baseline

The original wall-mounted MarantzPi was conclusively identified at runtime as a **1 GB Raspberry Pi 4 Model B Rev 1.5** (revision `a03115`, `MemTotal 927444 kB`). The earlier assumption that this board was 8 GB was wrong. During deep scrolling of the official-TIDAL-backed **594-track Favourite Tracks** screen, system-wide memory exhaustion caused the kernel OOM killer to terminate Chromium renderer/GPU processes. HEOS playback continued because playback is independent of the Chromium renderer. Treat **1 GB as inadequate for the current MarantzPi workload**.

The replacement board is a **2 GB Raspberry Pi 4 Model B Rev 1.5** (revision `b03115`, `MemTotal 1888972 kB`). Repeating the same 594-track Favourite Tracks stress test completed smoothly with no white screen, Chromium crash or kernel OOM event. Immediately afterwards the system reported about **795 MiB used and 1.0 GiB available RAM**, with Chromium total RSS about **630 MiB**. This is the current useful heavy-load baseline. A recovered 4 GB Pi would provide additional headroom, but current evidence does not require replacing the working 2 GB board. If memory later grows continuously across repeated navigation rather than reaching a stable level, investigate a software leak rather than assuming more RAM is the fix.

Fast scrolling can temporarily outrun some track-artwork loading near the end of the 594-track list. Artwork is present again after leaving and reopening Favourite Tracks, so this is currently treated as transient image loading rather than missing catalogue data or memory exhaustion.

The same microSD preserves the application/runtime configuration, but Pi 4 micro-HDMI socket choice matters. The existing labwc configuration rotates/maps the physically upside-down Waveshare display on **`HDMI-A-2`**. During the board swap the other socket enumerated the display as `HDMI-A-1` and made the image appear upside down while touch coordinates remained correct. **Before changing rotation/touch software after a board swap, verify the display cable is in the micro-HDMI socket that enumerates as HDMI-A-2.**

The replacement Pi's Ethernet MAC is **`D8:3A:DD:84:40:68`** and it is currently operating at **`192.168.50.79`** via DHCP. The previous `.84` address was an ASUS-router DHCP reservation, not an OS-static address. Repository and live-tree checks found **no application dependency on `192.168.50.84`** in either marantzPI or marantz-backend. A stale ASUS DHCP lease for MAC `D8:3A:DD:1E:B2:52` had occupied `.84` during the swap and was cleared. AVR communication subsequently returned, but that cleanup is correlation, not a proven cause of the earlier AVR port-23 silence.

## 2026-09-18 — TIDAL child-screen cleanup and Mixes & Radio ordering

The TIDAL artist search field is intentionally shown only on the TIDAL root/landing browse screen. Child/menu screens hide it and reclaim the unused vertical space. Personalised playlist controls retain the required reserved height. This layout was accepted on the physical MarantzPi touchscreen.

Mixes & Radio uses the backend's favourite/saved TIDAL MIX membership. The touchscreen sorts that membership as: **My New Arrivals**, **My Daily Discovery**, **My Mix 1** through **My Mix 8** numerically, **My Most Listened**, then every remaining mix/radio alphabetically (case-insensitive). My Daily Discovery must therefore be favourited in TIDAL to appear naturally and receive its official TIDAL playlist artwork. Do not restore the temporary missing-artwork enrichment workaround; it produced a four-track collage instead of the official Daily Discovery cover and was removed in `7000dee — Remove personalised artwork workaround`.

Accepted checkpoints: `33a69e9 — Use TIDAL search only on landing screen`, `8808d95 — Expand TIDAL child browse area`, `fe98173 — Sort Mixes and Radio by preferred order`, and cleanup `7000dee`. The 2026-09-18 known-good recovery snapshot is branch `backup-known-good-2026-09-18`, fixed at pre-cleanup SHA `318933ed061c4b757d9b286c6cdeb8f936ef5094`; treat it as read-only.

<!-- ARTIST_PAGE_COMPLETE_2026_09_17 -->
## 2026-09-17 — Rich TIDAL Artist page production accepted

The richer Artist Page is complete and accepted on the physical **8-inch 1080p MarantzPi touchscreen**. The governing architecture is **official TIDAL API for what the user sees; HEOS for what the user hears**.

The Artist landing page is deliberately bounded to **4 genuine popularity-ranked Top Tracks in a fixed 2x2**, **3 Albums**, **3 EPs & Singles** and **3 Appears On**. Biography and Top Tracks load lazily so they do not block the core Artist landing response. Similar Artists and Artist Radio remain available through the established hybrid paths.

The three release-category controls now load their complete HEOS category on demand through the Pi proxy for /api/tidal/artist-releases, with the HP enriching those exact release identities using official TIDAL metadata/artwork. Releases are not automatically deduplicated merely because titles or artwork look similar; separate TIDAL catalogue versions are legitimate unless identity evidence proves otherwise.

Top Tracks remains based on the backend full Artist-track crawl, de-duplication and official TIDAL popularity sort. The backend persistently stores the ranked top 10; the landing shows the first four and the full Top Tracks page shows all 10. Biography is independently lazy and persistent; null biography results are valid.

The Pi artwork proxy is production-tested against the backend persistent artwork cache. The Artist UI uses a request-token/current-Artist guard so late biography, Top Tracks or release responses cannot update a different Artist after navigation.

Runtime acceptance used The Afghan Whigs, TIDAL Artist ID 672: the full Albums route returned **14/14** releases, from Soft Control through Up In It, with official TIDAL enrichment. The same 14/14 result was proven through the Pi proxy. Physical touchscreen acceptance confirmed each release category opens its complete list and Back restores the intended **3-release / 4-Top-Tracks** landing layout.

Pi production checkpoints: **05ce9f1 — persistent artwork proxy**, **228cb39 — 8-inch Artist landing layout**, **b141a76 — lazy rich Artist data**, and **c5841e6 — Load full Artist categories on demand**. Companion backend full-category checkpoint: **c1d578f — Add full Artist release loading**.

The backend sequential Artist cache warmer completed 391 of 392 favourite artists. BODEGA TIDAL ID 3644091 was the single HTTP 429 failure and should not be repeatedly hammered. BODEGA IDs 3644091 and 43627077 are separate TIDAL profiles for the same real-world band and must not be automatically merged.

**Acceptance rule:** syntax checks, diffs and backend curl tests are not sufficient to call a MarantzPi UI feature complete. Final acceptance requires end-to-end testing on the physical touchscreen. This Artist phase has passed that acceptance.

Current Queue, Now Playing favourite heart, TIDAL landing/Mixes & Radio and the richer Artist Page are complete. **Now Playing Track Radio remains deliberately on the back burner.**

<!-- TASK3_TIDAL_LANDING_MIXES_2026_09_16 -->
## 2026-09-16 — TIDAL landing / Mixes & Radio accepted

Task 3 is production-accepted. The TIDAL landing page now presents six local line-icon shortcuts in a 2×3 layout: Playlists, Artists, Albums, Tracks, Mixes & Radio and Genres. Playlists retains Created by me and Favorited. Genres opens the existing HEOS/TIDAL genre browse surface with live artwork. Videos were deliberately omitted.

Mixes & Radio now renders the backend canonical saved-TIDAL MIX collection. The backend selects official saved playlist resources with `playlistType === "MIX"`; the Pi must not reconstruct this shelf using names, hard-coded IDs, HEOS subtraction or the old recommendations list. The acceptance snapshot contained 19 MIX playlists from 53 saved playlist references; counts are snapshots, not constants.

The Pi uses each MIX playlist's official TIDAL artwork directly. It no longer performs the old per-playlist `/api/tidal/personalised/artwork` enrichment requests for this screen. Existing official playlist detail and TIDAL-to-HEOS resolver paths remain responsible for track browsing and playback.

Live touchscreen acceptance passed Genres artwork, TRICKY Artist Radio browse, Turnip Farm Track Radio browse/playback and My Mix 8 playback. Pi production checkpoint: `e98c1e1`; cleanup checkpoint: `d94b55d`; dedicated documentation checkpoint: `2530d9c`. Companion backend canonical production checkpoint: `d075c78`. Detailed Pi record: `docs/TIDAL_LANDING_MIXES_RADIO_2026-09-16.md`.

Current Queue, Now Playing favourite heart, TIDAL landing/Mixes & Radio and the richer Artist Page are complete. **Now Playing Track Radio remains deliberately on the back burner.**


## 2026-09-15 — TIDAL Now Playing favourite heart

- Added the production Now Playing TIDAL favourite heart. Pi checkpoint: `4e7743e — Add TIDAL favourite heart to Now Playing`.
- The Pi preserves a known official TIDAL track ID when our TIDAL UI launches playback and exposes it as `tidalTrackId` only while the associated HEOS MID still matches. If no preserved official ID exists, live TIDAL `tidalMid` is only a candidate; the HP performs exact official metadata validation and fails closed if it is not a valid official track ID. This preserves the personalised replacement boundary demonstrated by The Sugarcubes — Birthday.
- Heart status is driven by the existing Now Playing `render(data)` cycle and only resynchronises when track identity changes. No second `/api/status` poller was added. Pi proxies status/add/remove to the HP backend; favourite membership and writes remain official-TIDAL operations, never HEOS reconciliation.
- Accepted UI: heart at the right of the progress area, `bottom:48px`; identical 32×29 SVG geometry in both states; non-favourite grey outline `rgba(255,255,255,0.45)`; favourite solid red `#ff3b3b`.
- Controlled end-to-end Aquarius tests passed add and remove through Pi/HP/official TIDAL. Backend latency work reduced official writes from about 35 seconds to roughly 0.3 seconds and immediate post-write status to roughly 0.2 seconds. Backend checkpoint is `6c7e2fe`; its two-minute recent-mutation overlay does not replace the canonical Favourite Tracks collection.
- Task 2 is complete. Next agreed task is TIDAL landing/home artwork cleanup; richer artist page follows.

Touchscreen controller and now-playing display for the Marantz SR8015 / HEOS system.

## Current known-good state

Active deployed/development branch:

```text
housekeeping-2026-08-21
```

Current cleaned/pushed Pi checkpoint:

```text
c5841e6 — Load full Artist categories on demand
```

Current Queue API checkpoint:

```text
41e8ab0 — Add read-only Current Queue API
```

Latest tested production UI checkpoints:

```text
36bd317 — Restore TIDAL browse with Now Playing swipe
84170a5 — Sort TIDAL Artists alphabetically
```

Companion backend current cleaned/pushed checkpoint:

```text
c1d578f — Add full Artist release loading
```

This checkpoint includes the current rich personalised TIDAL/My Mixes UI and playback controls, the official-TIDAL-backed 594-track Favourite Tracks UI, protected TIDAL resume behaviour, deterministic suppression of transient HEOS queue metadata during queue replacement, explicit AVR `unknown` handling, reduced AVR port-23 connection churn, and the production personalised-artwork path tested 10/10 from a cold backend cache. Treat older `v3-development`, `v3`, and stable branches as historical/reference branches unless deliberately restoring or comparing them.

## 2026-09-14 — Artist ordering and TIDAL Now Playing swipe return

- My Music -> Artists now sorts the complete official-TIDAL-backed artist list alphabetically, case-insensitively, before the existing ALL/A-Z filtering. No other TIDAL lists were re-ordered. Live touchscreen acceptance confirmed ALL and A-Z behaviour.
- When TIDAL itself sends the user to Now Playing through PLAY NOW, PLAY FROM HERE or PLAY ONLY, the Chromium swipe-back gesture now restores the exact preserved TIDAL browse screen. The TIDAL DOM/history is only hidden during playback, so the prior playlist/track-list context and scroll position remain available.
- The swipe return is deliberately armed only by those TIDAL track actions. Swiping on PHONO/CD/other MarantzPi input screens remains trapped/no-op, and the existing native browser-back behaviour from the external SR8015 HTTPS setup page is unchanged because MarantzPi JavaScript is not running there.
- Manual use of the TIDAL NOW PLAYING button does not arm swipe-return. The global kiosk-history guard in `public/app.js` was not weakened.
- Live acceptance passed TIDAL playlist -> PLAY NOW -> Now Playing -> swipe-back to the exact previous track list, plus a non-TIDAL input swipe test that correctly did nothing.

Checkpoint sequence:

```text
84170a5 — Sort TIDAL Artists alphabetically
7de1701 — Remove TIDAL Artists sort migration helper
36bd317 — Restore TIDAL browse with Now Playing swipe
1758311 — Remove TIDAL swipe return migration helper
```

## Official TIDAL Favourite Tracks UI checkpoint — 13 Sep 2026

My Music -> Tracks is now fully migrated away from HEOS browsing for display. The Pi calls its local `/api/tidal/favourite-tracks` proxy, which forwards to the HP backend's official-TIDAL-backed canonical Favourite Tracks endpoint. The live canonical collection is 594 tracks after stale official references are omitted and HEOS duplicate rows are reconciled.

The touchscreen renders those 594 tracks as one continuous rich list with official TIDAL artwork, title, artist and album metadata. No 50-item pager or HEOS browse wait remains in the Tracks UI. PLAY ALL and SHUFFLE ALL continue to use the accepted rolling Favourite Tracks backend queue builder; individual tracks retain PLAY NOW, PLAY NEXT, ADD TO END, PLAY FROM HERE and PLAY ONLY.

End-to-end touchscreen acceptance passed all seven actions: PLAY ALL, SHUFFLE ALL, PLAY FROM HERE, PLAY NOW, PLAY NEXT, ADD TO END and PLAY ONLY. ADD TO END was additionally verified by confirming the selected track was present at the queue tail.

A critical HEOS transport detail was reconfirmed during this migration: ordinary Favourite Tracks queue actions must send the literal-space HEOS CID `My Music-Tracks`. URL-encoded `My%20Music-Tracks` is rejected by HEOS with `cannot play`. Official TIDAL track IDs already match the de-duplicated HEOS MIDs, so no track-ID translation is required for this collection.

Production checkpoints:

```text
27be5d1 — Use official TIDAL Favourite Tracks UI
750de76 — Remove Favourite Tracks UI migration helper

Backend:
08a86ce — Fix Favourite Tracks ordinary actions
9ba3b6f — Remove Favourite Tracks action fix helper
```

## Official TIDAL Artists and Albums UI checkpoint — 13 Sep 2026

My Music -> Artists and My Music -> Albums now use the HP backend's official-TIDAL-backed catalogue endpoints for their top-level display while retaining the existing HEOS CID-driven drill-ins and playback paths. Artists uses `/api/tidal/favourite-artists`; Albums uses `/api/tidal/favourite-albums`. The Pi preserves/generated `LIBARTIST-<id>` and `LIBALBUM-<id>` CIDs, so selecting an artist or album continues into the already-tested HEOS navigation/playback routes.

Artists has 393 official relationship references, 392 live official artist resources and 392 matching HEOS artist IDs. Official artist ID `32968323` was directly checked and returns 404, so it is omitted from the live UI. Albums has 1,535 official relationship references and the same 1,535-ID set in HEOS; official rich metadata resolves 1,482 albums, leaving 53 unresolved references. Three sampled unresolved album IDs (`1441435`, `69720620`, `308597115`) were directly checked and each returned 404; do not claim that every unresolved album was individually 404-tested.

Touchscreen acceptance passed Artists artwork/A-Z navigation and artist drill-in, Albums artwork/artist/A-Z navigation and album drill-in, PLAY RANDOM through the existing HEOS album route, and ordinary album-track PLAY NOW. The HP prewarms the official catalogues sequentially in the accepted order Artists -> Albums -> Tracks.

Production checkpoints:

```text
998589b — Use official TIDAL Artists and Albums UI
497e6a5 — Remove Artists and Albums UI migration helper

Backend:
2ba75d0 — Add official TIDAL Artists and Albums catalogues
f4e1476 — Remove Artists and Albums migration helpers
dbe79a6 — Remove Artists and Albums documentation helper
```

## Official TIDAL ordinary Playlists UI checkpoint — 14 Sep 2026

My Music -> Playlists now uses the HP backend's official-TIDAL-backed ordinary-playlist catalogue for its top-level and branch display while preserving the existing HEOS-backed `LIBPLAYLIST-*` drill-in and playback paths. The top level retains the two familiar branches, Created by me and Favorited.

The catalogue is deliberately dynamic. The backend takes the live exact-ID intersection of the official TIDAL user-playlist collection and the live HEOS Created by me/Favorited playlist rows. It does not hard-code today's playlist IDs and it does not maintain a blacklist of personalised Mix/Radio IDs. If an ordinary playlist is created/favourited and appears on both sides it can appear automatically; if it is removed from either side it drops out of the intersection.

The accepted reconciliation snapshot contained 53 official relationship IDs across 3 pages and 34 ordinary HEOS playlists: 13 Created by me and 21 Favorited. All 34 HEOS ordinary IDs were present officially, giving zero HEOS-only IDs. The 19 official-only entries were personalised Mixes/Radio and were excluded naturally by the intersection. These counts are an acceptance snapshot, not permanent library constants.

Official TIDAL supplies rich playlist metadata and artwork; HEOS supplies grouping/order and the deterministic playable `LIBPLAYLIST-<id>` CID. Both USER and EDITORIAL ordinary playlists are valid, so do not filter by playlist type. The Pi proxies `/api/tidal/favourite-playlists`; opening a `LIBPLAYLIST-*` item continues through the existing HEOS track-list path.

Live touchscreen acceptance passed both branches, rich artwork, opening 1980s Alternative Rock Classics, PLAY NOW, PLAY ALL and SHUFFLE ALL. Personalised My Mix/Radio remains a separate resolver architecture; do not reopen the Sugarcubes/Birthday work for ordinary Playlists without new evidence.

Production checkpoints:

```text
d2f96e4 — Use official TIDAL ordinary Playlists UI
1e810ed — Remove ordinary Playlists UI migration helper

Backend:
43902d1 — Add official TIDAL ordinary Playlists catalogue
0f6bf7b — Remove ordinary Playlists migration helpers
```

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

Personalised PLAY FROM HERE is now implemented and live-tested. Selecting a My Mix track replaces the queue with that exact selected track followed by the remaining tracks from the same Mix in original order. The selected track is strict/fail-closed: it must resolve and queue safely rather than silently skipping to the following track. Runtime acceptance confirmed repeated PLAY FROM HERE use, exact selected-track starts, and the last-track boundary: starting from the final track leaves no later queue entry, so NEXT does not start an unrelated track.

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

Inside a personalised playlist, rows show official TIDAL artwork plus track title, artist and album. PLAY ALL and SHUFFLE ALL use the HP backend's resolved personalised queue path. Live My Mix 1 testing starts playback in about 2.34 seconds and builds the remainder in the background; the tested 39-track mix completed 39/39 with zero skips. Individual personalised tracks support PLAY NOW, PLAY NEXT, ADD TO END, PLAY FROM HERE and PLAY ONLY. Personalised PLAY FROM HERE uses the official selected track ID plus its personalised-playlist context, starts that exact selected track, and builds only the remaining tail of the Mix. The shared track-action lifecycle always clears its disabled/loading state after success or failure, so PLAY FROM HERE and the other actions remain reusable without rebuilding the menu DOM.

Related source checkpoints include `ce18540` (richer personalised track metadata), `a7e4970` (personalised playback controls) and `a65f1b5` (rich personalised landing cards).

## 2026-09-15 — Read-only Current Queue

Current Queue is now production-accepted on the Pi. A QUEUE control on Now Playing opens a dedicated full-screen CURRENT QUEUE view backed by the Pi-local read-only `GET /api/queue` endpoint. The endpoint reuses the existing HEOS queue reader and current-media query; it does not mutate playback or involve the HP backend.

The screen displays the **physical queue currently materialised by HEOS**, not an inferred source/canonical total. Live reconnaissance proved that Favourite Tracks rolling playback initially materialises 10 rows and appends 5 at the low-water point, an ordinary 125-track Created-by-me playlist exposed 50 physical rows, and My Mix 2 exposed 24 rows initially and later 40. Therefore a displayed count such as `50 TRACKS` means 50 current physical HEOS queue rows, never `50 of 125` unless HEOS itself provides that source total through a separately proven contract.

Rows expose HEOS artwork, title, artist, album, qid, mid and album_id. The current row is identified by current-media qid/mid and marked NOW PLAYING. The queue refreshes every 5 seconds only while the screen is open, preserves manual scroll position during refreshes, and stops polling when BACK closes the screen. Opening the screen centres the current row. Retained queue state while the AVR is off or after leaving NET is intentional because MarantzPi already preserves TIDAL queue/resume state; do not invalidate Current Queue merely because the receiver is off.

Current Queue is deliberately **read-only**. No play-selected, remove, move, sort, clear or other queue mutation controls were added, and the user does not currently consider queue editing a priority. If mutation is revisited later, investigate it as a separate feature against ordinary HEOS playback, Favourite Tracks rolling playback and personalised/background queue builders rather than complicating this accepted viewer.

Production checkpoints:

```text
41e8ab0 — Add read-only Current Queue API
1796f6c — Add read-only Current Queue UI
```

## Near-term TIDAL roadmap

The next work is intentionally ordered so each feature can be researched and accepted without destabilising the working playback stack:

1. **Now Playing favourite heart:** show whether the canonical TIDAL track is in the user's collection and allow add/remove only after a read-only membership path and safe official-TIDAL mutation contract are proven. Never infer canonical TIDAL identity from a HEOS MID where personalised/replacement resolution may differ.
3. **TIDAL landing artwork:** remove the generic empty artwork boxes on category rows or replace them with deliberate appropriate imagery; do not leave blank placeholder boxes.
4. **Richer artist page:** remove/fill blank category artwork slots and add an official-TIDAL artist hero image plus biography/description where the developer API actually exposes supported metadata. Preserve the existing HEOS-backed category drill-ins/playback.

Longer-term backend opportunities already preserved in the backend handover include listening history/recently played, diagnostics and richer discovery.

## Current feature set

- Marantz input control using Smart Select mappings for PHONO, CD and TIDAL/HEOS.
- TIDAL/HEOS Smart Select 3 is only reapplied when the AVR is not already on NET/HEOS, so browsing/changing TIDAL content does not reset manually adjusted listening state.
- TIDAL opens directly into the HEOS `My Music` container, which is treated as the touchscreen TIDAL navigation root.
- Back from child TIDAL views returns toward My Music; Back from My Music closes TIDAL.
- Every TIDAL browser screen has a `NOW PLAYING` shortcut in the top-right opposite `BACK`. It only hides the TIDAL overlay and preserves browser history, playback, queue and AVR state.
- Now Playing has a read-only **QUEUE** control that opens the dedicated CURRENT QUEUE screen. It displays the physical HEOS queue with artwork/title/artist/album metadata, marks the current row, refreshes every 5 seconds while open, and never mutates the queue.
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

The Tracks display no longer depends on the HEOS browse cache. The Pi now requests `/api/tidal/favourite-tracks`, backed by the HP's canonical official TIDAL Favourite Tracks cache, and renders the complete 594-track collection with official artwork, title, artist and album metadata. HEOS remains the playback transport rather than the display/catalogue authority for this screen.

For playback, the Pi proxies full-library requests to the HP endpoint:

```text
/api/tidal/tracks/play-all?shuffle=0|1
```

The HP uses the accepted rolling Favourite Tracks queue architecture rather than attempting to build all 594 HEOS queue rows at once. It starts playback from an initial 10-track buffer, replenishes 5 tracks whenever fewer than 5 remain ahead, and keeps HEOS shuffle disabled. For SHUFFLE ALL, the backend shuffles the canonical 594-track order once before the rolling session starts, so playback follows one fixed full-library shuffle order.

A persistent HEOS event connection drives debounced queue reconciliation by qid/count, with bounded tail verification before replenishment. External queue divergence fails closed, and a newer playback request supersedes the older rolling generation so stale work cannot continue modifying the queue.

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
