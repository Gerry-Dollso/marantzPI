# marantzPI v2.1.0

A touchscreen companion display for a Marantz receiver and HEOS playback.

## v2.1.0 changes

- Now Playing appears only while HEOS supplies track metadata.
- The idle screen returns after the configured timeout when metadata disappears.
- Receiver input labels are configurable in `settings.json`.
- Default custom labels include `NET` → `TIDAL` and `8K` → `PHONO`.
- The kiosk mouse pointer is hidden.

## Update an existing installation

From the extracted release directory:

```bash
chmod +x update.sh
./update.sh
```

The updater preserves `config.json`, creates a timestamped backup, restarts the
user-level `marantz-display.service`, and verifies that it is active.
