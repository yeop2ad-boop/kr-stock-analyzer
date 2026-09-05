# 국내(KOSPI200 + KOSDAQ150) 섹터맵 데이터 수집 스크립트
# data/kr-universe.json(내투자닷컴 본체의 KODEX 200/코스닥150 편입종목 리스트)을 읽어,
# 종목별로 Yahoo Finance에서 (1)가격/거래량 (2)섹터 (3)재무제표 3종을 조회해 병합한다.
# 미국판과 달리 지역 스크리너가 없어 종목당 3회씩 개별 호출 — 350종목 x 3 = 1050회, 시간이 꽤 걸림.

$ProgressPreference = 'SilentlyContinue'
$headers = @{ "User-Agent" = "Mozilla/5.0" }

# Yahoo가 돌려주는 Morningstar식 섹터명 -> 미국판에서 쓰는 GICS식 섹터명 + 한글 라벨로 통일
# (미국판은 위키피디아 GICS 표기를 쓰고 있어서, 한 지도 안에서 섹터색이 서로 어긋나지 않도록 맞춰줌)
$sectorTranslate = @{
  "Technology"              = @{ gics = "Information Technology";     ko = "기술" }
  "Healthcare"               = @{ gics = "Health Care";                 ko = "헬스케어" }
  "Financial Services"       = @{ gics = "Financials";                  ko = "금융" }
  "Consumer Cyclical"        = @{ gics = "Consumer Discretionary";      ko = "경기소비재" }
  "Consumer Defensive"       = @{ gics = "Consumer Staples";            ko = "필수소비재" }
  "Communication Services"   = @{ gics = "Communication Services";      ko = "커뮤니케이션" }
  "Industrials"              = @{ gics = "Industrials";                 ko = "산업재" }
  "Energy"                   = @{ gics = "Energy";                      ko = "에너지" }
  "Utilities"                = @{ gics = "Utilities";                   ko = "유틸리티" }
  "Real Estate"              = @{ gics = "Real Estate";                 ko = "부동산" }
  "Basic Materials"          = @{ gics = "Materials";                   ko = "소재" }
}

$universe = Get-Content "$PSScriptRoot\..\data\kr-universe.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$tickers = @()
foreach ($it in $universe.kospi200) { $tickers += [PSCustomObject]@{ symbol = $it.symbol; name = $it.name; exchange = "KOSPI" } }
foreach ($it in $universe.kosdaq150) { $tickers += [PSCustomObject]@{ symbol = $it.symbol; name = $it.name; exchange = "KOSDAQ" } }
Write-Host "1) 총 $($tickers.Count)개 종목(KOSPI200+KOSDAQ150) 수집 시작..."

function Get-LatestYoyGrowth($series) {
  if (-not $series -or $series.Count -lt 2) { return $null }
  $sorted = $series | Sort-Object asOfDate
  $last = $sorted[-1].reportedValue.raw
  $prev = $sorted[-2].reportedValue.raw
  if ($null -eq $last -or $null -eq $prev -or $prev -eq 0) { return $null }
  return [math]::Round((($last - $prev) / [math]::Abs($prev)) * 100, 2)
}
function Get-LatestValue($series) {
  if (-not $series -or $series.Count -lt 1) { return $null }
  $sorted = $series | Sort-Object asOfDate
  return $sorted[-1].reportedValue.raw
}
# 분기 YoY 증가율(2026-09-05): 최신 분기 vs 전년 동기(4분기 전) — 야후가 분기 데이터를 5개까지만 주므로
# TTM 합산 대신 이 방식. 분기 5개 미만이면 연간 YoY 폴백.
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

$now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$fiveYearsAgo = $now - 5 * 365 * 24 * 3600

# 직전 수집본 로드 — 재시도 후에도 실패한 종목은 null로 비우지 않고 마지막 성공값을 유지
# (2026-08-31: 단일 시도+null 폴백 구조 때문에 48종목이 marketCap null이 되어 지도에서 통째로 빠졌던 문제 재발 방지)
$prevMap = @{}
try {
  $prevData = Get-Content "$PSScriptRoot\..\data\kr-sectors.json" -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach ($p in $prevData.companies) { $prevMap[$p.symbol] = $p }
} catch {}

