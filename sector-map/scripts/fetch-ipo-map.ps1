# IPO 전용 마켓맵 데이터 수집(2026-09-11 사용자 요청)
#
# "IPO 기업들만 따로 12개 지표를 정리해 마켓맵에 넣어줘(한국IPO, 미국IPO)"
# data/ipo-list.json(최근 5년 신규 상장)에서 스팩·이전상장을 뺀 종목을 대상으로,
# 지도 필터 칩 12가지가 쓰는 필드를 코스피200·S&P500 지도와 똑같은 계산식으로 채운다.
#
#   10년승률 winRateScore / 연평균상승 ret10yAvg / RSI rsiWeekly      <- 월봉·주봉(fetch-winrate-scores.ps1과 동일)
#   등락률 changePercent / 거래대금 dollarVolume / 52주최저 week52RangePct <- 일봉·요약
#   매출성장 revenueGrowth / 순이익증가 netIncomeGrowth / 현금흐름 cashFlowGrowth / 부채비율 debtRatio
#                                                                    <- fundamentals-timeseries(분기 YoY, fetch-growth-metrics.ps1과 동일)
#   PER per / 배당률 dividendYield                                    <- quoteSummary summaryDetail
#
# 결과: sector-map/data/ipo-map.js  (IPO_MAP_DATA = { kr: {companies:[...]}, us: {companies:[...]} })

param(
  [switch]$SkipKr,
  [switch]$SkipUs,
  [int]$Limit = 0   # 0이면 전체(테스트용으로 줄여 돌릴 때 사용)
)

$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = "Stop"
$UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
$headers = @{ "User-Agent" = $UA }
$scriptDir = $PSScriptRoot
$mapDataDir = Join-Path (Split-Path $scriptDir -Parent) "data"
$rootDataDir = Join-Path (Split-Path (Split-Path $scriptDir -Parent) -Parent) "data"

# ---------- 공용 계산기(기존 배치와 같은 공식) ----------
function Get-SortedClosePairs($resp) {
  $res = $resp.chart.result[0]
  if (-not $res) { return @() }
  $ts = $res.timestamp; $cl = $res.indicators.quote[0].close
  if (-not $ts -or -not $cl) { return @() }
  $pairs = @()
  for ($i = 0; $i -lt $ts.Count; $i++) { if ($null -ne $cl[$i]) { $pairs += [PSCustomObject]@{ t = [int64]$ts[$i]; c = [double]$cl[$i] } } }
  return @($pairs | Sort-Object t)
}
# 와일더 RSI(14) — 본체 computeWilderRsi와 동일
function Compute-WilderRsi($closes, $period) {
  if (-not $closes -or $closes.Count -lt ($period + 1)) { return $null }
  $gain = 0.0; $loss = 0.0
  for ($i = 1; $i -le $period; $i++) {
    $d = $closes[$i] - $closes[$i - 1]
    if ($d -gt 0) { $gain += $d } else { $loss -= $d }
  }
  $avgGain = $gain / $period; $avgLoss = $loss / $period
  for ($i = $period + 1; $i -lt $closes.Count; $i++) {
    $d = $closes[$i] - $closes[$i - 1]
    $g = 0.0; $l = 0.0
    if ($d -gt 0) { $g = $d } else { $l = -$d }
    $avgGain = ($avgGain * ($period - 1) + $g) / $period
    $avgLoss = ($avgLoss * ($period - 1) + $l) / $period
  }
  if ($avgLoss -eq 0) { return 100.0 }
  return [Math]::Round(100.0 - 100.0 / (1.0 + $avgGain / $avgLoss), 1)
}
# 분기 YoY 증가율(분기 5개 미만이면 연간 YoY 폴백) — fetch-growth-metrics.ps1과 동일
function Get-YoyGrowth($qSeries, $aSeries) {
  $q = @()
  if ($qSeries) { $q = @($qSeries | Where-Object { $null -ne $_.reportedValue.raw } | Sort-Object asOfDate) }
  if ($q.Count -ge 5) {
    $lastV = [double]$q[$q.Count - 1].reportedValue.raw
    $prevV = [double]$q[$q.Count - 5].reportedValue.raw
    if ($prevV -ne 0) { return [Math]::Round((($lastV - $prevV) / [Math]::Abs($prevV)) * 100, 2) }
  }
  $a = @()
  if ($aSeries) { $a = @($aSeries | Where-Object { $null -ne $_.reportedValue.raw } | Sort-Object asOfDate) }
  if ($a.Count -ge 2) {
    $lastV = [double]$a[$a.Count - 1].reportedValue.raw
    $prevV = [double]$a[$a.Count - 2].reportedValue.raw
    if ($prevV -ne 0) { return [Math]::Round((($lastV - $prevV) / [Math]::Abs($prevV)) * 100, 2) }
  }
  return $null
}
# 야후가 가끔 PER 등을 무한대로 준다. 그대로 두면 PowerShell이 JSON에 Infinity를 그대로 써서
# JSON.parse가 깨진다(스크립트 태그로는 읽히지만 fetch+파싱하는 S리포트 쪽이 통째로 실패).
function Use-Finite($v) {
  if ($null -eq $v) { return $null }
  $d = [double]$v
  if ([double]::IsNaN($d) -or [double]::IsInfinity($d)) { return $null }
  return $d
}

