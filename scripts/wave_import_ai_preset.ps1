$path = (Resolve-Path (Join-Path $PSScriptRoot '..\wave\presets.homeeye.json') -ErrorAction SilentlyContinue).Path
if($path){ Start-Process explorer.exe "/select,`"$path`""; Write-Host 'Wave → AI → Import preset' -ForegroundColor Yellow } else { Write-Warning 'Preset file not found' }
