Pi project for home camera surviliance

# HomeEye


Minimal home-network camera viewer for Raspberry Pi 5 + Camera v3 (libcamera). Dark/light UI, 4×4 grid overlay, timestamp overlay, and placeholder motion boxes (for future AI upgrades). No external dependencies beyond Node.js + libcamera-apps.


## Quick Start (Wave Terminal / Windows)


### A) Pi pulls from GitHub (recommended)
```powershell
git clone https://github.com/Aeell/HomeEye.git
cd HomeEye
scripts\wave_bootstrap.ps1 -User riplay -PiHost 192.168.0.103 -RepoName HomeEye -InstallPreset
scripts\wave_deploy_from_github.ps1 -User riplay -PiHost 192.168.0.103 -RepoUrl https://github.com/Aeell/HomeEye.git -Branch main -WebPort 8420 -MjpegPort 8421
scripts\wave_check.ps1 -User riplay -PiHost 192.168.0.103
Open http://192.168.0.103:8420/.

B) Push local files to Pi
cd HomeEye
scripts\wave_bootstrap.ps1 -User riplay -PiHost 192.168.0.103 -RepoName HomeEye
scripts\wave_push_to_pi.ps1 -User riplay -PiHost 192.168.0.103 -PiPath /home/riplay/homeeye
scripts\wave_check.ps1 -User riplay -PiHost 192.168.0.103
Configuration

Edit Raspi5/.env (created from template on first install):
WEB_PORT=8420
MJPEG_PORT=8421
CAMERA_WIDTH=1280
CAMERA_HEIGHT=720
CAMERA_FPS=15
CAMERA_EXTRA_OPTS=
THEME_DEFAULT=dark
Services

homeeye-camera.service → MJPEG stream at http://<pi>:8421/stream.mjpg

homeeye-web.service → UI/API at http://<pi>:8420/

Manage:
sudo systemctl status homeeye-camera.service
sudo systemctl status homeeye-web.service
sudo systemctl restart homeeye-camera.service homeeye-web.service

Notes

Requires Raspberry Pi OS (Bookworm, 64-bit recommended) with Camera v3 enabled.

libcamera-vid is used to produce MJPEG; Node server re-multiplexes frames to multiple clients.

Placeholder motion boxes are simulated via WebSocket and drawn as overlays; real detections can later publish the same JSON shape.