function Get-LatestRaw($series) {
  if (-not $series) { return $null }
  $s = @($series | Where-Object { $null -ne $_.reportedValue.raw } | Sort-Object asOfDate)
  if ($s.Count -eq 0) { return $null }
  return [double]$s[$s.Count - 1].reportedValue.raw
}

# 야후 섹터명 -> 지도에서 쓰는 한글 섹터(코스피200·S&P500 지도와 같은 11종)
$SECTOR_KO = @{
  "Technology" = "기술"; "Information Technology" = "기술"
  "Financial Services" = "금융"; "Financials" = "금융"
  "Healthcare" = "헬스케어"; "Health Care" = "헬스케어"
  "Consumer Cyclical" = "경기소비재"; "Consumer Discretionary" = "경기소비재"
  "Consumer Defensive" = "필수소비재"; "Consumer Staples" = "필수소비재"
  "Communication Services" = "커뮤니케이션"
  "Industrials" = "산업재"; "Basic Materials" = "소재"; "Materials" = "소재"
  "Energy" = "에너지"; "Utilities" = "유틸리티"; "Real Estate" = "부동산"
}

# 야후 quoteSummary는 쿠키+crumb 인증이 필요하다
$ySession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
try { Invoke-WebRequest "https://fc.yahoo.com" -WebSession $ySession -UserAgent $UA -TimeoutSec 20 -UseBasicParsing -ErrorAction SilentlyContinue | Out-Null } catch { }
$crumb = (Invoke-WebRequest "https://query1.finance.yahoo.com/v1/test/getcrumb" -WebSession $ySession -UserAgent $UA -TimeoutSec 20 -UseBasicParsing).Content
if (-not $crumb -or $crumb.Length -gt 30) { throw "야후 crumb을 받지 못했습니다: [$crumb]" }
Write-Host "crumb=$crumb"

$now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$fiveYearsAgo = $now - 5 * 365 * 24 * 3600

