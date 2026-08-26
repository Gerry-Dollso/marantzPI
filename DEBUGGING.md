# marantzPI diagnostics

marantzPI runs as the user service `marantz-display.service`. Its normal output, warnings, crashes and restart history are retained by the systemd user journal.

## Create an uploadable diagnostic archive

From the project directory:

```bash
cd ~/marantz-now-playing
chmod +x scripts/export-debug-log.sh
./scripts/export-debug-log.sh
```

The optional first argument selects how many days of journal history to include:

```bash
./scripts/export-debug-log.sh 14
```

The archive is written to:

```text
~/marantz-now-playing/debug-exports/marantzpi-debug-YYYYMMDD-HHMMSS.tar.gz
```

It contains:

- `service-journal.txt` — service output, warnings and errors
- `service.txt` — current service status and unit definition
- `api-status.json` — a snapshot of `/api/status`
- `git.txt` — branch, commit, recent history and local changes
- `system.txt` — OS, kernel, uptime, disk and memory information
- `summary.txt` — archive creation information

The export does not include passwords or the contents of `config.json`. The status snapshot may contain the currently playing song, artist, album, input and receiver volume.

## Watch the live service log

```bash
journalctl --user -u marantz-display.service -f
```

## Show recent errors

```bash
journalctl --user -u marantz-display.service --since '24 hours ago' -p warning --no-pager
```

## Preserve journals across reboots

To explicitly enable persistent system journals:

```bash
sudo mkdir -p /var/log/journal
sudo systemd-tmpfiles --create --prefix /var/log/journal
sudo systemctl restart systemd-journald
```

This is a one-time operating-system setting, not a marantzPI code change.

## Current recovery baseline

Active deployed/development branch:

```text
housekeeping-2026-08-21
```

Known-good functional checkpoint immediately before the documentation refresh/local-AI phase:

```text
3fc0f52 — Add persistent track voice learning
```

Do not use the old `v3-development` / `99cdb6e` recovery instructions as the normal current recovery target; they predate the completed TIDAL voice-learning work.

To inspect or restore the known-good checkpoint, first confirm that there are no local changes you need to preserve:

```bash
cd ~/marantz-now-playing
git status -sb
git fetch origin
git checkout housekeeping-2026-08-21
```

Only if an exact rollback is deliberately required:

```bash
git reset --hard 3fc0f52
systemctl --user restart marantz-display
```

A hard reset discards tracked local changes. Never run it as a routine troubleshooting step.

## Normal validation

After JavaScript changes:

```bash
cd ~/marantz-now-playing
node --check server.js
node --check public/app.js
node --check public/tidal-ui.js
git diff --check
systemctl --user restart marantz-display
systemctl --user is-active marantz-display
```
