# 영업이익률·ROE·부채비율·52주최저(구간위치) 4개 신규 지표 수집 스크립트 (2026-08-25 추가)
# 기존 fetch-growth-metrics.ps1과 동일한 패턴 — data/sp500-sectors.json, data/kr-sectors.json을 읽어
# 종목별로 (1)차트 meta(52주 고저+현재가) (2)fundamentals-timeseries(직전분기 영업이익/매출/순이익/자기자본/부채총계)를
# 조회해 4개 필드를 계산 후 덧붙여 다시 저장한다. 종목당 2회 호출 x 약 850종목이라 시간이 꽤 걸림(백그라운드 실행 권장).
# 완료 후 sp500-data.js / kr-data.js를 "const X_DATA = " + 최신 JSON으로 재생성해야 지도에 반영됨(수동 단계).

$ProgressPreference = 'SilentlyContinue'
$headers = @{ "User-Agent" = "Mozilla/5.0" }
$now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$twoYearsAgo = $now - 2 * 365 * 24 * 3600
$types = "quarterlyOperatingIncome,quarterlyTotalRevenue,quarterlyNetIncome,quarterlyStockholdersEquity,quarterlyTotalLiabilitiesNetMinorityInterest"

function Get-LatestValue($series) {
  if (-not $series -or $series.Count -lt 1) { return $null }
  $sorted = $series | Sort-Object asOfDate
  return $sorted[-1].reportedValue.raw
}

function Update-Ratios($dataPath) {
  $data = Get-Content -Path $dataPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $companies = $data.companies
  Write-Host "=== $dataPath : $($companies.Count)개 종목 처리 시작 ==="
  $done = 0
  $failed = 0
  foreach ($c in $companies) {
    $sym = $c.symbol
    try {
      $chart = Invoke-RestMethod -Uri "https://query1.finance.yahoo.com/v8/finance/chart/$sym`?range=5d&interval=1d" -Headers $headers -TimeoutSec 15
      $meta = $chart.chart.result[0].meta
      $price = $meta.regularMarketPrice
      $high = $meta.fiftyTwoWeekHigh
      $low = $meta.fiftyTwoWeekLow
      $week52 = $null
      if ($price -and $high -and $low -and ($high -gt $low)) {
        $week52 = [math]::Round((($price - $low) / ($high - $low)) * 100, 1)
      }

      Start-Sleep -Milliseconds 60
      $fund = Invoke-RestMethod -Uri "https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/$sym`?type=$types&period1=$twoYearsAgo&period2=$now&merge=false&lang=en-US&region=US" -Headers $headers -TimeoutSec 15
      $blocks = $fund.timeseries.result
      $opInc = Get-LatestValue ($blocks | Where-Object { $_.quarterlyOperatingIncome }).quarterlyOperatingIncome
      $rev = Get-LatestValue ($blocks | Where-Object { $_.quarterlyTotalRevenue }).quarterlyTotalRevenue
      $ni = Get-LatestValue ($blocks | Where-Object { $_.quarterlyNetIncome }).quarterlyNetIncome
      $eq = Get-LatestValue ($blocks | Where-Object { $_.quarterlyStockholdersEquity }).quarterlyStockholdersEquity
      $liab = Get-LatestValue ($blocks | Where-Object { $_.quarterlyTotalLiabilitiesNetMinorityInterest }).quarterlyTotalLiabilitiesNetMinorityInterest

      $opMargin = $null
      if ($null -ne $opInc -and $rev -and $rev -ne 0) { $opMargin = [math]::Round(($opInc / $rev) * 100, 1) }
      $roe = $null
      if ($null -ne $ni -and $eq -and $eq -ne 0) { $roe = [math]::Round(($ni / $eq) * 100, 1) }
      $debtRatio = $null
      if ($null -ne $liab -and $eq -and $eq -ne 0) { $debtRatio = [math]::Round(($liab / $eq) * 100, 1) }

      $c | Add-Member -NotePropertyName operatingMargin -NotePropertyValue $opMargin -Force
      $c | Add-Member -NotePropertyName roe -NotePropertyValue $roe -Force
      $c | Add-Member -NotePropertyName debtRatio -NotePropertyValue $debtRatio -Force
      $c | Add-Member -NotePropertyName week52RangePct -NotePropertyValue $week52 -Force
    } catch {
      $failed++
      $c | Add-Member -NotePropertyName operatingMargin -NotePropertyValue $null -Force
      $c | Add-Member -NotePropertyName roe -NotePropertyValue $null -Force
      $c | Add-Member -NotePropertyName debtRatio -NotePropertyValue $null -Force
      $c | Add-Member -NotePropertyName week52RangePct -NotePropertyValue $null -Force
    }
    $done++
    if ($done % 50 -eq 0) { Write-Host "   - $done / $($companies.Count) 완료 (실패 $failed)" }
    Start-Sleep -Milliseconds 90
  }
  $data.companies = $companies
  $data | Add-Member -NotePropertyName ratiosUpdatedAt -NotePropertyValue ((Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")) -Force
  $data | ConvertTo-Json -Depth 6 | Set-Content -Path $dataPath -Encoding utf8
  Write-Host "   -> 완료: $done 건, 실패: $failed 건. $dataPath 저장됨"
}

Update-Ratios "$PSScriptRoot\..\data\sp500-sectors.json"
Update-Ratios "$PSScriptRoot\..\data\kr-sectors.json"

Write-Host "ALL_DONE"
