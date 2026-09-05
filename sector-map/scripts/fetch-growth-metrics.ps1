# 매출액/현금흐름/순이익 증가율 수집 스크립트 (2026-09-05 개정: 분기 YoY 기준)
# 종목별 fundamentals-timeseries에서 분기 시계열(quarterly*)을 받아 "최신 분기 vs 전년 동기"로 증가율을 구한다
# — 분기 실적발표가 야후에 반영되는 즉시 다음 갱신에 잡힘. 분기 데이터가 5개 미만이면 연간 YoY로 폴백.
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

# 분기 YoY 증가율: 최신 분기 vs 전년 동기(4분기 전). 야후가 분기 데이터를 최근 5개까지만 주므로
# TTM(4분기 합산) 대신 이 방식 사용 — 분기 실적발표가 야후에 반영되면 다음 갱신에 즉시 잡힘.
# 분기 5개 미만이면 연간 YoY 폴백.
function Get-TtmGrowth($qSeries, $aSeries) {
  $q = @()
  if ($qSeries) { $q = @($qSeries | Where-Object { $null -ne $_.reportedValue.raw } | Sort-Object asOfDate) }
  if ($q.Count -ge 5) {
    $lastV = [double]$q[$q.Count - 1].reportedValue.raw
    $prevV = [double]$q[$q.Count - 5].reportedValue.raw
    if ($prevV -ne 0) { return [math]::Round((($lastV - $prevV) / [math]::Abs($prevV)) * 100, 2) }
  }
  return Get-LatestYoyGrowth $aSeries
}

$done = 0
$failed = 0
foreach ($c in $companies) {
  $sym = $c.symbol
  try {
    $url = "https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/$sym`?type=quarterlyTotalRevenue,quarterlyNetIncome,quarterlyOperatingCashFlow,annualTotalRevenue,annualNetIncome,annualOperatingCashFlow&period1=$fiveYearsAgo&period2=$now&merge=false&lang=en-US&region=US"
    $resp = Invoke-RestMethod -Uri $url -Headers $headers -TimeoutSec 15
    $blocks = $resp.timeseries.result

    $revSeries = ($blocks | Where-Object { $_.annualTotalRevenue }).annualTotalRevenue
    $niSeries = ($blocks | Where-Object { $_.annualNetIncome }).annualNetIncome
    $cfSeries = ($blocks | Where-Object { $_.annualOperatingCashFlow }).annualOperatingCashFlow
    $revQ = ($blocks | Where-Object { $_.quarterlyTotalRevenue }).quarterlyTotalRevenue
    $niQ = ($blocks | Where-Object { $_.quarterlyNetIncome }).quarterlyNetIncome
    $cfQ = ($blocks | Where-Object { $_.quarterlyOperatingCashFlow }).quarterlyOperatingCashFlow

    $c | Add-Member -NotePropertyName revenueGrowth -NotePropertyValue (Get-TtmGrowth $revQ $revSeries) -Force
    $c | Add-Member -NotePropertyName netIncomeGrowth -NotePropertyValue (Get-TtmGrowth $niQ $niSeries) -Force
    $c | Add-Member -NotePropertyName cashFlowGrowth -NotePropertyValue (Get-TtmGrowth $cfQ $cfSeries) -Force
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
