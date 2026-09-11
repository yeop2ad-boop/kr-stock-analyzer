# 투자방법 비교(2026-09-11 사용자 요청) — 지금부터 딱 10년을 매년 1년씩 끊어, 7가지 투자 방법의 연도별 수익률을 계산한다.
#
# 결과: data/strategy-compare.json
#   { generatedAt, years:[{label,start,end}...], strategies:[{key,label,color,yearly:[%...],cumulative:[%...],total,picksByYear:[[..]]}] }
#
# 7가지(코스피 장기투자만 KOSPI200, 나머지는 전부 S&P500/미국)
#   1 winrate   10년 승률 매매  : 해당 연도 시작 시점 기준 "직전 10년 월간 승률" 상위 20종목을 1년 보유
#   2 sector    섹터 순환 매매  : 직전 1년 수익률 1위 섹터를 통째로 1년 보유(그 섹터 종목 평균)
#   3 low52     52주 저점 매매  : 시작 시점에 직전 52주 구간에서 가장 낮은 위치인 20종목을 1년 보유
#   4 high52    52주 고점 매매  : 반대로 가장 높은 위치인 20종목을 1년 보유
#   5 spy       S&P 장기투자    : SPY 보유
#   6 kospi     코스피 장기투자 : KODEX 200(069500.KS) 보유
#   7 ipo       IPO 매매        : 시작 시점 기준 상장한 지 가장 얼마 안 된 20종목을 1년 보유
#
# 데이터: S&P500 구성종목(sp500-sectors.json)의 11년 월봉 종가 1회 조회 + SPY/KODEX200.
# 주의(표시에도 명시): 오늘의 S&P500 구성종목으로 과거를 계산하므로 생존편향이 있다.

$ProgressPreference = 'SilentlyContinue'
$headers = @{ "User-Agent" = "Mozilla/5.0" }
$scriptDir = $PSScriptRoot
$dataDir = Join-Path (Split-Path $scriptDir -Parent) "data"
$rootDataDir = Join-Path (Split-Path (Split-Path $scriptDir -Parent) -Parent) "data"

$TOP_N = 20
$YEAR_COUNT = 10

function Get-MonthlyCloses($symbol) {
  for ($attempt = 1; $attempt -le 3; $attempt++) {
    try {
      $url = "https://query1.finance.yahoo.com/v8/finance/chart/$([uri]::EscapeDataString($symbol))?range=12y&interval=1mo"
      $resp = Invoke-RestMethod -Uri $url -Headers $headers -TimeoutSec 40
      $res = $resp.chart.result[0]
      if (-not $res) { return $null }
      $ts = $res.timestamp
      $cl = $res.indicators.quote[0].close
      if (-not $ts -or -not $cl) { return $null }
      $pairs = @()
      for ($i = 0; $i -lt $ts.Count; $i++) {
        if ($null -ne $cl[$i]) { $pairs += [PSCustomObject]@{ t = [int64]$ts[$i]; c = [double]$cl[$i] } }
      }
      $first = $res.meta.firstTradeDate
      return [PSCustomObject]@{ pairs = ($pairs | Sort-Object t); firstTrade = $first }
    } catch {
      if ($attempt -lt 3) { Start-Sleep -Seconds (2 * $attempt) }
    }
  }
  return $null
}

# 특정 유닉스초 시점에 "가장 가까운(그 이전) 월봉 종가"
function Close-At($pairs, [int64]$t) {
  $best = $null
  foreach ($p in $pairs) {
    if ($p.t -le $t) { $best = $p } else { break }
  }
  if ($null -eq $best) { return $null }
  # 1년 넘게 떨어진 값이면 그 시점엔 데이터가 없던 것으로 봄
  if (($t - $best.t) -gt (400 * 86400)) { return $null }
  return $best.c
}

# 시작~종료 수익률(%)
function Return-Between($pairs, [int64]$t0, [int64]$t1) {
  $a = Close-At $pairs $t0
  $b = Close-At $pairs $t1
  if ($null -eq $a -or $null -eq $b -or $a -le 0) { return $null }
  return ($b / $a - 1.0) * 100.0
}

