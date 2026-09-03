# 지도(sector-map)에 "상승압력" "투자안정" 두 점수를 추가하기 위한 배치 수집 스크립트 (2026-08-26 추가)
# 본체(app.js)의 computeAttractivenessScore(상승압력)·computeRiskScore(투자안정) 공식을 그대로 PowerShell로
# 재구현해서(로컬에 Node.js가 없어 이 프로젝트 기존 배치 스크립트 관례대로 PowerShell 사용) 지도의 850개 종목
# 전체에 대해 계산한다. 신용등급표(TICKER_CREDIT_RATING, app.js에서 브라우저 JS엔진으로 1회 추출해
# us-credit-ratings.json으로 저장해둠)·KODEX200 편입비중·국내 신용등급(data/kr-credit-rating.json)을 그대로 사용.
# 종목당 API 호출 2회(차트 1y + fundamentals-timeseries) x 약 850종목 — 시간이 꽤 걸림(백그라운드 실행 권장).
# 완료 후 kr-data-core.js/-extra.js, sp500-data-core.js/-extra.js를 별도 스크립트로 재생성해야 지도에 반영됨.

$ProgressPreference = 'SilentlyContinue'
$headers = @{ "User-Agent" = "Mozilla/5.0" }
$scriptDir = $PSScriptRoot
$root = Join-Path $scriptDir "..\.."

