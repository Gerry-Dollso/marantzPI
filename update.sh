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
if [[ "$SOURCE_DIR" == "$TARGET_DIR" ]]; then
  echo "Refusing in-place update: source and installed directory are the same." >&2
  echo "Run update.sh from a separate checkout of the repository." >&2
  exit 1
fi


"$SOURCE_DIR/scripts/validate.sh"
VERSION="$(node -p "require('$SOURCE_DIR/package.json').version")"

cp -a "$TARGET_DIR" "$BACKUP_DIR"
tmp_config="$(mktemp)"
cp "$TARGET_DIR/config.json" "$tmp_config"
find "$TARGET_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -a "$SOURCE_DIR"/. "$TARGET_DIR"/
cp "$tmp_config" "$TARGET_DIR/config.json"
rm -f "$tmp_config"

systemctl --user restart marantz-display.service
sleep 2
systemctl --user --quiet is-active marantz-display.service

echo "marantzPI v$VERSION installed."
echo "Backup: $BACKUP_DIR"
