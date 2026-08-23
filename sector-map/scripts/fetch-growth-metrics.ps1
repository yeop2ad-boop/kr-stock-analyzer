# 매출액/현금흐름/순이익 증가율(YoY, 최근 연간 실적 기준) 수집 스크립트
# 내투자닷컴 본체(app.js getFullMetrics/latestAnnualGrowth)와 같은 방식 — 종목별 fundamentals-timeseries를 하나씩 조회해서
# annualTotalRevenue / annualOperatingCashFlow / annualNetIncome 시계열의 최근 두 해를 비교해 증가율을 구한다.
# data/sp500-sectors.json 을 읽어 종목 목록을 얻고, 증가율 필드를 덧붙여 다시 저장한다.
# 종목당 1회 호출 x 489종목이라 몇 분 정도 걸림 — 실행 빈도는 하루 1회(스케줄 잡)면 충분.

$ProgressPreference = 'SilentlyContinue'
$headers = @{ "User-Agent" = "Mozilla/5.0" }
$dataPath = "$PSScriptRoot\..\data\sp500-sectors.json"

$data = Get-Content -Path $dataPath -Raw -Encoding UTF8 | ConvertFrom-Json
$companies = $data.companies
Write-Host "1) $($companies.Count)개 종목의 매출액/현금흐름/순이익 증가율 조회 시작..."

$now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$fiveYearsAgo = $now - 5 * 365 * 24 * 3600

function Get-LatestYoyGrowth($series) {
  if (-not $series -or $series.Count -lt 2) { return $null }
  $sorted = $series | Sort-Object asOfDate
  $last = $sorted[-1].reportedValue.raw
  $prev = $sorted[-2].reportedValue.raw
  if ($null -eq $last -or $null -eq $prev -or $prev -eq 0) { return $null }
  return [math]::Round((($last - $prev) / [math]::Abs($prev)) * 100, 2)
}

$done = 0
$failed = 0
foreach ($c in $companies) {
  $sym = $c.symbol
  try {
    $url = "https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/$sym`?type=annualTotalRevenue,annualNetIncome,annualOperatingCashFlow&period1=$fiveYearsAgo&period2=$now&merge=false&lang=en-US&region=US"
    $resp = Invoke-RestMethod -Uri $url -Headers $headers -TimeoutSec 15
    $blocks = $resp.timeseries.result

    $revSeries = ($blocks | Where-Object { $_.annualTotalRevenue }).annualTotalRevenue
    $niSeries = ($blocks | Where-Object { $_.annualNetIncome }).annualNetIncome
    $cfSeries = ($blocks | Where-Object { $_.annualOperatingCashFlow }).annualOperatingCashFlow

    $c | Add-Member -NotePropertyName revenueGrowth -NotePropertyValue (Get-LatestYoyGrowth $revSeries) -Force
    $c | Add-Member -NotePropertyName netIncomeGrowth -NotePropertyValue (Get-LatestYoyGrowth $niSeries) -Force
    $c | Add-Member -NotePropertyName cashFlowGrowth -NotePropertyValue (Get-LatestYoyGrowth $cfSeries) -Force
  } catch {
    $failed++
    $c | Add-Member -NotePropertyName revenueGrowth -NotePropertyValue $null -Force
    $c | Add-Member -NotePropertyName netIncomeGrowth -NotePropertyValue $null -Force
    $c | Add-Member -NotePropertyName cashFlowGrowth -NotePropertyValue $null -Force
  }
  $done++
  if ($done % 50 -eq 0) { Write-Host "   - $done / $($companies.Count) 완료 (실패 $failed)" }
  Start-Sleep -Milliseconds 90
}

Write-Host "   -> 완료: $done 건, 실패: $failed 건"

$data.companies = $companies
$data | Add-Member -NotePropertyName growthUpdatedAt -NotePropertyValue ((Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")) -Force
$data | ConvertTo-Json -Depth 6 | Set-Content -Path $dataPath -Encoding utf8
Write-Host "완료: data/sp500-sectors.json 에 증가율 필드 추가됨"
