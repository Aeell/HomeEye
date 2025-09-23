#!/usr/bin/env bash
# HomeEye Pi installer (idempotent)
# Usage: sudo bash pi_install_remote.sh
set -euo pipefail

LOG=/var/log/homeeye-install.log
exec > >(tee -a "$LOG") 2>&1

echo "[homeeye] Starting install: $(date)"

if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root (sudo). Exiting." >&2
  exit 1
fi

# Wait for apt/dpkg to become available (avoid collisions with raspi-config)
wait_for_apt() {
  local tries=0
  while fuser /var/lib/dpkg/lock >/dev/null 2>&1 || fuser /var/lib/apt/lists/lock >/dev/null 2>&1 || pgrep -x apt >/dev/null || pgrep -f apt >/dev/null || pgrep -x dpkg >/dev/null; do
    tries=$((tries+1))
    if [ "$tries" -gt 60 ]; then
      echo "apt/dpkg busy for too long, aborting" >&2
      return 1
    fi
    echo "Waiting for apt/dpkg to be free... (attempt $tries)"
    sleep 2
  done
  return 0
}

wait_for_apt || exit 1

export DEBIAN_FRONTEND=noninteractive

echo "[homeeye] apt update/upgrade"
apt update -y
apt upgrade -y

# Install base packages
echo "[homeeye] Installing required APT packages"
apt install -y --no-install-recommends \
  ca-certificates curl gnupg git build-essential pkg-config \
  libcamera-apps ffmpeg v4l-utils qv4l2 \
  python3 python3-venv python3-pip python3-opencv \
  zram-tools wget udev apt-transport-https software-properties-common \
  tmux dos2unix unzip net-tools

# Install Node.js 22.x via NodeSource if needed
install_node() {
  if command -v node >/dev/null 2>&1; then
    ver=$(node -v | sed 's/^v//')
    major=${ver%%.*}
    if [ "$major" -eq 22 ]; then
      echo "[homeeye] Node.js $ver already installed"
      return 0
    fi
    echo "[homeeye] Different Node.js detected: $ver"
  fi
  echo "[homeeye] Installing Node.js 22.x"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt install -y nodejs
}

install_node

# Create homeeye user if missing
if ! id -u homeeye >/dev/null 2>&1; then
  echo "[homeeye] Creating user 'homeeye'"
  useradd -m -s /bin/bash -U -G video,render,dialout homeeye || true
  echo "homeeye ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/homeeye
  chmod 0440 /etc/sudoers.d/homeeye
else
  echo "[homeeye] user 'homeeye' exists"
fi

# Ensure /opt/homeeye exists and is owned by homeeye
mkdir -p /opt/homeeye
chown homeeye:homeeye /opt/homeeye

# Clone or update repository
REPO_URL="https://github.com/Aeell/HomeEye.git"
if [ -d /opt/homeeye/.git ]; then
  echo "[homeeye] Updating existing repo"
  sudo -u homeeye git -C /opt/homeeye pull || true
else
  echo "[homeeye] Cloning repository into /opt/homeeye"
  sudo -u homeeye git clone --depth=1 "$REPO_URL" /opt/homeeye || true
fi

# Setup Python venv
echo "[homeeye] Setting up Python venv"
sudo -u homeeye bash -lc '
  python3 -m venv /home/homeeye/venv || true
  /home/homeeye/venv/bin/python -m pip install --upgrade pip setuptools wheel
  /home/homeeye/venv/bin/pip install numpy Pillow
'

# Attempt to install tflite-runtime (non-fatal)
echo "[homeeye] Attempting tflite-runtime install (may fail)"
sudo -u homeeye bash -lc '
  set -e
  /home/homeeye/venv/bin/python -m pip install --upgrade pip || true
  if /home/homeeye/venv/bin/pip install tflite-runtime; then
    echo "[homeeye] tflite-runtime installed"
  else
    echo "[homeeye] tflite-runtime install failed - continue without it"
  fi
'

# Install Node server dependencies
if [ -d /opt/homeeye/server ]; then
  echo "[homeeye] Installing Node dependencies in /opt/homeeye/server"
  sudo -u homeeye bash -lc 'cd /opt/homeeye/server && if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi' || true
else
  echo "[homeeye] /opt/homeeye/server not found, skipping npm install"
fi

# Copy systemd service files from repo if present
if [ -d /opt/homeeye/Raspi5/services ]; then
  echo "[homeeye] Installing systemd service files"
  for svc in homeeye-web homeeye-camera homeeye-detector; do
    if [ -f /opt/homeeye/Raspi5/services/${svc}.service ]; then
      # sanitize and install service file
      sed -e 's|/home/homeeye/homeeye|/opt/homeeye|g' -e 's|/home/riplay/homeeye|/opt/homeeye|g' /opt/homeeye/Raspi5/services/${svc}.service | sudo tee /etc/systemd/system/${svc}.service > /dev/null
      chmod 644 /etc/systemd/system/${svc}.service
    fi
  done
  systemctl daemon-reload || true
  systemctl enable --now homeeye-web.service homeeye-camera.service homeeye-detector.service || true
else
  echo "[homeeye] No service files in repo to install"
fi

# Final status
echo "[homeeye] Install finished: $(date)"
echo "Check /var/log/homeeye-install.log and 'sudo systemctl status homeeye-web'"

# Show brief service statuses
systemctl status homeeye-web --no-pager || true
systemctl status homeeye-camera --no-pager || true
systemctl status homeeye-detector --no-pager || true

exit 0
