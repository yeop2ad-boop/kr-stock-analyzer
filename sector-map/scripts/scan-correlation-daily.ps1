# Correlation board daily batch (2026-09-05, user request "sanggwangwangyedo")
# For US(S&P500) and KR(KOSPI200+KOSDAQ150), computes for 17 ranking metrics:
#  - month mode: metric ranks AS OF 1 month ago (top100/bottom100) vs last-1-month gainers top50 / losers top50
#  - year  mode: metric ranks AS OF 1 year  ago (top100/bottom100) vs last-1-year  gainers top50 / losers top50
# Fundamentals (quarterly data) use current snapshot values as the as-of approximation; price-scaled ones
# (PER / marketCap / dividendYield) are rescaled by the price ratio; 52w position / volume / RSI / momentum
# are computed from the 2y daily series truncated at the as-of date.
# Output: ../../data/correlation-daily.json  { generatedAt, dateKst, us:{month,year}, kr:{month,year} }
# Split schedule (2026-09-05 user request): US runs 07:00 KST (after fresh US snapshot), KR runs 17:00 KST
# (after fresh KR snapshot). -Market us|kr updates only that section of correlation-daily.json (other kept).
param([string]$Market = "all")
$ProgressPreference = 'SilentlyContinue'
$H = @{ "User-Agent" = "Mozilla/5.0" }
$dataDir = Join-Path $PSScriptRoot "..\data"
$rootData = Join-Path $PSScriptRoot "..\..\data"