function Build-Company($row) {
  $sym = $row.symbol
  $c = [ordered]@{
    symbol = $sym; name = $row.name; displayName = $row.name
    sector = "Unknown"; sectorKo = "기타"
    currency = $row.currency; marketCap = $row.marketCap
    pricedDate = $row.pricedDate
  }

  # ---- 월봉: 10년승률 + 연평균 상승(CAGR) ----
  try {
    $mo = Invoke-RestMethod "https://query1.finance.yahoo.com/v8/finance/chart/$([uri]::EscapeDataString($sym))?range=11y&interval=1mo" -Headers $headers -TimeoutSec 30
    $sorted = @(Get-SortedClosePairs $mo)
    if ($sorted.Count -gt 1) {
      # 진행 중인 이번 달 봉은 빼고 센다(아직 안 끝난 달이라 승패 판정이 뒤집힐 수 있음)
      $lastDate = [DateTimeOffset]::FromUnixTimeSeconds($sorted[$sorted.Count - 1].t)
      if ($lastDate.Year -eq ([DateTimeOffset]::UtcNow).Year -and $lastDate.Month -eq ([DateTimeOffset]::UtcNow).Month -and $sorted.Count -gt 2) {
        $sorted = $sorted[0..($sorted.Count - 2)]
      }
      if ($sorted.Count -gt 121) { $sorted = $sorted[($sorted.Count - 121)..($sorted.Count - 1)] }
      $up = 0
      for ($i = 1; $i -lt $sorted.Count; $i++) { if ($sorted[$i].c - $sorted[$i - 1].c -gt 0) { $up++ } }
      $total = $sorted.Count - 1
      if ($total -ge 6) { $c.winRateScore = [Math]::Round($up / $total * 100, 1) }
      if ($total -ge 12 -and $sorted[0].c -gt 0) {
        $ratio = $sorted[$sorted.Count - 1].c / $sorted[0].c
        if ($ratio -gt 0) { $c.ret10yAvg = [Math]::Round(([Math]::Pow($ratio, 12.0 / $total) - 1.0) * 100.0, 1) }
      }
    }
  } catch { }
  Start-Sleep -Milliseconds 80

  # ---- 주봉: RSI(14) ----
  try {
    $wk = Invoke-RestMethod "https://query1.finance.yahoo.com/v8/finance/chart/$([uri]::EscapeDataString($sym))?range=5y&interval=1wk" -Headers $headers -TimeoutSec 30
    $closes = @((Get-SortedClosePairs $wk) | ForEach-Object { $_.c })
    $rsi = Compute-WilderRsi $closes 14
    if ($null -ne $rsi) { $c.rsiWeekly = $rsi }
  } catch { }
  Start-Sleep -Milliseconds 80

  # ---- 요약: 등락률·거래대금·52주 구간·PER·배당률·섹터 ----
  try {
    $u = "https://query2.finance.yahoo.com/v10/finance/quoteSummary/$sym`?modules=summaryDetail,price,assetProfile&crumb=" + [uri]::EscapeDataString($crumb)
    $qs = Invoke-RestMethod $u -WebSession $ySession -UserAgent $UA -TimeoutSec 25
    $res = $qs.quoteSummary.result[0]
    $sd = $res.summaryDetail; $pr = $res.price; $ap = $res.assetProfile
    if ($null -ne $pr.regularMarketChangePercent.raw) { $c.changePercent = [Math]::Round([double]$pr.regularMarketChangePercent.raw * 100, 2) }
    if ($null -ne $pr.marketCap.raw) { $c.marketCap = [double]$pr.marketCap.raw }
    $peRaw = Use-Finite $sd.trailingPE.raw
    if ($null -ne $peRaw) { $c.per = [Math]::Round($peRaw, 2) }
    if ($null -ne $sd.dividendYield.raw) {
      # 야후가 어떤 종목은 비율(0.0063), 어떤 종목은 이미 %(0.63)로 준다 — 1 미만이면 비율로 보고 환산
      $dy = [double]$sd.dividendYield.raw
      if ($dy -lt 1) { $dy = $dy * 100 }
      $c.dividendYield = [Math]::Round($dy, 2)
    }
    $price = $pr.regularMarketPrice.raw
    $vol = $sd.averageVolume.raw
    if ($null -ne $price -and $null -ne $vol) { $c.dollarVolume = [Math]::Round([double]$price * [double]$vol) }
    $hi = $sd.fiftyTwoWeekHigh.raw; $lo = $sd.fiftyTwoWeekLow.raw
    if ($null -ne $hi -and $null -ne $lo -and $null -ne $price -and ($hi - $lo) -gt 0) {
      $c.week52RangePct = [Math]::Round((([double]$price - [double]$lo) / ([double]$hi - [double]$lo)) * 100, 1)
    }
    $sec = ($ap.sector + "").Trim()
    if ($sec) { $c.sector = $sec; if ($SECTOR_KO.ContainsKey($sec)) { $c.sectorKo = $SECTOR_KO[$sec] } }
  } catch { }
  Start-Sleep -Milliseconds 80

  # ---- 재무: 매출성장·순이익증가·현금흐름·부채비율 ----
  try {
    $types = "quarterlyTotalRevenue,quarterlyNetIncome,quarterlyOperatingCashFlow,annualTotalRevenue,annualNetIncome,annualOperatingCashFlow,quarterlyTotalLiabilitiesNetMinorityInterest,quarterlyStockholdersEquity,quarterlyOperatingIncome"
    $fu = "https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/$sym`?type=$types&period1=$fiveYearsAgo&period2=$now&merge=false&lang=en-US&region=US"
    $f = Invoke-RestMethod $fu -Headers $headers -TimeoutSec 25
    $b = $f.timeseries.result
    $rg = Get-YoyGrowth ($b | Where-Object { $_.quarterlyTotalRevenue }).quarterlyTotalRevenue ($b | Where-Object { $_.annualTotalRevenue }).annualTotalRevenue
    $ng = Get-YoyGrowth ($b | Where-Object { $_.quarterlyNetIncome }).quarterlyNetIncome ($b | Where-Object { $_.annualNetIncome }).annualNetIncome
    $cg = Get-YoyGrowth ($b | Where-Object { $_.quarterlyOperatingCashFlow }).quarterlyOperatingCashFlow ($b | Where-Object { $_.annualOperatingCashFlow }).annualOperatingCashFlow
    if ($null -ne $rg) { $c.revenueGrowth = $rg }
    if ($null -ne $ng) { $c.netIncomeGrowth = $ng }
    if ($null -ne $cg) { $c.cashFlowGrowth = $cg }
    $liab = Get-LatestRaw ($b | Where-Object { $_.quarterlyTotalLiabilitiesNetMinorityInterest }).quarterlyTotalLiabilitiesNetMinorityInterest
    $eq = Get-LatestRaw ($b | Where-Object { $_.quarterlyStockholdersEquity }).quarterlyStockholdersEquity
    if ($null -ne $liab -and $eq -and $eq -ne 0) { $c.debtRatio = [Math]::Round(($liab / $eq) * 100, 1) }
    # S리포트가 쓰는 영업이익률·ROE — fetch-financial-ratios.ps1과 같은 공식(최신 분기 기준)
    $opInc = Get-LatestRaw ($b | Where-Object { $_.quarterlyOperatingIncome }).quarterlyOperatingIncome
    $rev = Get-LatestRaw ($b | Where-Object { $_.quarterlyTotalRevenue }).quarterlyTotalRevenue
    $ni = Get-LatestRaw ($b | Where-Object { $_.quarterlyNetIncome }).quarterlyNetIncome
    if ($null -ne $opInc -and $rev -and $rev -ne 0) { $c.operatingMargin = [Math]::Round(($opInc / $rev) * 100, 1) }
    if ($null -ne $ni -and $eq -and $eq -ne 0) { $c.roe = [Math]::Round(($ni / $eq) * 100, 1) }
  } catch { }

  return [PSCustomObject]$c
}

