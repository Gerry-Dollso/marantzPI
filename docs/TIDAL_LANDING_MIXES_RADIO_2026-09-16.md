# TIDAL landing page and Mixes & Radio — accepted implementation (2026-09-16)

## Purpose

Refresh the MarantzPi TIDAL landing page so it behaves as a clean remote front end for the HP backend, exposes Genres again, and shows the user's complete canonical TIDAL Mixes & Radio collection with official artwork.

## Accepted landing page

The TIDAL My Music landing page now contains six shortcut tiles in a 2×3 layout:

1. Playlists
2. Artists
3. Albums
4. Tracks
5. Mixes & Radio
6. Genres

The tiles use local white line SVG/CSS artwork inside the existing translucent rounded tiles. No generated image assets are required.

The Playlists submenu retains Created by me and Favorited, now with matching line-style shortcut icons.

Videos were deliberately omitted by user decision; video playback is better handled directly by TIDAL on the LG C3/SR8015 setup.

## Genres

Genres was already available through the HEOS TIDAL browse hierarchy; the old Pi UI simply bypassed it by entering My Collection directly.

The new Genres shortcut restores access to that existing browse surface. Live testing returned 20 genre entries with real TIDAL/HEOS artwork, and touchscreen testing confirmed Genres opens correctly and displays artwork.

Do not replace this with a guessed or hard-coded genre list.

## Mixes & Radio canonical collection

The HP backend now supplies `/api/tidal/personalised` from the official TIDAL saved playlist collection, filtered by the official playlist metadata discriminator:

`playlistType === "MIX"`

This is the canonical definition for this project. Do not identify Mixes & Radio by names, hard-coded IDs, recommendation endpoint output, or HEOS subtraction.

On 2026-09-16 the live collection snapshot was 53 saved playlist references and exactly 19 MIX resources with zero unresolved metadata IDs. This count is a dated observation, not a constant.

The collection naturally includes saved Artist Radio, Track Radio, History/listening mixes, My Mixes and My New Arrivals. `My Most Listened` is currently present as a saved MIX; no separate public personal-top-tracks/artists API has been established and one must not be assumed.

## Artwork

Each `/api/tidal/personalised` item now carries its official TIDAL playlist artwork.

`loadTidalPersonalised()` uses `playlist.artwork` directly when rendering the list. It no longer performs the old per-playlist artwork enrichment pass for these entries. This preserves TIDAL's intended Artist Radio/Track Radio artwork and avoids unnecessary artwork requests.

The old enrichment helper functions may remain in source but are not part of the active list-loading path; do not re-enable the old per-item enrichment without a specific reason.

## Detail and playback

No replacement playlist-detail or playback mechanism was introduced. Selecting a MIX continues through the existing personalised playlist detail route and official TIDAL track data, then through the established TIDAL-to-HEOS playback resolver.

Touchscreen acceptance tests on 2026-09-16 confirmed:

- Mixes & Radio displayed 19 playlists with official TIDAL artwork in canonical order
- TRICKY Artist Radio opened its track list normally
- Turnip Farm Track Radio opened its track list normally
- PLAY NOW from Turnip Farm Radio started playback on the SR8015
- My Mix 8 still opened and PLAY NOW worked, proving no regression of existing My Mix playback
- Genres opened and displayed real artwork

## Future work deliberately excluded

A Now Playing Track Radio control, similar to the radio control in TIDAL's Android Auto UI, was discussed but deliberately put on the back burner until this landing-page work was completed. Treat it as a separate future feature.

The richer artist page is the next planned TIDAL UI task after this checkpoint.

## Accepted production checkpoint

Pi production implementation: `e98c1e1` — `Upgrade TIDAL landing page and Mixes Radio`.

Temporary landing-page upgrade helper removed in `d94b55d`.

Backend canonical MIX implementation after documentation rebase: `d075c78` — `Use saved TIDAL MIX collection for Mixes and Radio`.
