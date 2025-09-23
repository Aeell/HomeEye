#!/usr/bin/env bash
set -euo pipefail

PI_HOST="${PI_HOST:-homeeye.local}"
PI_USER="${PI_USER:-riplay}"
SRV_PORT="${SRV_PORT:-8789}"

echo "== HomeEye repo audit (bash) =="

mapfile -t FILES < <(git ls-files | grep -E "\.(js|ts|tsx|jsx|json|sh|ps1|service|env|md|py|yml|yaml|html|css|Dockerfile)$" | grep -Ev "^(node_modules|dist|build|coverage)/")

IP_REGEX='(^|[^0-9])((25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})\.){3}(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})([^0-9]|$)'
FOUND=0
for f in "${FILES[@]}"; do
  if grep -Eaq "$IP_REGEX" "$f"; then
    echo "Hardcoded IPv4 -> $f"
    FOUND=1
  fi
  if grep -Eq "raspberrypi\.local|pi\.local" "$f"; then
    echo "Host literal (avoid) -> $f"
    FOUND=1
  fi
  if grep -Eq "[:=][\"']?(80|3000|4000|5000|5173|8787)\b" "$f"; then
    echo "Suspicious port literal -> $f"
    FOUND=1
  fi
done

if [ "$FOUND" -eq 0 ]; then
  echo "No hard-coded IPs/hosts/ports found 🎉"
fi

# Create templates if missing
mkdir -p Raspi5 server tools

[ -f .env ] || cat > .env <<EOF
PROJECT_NAME=HomeEye
EOF

[ -f server/.env ] || cat > server/.env <<EOF
PORT=$SRV_PORT
HOST=0.0.0.0
CORS_ORIGIN=*
EOF

[ -f Raspi5/.env.pi ] || cat > Raspi5/.env.pi <<EOF
PI_HOST=$PI_HOST
PI_USER=$PI_USER
PI_PORT=22
STREAM_PORT=$SRV_PORT
CAMERA=libcamera
EOF

[ -f Raspi5/homeeye.service ] || cat > Raspi5/homeeye.service <<EOF
[Unit]
Description=HomeEye capture & stream
Wants=network-online.target
After=network-online.target

[Service]
User=$PI_USER
EnvironmentFile=/home/$PI_USER/HomeEye/Raspi5/.env.pi
WorkingDirectory=/home/$PI_USER/HomeEye/Raspi5
ExecStart=/usr/bin/python3 /home/$PI_USER/HomeEye/Raspi5/capture.py --port $SRV_PORT
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF

# UI config suggestion
for p in ui/src/config.ts ui/src/lib/config.ts; do
  if [ -f "$p" ]; then
    cat > "$p.suggested" <<'CFG'
export const apiBase = (() => {
  const { protocol, host } = window.location;
  return `${protocol}//${host}/api`;
})();

export const wsUrl = (() => {
  const { protocol, host } = window.location;
  const wsProto = protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProto}//${host}/ws`;
})();

export const defaultGrid = { rows: 4, cols: 4 };
CFG
    echo "Wrote $p.suggested (compare & merge)"
  fi
done

echo "Audit complete."
