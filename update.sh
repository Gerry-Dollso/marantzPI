#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="$HOME/marantz-now-playing"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$HOME/marantz-now-playing-backup-$STAMP"

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "Cannot find current installation at $TARGET_DIR" >&2
  exit 1
fi

# This updater replaces TARGET_DIR from a separate extracted/source directory.
# Running it from the installed checkout would delete its own source files
# before they could be copied back, so refuse that unsafe case explicitly.
if [[ "$(realpath "$SOURCE_DIR")" == "$(realpath "$TARGET_DIR")" ]]; then
  echo "Refusing unsafe in-place update from $TARGET_DIR" >&2
  echo "Use the normal git workflow in the installed checkout, or run this script from a separate extracted release directory." >&2
  exit 1
fi

node --check "$SOURCE_DIR/server.js"
node --check "$SOURCE_DIR/public/app.js"
python3 -m json.tool "$SOURCE_DIR/settings.json" >/dev/null
python3 -m json.tool "$SOURCE_DIR/package.json" >/dev/null

if [[ ! -f "$TARGET_DIR/config.json" ]]; then
  echo "Cannot find runtime config at $TARGET_DIR/config.json" >&2
  exit 1
fi

cp -a "$TARGET_DIR" "$BACKUP_DIR"

tmp_config="$(mktemp)"
trap 'rm -f "$tmp_config"' EXIT
cp "$TARGET_DIR/config.json" "$tmp_config"

find "$TARGET_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -a "$SOURCE_DIR"/. "$TARGET_DIR"/
cp "$tmp_config" "$TARGET_DIR/config.json"

systemctl --user restart marantz-display.service
sleep 2
systemctl --user --quiet is-active marantz-display.service

echo "marantzPI update installed."
echo "Backup: $BACKUP_DIR"
