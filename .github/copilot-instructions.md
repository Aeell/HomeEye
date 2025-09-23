## HomeEye — AI agent quick-start notes

Goal: make targeted, low-risk edits to restore the Raspberry Pi MJPEG stream and the Node web UI.

Key facts
- Minimal Raspberry Pi camera viewer. UI is static (`ui/`), server is Node (`server/`), Pi-specific helpers in `Raspi5/`.
- No frontend build step — edit `ui/app.js` / `ui/index.html` directly.
- Default Pi ports (from `Raspi5/.env`): WEB_PORT=8420, MJPEG_PORT=8421.

Where to look first (fast wins)
- Hardware/drivers: confirm `libcamera` and Camera v3 on the Pi. If hardware fails, nothing in Node will work.
- Streamer: `Raspi5/camera/streamer.js` and `Raspi5/services/homeeye-camera.service`.
- Server/API: `server/server.js` and `server/config.js` (start here if endpoints or websockets fail).
- UI: `ui/app.js` (WebSocket message shape and overlay drawing), `ui/index.html` (entry).

Concrete, copy-paste checks
- Start the Node server locally (PowerShell):
```powershell
cd server
npm install
node server.js
```
- Use the included Wave scripts to deploy to the Pi (PowerShell examples):
```powershell
scripts\wave_bootstrap.ps1 -User riplay -PiHost 192.168.0.103 -RepoName HomeEye -InstallPreset
scripts\wave_deploy_from_github.ps1 -User riplay -PiHost 192.168.0.103 -RepoUrl https://github.com/Aeell/HomeEye.git -Branch main -WebPort 8420 -MjpegPort 8421
scripts\wave_check.ps1 -User riplay -PiHost 192.168.0.103
```
- On the Pi, check services and logs:
```bash
sudo systemctl status homeeye-camera.service homeeye-web.service
sudo journalctl -u homeeye-camera.service -n 200
sudo journalctl -u homeeye-web.service -n 200
```

Patterns & conventions to follow
- Keep the UI dependency-free: do not introduce a bundler or transpiler.
- Motion detection messages are simple JSON sent over WebSocket. Match the payload shape in `ui/app.js` when publishing from any new detector.
- Config lives on the Pi as `Raspi5/.env` (created from `.env.template`). Changing ports or camera params happens there.

Common bug fingerprints (what to grep for)
- "stream.mjpg" — missing or misrouted MJPEG feed.
- WebSocket connect/close errors in `ui/app.js` — look for reconnection logic.
- Unhandled exceptions on server start — search `server.js` for synchronous startup tasks that may throw.

What to avoid without coordinating
- Adding a frontend build pipeline (Webpack/Vite). This repo intentionally serves static JS.
- Renaming systemd unit files or service names without updating `scripts/`.

If you need runtime info, request these artifacts
- `journalctl` output for `homeeye-camera.service` and `homeeye-web.service` from the Pi
- `node server.js` stderr output (full stack traces)
- The Pi `Raspi5/.env` file (sanitized for secrets)

If anything in this file is unclear, tell me which section to expand (examples: WebSocket payload format, precise server start errors, or typical libcamera commands).
