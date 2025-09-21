[CmdletBinding()]param([Parameter(Mandatory=$true)][string]$PiHost,[string]$User='riplay',[int]$WebPort=8420,[int]$MjpegPort=8421)
ssh $User@$PiHost "echo '--- web ---'; systemctl --no-pager --full status homeeye-web.service | tail -n 20; echo '--- camera ---'; systemctl --no-pager --full status homeeye-camera.service | tail -n 20; echo '--- ports ---'; ss -tulpn | egrep ':$WebPort|:$MjpegPort' || true; echo '--- healthz ---'; curl -s http://localhost:$WebPort/healthz || true"
Write-Host "Try: http://$PiHost:$WebPort/ and http://$PiHost:$MjpegPort/stream.mjpg" -ForegroundColor Yellow
