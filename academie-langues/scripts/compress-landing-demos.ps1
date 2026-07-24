# Compresse les MP4 de public/demos/ pour la landing (~5 Mo cible par fichier).
# Prérequis : ffmpeg dans le PATH (ex. winget install Gyan.FFmpeg)
#
# Usage (depuis academie-langues/) :
#   pwsh scripts/compress-landing-demos.ps1

$ErrorActionPreference = "Stop"
$demos = Join-Path $PSScriptRoot "..\public\demos"
$out = Join-Path $demos "_compressed"

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  Write-Error "ffmpeg introuvable. Installe-le puis relance (ex. winget install Gyan.FFmpeg)."
}

New-Item -ItemType Directory -Force -Path $out | Out-Null

Get-ChildItem (Join-Path $demos "*.mp4") | ForEach-Object {
  $dest = Join-Path $out $_.Name
  Write-Host "Compression : $($_.Name) ($([math]::Round($_.Length/1MB,1)) Mo) -> $dest"
  ffmpeg -y -i $_.FullName `
    -an `
    -vf "scale='min(1280,iw)':-2" `
    -c:v libx264 -preset slow -crf 28 `
    -movflags +faststart `
    $dest
}

Write-Host ""
Write-Host "Fichiers compressés dans public/demos/_compressed/"
Write-Host "Vérifie la qualité, puis remplace les originaux si OK."
