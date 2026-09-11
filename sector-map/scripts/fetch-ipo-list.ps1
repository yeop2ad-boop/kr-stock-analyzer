# 미국 IPO 목록 수집(2026-09-11 사용자 요청)
#
# 출처: 나스닥 공개 IPO 캘린더(api.nasdaq.com/api/ipo/calendar?date=YYYY-MM) — 월 단위로 "가격 결정(priced)"된 IPO를 준다.
# 최근 $MONTHS개월치를 모아 종목별로 상장일·공모가를 기록하고, 야후에서 상장 첫날 종가·현재가·시가총액·10년 승률 계산용
# 월봉 시세를 받아 합친다.
#
# 결과 1: data/ipo-list.json  — 인사이트 "IPO" 화면(최근 5년 목록: 기업명(IPO시기)·IPO 시총·현재 시총(등락률)·투자승률)
# 결과 2: sector-map/scripts/ipo-universe-cache.json — 투자방법 비교의 IPO 전략이 쓰는 원자료(상장일·첫날 종가·월봉)
#
# 주의: 나스닥 캘린더는 미국 상장 IPO만 다루고, 상장 폐지된 종목은 야후 시세가 비어 제외된다.

param(
  [int]$Months = 126,            # 10년 반치(전략용) — 화면은 최근 60개월만 사용
  [switch]$SkipQuotes            # 목록만 빠르게 받아볼 때
)

$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = "Stop"
$headers = @{ "User-Agent" = "Mozilla/5.0"; "Accept" = "application/json" }
$yahooHeaders = @{ "User-Agent" = "Mozilla/5.0" }
$scriptDir = $PSScriptRoot
$rootDataDir = Join-Path (Split-Path (Split-Path $scriptDir -Parent) -Parent) "data"

Write-Host "1) 나스닥 IPO 캘린더 수집(최근 $Months개월)..."
$ipos = @{}   # ticker -> [PSCustomObject]
$now = Get-Date
for ($m = 0; $m -lt $Months; $m++) {
  $d = $now.AddMonths(-$m)
  $key = $d.ToString("yyyy-MM")
  try {
    $r = Invoke-RestMethod -Uri "https://api.nasdaq.com/api/ipo/calendar?date=$key" -Headers $headers -TimeoutSec 30
    $rows = @($r.data.priced.rows)
    foreach ($row in $rows) {
      $t = ($row.proposedTickerSymbol + "").Trim().ToUpper()
      if (-not $t -or $t -match "[^A-Z.\-]") { continue }
      if ($ipos.ContainsKey($t)) { continue }
      $price = 0.0
      [void][double]::TryParse((($row.proposedSharePrice + "") -replace '[^0-9.]', ''), [ref]$price)
      $offered = 0.0
      [void][double]::TryParse((($row.dollarValueOfSharesOffered + "") -replace '[^0-9.]', ''), [ref]$offered)
      $shares = 0.0
      [void][double]::TryParse((($row.sharesOffered + "") -replace '[^0-9.]', ''), [ref]$shares)
      $pd = $null
      try { $pd = [datetime]::Parse($row.pricedDate) } catch { }
      if ($null -eq $pd) { continue }
      $ipos[$t] = [PSCustomObject]@{
        symbol      = $t
        name        = ($row.companyName + "").Trim()
        exchange    = ($row.proposedExchange + "").Trim()
        pricedDate  = $pd.ToString("yyyy-MM-dd")
        offerPrice  = $price
        sharesOffer = $shares
        offerValue  = $offered
      }
    }
    if ($m % 12 -eq 0) { Write-Host ("   {0} 까지 누적 {1}종목" -f $key, $ipos.Count) }
  } catch {
    Write-Host ("   {0} 실패: {1}" -f $key, $_.Exception.Message)
  }
  Start-Sleep -Milliseconds 250
}
Write-Host ("   -> IPO 후보 {0}종목" -f $ipos.Count)

if ($SkipQuotes) {
  $ipos.Values | ConvertTo-Json -Depth 5 -Compress | Set-Content (Join-Path $scriptDir "ipo-raw.json") -Encoding UTF8
  Write-Host "목록만 저장하고 종료(-SkipQuotes)"
  return
}

