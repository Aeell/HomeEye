#!/usr/bin/env bash
# Install runtime prerequisites on Pi, build server deps, install+enable services.
set -euo pipefail


USER_ARG="${1:-riplay}"
PI_USER="$USER_ARG"
BASE_DIR="/home/$PI_USER/homeeye"
ENV_FILE="$BASE_DIR/Raspi5/.env"


if [[ "$(id -u)" -eq 0 ]]; then
echo "Please run as the regular user (not sudo). This script will sudo when needed." >&2
fi


# Ensure base dir exists and owned by user
sudo mkdir -p "$BASE_DIR"
sudo chown -R "$PI_USER":"$PI_USER" "$BASE_DIR"


# If running outside the repo dir, try to detect
if [[ ! -f "$PWD/Raspi5/scripts/pi_install.sh" ]]; then
echo "Run this from the repo root (where Raspi5/ lives)." >&2
exit 1
fi


# Env file
if [[ ! -f "$ENV_FILE" ]]; then
echo "Creating $ENV_FILE from template";
cp "$BASE_DIR/Raspi5/.env.template" "$ENV_FILE" || cp "Raspi5/.env.template" "$ENV_FILE"
fi


# Packages
sudo apt-get update -y
sudo apt-get install -y nodejs npm libcamera-apps curl


# Server deps
pushd server >/dev/null
npm install --omit=dev
popd >/dev/null


# Install services
for svc in homeeye-camera.service homeeye-web.service; do
sudo cp "Raspi5/services/$svc" "/etc/systemd/system/$svc"
sudo chown root:root "/etc/systemd/system/$svc"
done
sudo systemctl daemon-reload
sudo systemctl enable homeeye-camera.service homeeye-web.service


# Start / restart
sudo systemctl restart homeeye-camera.service || true
sudo systemctl restart homeeye-web.service || true


# Summary
echo "=== HomeEye installed ==="
echo "Web: http://$(hostname -I | awk '{print $1}'):`grep -E '^WEB_PORT=' "$ENV_FILE" | cut -d= -f2`/"
echo "Stream: http://$(hostname -I | awk '{print $1}'):`grep -E '^MJPEG_PORT=' "$ENV_FILE" | cut -d= -f2`/stream.mjpg"
