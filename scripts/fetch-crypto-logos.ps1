# 암호화폐 로고 일괄 수집(2026-09-03 사용자 요청: 코인 로고를 자체 호스팅 DB로 관리)
# CoinGecko /coins/markets 시총 상위 목록의 image URL을 받아 logos/crypto/{티커대문자}.png로 저장하고,
# 성공한 티커 목록을 data/logo-db.js(CRYPTO_LOGO_DB)로 생성한다. 재실행 시 이미 있는 파일은 건너뜀.
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$outDir = Join-Path $root "logos\crypto"
New-Item -ItemType Directory -Force $outDir | Out-Null
$ua = @{ "User-Agent" = "MarketmapLogoFetcher/1.0" }

$coins = @()
foreach ($page in 1, 2) {
  $coins += Invoke-RestMethod -Uri "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=150&page=$page" -UseBasicParsing -Headers $ua -TimeoutSec 60
  Start-Sleep -Seconds 3
}

$ok = New-Object System.Collections.Generic.SortedSet[string]
$fail = @()
foreach ($c in $coins) {
  $base = ($c.symbol).ToUpper() -replace '[^A-Z0-9]', ''
  if (-not $base) { continue }
  $dest = Join-Path $outDir "$base.png"
  if (Test-Path $dest) { [void]$ok.Add($base); continue }
  if (-not $c.image) { continue }
  try {
    Invoke-WebRequest -Uri $c.image -OutFile $dest -UseBasicParsing -Headers $ua -TimeoutSec 30
    [void]$ok.Add($base)
    Start-Sleep -Milliseconds 250
  } catch {
    $fail += $base
  }
}

# DB는 실제 폴더 내용 기준으로 생성 — 목록 밖에서 수동 추가한 로고(랩트 코인 등)도 포함되도록
$dbPath = Join-Path $root "data\logo-db.js"
$files = Get-ChildItem $outDir -Filter "*.png" -Name | ForEach-Object { [System.IO.Path]::GetFileNameWithoutExtension($_) } | Sort-Object
$list = ($files | ForEach-Object { "`"$_`"" }) -join ","
$js = "// 자동 생성: scripts/fetch-crypto-logos.ps1 — logos/crypto/{티커}.png 보유 목록(앱은 이 목록에 있으면 자체 호스팅 로고 사용)`nconst CRYPTO_LOGO_DB = new Set([$list]);`n"
[System.IO.File]::WriteAllText($dbPath, $js, (New-Object System.Text.UTF8Encoding $false))
Write-Output "saved=$($files.Count) failed=$($fail.Count) $($fail -join ',')"
