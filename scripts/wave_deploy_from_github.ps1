[CmdletBinding()]param([Parameter(Mandatory=$true)][string]$PiHost,[string]$User='riplay',[string]$RepoUrl='https://github.com/Aeell/HomeEye.git',[string]$Branch='main',[string]$PiPath="/home/$User/homeeye",[int]$WebPort=8420,[int]$MjpegPort=8421,[switch]$NoRestart)
function R($c){Write-Host "→ ssh $User@$PiHost $c" -ForegroundColor Cyan; $p=Start-Process ssh -ArgumentList "$User@$PiHost",$c -NoNewWindow -PassThru -Wait; if($p.ExitCode -ne 0){throw "Remote command failed ($($p.ExitCode))"}}
R @"
set -e
sudo apt-get update -y && sudo apt-get install -y git
mkdir -p $PiPath
if [ -d "$PiPath/.git" ]; then cd $PiPath && git fetch --all && git checkout $Branch && git pull --ff-only; else git clone -b $Branch $RepoUrl $PiPath; fi
cd $PiPath
bash Raspi5/scripts/pi_install.sh $User
for kv in WEB_PORT=$WebPort MJPEG_PORT=$MjpegPort; do k=${kv%%=*}; v=${kv#*=}; if grep -q "^$k=" Raspi5/.env; then sed -i "s/^$k=.*/$k=$v/" Raspi5/.env; else echo "$kv" >> Raspi5/.env; fi; done
if [ "$NoRestart" = "" ]; then sudo systemctl restart homeeye-camera.service || true; sudo systemctl restart homeeye-web.service || true; fi
"@
R "systemctl --no-pager --full status homeeye-web.service | tail -n 20"
R "systemctl --no-pager --full status homeeye-camera.service | tail -n 20"
R "curl -s http://localhost:$WebPort/healthz || true"
Write-Host "Open: http://${PiHost}:$WebPort/" -ForegroundColor Green
