First-boot helper files for HomeEye

Copy the files in this directory to the Raspberry Pi's /boot partition after flashing Raspberry Pi OS.

Files:
- homeeye-firstboot.sh — run once on first boot (creates homeeye user, copies authorized_keys and wpa_supplicant if present, clones the repo and runs the installer)
- authorized_keys.template — paste your SSH public key to enable login without a password and save as `authorized_keys` on the /boot partition
- wpa_supplicant.conf.template — Wi-Fi config template; edit and save as `wpa_supplicant.conf` on the /boot partition to auto-join Wi‑Fi on first boot

Usage:
1. Flash Raspberry Pi OS (Bookworm 64-bit recommended) to the SD card.
2. Mount the SD card's /boot partition in Windows and copy these files there. Rename templates as needed.
3. Insert the card into your Pi and power it on. The firstboot script will run and perform the installation steps.
