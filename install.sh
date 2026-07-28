#!/usr/bin/env bash
set -euo pipefail
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
USER_SYSTEMD_DIR="$HOME/.config/systemd/user"
LABWC_AUTOSTART="$HOME/.config/labwc/autostart"
command -v node >/dev/null 2>&1 || { echo "Run: sudo apt install -y nodejs"; exit 1; }
mkdir -p "$USER_SYSTEMD_DIR"
cat > "$USER_SYSTEMD_DIR/marantz-display.service" <<EOF
[Unit]
Description=Marantz Now Playing Display
After=network-online.target
Wants=network-online.target
[Service]
Type=simple
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node $APP_DIR/server.js
Restart=always
RestartSec=3
[Install]
WantedBy=default.target
EOF
systemctl --user daemon-reload
systemctl --user enable --now marantz-display.service
CHROMIUM=""
for c in chromium chromium-browser; do command -v "$c" >/dev/null 2>&1 && CHROMIUM="$(command -v "$c")" && break; done
if [[ -z "$CHROMIUM" ]]; then sudo apt update; sudo apt install -y chromium; CHROMIUM="$(command -v chromium)"; fi
mkdir -p "$(dirname "$LABWC_AUTOSTART")"; touch "$LABWC_AUTOSTART"
LINE="sleep 3; $CHROMIUM --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble --overscroll-history-navigation=0 http://127.0.0.1:3000 &"
grep -Fq "http://127.0.0.1:3000" "$LABWC_AUTOSTART" || printf '\n%s\n' "$LINE" >> "$LABWC_AUTOSTART"
echo "Installed. Run: sudo reboot"
