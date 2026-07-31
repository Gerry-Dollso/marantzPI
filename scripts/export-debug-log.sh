#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$HOME/marantz-now-playing}"
SERVICE_NAME="${SERVICE_NAME:-marantz-display.service}"
DAYS="${1:-7}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT_DIR="$PROJECT_DIR/debug-exports"
WORK_DIR="$(mktemp -d)"
ARCHIVE="$OUTPUT_DIR/marantzpi-debug-$TIMESTAMP.tar.gz"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

mkdir -p "$OUTPUT_DIR"

{
  echo "marantzPI diagnostic export"
  echo "Created: $(date --iso-8601=seconds)"
  echo "Host: $(hostname)"
  echo "Requested journal period: $DAYS day(s)"
} > "$WORK_DIR/summary.txt"

{
  echo "=== uname ==="
  uname -a
  echo
  echo "=== OS release ==="
  cat /etc/os-release 2>/dev/null || true
  echo
  echo "=== uptime ==="
  uptime
  echo
  echo "=== disk usage ==="
  df -h "$PROJECT_DIR" 2>/dev/null || df -h
  echo
  echo "=== memory ==="
  free -h 2>/dev/null || true
} > "$WORK_DIR/system.txt" 2>&1

{
  echo "=== service status ==="
  systemctl --user status "$SERVICE_NAME" --no-pager || true
  echo
  echo "=== service definition ==="
  systemctl --user cat "$SERVICE_NAME" || true
} > "$WORK_DIR/service.txt" 2>&1

journalctl --user \
  -u "$SERVICE_NAME" \
  --since "$DAYS days ago" \
  --no-pager \
  -o short-iso-precise \
  > "$WORK_DIR/service-journal.txt" 2>&1 || true

{
  echo "=== current status endpoint ==="
  curl --silent --show-error --max-time 5 \
    http://localhost:3000/api/status | python3 -m json.tool
} > "$WORK_DIR/api-status.json" 2>&1 || true

if [[ -d "$PROJECT_DIR/.git" ]]; then
  {
    cd "$PROJECT_DIR"
    echo "=== branch ==="
    git branch --show-current
    echo
    echo "=== head ==="
    git rev-parse HEAD
    echo
    echo "=== status ==="
    git status --short --branch
    echo
    echo "=== recent commits ==="
    git log -n 30 --date=iso --pretty=format:'%h %ad %s'
  } > "$WORK_DIR/git.txt" 2>&1
fi

tar -C "$WORK_DIR" -czf "$ARCHIVE" .

printf '\nDiagnostic archive created:\n%s\n' "$ARCHIVE"
printf '\nUpload that .tar.gz file for analysis.\n'