# ---------- 정적 상수 로드 ----------
$usCreditRatingsRaw = Get-Content -Path (Join-Path $scriptDir "us-credit-ratings.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$US_CREDIT_RATING = @{}
foreach ($p in $usCreditRatingsRaw.PSObject.Properties) { $US_CREDIT_RATING[$p.Name] = $p.Value }

$krCreditRaw = Get-Content -Path (Join-Path $root "data\kr-credit-rating.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$KR_CREDIT_RATING_MAP = @{}
foreach ($p in $krCreditRaw.ratings.PSObject.Properties) { $KR_CREDIT_RATING_MAP[$p.Name] = $p.Value }
$KR_PREFERRED_SHARE_MAP = @{}
if ($krCreditRaw._preferredShareMap) {
  foreach ($p in $krCreditRaw._preferredShareMap.PSObject.Properties) { $KR_PREFERRED_SHARE_MAP[$p.Name] = $p.Value }
}

$CREDIT_RATING_SCORE = @{ "AAA" = 4; "AA+" = 3.5; "AA" = 3; "AA-" = 2.5; "A+" = 2; "A" = 1.5; "A-" = 1; "BBB+" = 0.5 }
$KODEX200_WEIGHTS = @{
  "005930.KS" = 32.72; "000660.KS" = 25.44; "402340.KS" = 2.48; "105560.KS" = 1.73; "009150.KS" = 1.67
  "005380.KS" = 1.63; "055550.KS" = 1.41; "086790.KS" = 1.05; "068270.KS" = 1.02; "000270.KS" = 1.0
}
$NO_DEBT_RATING = "회사채 없음"
$UNRATED_REASON = "미평가"
$US_TOTAL_MARKET_CAP_ESTIMATE = 87.4e12

$YEAR_SECONDS = 365.25 * 24 * 3600
$HISTORY_TOLERANCE_SECONDS = 20 * 24 * 3600
$THREE_MONTH_SECONDS = 91 * 24 * 3600
$MOMENTUM_TOLERANCE_SECONDS = 10 * 24 * 3600

function Clamp($v, $min, $max) {
  if ($v -lt $min) { return $min }
  if ($v -gt $max) { return $max }
  return $v
}

# ---------- 차트 헬퍼 ----------
function Get-ClosePairs($chart) {
  $result = $chart.chart.result[0]
  if (-not $result) { return @() }
  $timestamps = $result.timestamp
  $closes = $result.indicators.quote[0].close
  $pairs = @()
  for ($i = 0; $i -lt $timestamps.Count; $i++) {
    if ($null -ne $closes[$i]) { $pairs += [PSCustomObject]@{ t = $timestamps[$i]; c = $closes[$i] } }
  }
  return $pairs | Sort-Object t
}

function Get-DollarVolumePairs($chart) {
  $result = $chart.chart.result[0]
  if (-not $result) { return @() }
  $timestamps = $result.timestamp
  $closes = $result.indicators.quote[0].close
  $volumes = $result.indicators.quote[0].volume
  $pairs = @()
  for ($i = 0; $i -lt $timestamps.Count; $i++) {
    if ($null -ne $closes[$i] -and $null -ne $volumes[$i]) {
      $pairs += [PSCustomObject]@{ t = $timestamps[$i]; dv = $closes[$i] * $volumes[$i] }
    }
  }
  return $pairs | Sort-Object t
}

function Get-ClosestPair($pairs, $target) {
  $closest = $null
  $minDiff = [double]::PositiveInfinity
  foreach ($p in $pairs) {
    $diff = [math]::Abs($p.t - $target)
    if ($diff -lt $minDiff) { $minDiff = $diff; $closest = $p }
  }
  return $closest
}

function Get-1yReturn($chart) {
  $pairs = Get-ClosePairs $chart
  if ($pairs.Count -lt 2) { return $null }
  $latest = $pairs[$pairs.Count - 1]
  $target = $latest.t - $YEAR_SECONDS
  if ($pairs[0].t -gt ($target + $HISTORY_TOLERANCE_SECONDS)) { return $null }
  $base = Get-ClosestPair $pairs $target
  if (-not $base -or -not $base.c) { return $null }
  return (($latest.c - $base.c) / $base.c) * 100
}

function Get-3MonthReturn($chart) {
  $pairs = Get-ClosePairs $chart
  if ($pairs.Count -lt 2) { return $null }
  $latest = $pairs[$pairs.Count - 1]
  $target = $latest.t - $THREE_MONTH_SECONDS
  if ($pairs[0].t -gt ($target + $MOMENTUM_TOLERANCE_SECONDS)) { return $null }
  $base = Get-ClosestPair $pairs $target
  if (-not $base -or -not $base.c) { return $null }
  return (($latest.c - $base.c) / $base.c) * 100
}

function Get-DollarVolumeStats($chart) {
  $pairs = Get-DollarVolumePairs $chart
  if ($pairs.Count -eq 0) { return @{ recent5dAvg = $null; avg1y = $null; avg3m = $null } }
  $latest = $pairs[$pairs.Count - 1]
  $latestIndex = $pairs.Count - 1
  $startIdx = [math]::Max(0, $latestIndex - 4)
  $recentSlice = $pairs[$startIdx..$latestIndex]
  $recent5dAvg = ($recentSlice | Measure-Object -Property dv -Average).Average
  $target = $latest.t - $YEAR_SECONDS
  $windowValues = $pairs | Where-Object { $_.t -le $latest.t -and $_.t -ge ($target - $HISTORY_TOLERANCE_SECONDS) }
  $avg1y = if ($windowValues.Count -gt 0) { ($windowValues | Measure-Object -Property dv -Average).Average } else { $null }
  # 최근 3개월 평균 거래대금 — 상승압력 공통 배점 ①(2026-09-03 통일) 입력
  $window3m = $pairs | Where-Object { $_.t -ge ($latest.t - 91 * 24 * 3600) }
  $avg3m = if ($window3m.Count -gt 0) { ($window3m | Measure-Object -Property dv -Average).Average } else { $null }
  return @{ recent5dAvg = $recent5dAvg; avg1y = $avg1y; avg3m = $avg3m }
}

# 최근 1개월 수익률 — 상승압력 공통 배점 ②(한달상승) 입력
function Get-1MonthReturn($chart) {
  $pairs = Get-ClosePairs $chart
  if ($pairs.Count -lt 2) { return $null }
  $latest = $pairs[$pairs.Count - 1]
  $target = $latest.t - 30 * 24 * 3600
  if ($pairs[0].t -gt ($target + $MOMENTUM_TOLERANCE_SECONDS)) { return $null }
  $base = Get-ClosestPair $pairs $target
  if (-not $base -or -not $base.c) { return $null }
  return (($latest.c - $base.c) / $base.c) * 100
}

# ---------- 재무제표 헬퍼 ----------
function Get-FundamentalSeries($blocks, $key) {
  $items = @()
  foreach ($block in $blocks) {
    $series = $block.$key
    if ($series) {
      foreach ($it in $series) {
        if ($it.asOfDate -and $null -ne $it.reportedValue.raw) {
          $items += [PSCustomObject]@{ date = [datetime]$it.asOfDate; value = $it.reportedValue.raw }
        }
      }
    }
  }
  return $items | Sort-Object date
}

function Get-LastVal($series) {
  if ($series -and $series.Count -gt 0) { return $series[$series.Count - 1].value }
  return $null
}

function Get-LatestQuarterYoY($series) {
  if (-not $series -or $series.Count -lt 5) { return $null }
  $latest = $series[$series.Count - 1].value
  $yearAgo = $series[$series.Count - 5].value
  if (-not $yearAgo) { return $null }
  return (($latest - $yearAgo) / [math]::Abs($yearAgo)) * 100
}

# ---------- 점수 계산 (app.js와 동일 공식) ----------
# 상승압력 공통 배점(2026-09-03 사용자 통일 — app.js computeAttractivenessScore와 동일, 주식·ETF·코인 공통):
# ①거래량(0~3): 5거래일 평균 거래대금÷3개월 평균 3배 만점·0.5배 0점(3개월 평균 없으면 1년 평균 대체)
# ②한달상승(0~3): 최근 1개월 상승률 50% 만점·0% 0점 ③RSI(0~4): 주간 RSI 70 만점·30 0점(없으면 중립 2점)
function Get-AttractivenessScore($recentDollarVolume, $avgDollarVolume3m, $avgDollarVolume1y, $monthReturn, $rsiWeekly) {
  $volumeScore = 1.5
  $baseDv = if ($null -ne $avgDollarVolume3m -and $avgDollarVolume3m -gt 0) { $avgDollarVolume3m } else { $avgDollarVolume1y }
  if ($null -ne $recentDollarVolume -and $baseDv) {
    $volumeScore = Clamp ((3 * ($recentDollarVolume / $baseDv - 0.5)) / 2.5) 0 3
  }
  $monthScore = 0
  if ($null -ne $monthReturn) { $monthScore = Clamp (($monthReturn / 50) * 3) 0 3 }
  $rsiScore = 2
  if ($null -ne $rsiWeekly) { $rsiScore = Clamp ((4 * ($rsiWeekly - 30)) / 40) 0 4 }
  return [math]::Round((Clamp ($volumeScore + $monthScore + $rsiScore) 0 10), 1)
}

function Is-KrTicker($symbol) {
  return ($symbol.EndsWith(".KS") -or $symbol.EndsWith(".KQ"))
}

function Get-RiskScore($symbol, $oneYearReturn, $netIncome, $revenue, $marketCap, $sp500Return, $kospi200Return) {
  $isKr = Is-KrTicker $symbol
  $benchmarkReturn = if ($isKr) { $kospi200Return } else { $sp500Return }

  $creditScore = 1
  if ($isKr) {
    $krSymbol = if ($KR_PREFERRED_SHARE_MAP.ContainsKey($symbol)) { $KR_PREFERRED_SHARE_MAP[$symbol] } else { $symbol }
    if ($KR_CREDIT_RATING_MAP.ContainsKey($krSymbol)) {
      # ⚠️ kr-credit-rating.json의 ratings 항목은 {name, rating, ...} 객체라 .rating을 꺼내야 함 —
      # 객체 자체를 문자열과 비교하면 전부 불일치해 등급 보유 종목이 모조리 0점 처리되는 버그가 있었음(2026-09-01 수정)
      $rating = $KR_CREDIT_RATING_MAP[$krSymbol].rating
      if ($rating -eq "회사채없음") { $creditScore = 4 }
      elseif ($rating -eq "미평가") { $creditScore = 0 }
      elseif ($null -ne $rating -and $CREDIT_RATING_SCORE.ContainsKey($rating)) { $creditScore = $CREDIT_RATING_SCORE[$rating] }
      else { $creditScore = 0 }
    }
  } else {
    if ($US_CREDIT_RATING.ContainsKey($symbol)) {
      $rating = $US_CREDIT_RATING[$symbol]
      if ($rating -eq $NO_DEBT_RATING) { $creditScore = 2 }
      elseif ($rating -eq $UNRATED_REASON) { $creditScore = 1 }
      elseif ($CREDIT_RATING_SCORE.ContainsKey($rating)) { $creditScore = $CREDIT_RATING_SCORE[$rating] }
      else { $creditScore = 0 }
    }
  }

  $marketScore = 1
  if ($null -ne $oneYearReturn -and $null -ne $benchmarkReturn) {
    $relDiff = [math]::Abs($benchmarkReturn - $oneYearReturn)
    $marketScore = Clamp (2 * (1 - $relDiff / 200)) 0 2
  }

  $marginScore = 1
  if ($null -ne $revenue -and $revenue -gt 0 -and $null -ne $netIncome) {
    $netMargin = $netIncome / $revenue
    if ($netMargin -lt 0) { $marginScore = 0 }
    elseif ($isKr) { $marginScore = Clamp (($netMargin / 0.35) * 2) 0 2 }
    else { $marginScore = Clamp ((2 / 3) * (0.5 + $netMargin * 5)) 0 2 }
  }

  $vtsaxScore = 0.1
  if ($isKr) {
    $krSymbol = if ($KR_PREFERRED_SHARE_MAP.ContainsKey($symbol)) { $KR_PREFERRED_SHARE_MAP[$symbol] } else { $symbol }
    if ($KODEX200_WEIGHTS.ContainsKey($krSymbol)) {
      $vtsaxScore = Clamp (($KODEX200_WEIGHTS[$krSymbol] / 3) * 2) 0 2
    } else {
      $vtsaxScore = 0
    }
  } elseif ($null -ne $marketCap) {
    $vtsaxWeightPct = ($marketCap / $US_TOTAL_MARKET_CAP_ESTIMATE) * 100
    $vtsaxScore = Clamp (($vtsaxWeightPct / 6) * 2) 0 2
  }

  return [math]::Round((Clamp ($creditScore + $marketScore + $marginScore + $vtsaxScore) 0 10), 1)
}

# ---------- Yahoo 조회 ----------
function Get-Chart($symbol, $range) {
  $uri = "https://query1.finance.yahoo.com/v8/finance/chart/$symbol`?range=$range&interval=1d"
  return Invoke-RestMethod -Uri $uri -Headers $headers -TimeoutSec 15
}

$now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$fiveYearsAgo = $now - 5 * 365 * 24 * 3600
function Get-Fundamentals($symbol) {
  $types = "annualTotalRevenue,annualNetIncome,quarterlyTotalRevenue"
  $uri = "https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/$symbol`?type=$types&period1=$fiveYearsAgo&period2=$now&merge=false&lang=en-US&region=US"
  return Invoke-RestMethod -Uri $uri -Headers $headers -TimeoutSec 15
}

function Update-MomentumScores($dataPath, $sp500Return, $kospi200Return) {
  $data = Get-Content -Path $dataPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $testLimit = [int]($env:TEST_LIMIT)
  $companies = if ($testLimit -gt 0) { $data.companies[0..($testLimit - 1)] } else { $data.companies }
  Write-Host "=== $dataPath : $($companies.Count)개 종목 처리 시작 ==="
  $done = 0
  $failed = 0
  foreach ($c in $companies) {
    $sym = $c.symbol
    try {
      $chart = Get-Chart $sym "1y"
      $oneYearReturn = Get-1yReturn $chart
      $monthReturn = Get-1MonthReturn $chart
      $dvStats = Get-DollarVolumeStats $chart

      Start-Sleep -Milliseconds 60
      $fund = Get-Fundamentals $sym
      $blocks = $fund.timeseries.result
      $revASeries = Get-FundamentalSeries $blocks "annualTotalRevenue"
      $niASeries = Get-FundamentalSeries $blocks "annualNetIncome"
      $revenue = Get-LastVal $revASeries
      $netIncome = Get-LastVal $niASeries

      # RSI는 스냅샷에 이미 병합돼 있는 주간 RSI(fetch-winrate-scores.ps1 산출)를 그대로 사용
      $pressureScore = Get-AttractivenessScore $dvStats.recent5dAvg $dvStats.avg3m $dvStats.avg1y $monthReturn $c.rsiWeekly
      $stabilityScore = Get-RiskScore $sym $oneYearReturn $netIncome $revenue $c.marketCap $sp500Return $kospi200Return

      $c | Add-Member -NotePropertyName pressureScore -NotePropertyValue $pressureScore -Force
      $c | Add-Member -NotePropertyName stabilityScore -NotePropertyValue $stabilityScore -Force
    } catch {
      $failed++
      $c | Add-Member -NotePropertyName pressureScore -NotePropertyValue $null -Force
      $c | Add-Member -NotePropertyName stabilityScore -NotePropertyValue $null -Force
    }
    $done++
    if ($done % 50 -eq 0) { Write-Host "   - $done / $($companies.Count) 완료 (실패 $failed)" }
    Start-Sleep -Milliseconds 90
  }
  if ($testLimit -gt 0) {
    $outPath = $dataPath -replace '\.json$', '.test-output.json'
    @{ companies = $companies } | ConvertTo-Json -Depth 6 | Set-Content -Path $outPath -Encoding utf8
    Write-Host "   -> [TEST] 완료: $done 건, 실패: $failed 건. $outPath 저장됨(원본 미변경)"
  } else {
    $data.companies = $companies
    $data | Add-Member -NotePropertyName momentumScoresUpdatedAt -NotePropertyValue ((Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")) -Force
    $data | ConvertTo-Json -Depth 6 | Set-Content -Path $dataPath -Encoding utf8
    Write-Host "   -> 완료: $done 건, 실패: $failed 건. $dataPath 저장됨"
  }
}

Write-Host "벤치마크(S&P500 1y, KOSPI200 2y) 조회 중..."
$sp500Chart = Get-Chart "%5EGSPC" "1y"
$kospi200Chart = Get-Chart "%5EKS200" "2y"
$sp500Return = Get-1yReturn $sp500Chart
$kospi200Return = Get-1yReturn $kospi200Chart
Write-Host "   S&P500 1y수익률=$sp500Return, KOSPI200 1y수익률=$kospi200Return"

# ONLY 환경변수로 한쪽만 재계산 가능(us | kr) — 미지정 시 둘 다
if ($env:ONLY -ne "kr") { Update-MomentumScores "$PSScriptRoot\..\data\sp500-sectors.json" $sp500Return $kospi200Return }
if ($env:ONLY -ne "us") { Update-MomentumScores "$PSScriptRoot\..\data\kr-sectors.json" $sp500Return $kospi200Return }

Write-Host "ALL_DONE"


