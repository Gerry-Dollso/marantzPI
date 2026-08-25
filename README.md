# marantzPI — developer / takeover guide

This repository contains the Raspberry Pi touchscreen front end for the Marantz/HEOS system. This README is deliberately written as a **handover document**: it records the environment, known-good assumptions, deployment rules and project-specific lessons that must not be guessed again.

## Authoritative branch and installation

- Active development branch: **`v3-development`**.
- Older `main` currently represents the v2.1 line and must not be assumed to contain current v3 work.
- Installed project directory on the Pi: **`~/marantz-now-playing`**.
- Runtime service: **user-level** `marantz-display.service`.
- Restart command: `systemctl --user restart marantz-display`.
- Do **not** create or manage a system-wide service unless the architecture is intentionally changed.
- Kiosk URL: **`http://127.0.0.1:3000`**.
- Chromium kiosk profile: **`~/.config/chromium-marantz`**.

## Hardware / OS baseline

Known development installation:

- Raspberry Pi 4, aarch64.
- Raspberry Pi OS Desktop 64-bit.
- Wayland session using **labwc** (Xwayland may also appear for compatibility).
- Touchscreen kiosk operated locally; SSH work is normally performed from an Android phone using Termius.

Do not blindly apply old X11 touchscreen/display-rotation advice. The project previously lost considerable time because display rotation, pointer rotation and touchscreen rotation behaved differently under Wayland. Before changing display/input configuration, identify the active compositor/session and preserve a known-good configuration.

## Current architecture

`server.js` serves the local web UI and talks directly to the Marantz/HEOS interfaces. The browser loads files from `public/`.

Important files:

- `server.js` — local API, AVR/HEOS communication, panel power control and backend proxy calls.
- `public/app.js` — touchscreen behaviour and UI logic.
- `public/index.html` — UI markup/styles.
- `config.json` — local runtime configuration; intentionally not committed.
- `config.example.json` — template only; do not assume its example IP/player ID matches the live system.
- `settings.json` — UI/runtime settings and custom labels.

The Pi also calls the HP backend for media/TIDAL functions. Current code points to:

- HP backend host: **`192.168.50.145`**
- HP backend HTTP port: **`3100`**

These are environment-specific known values. If networking changes, change them deliberately rather than inventing replacements.

## Receiver / HEOS facts that must not be guessed

Current receiver: **Marantz SR8015**.

Known source behaviour and labels:

- The source shown to the user as **PHONO is the receiver's `8K` input**, because an external phono stage is connected there.
- Smart Select mappings have been tested and are part of the intended UX:
  - PHONO → `MSSMART1`
  - CD → `MSSMART2`
  - HEOS/TIDAL → `MSSMART3`
  - TV → `MSSMART4`
  - AUX/projector → `SIAUX1`
- Do not substitute `SIPHONO` for the user-facing PHONO path without checking the intended feature: the physical receiver input in this installation is 8K, not the SR8015's native phono input.
- HEOS commands use TCP port **1255**.

The backend repository currently records the live SR8015 address as `192.168.50.220` and HEOS player ID `48723103`. The Pi's local `config.json` remains the authority for its own direct receiver connection.

## Display power behaviour

Hardware panel control currently uses `ddcutil` in `server.js`:

- DDC bus: **21**
- Normal brightness: **50**
- VCP `D6` is used for panel power.
- VCP `10` is used for brightness when the panel wakes.

The old display used dimming because it could not be powered off under software control. **That dimming policy is obsolete for the current panel.** The current intended behaviour is physical panel power-off while leaving the touchscreen/input layer alive:

- On **TV** input: after **5 minutes** with no touchscreen interaction, power the display panel off.
- On **AUX1/projector** input: after **5 minutes** with no touchscreen interaction, power the display panel off.
- With the AVR in **standby/off**: after **1 hour** with no touchscreen interaction, power the display panel off.
- A touchscreen press must wake the physical display without consuming the original touch action.
- Once awakened, the applicable 5-minute or 1-hour timeout starts again.
- On ordinary music/control sources such as PHONO, CD and HEOS/TIDAL, there is no automatic panel-off timeout unless the UX is deliberately changed later.

Do **not** reintroduce dimming for TV/projector use unless the hardware or UX changes again.

## Zone 2 / patio behaviour

The patio/Zone 2 controls are established functionality and should be regression-tested after UI changes.

