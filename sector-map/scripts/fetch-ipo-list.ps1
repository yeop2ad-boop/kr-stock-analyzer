# 신규 상장(IPO) 목록 수집 — 미국 + 한국(2026-09-11 사용자 요청으로 한국 추가)
#
# 미국 출처: 나스닥 공개 IPO 캘린더(api.nasdaq.com/api/ipo/calendar?date=YYYY-MM) — 월 단위로 "가격 결정(priced)"된 IPO.
# 한국 출처: 한국거래소 상장법인목록(kind.krx.co.kr/corpgeneral/corpList.do) — 전 상장사의 회사명·종목코드·시장·상장일.
#            (KIND의 신규상장 조회 화면과 data.krx.co.kr은 봇 요청을 막아서 이 경로를 쓴다)
#
# 공통 처리: 야후 월봉으로 상장 첫 달 종가·현재가·상장 후 월간 승률을 구하고, 시가총액을 붙인다.
#   - 미국 시총: 나스닥 quote summary  /  한국 시총: 네이버 m.stock 종목 integration
#   - 상장 3개월 이내 종목은 월봉이 1~2개뿐이라 등락률이 0%로 굳는다 → 일봉을 따로 받아 상장 첫날 종가를 잡는다
#   - 스팩(기업인수목적회사)은 껍데기 회사라 이름·로고·시총·승률이 전부 비어 목록이 망가진다 → 따로 표시해 화면에서 걸러낸다
#
# 결과: data/ipo-list.json  { us: [...], kr: [...] }   +   sector-map/scripts/ipo-universe-cache.json(투자방법 비교 IPO 전략용)

param(
  [int]$Months = 126,            # 미국 캘린더 조회 개월 수(10년 반치 — 화면은 최근 5년만 사용)
  [switch]$SkipUs,
  [switch]$SkipKr
)

$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = "Stop"
$UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
$headers = @{ "User-Agent" = $UA; "Accept" = "application/json" }
$yahooHeaders = @{ "User-Agent" = $UA }
$scriptDir = $PSScriptRoot
$rootDataDir = Join-Path (Split-Path (Split-Path $scriptDir -Parent) -Parent) "data"
$cutDate = (Get-Date).AddYears(-5)

# 갓 상장한 회사는 로고 DB(FMP)에 없어서 목록이 글자 배지로만 찬다.
# 홈페이지 도메인을 같이 담아두면 화면에서 파비콘으로라도 로고 자리를 채울 수 있다.
function Get-Domain($url) {
  if (-not $url) { return $null }
  $u = ($url + "").Trim() -replace '^https?://', '' -replace '^www\.', ''
  $u = ($u -split '[/?#]')[0]
  if ($u -match '^[a-z0-9.\-]+\.[a-z]{2,}$') { return $u.ToLower() }
  return $null
}

# 이전상장·재상장 판별 — 거래소가 주는 "상장일"은 지금 속한 시장에 상장한 날이라,
# 코스닥에서 코스피로 옮겼거나 분할 후 다시 상장한 종목도 최근 날짜로 찍힌다(비에이치가 대표적).
# 야후 월봉 개수가 "상장일 이후 개월수"보다 4개월 넘게 많으면 그 전부터 거래되던 종목으로 본다.
# (전수 분포상 정상 신규상장은 -1~+1개월에 몰려 있고, 이전상장은 +5개월 이상으로 뚝 떨어진다)
function Test-Relisted($listedDate, $barCount) {
  if (-not $listedDate -or -not $barCount) { return $false }
  $now = Get-Date
  $elapsed = ($now.Year - $listedDate.Year) * 12 + ($now.Month - $listedDate.Month)
  return ($barCount - $elapsed) -gt 3
}

# 스팩 판별 — 미국은 "... Acquisition Corp" + 유닛/워런트 티커(끝이 U/R/W), 한국은 이름에 "스팩"
function Test-Spac($name, $symbol) {
  if ($name -match '스팩|기업인수목적') { return $true }
  if ($name -match 'Acquisition Corp|Acquisition Co\b|Acquisition Company') { return $true }
  if ($symbol -match '^[A-Z]{3,4}(U|R|W)$' -and $name -match 'Acquisition|Capital') { return $true }
  return $false
}