$result = @()
$done = 0
$failed = 0
foreach ($t in $tickers) {
  $sym = $t.symbol
  $entry = $null
  for ($attempt = 1; $attempt -le 3; $attempt++) {
  try {
    # (1) 가격/거래량
    $chart = Invoke-RestMethod -Uri "https://query1.finance.yahoo.com/v8/finance/chart/$sym`?range=5d&interval=1d" -Headers $headers -TimeoutSec 15
    $meta = $chart.chart.result[0].meta
    $price = $meta.regularMarketPrice
    $prevClose = $meta.chartPreviousClose
    $volume = $meta.regularMarketVolume
    $changePercent = $null
    if ($price -and $prevClose -and $prevClose -ne 0) {
      $changePercent = [math]::Round((($price - $prevClose) / $prevClose) * 100, 2)
    }

    # (1-1) 배당률 — 최근 1년 배당 이벤트 합계 ÷ 현재가(%). 배당 이벤트 없으면 무배당 0%로 확정
    $dividendYield = $null
    try {
      $divChart = Invoke-RestMethod -Uri "https://query1.finance.yahoo.com/v8/finance/chart/$sym`?range=1y&interval=1mo&events=div" -Headers $headers -TimeoutSec 15
      $divPrice = $divChart.chart.result[0].meta.regularMarketPrice
      if ($divPrice -and $divPrice -gt 0) {
        $divSum = 0.0
        $divEvents = $divChart.chart.result[0].events.dividends
        if ($divEvents) {
          foreach ($p in $divEvents.PSObject.Properties) {
            if ($p.Value.amount) { $divSum += [double]$p.Value.amount }
          }
        }
        $dividendYield = [math]::Round(($divSum / $divPrice) * 100, 2)
      }
    } catch {}

    # (2) 섹터
    $search = Invoke-RestMethod -Uri "https://query1.finance.yahoo.com/v1/finance/search?q=$sym&quotesCount=1&newsCount=0" -Headers $headers -TimeoutSec 15
    $q = $search.quotes[0]
    $sectorRaw = $q.sectorDisp
    $sectorInfo = $sectorTranslate[$sectorRaw]
    $sectorGics = if ($sectorInfo) { $sectorInfo.gics } else { "Industrials" }
    $sectorKo = if ($sectorInfo) { $sectorInfo.ko } else { "산업재" }

    # (3) 재무제표(매출/순이익/영업현금흐름/발행주식수/EPS)
    $fund = Invoke-RestMethod -Uri "https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/$sym`?type=quarterlyTotalRevenue,quarterlyNetIncome,quarterlyOperatingCashFlow,annualTotalRevenue,annualNetIncome,annualOperatingCashFlow,annualShareIssued,annualBasicEPS&period1=$fiveYearsAgo&period2=$now&merge=false&lang=en-US&region=US" -Headers $headers -TimeoutSec 15
    $blocks = $fund.timeseries.result
    $revSeries = ($blocks | Where-Object { $_.annualTotalRevenue }).annualTotalRevenue
    $niSeries = ($blocks | Where-Object { $_.annualNetIncome }).annualNetIncome
    $cfSeries = ($blocks | Where-Object { $_.annualOperatingCashFlow }).annualOperatingCashFlow
    $revQ = ($blocks | Where-Object { $_.quarterlyTotalRevenue }).quarterlyTotalRevenue
    $niQ = ($blocks | Where-Object { $_.quarterlyNetIncome }).quarterlyNetIncome
    $cfQ = ($blocks | Where-Object { $_.quarterlyOperatingCashFlow }).quarterlyOperatingCashFlow
    $shareSeries = ($blocks | Where-Object { $_.annualShareIssued }).annualShareIssued
    $epsSeries = ($blocks | Where-Object { $_.annualBasicEPS }).annualBasicEPS

    $shares = Get-LatestValue $shareSeries
    $eps = Get-LatestValue $epsSeries
    $marketCap = $null
    if ($price -and $shares) { $marketCap = $price * $shares }
    $per = $null
    if ($price -and $eps -and $eps -gt 0) { $per = [math]::Round($price / $eps, 2) }

    if ($null -eq $marketCap) { throw "marketCap null (발행주식수 조회 실패)" }
    $entry = [PSCustomObject]@{
      symbol         = $sym
      name           = $t.name
      exchange       = $t.exchange
      sector         = $sectorGics
      sectorKo       = $sectorKo
      currency       = "KRW"
      marketCap      = $marketCap
      changePercent  = $changePercent
      per            = $per
      eps            = $eps
      dividendYield  = $dividendYield
      dollarVolume   = $(if ($price -and $volume) { $price * $volume } else { $null })
      revenueGrowth  = Get-TtmGrowth $revQ $revSeries
      netIncomeGrowth = Get-TtmGrowth $niQ $niSeries
      cashFlowGrowth = Get-TtmGrowth $cfQ $cfSeries
    }
    break
  } catch {
    Start-Sleep -Milliseconds (500 * $attempt)
  }
  } # 재시도 루프 끝
  if ($entry) {
    $result += $entry
  } elseif ($prevMap[$sym]) {
    # 3회 재시도 후에도 실패 — 직전 수집본의 마지막 성공값을 그대로 유지(지도에서 종목이 사라지는 것 방지)
    $failed++
    $result += $prevMap[$sym]
  } else {
    $failed++
    $result += [PSCustomObject]@{
      symbol = $sym; name = $t.name; exchange = $t.exchange
      sector = "Industrials"; sectorKo = "산업재"; currency = "KRW"
      marketCap = $null; changePercent = $null; per = $null; eps = $null; dividendYield = $null
      dollarVolume = $null; revenueGrowth = $null; netIncomeGrowth = $null; cashFlowGrowth = $null
    }
  }
  $done++
  if ($done % 25 -eq 0) { Write-Host "   - $done / $($tickers.Count) 완료 (실패 $failed)" }
  Start-Sleep -Milliseconds 80
}

Write-Host "   -> 완료: $done 건, 실패: $failed 건"

$output = [PSCustomObject]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  count       = $result.Count
  companies   = $result
}
$output | ConvertTo-Json -Depth 6 | Set-Content -Path "$PSScriptRoot\..\data\kr-sectors.json" -Encoding utf8
Write-Host "완료: data/kr-sectors.json"
