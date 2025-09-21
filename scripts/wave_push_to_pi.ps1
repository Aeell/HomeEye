[CmdletBinding()]param([Parameter(Mandatory=$true)][string]$PiHost,[string]$User='riplay',[string]$PiPath="/home/$User/homeeye",[switch]$NoRestart)
$arch = Join-Path $env:TEMP 'homeeye_push.tgz'; if(Test-Path $arch){ Remove-Item $arch -Force }
Write-Host 'Packing repo...' -ForegroundColor Green
tar -czf $arch --exclude-vcs --exclude='./node_modules' --exclude='./.DS_Store' .
Write-Host 'Uploading...' -ForegroundColor Green
scp $arch "$User@$PiHost:/tmp/homeeye_push.tgz" | Out-Null
Write-Host 'Installing on Pi...' -ForegroundColor Green
$remote = @"
set -e
mkdir -p $PiPath
tar -xzf /tmp/homeeye_push.tgz -C $PiPath
rm -f /tmp/homeeye_push.tgz
cd $PiPath
bash Raspi5/scripts/pi_install.sh $User
if [ "$NoRestart" = "" ]; then sudo systemctl restart homeeye-camera.service || true; sudo systemctl restart homeeye-web.service || true; fi
"@
$p = Start-Process ssh -ArgumentList "$User@$PiHost", $remote -NoNewWindow -PassThru -Wait
if($p.ExitCode -ne 0){ throw "Remote install failed ($($p.ExitCode))" }
Write-Host "Open: http://$PiHost:8420/" -ForegroundColor Green
