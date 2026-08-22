#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Validating marantzPI..."

while IFS= read -r -d '' file; do
  echo "  node --check ${file#"$APP_DIR/"}"
  node --check "$file"
done < <(
  find "$APP_DIR" \
    -maxdepth 2 \
    -type f \
    -name '*.js' \
    ! -name '*.backup-*' \
    ! -name '*.before-*' \
    ! -name '*.phase-*' \
    -print0 |
  sort -z
)

for file in \
  "$APP_DIR/package.json" \
  "$APP_DIR/settings.json" \
  "$APP_DIR/config.example.json"
do
  echo "  JSON ${file#"$APP_DIR/"}"
  python3 -m json.tool "$file" >/dev/null
done

if [[ -f "$APP_DIR/config.json" ]]; then
  echo "  JSON config.json"
  python3 -m json.tool "$APP_DIR/config.json" >/dev/null
fi

if command -v git >/dev/null 2>&1 &&
   git -C "$APP_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1
then
  echo "  git diff --check"
  git -C "$APP_DIR" diff --check
fi

while IFS= read -r -d '' file; do
  echo "  bash -n ${file#"$APP_DIR/"}"
  bash -n "$file"
done < <(find "$APP_DIR" -maxdepth 2 -type f -name '*.sh' -print0 | sort -z)

echo "marantzPI validation passed."
