# 코스피200 구성종목 대조(네이버)에서 유일하게 빠져 있던 한화(000880.KS)를 유니버스+지도 데이터에 추가하는 1회성 스크립트
$ProgressPreference = 'SilentlyContinue'
$headers = @{ "User-Agent" = "Mozilla/5.0" }
$sym = "000880.KS"
$dir = "$PSScriptRoot\.."

$sectorTranslate = @{
  "Technology" = @{ gics = "Information Technology"; ko = "기술" }
  "Healthcare" = @{ gics = "Health Care"; ko = "헬스케어" }
  "Financial Services" = @{ gics = "Financials"; ko = "금융" }
  "Consumer Cyclical" = @{ gics = "Consumer Discretionary"; ko = "경기소비재" }
  "Consumer Defensive" = @{ gics = "Consumer Staples"; ko = "필수소비재" }
  "Communication Services" = @{ gics = "Communication Services"; ko = "커뮤니케이션" }
  "Industrials" = @{ gics = "Industrials"; ko = "산업재" }
  "Energy" = @{ gics = "Energy"; ko = "에너지" }
  "Utilities" = @{ gics = "Utilities"; ko = "유틸리티" }
  "Real Estate" = @{ gics = "Real Estate"; ko = "부동산" }
  "Basic Materials" = @{ gics = "Materials"; ko = "소재" }
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

$now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$fiveYearsAgo = $now - 5 * 365 * 24 * 3600

$chart = Invoke-RestMethod -Uri "https://query1.finance.yahoo.com/v8/finance/chart/$sym`?range=5d&interval=1d" -Headers $headers -TimeoutSec 20
$meta = $chart.chart.result[0].meta
$price = $meta.regularMarketPrice
$prevClose = $meta.chartPreviousClose
$volume = $meta.regularMarketVolume
$changePercent = $null
if ($price -and $prevClose -and $prevClose -ne 0) { $changePercent = [math]::Round((($price - $prevClose) / $prevClose) * 100, 2) }

$dividendYield = $null
try {
  $divChart = Invoke-RestMethod -Uri "https://query1.finance.yahoo.com/v8/finance/chart/$sym`?range=1y&interval=1mo&events=div" -Headers $headers -TimeoutSec 20
  $divPrice = $divChart.chart.result[0].meta.regularMarketPrice
  if ($divPrice -and $divPrice -gt 0) {
    $divSum = 0.0
    $divEvents = $divChart.chart.result[0].events.dividends
    if ($divEvents) { foreach ($p in $divEvents.PSObject.Properties) { if ($p.Value.amount) { $divSum += [double]$p.Value.amount } } }
    $dividendYield = [math]::Round(($divSum / $divPrice) * 100, 2)
  }
} catch {}

$search = Invoke-RestMethod -Uri "https://query1.finance.yahoo.com/v1/finance/search?q=$sym&quotesCount=1&newsCount=0" -Headers $headers -TimeoutSec 20
$sectorRaw = $search.quotes[0].sectorDisp
$sectorInfo = $sectorTranslate[$sectorRaw]
$sectorGics = if ($sectorInfo) { $sectorInfo.gics } else { "Industrials" }
$sectorKo = if ($sectorInfo) { $sectorInfo.ko } else { "산업재" }

$fund = Invoke-RestMethod -Uri "https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/$sym`?type=annualTotalRevenue,annualNetIncome,annualOperatingCashFlow,annualShareIssued,annualBasicEPS&period1=$fiveYearsAgo&period2=$now&merge=false&lang=en-US&region=US" -Headers $headers -TimeoutSec 20
$blocks = $fund.timeseries.result
$shares = Get-LatestValue (($blocks | Where-Object { $_.annualShareIssued }).annualShareIssued)
$eps = Get-LatestValue (($blocks | Where-Object { $_.annualBasicEPS }).annualBasicEPS)
$marketCap = $null
if ($price -and $shares) { $marketCap = $price * $shares }
$per = $null
if ($price -and $eps -and $eps -gt 0) { $per = [math]::Round($price / $eps, 2) }

$entry = [PSCustomObject]@{
  symbol = $sym; name = "한화"; exchange = "KOSPI"; sector = $sectorGics; sectorKo = $sectorKo; currency = "KRW"
  marketCap = $marketCap; changePercent = $changePercent; per = $per; eps = $eps; dividendYield = $dividendYield
  dollarVolume = $(if ($price -and $volume) { $price * $volume } else { $null })
  revenueGrowth = Get-LatestYoyGrowth (($blocks | Where-Object { $_.annualTotalRevenue }).annualTotalRevenue)
  netIncomeGrowth = Get-LatestYoyGrowth (($blocks | Where-Object { $_.annualNetIncome }).annualNetIncome)
  cashFlowGrowth = Get-LatestYoyGrowth (($blocks | Where-Object { $_.annualOperatingCashFlow }).annualOperatingCashFlow)
}
Write-Output ("한화 조회: cap=" + $marketCap + " chg=" + $changePercent + " sector=" + $sectorGics)
if ($null -eq $marketCap) { Write-Output "marketCap 없음 - 중단"; exit 1 }

# 1) kr-sectors.json에 추가(이미 있으면 갱신)
$secPath = "$dir\data\kr-sectors.json"
$sec = Get-Content $secPath -Raw -Encoding UTF8 | ConvertFrom-Json
$exists = $sec.companies | Where-Object symbol -eq $sym
if ($exists) {
  foreach ($p in $entry.PSObject.Properties) { $exists | Add-Member -NotePropertyName $p.Name -NotePropertyValue $p.Value -Force }
} else {
  $sec.companies += $entry
  $sec.count = $sec.companies.Count
}
$sec | ConvertTo-Json -Depth 6 | Set-Content -Path $secPath -Encoding utf8

# 2) kr-data-extra.js에 추가
$extraPath = "$dir\data\kr-data-extra.js"
$t = Get-Content $extraPath -Raw -Encoding UTF8
$prefix = "const KR_EXTRA_DATA = "
$jsonStart = $t.IndexOf("{", $t.IndexOf($prefix))
$jsonText = $t.Substring($jsonStart).TrimEnd()
if ($jsonText.EndsWith(";")) { $jsonText = $jsonText.Substring(0, $jsonText.Length - 1) }
$extra = $jsonText | ConvertFrom-Json
if (-not ($extra.companies | Where-Object symbol -eq $sym)) {
  $extra.companies += $entry
  Set-Content -Path $extraPath -Value ($prefix + ($extra | ConvertTo-Json -Depth 6) + ";") -Encoding utf8
  Write-Output "kr-data-extra.js 추가 완료"
} else { Write-Output "kr-data-extra.js 이미 존재" }

# 3) 유니버스 2개 파일에 추가
foreach ($uPath in @("$dir\..\data\kr-universe-kospi200-kosdaq150.json", "$dir\data\kr-universe.json")) {
  $u = Get-Content $uPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if (-not ($u.kospi200 | Where-Object symbol -eq $sym)) {
    $u.kospi200 += [PSCustomObject]@{ symbol = $sym; name = "한화" }
    $u | ConvertTo-Json -Depth 6 | Set-Content -Path $uPath -Encoding utf8
    Write-Output ($uPath + " 추가 완료 (kospi200=" + $u.kospi200.Count + ")")
  } else { Write-Output ($uPath + " 이미 존재") }
}
Write-Output "DONE"