# 야후 월봉으로 상장 첫 달 종가·현재가·월간 승률. 상장 3개월 이내면 일봉으로 첫날 종가를 다시 잡는다.
function Get-ListingQuote($symbol, $listedDate) {
  try {
    $url = "https://query1.finance.yahoo.com/v8/finance/chart/$([uri]::EscapeDataString($symbol))?range=15y&interval=1mo"
    $resp = Invoke-RestMethod -Uri $url -Headers $yahooHeaders -TimeoutSec 30
    $res = $resp.chart.result[0]
    if (-not $res) { return $null }
    $ts = $res.timestamp; $cl = $res.indicators.quote[0].close
    if (-not $ts -or -not $cl) { return $null }
    $pairs = @()
    for ($i = 0; $i -lt $ts.Count; $i++) { if ($null -ne $cl[$i]) { $pairs += [PSCustomObject]@{ t = [int64]$ts[$i]; c = [double]$cl[$i] } } }
    if ($pairs.Count -lt 1) { return $null }
    $pairs = @($pairs | Sort-Object t)
    $meta = $res.meta
    $firstClose = $pairs[0].c
    $price = if ($null -ne $meta.regularMarketPrice) { [double]$meta.regularMarketPrice } else { $pairs[$pairs.Count - 1].c }

    # 최근 상장분: 월봉이 얼마 없어 첫 달 종가 = 현재가가 되어 등락률이 0%로 굳는다 → 일봉으로 상장 첫날 종가를 잡음
    if ($listedDate -and $listedDate -gt (Get-Date).AddMonths(-4)) {
      try {
        $d = Invoke-RestMethod -Uri "https://query1.finance.yahoo.com/v8/finance/chart/$([uri]::EscapeDataString($symbol))?range=6mo&interval=1d" -Headers $yahooHeaders -TimeoutSec 25
        $dres = $d.chart.result[0]
        $dcl = $dres.indicators.quote[0].close
        for ($i = 0; $i -lt $dcl.Count; $i++) { if ($null -ne $dcl[$i]) { $firstClose = [double]$dcl[$i]; break } }
      } catch { }
    }
    if ($firstClose -le 0) { return $null }

    $win = 0; $tot = 0
    $from = [Math]::Max(1, $pairs.Count - 120)
    for ($i = $from; $i -lt $pairs.Count; $i++) { $tot++; if ($pairs[$i].c -gt $pairs[$i - 1].c) { $win++ } }

    # 1년 수익률(2026-09-12 사용자 요청) — IPO 화면의 정렬 기준. 12개월 전 월봉 종가 대비 현재가.
    # 상장 1년이 안 된 종목은 낼 수 없어서 $null이고, 화면에서는 상장 후 연평균 상승(CAGR)으로 대신 줄 세운다.
    $oneYearReturn = $null
    if ($pairs.Count -ge 13) {
      $base1y = $pairs[$pairs.Count - 13].c
      if ($base1y -gt 0) { $oneYearReturn = [Math]::Round(($price / $base1y - 1.0) * 100.0, 1) }
    }

    return [PSCustomObject]@{
      firstClose     = [Math]::Round($firstClose, 4)
      price          = [Math]::Round($price, 4)
      changePct      = [Math]::Round(($price / $firstClose - 1.0) * 100.0, 1)
      oneYearReturn  = $oneYearReturn
      winRate        = if ($tot -ge 6) { [Math]::Round($win / $tot * 100.0, 1) } else { $null }
      months         = $tot
      currency       = $meta.currency
      pairs          = $pairs
    }
  } catch { return $null }
}

# 야후 quoteSummary(홈페이지·매출증가율)는 쿠키+crumb 인증이 필요하다 — 세션을 한 번만 만들어 양쪽에서 쓴다
$ySession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$crumb = $null
try {
  Invoke-WebRequest "https://fc.yahoo.com" -WebSession $ySession -UserAgent $UA -TimeoutSec 20 -UseBasicParsing -ErrorAction SilentlyContinue | Out-Null
  $c = (Invoke-WebRequest "https://query1.finance.yahoo.com/v1/test/getcrumb" -WebSession $ySession -UserAgent $UA -TimeoutSec 20 -UseBasicParsing).Content
  if ($c -and $c.Length -le 30) { $crumb = $c }
} catch { }
if (-not $crumb) { Write-Host "경고: 야후 crumb을 못 받아 홈페이지·매출증가율은 비어 있게 됩니다." }