# t 시점 기준 직전 $months 개월 월간 승률(%)
function WinRate-At($pairs, [int64]$t, [int]$months) {
  $win = 0; $tot = 0; $prev = $null
  $from = $t - ([int64]$months * 31 * 86400)
  foreach ($p in $pairs) {
    if ($p.t -gt $t) { break }
    if ($p.t -lt $from) { $prev = $p; continue }
    if ($null -ne $prev) {
      $tot++
      if ($p.c -gt $prev.c) { $win++ }
    }
    $prev = $p
  }
  if ($tot -lt 24) { return $null }
  return [double]$win / $tot * 100.0
}

# t 시점 기준 직전 52주(12개월) 구간에서 현재가 위치(0=최저, 100=최고)
function Range52-At($pairs, [int64]$t) {
  $from = $t - (370 * 86400)
  $vals = @()
  $cur = $null
  foreach ($p in $pairs) {
    if ($p.t -gt $t) { break }
    if ($p.t -ge $from) { $vals += $p.c; $cur = $p.c }
  }
  if ($vals.Count -lt 8 -or $null -eq $cur) { return $null }
  $lo = ($vals | Measure-Object -Minimum).Minimum
  $hi = ($vals | Measure-Object -Maximum).Maximum
  if ($hi -le $lo) { return $null }
  return ($cur - $lo) / ($hi - $lo) * 100.0
}