# ---------- 대상 종목 ----------
$ipo = Get-Content (Join-Path $rootDataDir "ipo-list.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$out = @{}
$prevPath = Join-Path $mapDataDir "ipo-map.js"
foreach ($side in @("kr", "us")) {
  if ($side -eq "kr" -and $SkipKr) { continue }
  if ($side -eq "us" -and $SkipUs) { continue }
  # 지도에 올릴 건 실제 사업을 하는 신규 상장사만 — 스팩(껍데기)과 이전상장(오래된 회사)은 뺀다
  $rows = @($ipo.$side | Where-Object { -not $_.isSpac -and -not $_.isRelisted -and $_.marketCap })
  $rows = @($rows | Sort-Object -Property @{ Expression = { [double]$_.marketCap }; Descending = $true })
  if ($Limit -gt 0) { $rows = @($rows | Select-Object -First $Limit) }
  Write-Host ("{0}: {1}종목" -f $side, $rows.Count)
  $list = @()
  $i = 0
  foreach ($r in $rows) {
    $i++
    $list += Build-Company $r
    if ($i % 25 -eq 0) { Write-Host ("   진행 {0}/{1}" -f $i, $rows.Count) }
  }
  $out[$side] = $list
  Write-Host ("   -> {0} 완료 {1}종목" -f $side, $list.Count)
}

# 한쪽만 돌렸으면 반대쪽은 기존 파일에서 살린다
if (($SkipKr -or $SkipUs) -and (Test-Path $prevPath)) {
  $txt = Get-Content $prevPath -Raw -Encoding UTF8
  $json = $txt -replace '^\s*const\s+IPO_MAP_DATA\s*=\s*', '' -replace ';\s*$', ''
  try {
    $prev = $json | ConvertFrom-Json
    if ($SkipKr -and $prev.kr) { $out["kr"] = @($prev.kr.companies) }
    if ($SkipUs -and $prev.us) { $out["us"] = @($prev.us.companies) }
  } catch { }
}

$payload = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  kr          = [ordered]@{ companies = @($out["kr"]) }
  us          = [ordered]@{ companies = @($out["us"]) }
}
$js = "const IPO_MAP_DATA = " + ($payload | ConvertTo-Json -Depth 6 -Compress) + ";"
Set-Content (Join-Path $mapDataDir "ipo-map.js") $js -Encoding UTF8
Write-Host ("저장 -> sector-map/data/ipo-map.js (한국 {0} · 미국 {1})" -f @($out["kr"]).Count, @($out["us"]).Count)