# 홈페이지 도메인과 직전 분기 매출 증가율(전년 동기 대비)을 한 번에 받아온다
function Get-YahooProfile($symbol) {
  if (-not $crumb) { return $null }
  try {
    $u = "https://query2.finance.yahoo.com/v10/finance/quoteSummary/$symbol`?modules=assetProfile,financialData&crumb=" + [uri]::EscapeDataString($crumb)
    $r = Invoke-RestMethod $u -WebSession $ySession -UserAgent $UA -TimeoutSec 20
    $res = $r.quoteSummary.result[0]
    $g = $null
    if ($null -ne $res.financialData.revenueGrowth.raw) { $g = [Math]::Round([double]$res.financialData.revenueGrowth.raw * 100.0, 1) }
    return [PSCustomObject]@{ site = (Get-Domain $res.assetProfile.website); revenueGrowth = $g }
  } catch { return $null }
}

$usRows = @()
$krRows = @()
$strategyRows = @()   # 투자방법 비교 IPO 전략용(미국 전체 기간)
$series = @{}

# ============================== 미국 ==============================
if (-not $SkipUs) {
  Write-Host "1) 미국 — 나스닥 IPO 캘린더 수집(최근 $Months개월)..."
  $ipos = @{}
  $now = Get-Date
  for ($m = 0; $m -lt $Months; $m++) {
    $key = $now.AddMonths(-$m).ToString("yyyy-MM")
    try {
      $r = Invoke-RestMethod -Uri "https://api.nasdaq.com/api/ipo/calendar?date=$key" -Headers $headers -TimeoutSec 30
      foreach ($row in @($r.data.priced.rows)) {
        $t = ($row.proposedTickerSymbol + "").Trim().ToUpper()
        if (-not $t -or $t -match "[^A-Z.\-]" -or $ipos.ContainsKey($t)) { continue }
        $pd = $null
        try { $pd = [datetime]::Parse($row.pricedDate) } catch { }
        if ($null -eq $pd) { continue }
        $price = 0.0
        [void][double]::TryParse((($row.proposedSharePrice + "") -replace '[^0-9.]', ''), [ref]$price)
        $ipos[$t] = [PSCustomObject]@{
          symbol = $t; name = ($row.companyName + "").Trim(); exchange = ($row.proposedExchange + "").Trim()
          pricedDate = $pd; offerPrice = $price
        }
      }
      if ($m % 12 -eq 0) { Write-Host ("   {0} 까지 누적 {1}종목" -f $key, $ipos.Count) }
    } catch { }
    Start-Sleep -Milliseconds 250
  }
  Write-Host ("   -> 후보 {0}종목" -f $ipos.Count)

  Write-Host "   야후 시세 계산..."
  $idx = 0
  $list = @($ipos.Values | Sort-Object pricedDate -Descending)
  foreach ($ipo in $list) {
    $idx++
    $recent = $ipo.pricedDate -ge $cutDate
    $q = Get-ListingQuote $ipo.symbol $(if ($recent) { $ipo.pricedDate } else { $null })
    if ($q) {
      $row = [ordered]@{
        symbol = $ipo.symbol; name = $ipo.name; exchange = $ipo.exchange
        pricedDate = $ipo.pricedDate.ToString("yyyy-MM-dd"); offerPrice = $ipo.offerPrice
        firstClose = $q.firstClose; price = $q.price; changePct = $q.changePct
        oneYearReturn = $q.oneYearReturn
        winRate = $q.winRate; months = $q.months; currency = $q.currency
        isSpac = [bool](Test-Spac $ipo.name $ipo.symbol)
        isRelisted = [bool](Test-Relisted $ipo.pricedDate $q.months)
      }
      if ($recent) { $usRows += [PSCustomObject]$row }
      $strategyRows += [PSCustomObject]@{
        symbol = $ipo.symbol; name = $ipo.name; pricedDate = $ipo.pricedDate.ToString("yyyy-MM-dd")
        firstClose = $q.firstClose; price = $q.price; changePct = $q.changePct; winRate = $q.winRate; months = $q.months
      }
      $series[$ipo.symbol] = $q.pairs
    }
    if ($idx % 100 -eq 0) { Write-Host ("   진행 {0}/{1} (확보 {2})" -f $idx, $list.Count, $strategyRows.Count) }
    Start-Sleep -Milliseconds 120
  }

  Write-Host "   시가총액(나스닥) + 홈페이지·매출증가율(야후)..."
  $mi = 0
  foreach ($r in $usRows) {
    $mi++
    $cap = $null
    try {
      $q = Invoke-RestMethod -Uri "https://api.nasdaq.com/api/quote/$($r.symbol)/summary?assetclass=stocks" -Headers $headers -TimeoutSec 20
      $raw = ($q.data.summaryData.MarketCap.value + "") -replace '[^0-9.]', ''
      $tmp = 0.0
      if ($raw -and [double]::TryParse($raw, [ref]$tmp) -and $tmp -gt 0) { $cap = $tmp }
    } catch { }
    $r | Add-Member -NotePropertyName marketCap -NotePropertyValue $cap -Force
    $ipoCap = $null
    if ($null -ne $cap -and $r.price -gt 0) { $ipoCap = [Math]::Round($cap / $r.price * $r.firstClose) }
    $r | Add-Member -NotePropertyName ipoMarketCap -NotePropertyValue $ipoCap -Force
    $prof = Get-YahooProfile $r.symbol
    $r | Add-Member -NotePropertyName site -NotePropertyValue $(if ($prof) { $prof.site } else { $null }) -Force
    $r | Add-Member -NotePropertyName revenueGrowth -NotePropertyValue $(if ($prof) { $prof.revenueGrowth } else { $null }) -Force
    if ($mi % 100 -eq 0) { Write-Host ("   시총 {0}/{1}" -f $mi, $usRows.Count) }
    Start-Sleep -Milliseconds 120
  }
  Write-Host ("   -> 미국 {0}종목(최근 5년)" -f $usRows.Count)
}