Write-Host "1) S&P500 구성종목 목록 읽는 중..."
$sp = Get-Content (Join-Path $dataDir "sp500-sectors.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$universe = @($sp.companies | Where-Object { $_.symbol })
Write-Host ("   -> {0}개" -f $universe.Count)

Write-Host "2) 월봉 시세 수집(종목당 1회)..."
$series = @{}
$firstTrade = @{}
# 하루 이내 캐시가 있으면 재사용 — 계산식만 고쳐 다시 돌릴 때 500종목을 또 받지 않기 위함
$cachePath = Join-Path $scriptDir "strategy-series-cache.json"
if (Test-Path $cachePath) {
  $age = (Get-Date) - (Get-Item $cachePath).LastWriteTime
  if ($age.TotalHours -lt 24) {
    try {
      $cache = Get-Content $cachePath -Raw -Encoding UTF8 | ConvertFrom-Json
      foreach ($p in $cache.series.PSObject.Properties) {
        $series[$p.Name] = @($p.Value | ForEach-Object { [PSCustomObject]@{ t = [int64]$_.t; c = [double]$_.c } })
      }
      foreach ($p in $cache.firstTrade.PSObject.Properties) { $firstTrade[$p.Name] = [int64]$p.Value }
      Write-Host ("   -> 캐시 재사용: {0}종목" -f $series.Count)
    } catch { $series = @{}; $firstTrade = @{} }
  }
}
$idx = 0
if ($series.Count -eq 0) {
foreach ($c in $universe) {
  $idx++
  $d = Get-MonthlyCloses $c.symbol
  if ($d -and $d.pairs.Count -gt 12) {
    $series[$c.symbol] = $d.pairs
    if ($null -ne $d.firstTrade) { $firstTrade[$c.symbol] = [int64]$d.firstTrade }
  }
  if ($idx % 25 -eq 0) { Write-Host ("   진행 {0}/{1} (수집 {2})" -f $idx, $universe.Count, $series.Count) }
  Start-Sleep -Milliseconds 200
}
  @{ series = $series; firstTrade = $firstTrade } | ConvertTo-Json -Depth 6 -Compress | Set-Content $cachePath -Encoding UTF8
}
Write-Host ("   -> 시세 확보 {0}종목" -f $series.Count)

Write-Host "3) 지수(SPY·KODEX200) 수집..."
$spy = Get-MonthlyCloses "SPY"
$kospi = Get-MonthlyCloses "069500.KS"

# 연도 경계: 지금부터 1년씩 거꾸로 10칸
$now = [DateTimeOffset]::UtcNow
$bounds = @()
for ($k = $YEAR_COUNT; $k -ge 0; $k--) { $bounds += $now.AddYears(-$k) }
$yearRows = @()
for ($i = 0; $i -lt $YEAR_COUNT; $i++) {
  $yearRows += [ordered]@{
    label = ("{0}~{1}" -f $bounds[$i].ToString("yyyy.MM"), $bounds[$i + 1].ToString("yyyy.MM"))
    start = $bounds[$i].ToString("yyyy-MM")
    end   = $bounds[$i + 1].ToString("yyyy-MM")
  }
}

function Avg-Return($symbols, [int64]$t0, [int64]$t1) {
  $rs = @()
  foreach ($s in $symbols) {
    $r = Return-Between $series[$s] $t0 $t1
    if ($null -ne $r) { $rs += $r }
  }
  if ($rs.Count -eq 0) { return $null }
  return ($rs | Measure-Object -Average).Average
}

Write-Host "4) 전략별 연도 수익률 계산..."
$stratYearly = @{ winrate = @(); sector = @(); low52 = @(); high52 = @(); spy = @(); kospi = @(); ipo = @() }
$stratPicks = @{ winrate = @(); sector = @(); low52 = @(); high52 = @(); spy = @(); kospi = @(); ipo = @() }

for ($i = 0; $i -lt $YEAR_COUNT; $i++) {
  $t0 = $bounds[$i].ToUnixTimeSeconds()
  $t1 = $bounds[$i + 1].ToUnixTimeSeconds()

  # 1) 10년 승률 상위 20
  $scored = @()
  foreach ($s in $series.Keys) {
    $w = WinRate-At $series[$s] $t0 120
    if ($null -ne $w) { $scored += [PSCustomObject]@{ s = $s; v = $w } }
  }
  $pick = @($scored | Sort-Object -Property v -Descending | Select-Object -First $TOP_N | ForEach-Object { $_.s })
  $stratYearly.winrate += (Avg-Return $pick $t0 $t1)
  $stratPicks.winrate += , $pick

  # 2) 섹터 순환 — 직전 1년 수익률 1위 섹터
  $secRet = @{}
  foreach ($c in $universe) {
    if (-not $series.ContainsKey($c.symbol)) { continue }
    $r = Return-Between $series[$c.symbol] ($bounds[$i].AddYears(-1).ToUnixTimeSeconds()) $t0
    if ($null -eq $r) { continue }
    $k = if ($c.sectorKo) { $c.sectorKo } else { $c.sector }
    if (-not $secRet.ContainsKey($k)) { $secRet[$k] = @() }
    $secRet[$k] += $r
  }
  $bestSector = $null; $bestAvg = -9999.0
  foreach ($k in $secRet.Keys) {
    if ($secRet[$k].Count -lt 3) { continue }
    $a = ($secRet[$k] | Measure-Object -Average).Average
    if ($a -gt $bestAvg) { $bestAvg = $a; $bestSector = $k }
  }
  $secSyms = @()
  foreach ($c in $universe) {
    if (-not $series.ContainsKey($c.symbol)) { continue }
    $ck = if ($c.sectorKo) { $c.sectorKo } else { $c.sector }
    if ($ck -eq $bestSector) { $secSyms += $c.symbol }
  }
  $stratYearly.sector += (Avg-Return $secSyms $t0 $t1)
  $stratPicks.sector += , @($bestSector)

  # 3·4) 52주 저점·고점 20
  $pos = @()
  foreach ($s in $series.Keys) {
    $p = Range52-At $series[$s] $t0
    if ($null -ne $p) { $pos += [PSCustomObject]@{ s = $s; v = $p } }
  }
  $lowPick = @($pos | Sort-Object -Property v | Select-Object -First $TOP_N | ForEach-Object { $_.s })
  $highPick = @($pos | Sort-Object -Property v -Descending | Select-Object -First $TOP_N | ForEach-Object { $_.s })
  $stratYearly.low52 += (Avg-Return $lowPick $t0 $t1)
  $stratPicks.low52 += , $lowPick
  $stratYearly.high52 += (Avg-Return $highPick $t0 $t1)
  $stratPicks.high52 += , $highPick

  # 5·6) 지수
  $spyR = $null
  if ($spy) { $spyR = Return-Between $spy.pairs $t0 $t1 }
  $stratYearly.spy += $spyR
  $stratPicks.spy += , @("SPY")
  $kospiR = $null
  if ($kospi) { $kospiR = Return-Between $kospi.pairs $t0 $t1 }
  $stratYearly.kospi += $kospiR
  $stratPicks.kospi += , @("069500.KS")

  # 7) IPO — 그 시점 기준 상장한 지 가장 얼마 안 된 20종목(상장 3년 이내만 후보)
  $ipoCand = @()
  foreach ($s in $series.Keys) {
    if (-not $firstTrade.ContainsKey($s)) { continue }
    $age = $t0 - $firstTrade[$s]
    if ($age -gt 0 -and $age -lt (3 * 365 * 86400)) { $ipoCand += [PSCustomObject]@{ s = $s; v = $age } }
  }
  $ipoPick = @($ipoCand | Sort-Object -Property v | Select-Object -First $TOP_N | ForEach-Object { $_.s })
  $stratYearly.ipo += (Avg-Return $ipoPick $t0 $t1)
  $stratPicks.ipo += , $ipoPick

  Write-Host ("   {0}: 승률 {1} / 섹터 {2}({3}) / 저점 {4} / 고점 {5} / SPY {6} / 코스피 {7} / IPO {8}" -f `
      $yearRows[$i].label,
    [Math]::Round(($stratYearly.winrate[$i]), 1), [Math]::Round(($stratYearly.sector[$i]), 1), $bestSector,
    [Math]::Round(($stratYearly.low52[$i]), 1), [Math]::Round(($stratYearly.high52[$i]), 1),
    [Math]::Round(($stratYearly.spy[$i]), 1), [Math]::Round(($stratYearly.kospi[$i]), 1), [Math]::Round(($stratYearly.ipo[$i]), 1))
}

$meta = [ordered]@{
  winrate = @{ label = "10년 승률 매매"; color = "#8b5cf6" }
  sector  = @{ label = "섹터 순환 매매"; color = "#f59e0b" }
  low52   = @{ label = "52주 저점 매매"; color = "#22a866" }
  high52  = @{ label = "52주 고점 매매"; color = "#ef4444" }
  spy     = @{ label = "S&P 장기투자"; color = "#2563eb" }
  kospi   = @{ label = "코스피 장기투자"; color = "#0ea5e9" }
  ipo     = @{ label = "IPO 매매"; color = "#ec4899" }
}

$strategies = @()
foreach ($k in @("winrate", "sector", "low52", "high52", "spy", "kospi", "ipo")) {
  $yearly = @()
  $cum = @()
  $factor = 1.0
  foreach ($v in $stratYearly[$k]) {
    if ($null -eq $v) { $yearly += $null; $cum += [Math]::Round((($factor - 1.0) * 100.0), 1); continue }
    $r = [Math]::Round([double]$v, 1)
    $yearly += $r
    $factor = $factor * (1.0 + [double]$v / 100.0)
    $cum += [Math]::Round((($factor - 1.0) * 100.0), 1)
  }
  $strategies += [ordered]@{
    key         = $k
    label       = $meta[$k].label
    color       = $meta[$k].color
    yearly      = $yearly
    cumulative  = $cum
    total       = $cum[$cum.Count - 1]
    picksByYear = $stratPicks[$k]
  }
}

$out = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  description = "지금부터 10년을 1년씩 끊어 7가지 투자 방법의 연도별 수익률과 누적 수익률을 계산. 코스피 장기투자(KODEX 200)만 국내, 나머지는 S&P500/미국 기준. 매년 초 종목을 새로 골라 1년 보유했다고 가정하며, 종목 선정은 오늘의 S&P500 구성종목 안에서만 이뤄져 생존편향이 있다."
  topN        = $TOP_N
  years       = $yearRows
  strategies  = $strategies
}
$outPath = Join-Path $rootDataDir "strategy-compare.json"
$out | ConvertTo-Json -Depth 8 -Compress | Set-Content $outPath -Encoding UTF8
Write-Host ("완료 -> {0}" -f $outPath)
