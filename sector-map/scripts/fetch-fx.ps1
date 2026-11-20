# 원·달러 환율을 받아 sector-map/data/fx.js 에 한 줄로 쓴다(2026-11-20 신설).
# 지도가 원화·달러 종목을 한 단위로 비교할 때 1,400원 고정값을 쓰던 것을 대신할 값 — 하루 2번 도는 섹터맵 배치가 갱신한다.
#   파일 내용(정확히 이 모양 한 줄): window.MM_FX = {"usdkrw": 1467.2, "asOf": "2026-11-20"};
#   usdkrw = 야후 KRW=X 현재가(소수 1자리), asOf = 그 시세의 한국 날짜.
# 900~2500 밖이거나 값을 못 받으면 파일을 덮어쓰지 않는다(직전 값 유지).
# 사용: ./scripts/fetch-fx.ps1

$ProgressPreference = 'SilentlyContinue'
$headers = @{ "User-Agent" = "Mozilla/5.0" }
$outPath = Join-Path (Join-Path (Split-Path $PSScriptRoot -Parent) "data") "fx.js"
$inv = [System.Globalization.CultureInfo]::InvariantCulture

$rate = $null
$asOf = $null
foreach ($apiHost in @("query1.finance.yahoo.com", "query2.finance.yahoo.com", "query1.finance.yahoo.com")) {
  try {
    $resp = Invoke-RestMethod -Uri "https://$apiHost/v8/finance/chart/KRW=X?range=5d&interval=1d" -Headers $headers -TimeoutSec 20
    $meta = $resp.chart.result[0].meta
    $v = [double]$meta.regularMarketPrice
    if ($v -gt 0) {
      $rate = $v
      $t = [DateTimeOffset]::UtcNow
      if ($null -ne $meta.regularMarketTime) { $t = [DateTimeOffset]::FromUnixTimeSeconds([int64]$meta.regularMarketTime) }
      $asOf = $t.ToOffset([TimeSpan]::FromHours(9)).ToString("yyyy-MM-dd", $inv)
      break
    }
  } catch {
    Write-Host "환율 조회 실패($apiHost): $($_.Exception.Message)"
  }
  Start-Sleep -Seconds 2
}

if ($null -eq $rate) {
  Write-Host "::warning::원·달러 환율을 받지 못해 fx.js 를 그대로 둡니다."
  Write-Host "ALL_DONE"
  exit 0
}
if ($rate -lt 900 -or $rate -gt 2500) {
  Write-Host "::warning::원·달러 환율 $rate 이 900~2500 밖이라 fx.js 를 그대로 둡니다."
  Write-Host "ALL_DONE"
  exit 0
}

$rateText = ([math]::Round($rate, 1)).ToString("0.0", $inv)
$line = 'window.MM_FX = {"usdkrw": ' + $rateText + ', "asOf": "' + $asOf + '"};'
[System.IO.File]::WriteAllText($outPath, $line + "`n", (New-Object System.Text.UTF8Encoding($false)))
Write-Host "저장: $outPath -> $line"
Write-Host "ALL_DONE"