# ============================== 한국 ==============================
if (-not $SkipKr) {
  Write-Host "2) 한국 — 거래소 상장법인목록에서 최근 5년 신규 상장 추출..."
  # corpList.do는 EUC-KR HTML 표를 내려준다(엑셀 다운로드용) — 회사명·시장구분·종목코드·업종·상장일이 들어 있다
  $resp = Invoke-WebRequest "https://kind.krx.co.kr/corpgeneral/corpList.do?method=download&searchType=13" -UserAgent $UA -TimeoutSec 90 -UseBasicParsing
  $html = [Text.Encoding]::GetEncoding(949).GetString($resp.Content)
  $all = @()
  foreach ($tr in [regex]::Matches($html, '(?s)<tr[^>]*>(.*?)</tr>')) {
    $tds = @([regex]::Matches($tr.Groups[1].Value, '(?s)<td[^>]*>(.*?)</td>') | ForEach-Object {
        ($_.Groups[1].Value -replace '<[^>]+>', '' -replace '&amp;', '&' -replace '\s+', ' ').Trim()
      })
    # 열: 회사명 / 시장구분 / 종목코드 / 업종 / 주요제품 / 상장일 / 결산월 / 대표자명 / 홈페이지 / 지역
    if ($tds.Count -lt 6) { continue }
    $code = $tds[2]
    if ($code -notmatch '^[0-9A-Z]{6}$') { continue }
    $ld = $null
    try { $ld = [datetime]::Parse($tds[5]) } catch { continue }
    if ($ld -lt $cutDate) { continue }
    $all += [PSCustomObject]@{
      name = $tds[0]; market = $tds[1]; code = $code; industry = $tds[3]; listedDate = $ld
      site = $(if ($tds.Count -ge 9) { Get-Domain $tds[8] } else { $null })
    }
  }
  Write-Host ("   최근 5년 신규 상장 {0}종목" -f $all.Count)

  $idx = 0
  foreach ($it in @($all | Sort-Object listedDate -Descending)) {
    $idx++
    # 유가=코스피(.KS), 코스닥=.KQ. 코넥스는 야후 시세가 없어 건너뛴다
    $suffix = if ($it.market -match '유가|코스피') { ".KS" } elseif ($it.market -match '코스닥') { ".KQ" } else { $null }
    if (-not $suffix) { continue }
    $sym = $it.code + $suffix
    $q = Get-ListingQuote $sym $it.listedDate
    if (-not $q) { Start-Sleep -Milliseconds 80; continue }
    # 시총은 네이버에서(야후는 국내 종목 시총을 안 준다)
    $cap = $null
    try {
      $ni = Invoke-RestMethod "https://m.stock.naver.com/api/stock/$($it.code)/integration" -Headers $headers -TimeoutSec 20
      $capText = (@($ni.totalInfos | Where-Object { $_.code -eq 'marketValue' -or $_.key -eq '시총' })[0]).value
      if ($capText) {
        # "4,794억" / "25조 2,836억" 형태를 원 단위로 환산
        $t = ($capText + "") -replace ',', ''
        $won = 0.0
        if ($t -match '([\d.]+)조') { $won += [double]$Matches[1] * 1e12 }
        if ($t -match '([\d.]+)억') { $won += [double]$Matches[1] * 1e8 }
        if ($won -gt 0) { $cap = $won }
      }
    } catch { }
    $ipoCap = $null
    if ($null -ne $cap -and $q.price -gt 0) { $ipoCap = [Math]::Round($cap / $q.price * $q.firstClose) }
    $krProf = Get-YahooProfile $sym
    $krRows += [PSCustomObject]([ordered]@{
        symbol = $sym; name = $it.name; exchange = $it.market
        pricedDate = $it.listedDate.ToString("yyyy-MM-dd"); offerPrice = $null
        firstClose = $q.firstClose; price = $q.price; changePct = $q.changePct
        oneYearReturn = $q.oneYearReturn
        winRate = $q.winRate; months = $q.months; currency = "KRW"
        isSpac = [bool](Test-Spac $it.name $it.code)
        isRelisted = [bool](Test-Relisted $it.listedDate $q.months)
        industry = $it.industry; marketCap = $cap; ipoMarketCap = $ipoCap; site = $it.site
        revenueGrowth = $(if ($krProf) { $krProf.revenueGrowth } else { $null })
      })
    if ($idx % 50 -eq 0) { Write-Host ("   진행 {0}/{1} (확보 {2})" -f $idx, $all.Count, $krRows.Count) }
    Start-Sleep -Milliseconds 120
  }
  Write-Host ("   -> 한국 {0}종목" -f $krRows.Count)
}

