param(
  [string]$PiHost      = "homeeye.local",
  [string]$PiUser      = "riplay",
  [string]$SrvPort     = "8789"
)

$ErrorActionPreference = "Stop"

Write-Host "== HomeEye repo audit ==" -ForegroundColor Cyan

# Files to scan (skip node_modules, build, dist, .git, etc.)
$include = @("*.js","*.ts","*.tsx","*.jsx","*.json","*.sh","*.ps1","*.service","*.env","*.md","*.py","*.yml","*.yaml","Dockerfile","*.html","*.css")
$excludeDirs = @("\.git","\bnode_modules\b","\bdist\b","\bbuild\b","\bcoverage\b")

$allFiles = Get-ChildItem -Recurse -File -Include $include | Where-Object {
  $path = $_.FullName
  -not ($excludeDirs | Where-Object { $path -match $_ })
}

$findings = [System.Collections.Generic.List[Object]]::new()

# Regex for IPv4 literals
$ipRegex = '(?<![\d])(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)(?![\d])'
# Direct host patterns we don't want (except localhost)
$badHosts = @("raspberrypi.local","pi.local")

foreach ($f in $allFiles) {
  $text = Get-Content -Raw -LiteralPath $f.FullName

  # 1) any bare IPv4?
  if ($text -match $ipRegex) {
    $ips = [System.Text.RegularExpressions.Regex]::Matches($text, $ipRegex) | Select-Object -ExpandProperty Value -Unique
    foreach ($ip in $ips) {
      $findings.Add([pscustomobject]@{ File=$f.FullName; Type="Hardcoded IPv4"; Value=$ip })
    }
  }

  # 2) hostnames we want to avoid in code
  foreach ($h in $badHosts) {
    if ($text -match [Regex]::Escape($h)) {
      $findings.Add([pscustomobject]@{ File=$f.FullName; Type="Host hostname literal"; Value=$h })
    }
  }

  # 3) server port literals likely used (80/3000/4000/5000/5173/8787)
  foreach ($p in @("80","3000","4000","5000","5173","8787")) {
    # avoid matching in words; match :PORT or =PORT or "PORT"
    if ($text -match "[:=][""`']?$p\b") {
      $findings.Add([pscustomobject]@{ File=$f.FullName; Type="Suspicious Port Literal"; Value=$p })
    }
  }
}

if ($findings.Count -eq 0) {
  Write-Host "No hard-coded IPs/hosts/ports found 🎉" -ForegroundColor Green
} else {
  Write-Host "Findings:" -ForegroundColor Yellow
  $findings | Sort-Object File,Type,Value | Format-Table -AutoSize
}

# 3) Check for env files and systemd unit; prepare templates if missing
$need = @()

if (-not (Test-Path ".\.env")) { $need += ".env" }
if (-not (Test-Path ".\server\.env")) { $need += "server/.env" }
if (-not (Test-Path ".\Raspi5\.env.pi")) { $need += "Raspi5/.env.pi" }
if (-not (Test-Path ".\Raspi5\homeeye.service")) { $need += "Raspi5/homeeye.service" }

if ($need.Count -gt 0) {
  Write-Host "`nMissing files detected, generating templates:" -ForegroundColor Yellow
  foreach ($n in $need) { Write-Host " - $n" }
  # Root .env (optional shared)
  if ($need -contains ".env") {
@"
# Root env (optional)
PROJECT_NAME=HomeEye
"@ | Out-File -Encoding UTF8 .\.env
  }
  # Server .env
  if ($need -contains "server/.env") {
@"
# Server env
PORT=$SrvPort
HOST=0.0.0.0
CORS_ORIGIN=*
# If you proxy UI -> server, keep relative URLs in UI (recommended)
"@ | Out-File -Encoding UTF8 .\server\.env
  }
  # Pi side .env.pi
  if ($need -contains "Raspi5/.env.pi") {
@"
# Pi side env
PI_HOST=$PiHost
PI_USER=$PiUser
PI_PORT=22
STREAM_PORT=$SrvPort
CAMERA=libcamera
"@ | Out-File -Encoding UTF8 .\Raspi5\.env.pi
  }
  # systemd unit
  if ($need -contains "Raspi5/homeeye.service") {
@"
[Unit]
Description=HomeEye capture & stream
Wants=network-online.target
After=network-online.target

[Service]
User=$PiUser
EnvironmentFile=/home/$PiUser/HomeEye/Raspi5/.env.pi
WorkingDirectory=/home/$PiUser/HomeEye/Raspi5
# placeholder ExecStart; adjust to your capture script
ExecStart=/usr/bin/python3 /home/$PiUser/HomeEye/Raspi5/capture.py --port $SrvPort
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
"@ | Out-File -Encoding UTF8 .\Raspi5\homeeye.service
  }

  Write-Host "`nTemplates written. Review and commit if correct." -ForegroundColor Green
}

# 4) Prepare a suggested UI config snippet for dynamic host (no hardcoded IP)
$uiCfgPath1 = ".\ui\src\config.ts"
$uiCfgPath2 = ".\ui\src\lib\config.ts"
$uiCfg = @"
export const apiBase = (() => {
  const { protocol, host } = window.location;
  return \`\${protocol}//\${host}/api\`;
})();

export const wsUrl = (() => {
  const { protocol, host } = window.location;
  const wsProto = protocol === 'https:' ? 'wss:' : 'ws:';
  return \`\${wsProto}//\${host}/ws\`;
})();

export const defaultGrid = { rows: 4, cols: 4 };
"@

foreach ($p in @($uiCfgPath1,$uiCfgPath2)) {
  if (Test-Path $p) {
    Write-Host "UI config candidate found: $p" -ForegroundColor Cyan
    # Skip auto-overwrite; write a suggested variant alongside
    $out = $p + ".suggested"
    $uiCfg | Out-File -Encoding UTF8 $out
    Write-Host " -> Wrote $out (compare & merge)" -ForegroundColor Green
  }
}

Write-Host "`nAudit complete." -ForegroundColor Cyan
