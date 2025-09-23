#!/usr/bin/env bash
# Robust installer for HomeEye on Raspberry Pi (Bookworm 64-bit / RPi 5)
set -euo pipefail

LOG=/var/log/homeeye-install.log
exec > >(tee -a "$LOG") 2>&1

echo "[homeeye] Starting install: $(date)"

if [ "$(id -u)" -ne 0 ]; then
  echo "This installer must be run as root (sudo). Exiting." >&2
  exit 1
fi

echo "[homeeye] Updating apt..."
apt update -y
apt upgrade -y

echo "[homeeye] Installing APT packages (git, build tools, libcamera, ffmpeg, python)..."
apt install -y --no-install-recommends \
  ca-certificates curl gnupg git build-essential pkg-config \
  libcamera-apps ffmpeg v4l-utils qv4l2 \
  python3 python3-venv python3-pip python3-opencv \
  zram-tools wget udev apt-transport-https software-properties-common

# Install Node.js (NodeSource). Prefer Node 22 for feature parity with dev env.
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/v//')" != "22" ]; then
  echo "[homeeye] Installing Node.js 22.x via NodeSource"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt install -y nodejs
fi

echo "[homeeye] Creating 'homeeye' system user if missing"
if ! id -u homeeye >/dev/null 2>&1; then
  useradd -m -s /bin/bash homeeye || true
  echo "homeeye ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/homeeye
  chmod 0440 /etc/sudoers.d/homeeye
fi

mkdir -p /opt/homeeye
chown homeeye:homeeye /opt/homeeye

echo "[homeeye] Cloning or updating repository into /opt/homeeye"
if [ -d /opt/homeeye/.git ]; then
  sudo -u homeeye git -C /opt/homeeye pull || true
else
  sudo -u homeeye git clone https://github.com/Aeell/HomeEye.git /opt/homeeye || true
fi

echo "[homeeye] Setting up Python venv and installing Python packages (as homeeye)"
sudo -u homeeye bash -lc '
  python3 -m venv /home/homeeye/venv
  /home/homeeye/venv/bin/python -m pip install --upgrade pip setuptools wheel
  /home/homeeye/venv/bin/pip install numpy Pillow
'

echo "[homeeye] Attempting to install TensorFlow Lite runtime (tflite-runtime). If this fails, see README for manual steps."
sudo -u homeeye bash -lc '
  set -e
  /home/homeeye/venv/bin/python -m pip install --upgrade pip
  if ! /home/homeeye/venv/bin/pip install tflite-runtime; then
    echo "tflite-runtime pip install failed; you may need to install an aarch64 wheel manually. See https://www.tensorflow.org/lite/guide/python"
  fi
'

echo "[homeeye] Installing Node server dependencies (as homeeye)"
if [ -d /opt/homeeye/server ]; then
  sudo -u homeeye bash -lc 'cd /opt/homeeye/server && if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi' || true
fi

echo "[homeeye] Setting up .env file"
ENV_FILE="/opt/homeeye/Raspi5/.env"
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" << EOF
WEB_PORT=8420
MJPEG_PORT=8421
THEME_DEFAULT=dark
CAMERA_FPS=15
CAMERA_WIDTH=1280
CAMERA_HEIGHT=720
EOF
fi

echo "[homeeye] Checking for libcamera-vid and setting MOCK_CAMERA if needed"
if ! command -v libcamera-vid >/dev/null 2>&1; then
  echo "MOCK_CAMERA=1" >> "$ENV_FILE"
  echo "[homeeye] MOCK_CAMERA enabled (libcamera-vid not found)"
else
  echo "[homeeye] libcamera-vid found, real camera will be used"
fi

echo "[homeeye] Copying service unit files and enabling services"
for svc in homeeye-web homeeye-camera homeeye-detector; do
  if [ -f /opt/homeeye/Raspi5/services/${svc}.service ]; then
    cp /opt/homeeye/Raspi5/services/${svc}.service /etc/systemd/system/${svc}.service
  fi
done

systemctl daemon-reload || true
systemctl enable --now homeeye-web.service homeeye-camera.service homeeye-detector.service || true

echo "[homeeye] Install finished: $(date)"
echo "Check logs at $LOG and 'sudo systemctl status homeeye-web'"
#!/usr/bin/env bash
# Minimal installer for HomeEye on Raspberry Pi (Bookworm, 64-bit recommended)
set -euo pipefail

echo "[homeeye] Updating apt and installing packages..."
sudo apt update
sudo apt upgrade -y
sudo apt install -y git nodejs npm libcamera-apps ffmpeg python3-pip python3-venv zram-tools

echo "[homeeye] Creating homeeye user and directories..."
if ! id -u homeeye >/dev/null 2>&1; then
  sudo useradd -m -s /bin/bash homeeye || true
fi
sudo mkdir -p /home/homeeye/homeeye
sudo chown -R homeeye:homeeye /home/homeeye/homeeye

echo "[homeeye] Setting up Python venv and install base libs (as homeeye user)..."
sudo -u homeeye bash -lc '
  python3 -m venv ~/homeeye/venv
  ~/homeeye/venv/bin/python -m pip install --upgrade pip
  ~/homeeye/venv/bin/pip install numpy opencv-python-headless Pillow
'

echo "[homeeye] Installing Node dependencies for server..."
sudo -u homeeye bash -lc 'cd ~/homeeye/server && npm install'

echo "[homeeye] Copying service files to /etc/systemd/system (requires sudo)"
sudo cp Raspi5/services/homeeye-web.service /etc/systemd/system/
sudo cp Raspi5/services/homeeye-camera.service /etc/systemd/system/
sudo cp Raspi5/services/homeeye-detector.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now homeeye-web.service homeeye-camera.service homeeye-detector.service || true

echo "[homeeye] Install complete. Check 'sudo systemctl status homeeye-web.service'"