# ============================== 저장 ==============================
$outPath = Join-Path $rootDataDir "ipo-list.json"
# 한쪽만 돌렸을 때 반대쪽 데이터를 날리지 않도록 기존 파일과 합친다
if (($SkipUs -or $SkipKr) -and (Test-Path $outPath)) {
  $prev = Get-Content $outPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($SkipUs -and $prev.us) { $usRows = @($prev.us) }
  if ($SkipKr -and $prev.kr) { $krRows = @($prev.kr) }
}

[ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  description = "최근 5년 신규 상장 종목. 미국=나스닥 IPO 캘린더, 한국=거래소 상장법인목록. 상장 첫날 종가 대비 등락률, 1년 수익률(oneYearReturn), 상장 후 월간 승률, 현재/상장 시총. isSpac=true는 스팩(기업인수목적회사)."
  us          = @($usRows | Sort-Object pricedDate -Descending)
  kr          = @($krRows | Sort-Object pricedDate -Descending)
} | ConvertTo-Json -Depth 5 -Compress | Set-Content $outPath -Encoding UTF8
Write-Host ("저장 -> data/ipo-list.json (미국 {0} · 한국 {1})" -f $usRows.Count, $krRows.Count)

if (-not $SkipUs) {
  @{ generatedAt = (Get-Date).ToUniversalTime().ToString("s"); ipos = $strategyRows; series = $series } |
    ConvertTo-Json -Depth 6 -Compress | Set-Content (Join-Path $scriptDir "ipo-universe-cache.json") -Encoding UTF8
  Write-Host "전략용 저장 -> sector-map/scripts/ipo-universe-cache.json"
}