- Patio source selector includes PHONO, CD and HEOS/TIDAL.
- AUX is not required for patio use.
- PHONO must still resolve to the SR8015 8K-based phono setup.
- Popup placement was intentionally positioned above the patio control on both normal and standby views.

## Coding and deployment rules

These rules exist because violating them has previously produced corrupt pastes, broken JS and unnecessary recovery work.

1. **Check reality before editing.** Confirm repository, branch, working tree, relevant file and running service before making changes. Do not rely on remembered filenames or paths when they can be verified.
2. **Prefer GitHub-side editing for substantial safe changes.** The normal SSH client is Termius on an Android phone; large multi-line copy/pastes frequently corrupt, truncate or alter text. Use direct GitHub edits/commits where safe, then pull/deploy on the Pi.
3. **Keep terminal commands small and sequential.** When Termius is required, send short commands one at a time with a verification step rather than a long heredoc or giant pasted script.
4. **Never guess ownership, paths, service scope, ports, input names or IDs.** Inspect the machine/repository or this README first.
5. **Syntax-check JavaScript before restart:**
   - `node --check public/app.js`
   - `node --check server.js`
6. **Restart only the user service:** `systemctl --user restart marantz-display`.
7. **Verify after restart.** Check service state and exercise the changed feature on the real touchscreen/receiver, not merely in code review.
8. **Commit known-good milestones.** Once behaviour is physically tested, commit/push before beginning the next risky change. A working checkpoint is more valuable than a large untested batch.
9. **Make one conceptual change at a time.** UI, AVR commands, HEOS behaviour, display power and backend integration can interact in non-obvious ways.
10. **Do not delete historical backup files casually.** There are several `*.backup-*` / `*.before-*` files from earlier recovery work. They are untidy but may still document pre-fix states; housekeeping should be a deliberate separate task.

## Safe edit/deploy workflow

Typical workflow for a code change:

```bash
cd ~/marantz-now-playing
git status
git branch --show-current
git pull
node --check public/app.js
node --check server.js
systemctl --user restart marantz-display
systemctl --user --no-pager --full status marantz-display
```

If the edit was made locally, inspect `git diff` before restarting and before committing. If the edit was made on GitHub, pull it first and confirm the expected commit/branch arrived.

## Important known-good checkpoints

Useful historical recovery points from v3 development include:

- `f6c8d48` — functionality-complete baseline including Zone 2 patio controls; previously recorded as clean/pushed.
- `051f444` — refined Marantz branding and standby wake; previously recorded as a clean checkpoint.
- `99cdb6e` — touch seek and kiosk history guard (current visible tip when this README was refreshed, 20 Aug 2026).
- `0181618` — HEOS track progress monitoring.
- `885b322` — TIDAL source switching fix and zone-control movement.
- `e7f937d` — touch volume slider.

Other earlier recovery commits documented during development include `577bb0d` (hardware panel power management) and `71f4ce9` (Smart Select source control).

Do not reset to one of these simply because it is listed here; first compare it with the current tip and identify what later work would be lost.

## Behaviour that should be regression-tested

After changes touching `server.js`, `public/app.js` or `public/index.html`, test at least the affected subset of:

- standby → wake behaviour;
- PHONO/CD/HEOS/AUX/TV source selection;
- automatic Smart Select 4 when entering TV where applicable;
- play/pause/next/previous;
- now-playing metadata and progress;
- touch volume slider;
- touch seek;
- TIDAL browse/play path through the HP backend;
- Zone 2 patio source popup and control;
- panel power-off after 5 minutes on TV and AUX1/projector;
- panel power-off after 1 hour in AVR standby;
- touchscreen wake of an off panel and timeout restart;
- kiosk navigation/history guard and hidden pointer behaviour.

## Relationship with `marantz-backend`

The Pi should increasingly be treated as the **touchscreen/control edge**, while heavier media indexing, TIDAL library functions, voice/AI and future automation belong on the HP EliteDesk backend where practical. Avoid duplicating backend responsibilities on the Pi unless latency/offline operation requires it.

Backend repository: `Gerry-Dollso/marantz-backend`.

## Before adding the AI model

The next development phase is the backend AI/voice layer. Preserve the existing AVR/HEOS control API as a stable foundation and add AI as a caller/orchestrator around explicit deterministic actions. Do not let a language model generate arbitrary raw AVR/HEOS commands or shell commands. Expose a constrained action layer with validation, then map natural-language intent to those actions.

See `CHANGELOG.md` for the consolidated development history.
