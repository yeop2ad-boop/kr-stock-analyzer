# KR 종목 배당률 수집 — Yahoo 차트 API의 배당 이벤트(events=div, 최근 1년)를 합산해 현재가로 나눈 값(%)
# kr-data-core.js / kr-data-extra.js 의 dividendYield(현재 전부 null)를 채워 넣는다.
param([int]$DelayMs = 150)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot  # sector-map/
$files = @(
  @{ Path = Join-Path $root "data\kr-data-core.js";  Prefix = "const KR_CORE_DATA = " },
  @{ Path = Join-Path $root "data\kr-data-extra.js"; Prefix = "const KR_EXTRA_DATA = " }
)

function Get-DividendYield([string]$Symbol) {
  $url = "https://query1.finance.yahoo.com/v8/finance/chart/$([uri]::EscapeDataString($Symbol))?range=1y&interval=1mo&events=div"
  try {
    $res = Invoke-RestMethod -Uri $url -TimeoutSec 15 -Headers @{ "User-Agent" = "Mozilla/5.0" }
  } catch { return $null }
  $r = $res.chart.result
  if (-not $r) { return $null }
  $meta = $r[0].meta
  $price = $meta.regularMarketPrice
  if (-not $price -or $price -le 0) { return $null }
  $divs = $r[0].events.dividends
  $sum = 0.0
  if ($divs) {
    foreach ($p in $divs.PSObject.Properties) {
      $amt = $p.Value.amount
      if ($amt) { $sum += [double]$amt }
    }
  }
  # 배당 이벤트가 없으면 무배당(0%)으로 확정 — null(미수집)과 구분됨
  return [math]::Round(($sum / $price) * 100, 2)
}

foreach ($f in $files) {
  $raw = Get-Content -Raw -Encoding UTF8 $f.Path
  # "const X = " 접두사와 끝의 ";" 를 벗기면 순수 JSON
  $jsonText = $raw -replace "^﻿?const [A-Z_]+ = ", "" -replace ";\s*$", ""
  $data = $jsonText | ConvertFrom-Json

  $done = 0; $filled = 0; $failed = 0
  foreach ($c in $data.companies) {
    $done++
    $y = Get-DividendYield $c.symbol
    if ($null -ne $y) { $c.dividendYield = $y; $filled++ } else { $failed++ }
    if ($done % 25 -eq 0) { Write-Host ("  {0}: {1}/{2} (filled {3}, failed {4})" -f (Split-Path -Leaf $f.Path), $done, $data.companies.Count, $filled, $failed) }
    Start-Sleep -Milliseconds $DelayMs
  }

  $newJson = $data | ConvertTo-Json -Depth 10
  Set-Content -Encoding UTF8 -Path $f.Path -Value ($f.Prefix + $newJson + ";")
  Write-Host ("DONE {0}: filled {1}, failed {2} / total {3}" -f (Split-Path -Leaf $f.Path), $filled, $failed, $data.companies.Count)
}

