# Changelog

This changelog consolidates the significant marantzPI development milestones known from the repository and project history. It is not intended to replace `git log`; it records the changes that matter for maintaining behaviour safely.

## Unreleased / v3 development

### 2026-08-25 — code-health sweep

- `779a562` — made `update.sh` refuse an unsafe in-place update when its source directory is the live `~/marantz-now-playing` installation. Previously the script could delete its own source tree before copying it back.
- Added a runtime `config.json` existence check and automatic temporary-file cleanup to the updater.
- Removed the stale `v2.1.0 installed` success message from the v3 updater.
- Review also identified performance/robustness items requiring deliberate runtime changes rather than blind cleanup: overlapping 750 ms status polls, redundant panel wake DDC calls, optimistic receiver connectivity reporting, and legacy backend input routes. These were not silently changed during the sweep.

### 2026-08-25 — project handover documentation

- Replaced the obsolete v2.1 README on `v3-development` with a developer/takeover guide.
- Recorded the authoritative branch, installation path, service scope, deployment workflow, Termius copy/paste constraint, receiver/source mappings, backend relationship and regression-test rules.
- Added this consolidated changelog before beginning the backend AI phase.

### 2026-08-20 — playback interaction and TIDAL refinements

- `99cdb6e` — added touch seek and kiosk history guard.
- `0181618` — added HEOS track-progress monitoring.
- `885b322` — fixed TIDAL source switching and moved Zone controls.

### 2026-08-19 — touchscreen volume

- `e7f937d` — added touch volume slider.

### Mid-August 2026 — functionality-complete control baseline

- `f6c8d48` — recorded project checkpoint with core v3 functionality complete, including Zone 2 patio control.
- Patio source selector established for PHONO, CD and HEOS/TIDAL.
- PHONO remained mapped to the SR8015 8K input/external phono stage rather than the receiver's native PHONO input.
- Source popup positioning refined for normal and standby layouts.
- Smart Select source workflow tested: PHONO/1, CD/2, HEOS/3; TV uses Smart Select 4; AUX uses AUX1.

### Branding / standby refinement

- `051f444` — refined Marantz branding and standby wake behaviour.
- Transparent `/marantz-logo.png` branding used; redundant text branding removed.
- Earlier standby-related checkpoints included automatic standby blanking, power-on feedback, restricted standby wake and hidden kiosk cursor.

### Hardware panel power management

- `577bb0d` — added hardware panel power management.
- `ddcutil` control established for panel power/brightness.
- Later UX direction moved away from a generic black-screen timeout toward intentional TV/projector dimming behaviour.

### Smart Select control

- `71f4ce9` — added and tested Smart Select source control.
- Established mappings that must remain installation-aware rather than inferred from source labels.

## v2.1 line

### 2026-07-29

- `be19db9` — saved working v2.1 state before v3 rewrite.

### 2026-07-28 — v2.1.0

- `ae4c26e` — released v2.1.0.
- Now Playing shown only when HEOS supplied track metadata.
- Idle screen returned when metadata disappeared.
- Receiver input labels became configurable in `settings.json`.
- Default custom labels included NET → TIDAL and 8K → PHONO.
- Kiosk mouse pointer hidden.

## Maintenance notes

When adding entries, prefer meaningful tested milestones over logging every tiny edit. Include commit hashes where available. If a behaviour is reverted, record the reversion explicitly so an old changelog entry is not mistaken for current functionality.
