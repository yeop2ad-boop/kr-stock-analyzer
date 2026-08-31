# kr-sectors.json에서 marketCap이 null인(수집 당시 Yahoo 조회 실패) 종목만 골라 재조회해 채우는 패치 스크립트.
# fetch-kr-data.ps1과 동일한 3종 호출(차트/섹터검색/재무제표) + 재시도 3회. 끝나면 regenerate-core-extra.ps1 실행 필요.

$ProgressPreference = 'SilentlyContinue'
$headers = @{ "User-Agent" = "Mozilla/5.0" }

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

$dataPath = "$PSScriptRoot\..\data\kr-sectors.json"
$data = Get-Content $dataPath -Raw -Encoding UTF8 | ConvertFrom-Json
$targets = @($data.companies | Where-Object { $null -eq $_.marketCap -or $_.marketCap -eq 0 })
Write-Output ("재조회 대상: " + $targets.Count + "건")

$now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$fiveYearsAgo = $now - 5 * 365 * 24 * 3600

$fixed = 0
$stillFailed = @()
foreach ($c in $targets) {
  $sym = $c.symbol
  $ok = $false
  for ($attempt = 1; $attempt -le 3; $attempt++) {
    try {
      $chart = Invoke-RestMethod -Uri "https://query1.finance.yahoo.com/v8/finance/chart/$sym`?range=5d&interval=1d" -Headers $headers -TimeoutSec 20
      $meta = $chart.chart.result[0].meta
      $price = $meta.regularMarketPrice
      $prevClose = $meta.chartPreviousClose
      $volume = $meta.regularMarketVolume
      $changePercent = $null
      if ($price -and $prevClose -and $prevClose -ne 0) {
        $changePercent = [math]::Round((($price - $prevClose) / $prevClose) * 100, 2)
      }

      $dividendYield = $null
      try {
        $divChart = Invoke-RestMethod -Uri "https://query1.finance.yahoo.com/v8/finance/chart/$sym`?range=1y&interval=1mo&events=div" -Headers $headers -TimeoutSec 20
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

      $search = Invoke-RestMethod -Uri "https://query1.finance.yahoo.com/v1/finance/search?q=$sym&quotesCount=1&newsCount=0" -Headers $headers -TimeoutSec 20
      $q = $search.quotes[0]
      $sectorRaw = $q.sectorDisp
      $sectorInfo = $sectorTranslate[$sectorRaw]
      $sectorGics = if ($sectorInfo) { $sectorInfo.gics } else { $c.sector }
      $sectorKo = if ($sectorInfo) { $sectorInfo.ko } else { $c.sectorKo }

      $fund = Invoke-RestMethod -Uri "https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/$sym`?type=annualTotalRevenue,annualNetIncome,annualOperatingCashFlow,annualShareIssued,annualBasicEPS&period1=$fiveYearsAgo&period2=$now&merge=false&lang=en-US&region=US" -Headers $headers -TimeoutSec 20
      $blocks = $fund.timeseries.result
      $revSeries = ($blocks | Where-Object { $_.annualTotalRevenue }).annualTotalRevenue
      $niSeries = ($blocks | Where-Object { $_.annualNetIncome }).annualNetIncome
      $cfSeries = ($blocks | Where-Object { $_.annualOperatingCashFlow }).annualOperatingCashFlow
      $shareSeries = ($blocks | Where-Object { $_.annualShareIssued }).annualShareIssued
      $epsSeries = ($blocks | Where-Object { $_.annualBasicEPS }).annualBasicEPS

      $shares = Get-LatestValue $shareSeries
      $eps = Get-LatestValue $epsSeries
      $marketCap = $null
      if ($price -and $shares) { $marketCap = $price * $shares }
      $per = $null
      if ($price -and $eps -and $eps -gt 0) { $per = [math]::Round($price / $eps, 2) }

      if ($null -eq $marketCap) { throw "marketCap still null (shares missing)" }

      $c.sector = $sectorGics
      $c.sectorKo = $sectorKo
      $c.marketCap = $marketCap
      $c.changePercent = $changePercent
      $c.per = $per
      $c.eps = $eps
      $c.dividendYield = $dividendYield
      if ($price -and $volume) { $c.dollarVolume = $price * $volume } else { $c.dollarVolume = $null }
      $c.revenueGrowth = Get-LatestYoyGrowth $revSeries
      $c.netIncomeGrowth = Get-LatestYoyGrowth $niSeries
      $c.cashFlowGrowth = Get-LatestYoyGrowth $cfSeries

      $ok = $true
      break
    } catch {
      Start-Sleep -Milliseconds (600 * $attempt)
    }
  }
  if ($ok) { $fixed++ } else { $stillFailed += $sym }
  Start-Sleep -Milliseconds 250
}

Write-Output ("성공: " + $fixed + "건 / 여전히 실패: " + $stillFailed.Count + "건 [" + ($stillFailed -join ",") + "]")
$data | ConvertTo-Json -Depth 6 | Set-Content -Path $dataPath -Encoding utf8
Write-Output "kr-sectors.json 저장 완료"

