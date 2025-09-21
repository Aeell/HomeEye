Pi project for home camera surviliance

# HomeEye


Minimal home-network camera viewer for Raspberry Pi 5 + Camera v3 (libcamera). Dark/light UI, 4×4 grid overlay, timestamp overlay, and placeholder motion boxes (for future AI upgrades). No external dependencies beyond Node.js + libcamera-apps.


## Quick Start (Wave Terminal / Windows)


### A) Pi pulls from GitHub (recommended)
```powershell
git clone https://github.com/Aeell/HomeEye.git
cd HomeEye
scripts\wave_bootstrap.ps1 -User riplay -PiHost 192.168.1.50 -RepoName HomeEye -InstallPreset
scripts\wave_deploy_from_github.ps1 -User riplay -PiHost 192.168.1.50 -RepoUrl https://github.com/Aeell/HomeEye.git -Branch main -WebPort 8420 -MjpegPort 8421
scripts\wave_check.ps1 -User riplay -PiHost 192.168.1.50
