#!/bin/sh
# Run once on first boot. Expects to be launched from /boot as homeeye-firstboot.sh
set -e
LOGFILE=/var/log/homeeye-firstboot.log
exec >"$LOGFILE" 2>&1

echo "[homeeye-firstboot] starting"

# create homeeye user if it doesn't exist
if ! id -u homeeye >/dev/null 2>&1; then
  echo "creating user 'homeeye'"
  useradd -m -s /bin/bash -G sudo homeeye || true
  passwd -d homeeye || true
  # allow passwordless sudo for installer
  echo "homeeye ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/homeeye
  chmod 0440 /etc/sudoers.d/homeeye
fi

# copy authorized_keys if provided on /boot/authorized_keys
if [ -f /boot/authorized_keys ]; then
  mkdir -p /home/homeeye/.ssh
  cp /boot/authorized_keys /home/homeeye/.ssh/authorized_keys
  chown -R homeeye:homeeye /home/homeeye/.ssh
  chmod 700 /home/homeeye/.ssh
  chmod 600 /home/homeeye/.ssh/authorized_keys
  echo "installed authorized_keys for homeeye"
fi

# optional wifi: if /boot/wpa_supplicant.conf exists, move it in place
if [ -f /boot/wpa_supplicant.conf ]; then
  echo "installing wpa_supplicant.conf"
  cp /boot/wpa_supplicant.conf /etc/wpa_supplicant/wpa_supplicant.conf
  chmod 600 /etc/wpa_supplicant/wpa_supplicant.conf
fi

cd /tmp
echo "installing prerequisites and cloning HomeEye"
apt-get update -y || true
apt-get install -y git curl || true

if [ ! -d /opt/homeeye ]; then
  echo "cloning HomeEye to /opt/homeeye"
  git clone https://github.com/Aeell/HomeEye.git /opt/homeeye || true
  chown -R homeeye:homeeye /opt/homeeye || true
fi

# attempt to run the project installer if present
if [ -x /opt/homeeye/Raspi5/pi_install.sh ]; then
  echo "running project installer as homeeye"
  sudo -u homeeye /opt/homeeye/Raspi5/pi_install.sh || true
fi

echo "firstboot finished, cleaning up"
# remove uploaded firstboot files to avoid re-running
rm -f /boot/homeeye-firstboot.sh
rm -f /boot/ssh
echo "[homeeye-firstboot] done"
