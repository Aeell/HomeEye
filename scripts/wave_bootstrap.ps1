[CmdletBinding()]param([string]$User='riplay',[Parameter(Mandatory=$true)][string]$PiHost,[string]$RepoName='HomeEye',[switch]$InstallPreset)
$env:HOME_EYE_USER=$User; $env:HOME_EYE_PI=$PiHost; $env:HOME_EYE_REPO=$RepoName
Write-Host "User=$User Pi=$PiHost Repo=$RepoName" -ForegroundColor Green
if($InstallPreset){ $p=(Resolve-Path (Join-Path $PSScriptRoot '..\wave\presets.homeeye.json') -ErrorAction SilentlyContinue).Path; if($p){ Start-Process explorer.exe "/select,`"$p`""; Write-Host "Import in Wave → AI Presets" -ForegroundColor Yellow } }
