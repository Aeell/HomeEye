#!/usr/bin/env bash
set -euo pipefail
sudo systemctl disable --now homeeye-web.service homeeye-camera.service || true
sudo rm -f /etc/systemd/system/homeeye-web.service /etc/systemd/system/homeeye-camera.service
sudo systemctl daemon-reload
echo "Services removed. Repo remains at ~/homeeye"
