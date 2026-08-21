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

## Recovery

The active development branch is:

```text
v3-development
```

The known-good checkpoint immediately before the 2026-08-21 housekeeping pass is:

```text
99cdb6e — Add touch seek and kiosk history guard
```

To return the Pi to that exact checkpoint for diagnosis:

```bash
cd ~/marantz-now-playing
git fetch origin
git checkout v3-development
git reset --hard 99cdb6e
systemctl --user restart marantz-display
```

Only use the hard reset after confirming there are no local changes you need to keep.