$ratingOrder = @{ "AAA"=21; "AA+"=20; "AA"=19; "AA-"=18; "A+"=17; "A"=16; "A-"=15; "BBB+"=14; "BBB"=13; "BBB-"=12; "BB+"=11; "BB"=10; "BB-"=9; "B+"=8; "B"=7; "B-"=6; "CCC+"=5; "CCC"=4; "CCC-"=3; "CC"=2; "C"=1; "D"=0 }
function RatingScore($s) {
  if (-not $s) { return $null }
  $t = ($s -replace "\s", "")
  if ($ratingOrder.ContainsKey($t)) { return $ratingOrder[$t] }
  return $null
}
$usRatings = Get-Content (Join-Path $PSScriptRoot "us-credit-ratings.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$krRatingsDoc = Get-Content (Join-Path $rootData "kr-credit-rating.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$wrDb = Get-Content (Join-Path $rootData "winrate-scores-us.json") -Raw -Encoding UTF8 | ConvertFrom-Json

function WkRsi($closes) {
  if ($closes.Count -lt 20) { return $null }
  $g = 0.0; $l = 0.0
  for ($k = 1; $k -le 14; $k++) { $d = $closes[$k] - $closes[$k-1]; if ($d -gt 0) { $g += $d } else { $l -= $d } }
  $ag = $g / 14.0; $al = $l / 14.0
  for ($k = 15; $k -lt $closes.Count; $k++) {
    $d = $closes[$k] - $closes[$k-1]; $gg = 0.0; $ll = 0.0
    if ($d -gt 0) { $gg = $d } else { $ll = -$d }
    $ag = ($ag * 13 + $gg) / 14.0; $al = ($al * 13 + $ll) / 14.0
  }
  if ($al -eq 0) { return 100.0 }
  return 100.0 - 100.0 / (1.0 + $ag / $al)
}
function ClosestIdx($list, $target) {
  $bi = 0; $bd = [double]::MaxValue
  for ($j = 0; $j -lt $list.Count; $j++) { $d = [Math]::Abs($list[$j].t - $target); if ($d -lt $bd) { $bd = $d; $bi = $j } }
  return $bi
}
function AsOfStats($cl, $endIdx) {
  # from series up to endIdx: 52w position of close[endIdx], 5d avg dollar volume, weekly RSI
  $s = [Math]::Max(0, $endIdx - 251)
  $win = New-Object System.Collections.Generic.List[object]
  for ($j = $s; $j -le $endIdx; $j++) { $win.Add($cl[$j]) }
  $closes = @($win | ForEach-Object { $_.c })
  $mn = ($closes | Measure-Object -Minimum).Minimum
  $mx = ($closes | Measure-Object -Maximum).Maximum
  $p = $cl[$endIdx].c
  $w52 = $null; if ($mx -gt $mn) { $w52 = ($p - $mn) / ($mx - $mn) * 100 }
  $dv = @(); for ($j = [Math]::Max($s, $endIdx - 4); $j -le $endIdx; $j++) { $dv += $cl[$j].c * $cl[$j].v }
  $dv5 = ($dv | Measure-Object -Average).Average
  $wk = [ordered]@{}
  foreach ($q in $win) { $wk[[string][int][Math]::Floor($q.t / 604800)] = $q.c }
  $rsi = WkRsi @($wk.Values)
  return @{ w52 = $w52; dv5 = $dv5; rsi = $rsi }
}

function BuildRows($sectorsPath, $isKr, $wrMap, $ratingFn) {
  $sec = Get-Content $sectorsPath -Raw -Encoding UTF8 | ConvertFrom-Json
  # snapshot time of per/marketCap/dividend in the sectors file - used to price-correct those fields
  $snapT = $null
  try { $snapT = ([DateTimeOffset]::Parse([string]$sec.generatedAt)).ToUnixTimeSeconds() } catch {}
  $rows = New-Object System.Collections.Generic.List[object]
  $i = 0
  foreach ($c in $sec.companies) {
    $i++
    $sym = $c.symbol
    for ($attempt = 1; $attempt -le 2; $attempt++) {
      try {
        $r = Invoke-RestMethod -Uri "https://query1.finance.yahoo.com/v8/finance/chart/$([uri]::EscapeDataString($sym))?range=2y&interval=1d" -Headers $H -TimeoutSec 25
        $res = $r.chart.result[0]; $ts = $res.timestamp; $q = $res.indicators.quote[0]
        $cl = New-Object System.Collections.Generic.List[object]
        for ($j = 0; $j -lt $ts.Count; $j++) {
          if ($null -ne $q.close[$j]) {
            $vv = 0.0; if ($null -ne $q.volume[$j]) { $vv = [double]$q.volume[$j] }
            $cl.Add([PSCustomObject]@{ t = [int64]$ts[$j]; c = [double]$q.close[$j]; v = $vv })
          }
        }
        if ($cl.Count -lt 80) { throw "short" }
        $last = $cl[$cl.Count - 1]
        $i1d = [Math]::Max(0, $cl.Count - 2)   # previous trading day
        $i2d = [Math]::Max(0, $cl.Count - 3)
        $i1w = ClosestIdx $cl ($last.t - 7 * 86400)
        $i2w = ClosestIdx $cl ($last.t - 14 * 86400)
        $i1m = ClosestIdx $cl ($last.t - 30 * 86400)
        $i2m = ClosestIdx $cl ($last.t - 60 * 86400)
        $i1y = ClosestIdx $cl ($last.t - 365 * 86400)
        $i13m = ClosestIdx $cl ($last.t - 395 * 86400)
        $p1d = $cl[$i1d].c; $p1w = $cl[$i1w].c; $p1m = $cl[$i1m].c; $p1y = $cl[$i1y].c
        $dret = $null; if ($p1d -gt 0 -and $i1d -lt ($cl.Count - 1)) { $dret = ($last.c / $p1d - 1) * 100 }
        $prevD = $null; if ($cl[$i2d].c -gt 0 -and $i2d -lt $i1d) { $prevD = ($p1d / $cl[$i2d].c - 1) * 100 }
        $wret = $null; if ($p1w -gt 0 -and $i1w -lt ($cl.Count - 1)) { $wret = ($last.c / $p1w - 1) * 100 }
        $mret = $null; if ($p1m -gt 0) { $mret = ($last.c / $p1m - 1) * 100 }
        $yret = $null; if ($p1y -gt 0 -and ($last.t - $cl[$i1y].t) -gt 300 * 86400) { $yret = ($last.c / $p1y - 1) * 100 }
        $prevW = $null; if ($cl[$i2w].c -gt 0 -and $i2w -lt $i1w) { $prevW = ($p1w / $cl[$i2w].c - 1) * 100 }
        $prevM = $null; if ($cl[$i2m].c -gt 0) { $prevM = ($p1m / $cl[$i2m].c - 1) * 100 }
        $prevY = $null; if ($cl[$i13m].c -gt 0 -and $i13m -lt $i1y) { $prevY = ($p1y / $cl[$i13m].c - 1) * 100 }
        $ad = AsOfStats $cl $i1d
        $aw = AsOfStats $cl $i1w
        $am = AsOfStats $cl $i1m
        $ay = AsOfStats $cl $i1y
        $an = AsOfStats $cl ($cl.Count - 1)  # current (for autotrack): today's 52w position / 5d dollar volume / weekly RSI
        # price-correct per/marketCap/dividend: snapshot values correspond to the close at snapshot time,
        # so all ratios are taken against that snapshot price (not blindly against the latest close)
        $ps = $last.c
        if ($null -ne $snapT) { $ips = ClosestIdx $cl $snapT; if ($cl[$ips].c -gt 0) { $ps = $cl[$ips].c } }
        $rd = 0; if ($ps -gt 0) { $rd = $p1d / $ps }
        $rw = 0; if ($ps -gt 0) { $rw = $p1w / $ps }
        $rm = 0; if ($ps -gt 0) { $rm = $p1m / $ps }
        $ry = 0; if ($ps -gt 0) { $ry = $p1y / $ps }
        $rn = 1.0; if ($ps -gt 0) { $rn = $last.c / $ps }
        $rows.Add([PSCustomObject]@{
          sym = $sym; dret = $dret; wret = $wret; mret = $mret; yret = $yret
          div_d = $(if ($null -ne $c.dividendYield -and $rd -gt 0) { $c.dividendYield / $rd } else { $null })
          per_d = $(if ($null -ne $c.per -and $c.per -gt 0 -and $rd -gt 0) { $c.per * $rd } else { $null })
          mcap_d = $(if ($c.marketCap) { $c.marketCap * $rd } else { $null })
          w52_d = $ad.w52; dv5_d = $ad.dv5; rsi_d = $ad.rsi; prev_d = $prevD
          div_w = $(if ($null -ne $c.dividendYield -and $rw -gt 0) { $c.dividendYield / $rw } else { $null })
          per_w = $(if ($null -ne $c.per -and $c.per -gt 0 -and $rw -gt 0) { $c.per * $rw } else { $null })
          mcap_w = $(if ($c.marketCap) { $c.marketCap * $rw } else { $null })
          w52_w = $aw.w52; dv5_w = $aw.dv5; rsi_w = $aw.rsi; prev_w = $prevW
          div_now = $(if ($null -ne $c.dividendYield -and $rn -gt 0) { $c.dividendYield / $rn } else { $null })
          per_now = $(if ($null -ne $c.per -and $c.per -gt 0) { $c.per * $rn } else { $null })
          mcap_now = $(if ($c.marketCap) { $c.marketCap * $rn } else { $null })
          w52_now = $an.w52; dv5_now = $an.dv5; rsi_now = $an.rsi
          revG = $c.revenueGrowth; netG = $c.netIncomeGrowth; cashG = $c.cashFlowGrowth
          debt = $c.debtRatio; opm = $c.operatingMargin; roe = $c.roe
          div_m = $(if ($null -ne $c.dividendYield -and $rm -gt 0) { $c.dividendYield / $rm } else { $null })
          div_y = $(if ($null -ne $c.dividendYield -and $ry -gt 0) { $c.dividendYield / $ry } else { $null })
          per_m = $(if ($null -ne $c.per -and $c.per -gt 0 -and $rm -gt 0) { $c.per * $rm } else { $null })
          per_y = $(if ($null -ne $c.per -and $c.per -gt 0 -and $ry -gt 0) { $c.per * $ry } else { $null })
          mcap_m = $(if ($c.marketCap) { $c.marketCap * $rm } else { $null })
          mcap_y = $(if ($c.marketCap) { $c.marketCap * $ry } else { $null })
          w52_m = $am.w52; w52_y = $ay.w52
          dv5_m = $am.dv5; dv5_y = $ay.dv5
          rsi_m = $am.rsi; rsi_y = $ay.rsi
          prev_m = $prevM; prev_y = $prevY
          score = $(if ($wrMap.$sym) { $wrMap.$sym.score } else { $null })
          rate = (& $ratingFn $sym)
        })
        break
      } catch { if ($attempt -eq 2) { Write-Host "fail $sym : $($_.Exception.Message) (line $($_.InvocationInfo.ScriptLineNumber))" } else { Start-Sleep -Seconds 2 } }
    }
    Start-Sleep -Milliseconds 120
    if ($i % 100 -eq 0) { Write-Host "  progress $i ok=$($rows.Count)" }
  }
  return $rows
}

function MetricDefs($suffix) {
  return @(
    @{ key = "revenueGrowth";   f = "revG";            dir = "desc" },
    @{ key = "netIncomeGrowth"; f = "netG";            dir = "desc" },
    @{ key = "dividendYield";   f = "div$suffix";      dir = "desc" },
    @{ key = "debtRatio";       f = "debt";            dir = "asc"  },
    @{ key = "cashFlowGrowth";  f = "cashG";           dir = "desc" },
    @{ key = "marketCap";       f = "mcap$suffix";     dir = "desc" },
    @{ key = "operatingMargin"; f = "opm";             dir = "desc" },
    @{ key = "per";             f = "per$suffix";      dir = "asc"  },
    @{ key = "roe";             f = "roe";             dir = "desc" },
    @{ key = "week52High";      f = "w52$suffix";      dir = "desc" },
    @{ key = "week52Low";       f = "w52$suffix";      dir = "asc"  },
    @{ key = "dollarVolume";    f = "dv5$suffix";      dir = "desc" },
    @{ key = "prevMonthUp";     f = "prev$suffix";     dir = "desc" },
    @{ key = "prevMonthDown";   f = "prev$suffix";     dir = "asc"  },
    @{ key = "winRate10y";      f = "score";           dir = "desc" },
    @{ key = "rsi";             f = "rsi$suffix";      dir = "desc" },
    @{ key = "creditRating";    f = "rate";            dir = "desc" }
  )
}

function Evaluate($rows, $period) {
  $retF = "mret"; $topN = 50
  if ($period -eq "year") { $retF = "yret"; $topN = 50 }
  if ($period -eq "week") { $retF = "wret"; $topN = 50 }
  if ($period -eq "day") { $retF = "dret"; $topN = 50 }
  $withRet = @($rows | Where-Object { $null -ne $_.$retF })
  $byRet = @($withRet | Sort-Object $retF -Descending)
  if ($byRet.Count -lt ($topN * 3)) { return @() }
  $upSet = @{}; foreach ($x in $byRet[0..($topN-1)]) { $upSet[$x.sym] = 1 }
  $dnSet = @{}; foreach ($x in $byRet[($byRet.Count-$topN)..($byRet.Count-1)]) { $dnSet[$x.sym] = 1 }
  $suffix = "_m"; if ($period -eq "year") { $suffix = "_y" }; if ($period -eq "week") { $suffix = "_w" }; if ($period -eq "day") { $suffix = "_d" }
  $metrics = MetricDefs $suffix
  $out = @()
  foreach ($m in $metrics) {
    $f = $m.f
    $valid = @($withRet | Where-Object { $null -ne $_.$f })
    if ($valid.Count -lt 150) { continue }
    $sorted = $null
    if ($m.dir -eq "desc") { $sorted = @($valid | Sort-Object $f -Descending) } else { $sorted = @($valid | Sort-Object $f) }
    $top = @($sorted[0..([Math]::Min(99, $sorted.Count-1))] | ForEach-Object { $_.sym })
    $bot = @($sorted[([Math]::Max(0, $sorted.Count-100))..($sorted.Count-1)] | ForEach-Object { $_.sym })
    $a = 0; foreach ($s in $top) { if ($upSet.ContainsKey($s)) { $a++ } }
    $b = 0; foreach ($s in $bot) { if ($dnSet.ContainsKey($s)) { $b++ } }
    $out += [PSCustomObject]@{ key = $m.key; n = $valid.Count; top = $a; bot = $b; tot = ($a + $b); exp = [Math]::Round($topN * 100.0 / $valid.Count, 1) }
  }
  return @($out | Sort-Object tot -Descending)
}

# Auto-track support (2026-09-05, revised per user: use CURRENT values/ranks): the top-3 metric KEYS come from
# each period's correlation eval, but ranks/values shown are TODAY's scores (suffix only selects the momentum window).
function MetricDefsNow($suffix) {
  $prevF = "mret"; if ($suffix -eq "_w") { $prevF = "wret" }; if ($suffix -eq "_d") { $prevF = "dret" }
  return @(
    @{ key = "revenueGrowth";   f = "revG";      dir = "desc" },
    @{ key = "netIncomeGrowth"; f = "netG";      dir = "desc" },
    @{ key = "dividendYield";   f = "div_now";   dir = "desc" },
    @{ key = "debtRatio";       f = "debt";      dir = "asc"  },
    @{ key = "cashFlowGrowth";  f = "cashG";     dir = "desc" },
    @{ key = "marketCap";       f = "mcap_now";  dir = "desc" },
    @{ key = "operatingMargin"; f = "opm";       dir = "desc" },
    @{ key = "per";             f = "per_now";   dir = "asc"  },
    @{ key = "roe";             f = "roe";       dir = "desc" },
    @{ key = "week52High";      f = "w52_now";   dir = "desc" },
    @{ key = "week52Low";       f = "w52_now";   dir = "asc"  },
    @{ key = "dollarVolume";    f = "dv5_now";   dir = "desc" },
    @{ key = "prevMonthUp";     f = $prevF;      dir = "desc" },
    @{ key = "prevMonthDown";   f = $prevF;      dir = "asc"  },
    @{ key = "winRate10y";      f = "score";     dir = "desc" },
    @{ key = "rsi";             f = "rsi_now";   dir = "desc" },
    @{ key = "creditRating";    f = "rate";      dir = "desc" }
  )
}
function AutotrackRanks($rows, $evalList, $suffix) {
  $defs = MetricDefsNow $suffix
  $keys = @($evalList | Select-Object -First 3 | ForEach-Object { $_.key })
  $out = [ordered]@{ keys = $keys; n = [ordered]@{}; ranks = [ordered]@{} }
  foreach ($k in $keys) {
    $def = $defs | Where-Object { $_.key -eq $k } | Select-Object -First 1
    if (-not $def) { continue }
    $f = $def.f
    $valid = @($rows | Where-Object { $null -ne $_.$f })
    $sorted = $null
    if ($def.dir -eq "desc") { $sorted = @($valid | Sort-Object $f -Descending) } else { $sorted = @($valid | Sort-Object $f) }
    $out.n[$k] = $valid.Count
    for ($i = 0; $i -lt $sorted.Count; $i++) {
      $s = $sorted[$i].sym
      if (-not $out.ranks.Contains($s)) { $out.ranks[$s] = [ordered]@{} }
      # r=rank, v=actual value (shown as % / x etc.) - mcap/dollarVolume integer, others 2 decimals
      $val = $sorted[$i].$f
      if ($k -eq "marketCap" -or $k -eq "dollarVolume") { $val = [Math]::Round([double]$val, 0) } else { $val = [Math]::Round([double]$val, 2) }
      $out.ranks[$s][$k] = [ordered]@{ r = ($i + 1); v = $val }
    }
  }
  return $out
}

function BuildSide($rows, $dateKst) {
  $d = Evaluate $rows "day"; $w = Evaluate $rows "week"; $m = Evaluate $rows "month"; $y = Evaluate $rows "year"
  return [ordered]@{
    dateKst = $dateKst
    day = $d; week = $w; month = $m; year = $y
    autotrackDay = (AutotrackRanks $rows $d "_d"); autotrackWeek = (AutotrackRanks $rows $w "_w"); autotrack = (AutotrackRanks $rows $m "_m"); autotrackYear = (AutotrackRanks $rows $y "_y")
  }
}

$kst = [DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromHours(9))
$dateKst = $kst.ToString("yyyy-MM-dd")
$outPath = Join-Path $rootData "correlation-daily.json"

# start from the existing file so a single-market run keeps the other market's section
$prev = $null
try { $prev = Get-Content $outPath -Raw -Encoding UTF8 | ConvertFrom-Json } catch {}
$usSide = $null; $krSide = $null
if ($prev) {
  if ($prev.us) { $usSide = $prev.us }
  if ($prev.kr) { $krSide = $prev.kr }
}

$usCount = 0; $krCount = 0
if ($Market -eq "all" -or $Market -eq "us") {
  Write-Host "US universe..."
  $usRateFn = { param($sym) RatingScore $usRatings.$sym }
  $usRows = BuildRows (Join-Path $dataDir "sp500-sectors.json") $false $wrDb.scores $usRateFn
  $usCount = $usRows.Count
  $usSide = BuildSide $usRows $dateKst
}
if ($Market -eq "all" -or $Market -eq "kr") {
  Write-Host "KR universe..."
  $krRateFn = { param($sym) $e = $krRatingsDoc.ratings.$sym; if ($e) { RatingScore $e.rating } else { $null } }
  $krRows = BuildRows (Join-Path $dataDir "kr-sectors.json") $true $wrDb.scoresKr $krRateFn
  $krCount = $krRows.Count
  $krSide = BuildSide $krRows $dateKst
}

$outDoc = [ordered]@{
  generatedAt = [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
  dateKst = $dateKst
  us = $usSide
  kr = $krSide
}
[IO.File]::WriteAllText($outPath, ($outDoc | ConvertTo-Json -Depth 6), (New-Object System.Text.UTF8Encoding $false))
Write-Host "DONE_MARKER market=$Market us=$usCount kr=$krCount -> $outPath"