Write-Host "2) 야후 월봉 시세로 상장 첫날 종가·현재가·승률 계산..."
$out = @()
$series = @{}
$idx = 0
$list = @($ipos.Values | Sort-Object pricedDate -Descending)
foreach ($ipo in $list) {
  $idx++
  try {
    $url = "https://query1.finance.yahoo.com/v8/finance/chart/$([uri]::EscapeDataString($ipo.symbol))?range=15y&interval=1mo"
    $resp = Invoke-RestMethod -Uri $url -Headers $yahooHeaders -TimeoutSec 30
    $res = $resp.chart.result[0]
    if (-not $res) { continue }
    $ts = $res.timestamp; $cl = $res.indicators.quote[0].close
    if (-not $ts -or -not $cl) { continue }
    $pairs = @()
    for ($i = 0; $i -lt $ts.Count; $i++) { if ($null -ne $cl[$i]) { $pairs += [PSCustomObject]@{ t = [int64]$ts[$i]; c = [double]$cl[$i] } } }
    if ($pairs.Count -lt 2) { continue }
    $pairs = @($pairs | Sort-Object t)
    $meta = $res.meta
    $firstClose = $pairs[0].c                      # 상장 첫 월봉 종가 ≈ 상장 첫날 종가
    $price = if ($null -ne $meta.regularMarketPrice) { [double]$meta.regularMarketPrice } else { $pairs[$pairs.Count - 1].c }
    # 월간 승률(최대 120개월)
    $win = 0; $tot = 0
    $from = [Math]::Max(1, $pairs.Count - 120)
    for ($i = $from; $i -lt $pairs.Count; $i++) { $tot++; if ($pairs[$i].c -gt $pairs[$i - 1].c) { $win++ } }
    $winRate = if ($tot -ge 6) { [Math]::Round($win / $tot * 100.0, 1) } else { $null }
    $shares = $null
    if ($null -ne $meta.regularMarketPrice -and $price -gt 0) { $shares = $null }
    $out += [PSCustomObject]@{
      symbol     = $ipo.symbol
      name       = $ipo.name
      exchange   = $ipo.exchange
      pricedDate = $ipo.pricedDate
      offerPrice = $ipo.offerPrice
      firstClose = [Math]::Round($firstClose, 4)
      price      = [Math]::Round($price, 4)
      changePct  = [Math]::Round(($price / $firstClose - 1.0) * 100.0, 1)
      winRate    = $winRate
      months     = $tot
      currency   = $meta.currency
    }
    $series[$ipo.symbol] = $pairs
  } catch { }
  if ($idx % 50 -eq 0) { Write-Host ("   진행 {0}/{1} (시세 확보 {2})" -f $idx, $list.Count, $out.Count) }
  Start-Sleep -Milliseconds 120
}
Write-Host ("   -> 시세까지 확보 {0}종목" -f $out.Count)

# 화면용(최근 5년) — 상장일 최신순
$cut = (Get-Date).AddYears(-5).ToString("yyyy-MM-dd")
$recent = @($out | Where-Object { $_.pricedDate -ge $cut } | Sort-Object pricedDate -Descending)

Write-Host "3) 시가총액 수집(나스닥 quote summary)..."
$mi = 0
foreach ($r in $recent) {
  $mi++
  $cap = $null
  try {
    $q = Invoke-RestMethod -Uri "https://api.nasdaq.com/api/quote/$($r.symbol)/summary?assetclass=stocks" -Headers $headers -TimeoutSec 20
    $raw = ($q.data.summaryData.MarketCap.value + "") -replace '[^0-9.]', ''
    $tmp = 0.0
    if ($raw -and [double]::TryParse($raw, [ref]$tmp) -and $tmp -gt 0) { $cap = $tmp }
  } catch { }
  $r | Add-Member -NotePropertyName marketCap -NotePropertyValue $cap -Force
  # 상장 당시 시총(근사): 지금 주식수가 그대로였다고 보고 첫날 종가로 환산 — 증자·감자는 반영되지 않음
  $ipoCap = $null
  if ($null -ne $cap -and $r.price -gt 0) { $ipoCap = [Math]::Round($cap / $r.price * $r.firstClose) }
  $r | Add-Member -NotePropertyName ipoMarketCap -NotePropertyValue $ipoCap -Force
  if ($mi % 100 -eq 0) { Write-Host ("   시총 {0}/{1}" -f $mi, $recent.Count) }
  Start-Sleep -Milliseconds 120
}
$screen = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  description = "나스닥 IPO 캘린더에서 모은 최근 5년 미국 신규 상장 종목. 상장 첫날 종가 대비 현재가 등락률, 상장 후 월간 승률, 현재 시총과 상장 당시 시총(현재 주식수 기준 환산)을 담는다. 상장 폐지·시세 없음 종목은 제외."
  count       = $recent.Count
  rows        = $recent
}
$screen | ConvertTo-Json -Depth 5 -Compress | Set-Content (Join-Path $rootDataDir "ipo-list.json") -Encoding UTF8
Write-Host ("화면용 저장 -> data/ipo-list.json ({0}종목)" -f $recent.Count)

# 전략용 원자료
@{ generatedAt = (Get-Date).ToUniversalTime().ToString("s"); ipos = $out; series = $series } |
  ConvertTo-Json -Depth 6 -Compress | Set-Content (Join-Path $scriptDir "ipo-universe-cache.json") -Encoding UTF8
Write-Host "전략용 저장 -> sector-map/scripts/ipo-universe-cache.json"

