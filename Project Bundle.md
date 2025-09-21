HomeEye/
├─ README.md # Use the one at the end of this doc (or merge with yours)
├─ .gitignore
├─ ui/ # Browser UI (no build step, pure HTML/CSS/JS)
│ ├─ index.html
│ ├─ styles.css
│ └─ app.js
├─ server/ # Web server (Express) + WebSocket placeholders
│ ├─ package.json
│ ├─ server.js
│ └─ config.js
├─ Raspi5/ # Pi-specific things
│ ├─ .env.template
│ ├─ camera/
│ │ └─ streamer.js # MJPEG server (libcamera-vid → Node multipart HTTP)
│ ├─ services/
│ │ ├─ homeeye-camera.service
│ │ └─ homeeye-web.service
│ └─ scripts/
│ ├─ pi_install.sh
│ ├─ pi_update_env.sh
│ └─ uninstall.sh
└─ scripts/ # Wave (Windows) helper scripts
├─ wave_bootstrap.ps1
├─ wave_deploy_from_github.ps1
├─ wave_push_to_pi.ps1
├─ wave_check.ps1
└─ wave_import_ai_preset.ps1 (optional)
