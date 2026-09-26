param([switch]$Execute)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$wrangler = Join-Path $repo 'node_modules\.bin\wrangler.cmd'
if (-not (Test-Path -LiteralPath $wrangler)) { throw 'Wrangler local est introuvable.' }

Push-Location -LiteralPath $repo
try {
  $query = 'SELECT id, name, skin_file_key, skin_file_name, skin_file_size, download_url FROM skins ORDER BY order_position'
  $result = & $wrangler d1 execute osu-yuzu-skins-db --remote --json --command $query
  if ($LASTEXITCODE -ne 0) { throw 'Lecture D1 de production impossible.' }
  $rows = @((($result -join "`n") | ConvertFrom-Json)[0].results)
  $files = @($rows | Where-Object { $_.skin_file_key })
  foreach ($row in $files) {
    if ($row.id -notmatch '^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$' -or
      $row.skin_file_key -ne "skins/$($row.id).osk") {
      throw "Clé de stockage inattendue : $($row.skin_file_key)"
    }
  }
  $totalBytes = ($files | Measure-Object -Property skin_file_size -Sum).Sum
  Write-Host "D1 production : $($files.Count) fichiers, $totalBytes octets."
  if (-not $Execute) {
    Write-Host 'Simulation uniquement. Relancer avec -Execute pour copier et vérifier.'
    return
  }

  & ssh fm 'install -d -m 750 -o osuyuzu-storage -g osuyuzu-storage /srv/osuyuzu-skins /srv/osuyuzu-skins/files /srv/osuyuzu-skins/files/skins /srv/osuyuzu-skins/files/bundles; install -d -m 700 /srv/osuyuzu-skins/incoming'
  if ($LASTEXITCODE -ne 0) { throw 'Préparation du répertoire VPS impossible.' }

  $copied = 0
  foreach ($row in $files) {
    $id = $row.id
    $temporary = Join-Path $env:TEMP "osuyuzu-r2-$id.osk"
    $remotePart = "/srv/osuyuzu-skins/incoming/$id.osk.part"
    $remoteFile = "/srv/osuyuzu-skins/files/skins/$id.osk"
    try {
      & $wrangler r2 object get "osu-yuzu-skins-storage/$($row.skin_file_key)" --remote --file $temporary
      if ($LASTEXITCODE -ne 0) { throw "Lecture R2 impossible : $id" }
      $localInfo = Get-Item -LiteralPath $temporary
      if ($row.skin_file_size -gt 0 -and $localInfo.Length -ne $row.skin_file_size) {
        throw "Taille R2 différente de D1 : $id"
      }
      $hash = (Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash.ToLowerInvariant()
      $existing = ((& ssh fm "if test -f '$remoteFile'; then sha256sum '$remoteFile' | cut -d' ' -f1; fi") | Out-String).Trim()
      if ($LASTEXITCODE -ne 0) { throw "Contrôle VPS impossible : $id" }
      if ($existing -eq $hash) {
        Write-Host "Déjà vérifié : $id"
        continue
      }
      if ($existing) { throw "Le VPS possède déjà une autre version de $id ; aucun écrasement." }
      & scp -q $temporary "fm:$remotePart"
      if ($LASTEXITCODE -ne 0) { throw "Copie SSH impossible : $id" }
      $remoteHash = (& ssh fm "sha256sum '$remotePart' | cut -d' ' -f1").Trim()
      if ($LASTEXITCODE -ne 0 -or $remoteHash -ne $hash) { throw "Empreinte SHA-256 différente : $id" }
      & ssh fm "test ! -e '$remoteFile' && chown osuyuzu-storage:osuyuzu-storage '$remotePart' && chmod 640 '$remotePart' && mv '$remotePart' '$remoteFile'"
      if ($LASTEXITCODE -ne 0) { throw "Validation du fichier VPS impossible : $id" }
      $copied += 1
      Write-Host "Copié et vérifié : $id ($($localInfo.Length) octets)"
    } finally {
      if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force }
    }
  }
  $manifest = Join-Path $env:TEMP 'osuyuzu-vps-migration-manifest.json'
  try {
    ConvertTo-Json -InputObject $rows -Depth 5 | Set-Content -LiteralPath $manifest -Encoding utf8
    & scp -q $manifest 'fm:/srv/osuyuzu-skins/incoming/migration-manifest.json'
    if ($LASTEXITCODE -ne 0) { throw 'Copie du manifeste impossible.' }
    & ssh fm 'install -m 640 -o osuyuzu-storage -g osuyuzu-storage /srv/osuyuzu-skins/incoming/migration-manifest.json /srv/osuyuzu-skins/migration-manifest.json && runuser -u osuyuzu-storage -- python3 /opt/osuyuzu-storage/build-bundle.py --root /srv/osuyuzu-skins --manifest /srv/osuyuzu-skins/migration-manifest.json'
    if ($LASTEXITCODE -ne 0) { throw "Construction de l'archive VPS impossible." }
  } finally {
    if (Test-Path -LiteralPath $manifest) { Remove-Item -LiteralPath $manifest -Force }
  }
  Write-Host "Migration terminée : $copied nouvelles copies sur $($files.Count) fichiers D1. Archive reconstruite. R2 conservé."
} finally {
  Pop-Location
}
