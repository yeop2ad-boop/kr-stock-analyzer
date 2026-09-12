# 알트코인 시즌지수 과거 이력 수집 (2026-09-12 사용자 요청)
#
# 화면(비트코인 검색상세 > 알트코인 시즌지수 > +자세히)에 쓰는 2017년 이후 주간 이력을 미리 만들어 둔다.
# 접속할 때마다 코인 100개의 주봉을 받아오면 30초씩 걸려서, 그래프는 이 배치 결과를 그대로 쓰고
# "지금 점수"만 화면에서 실시간으로 계산한다.
#
# 계산 방식(화면의 실시간 점수와 동일):
#   ① 야후 암호화폐 스크리너 시총 상위 250개를 후보로 받고
#   ② 스테이블코인·비트코인 연동(래핑) 자산·스테이킹 파생을 걸러낸 뒤 앞에서 100개를 고른다
#   ③ 2017년 1월부터의 주봉을 받아 매주 "13주 전 대비 수익률"(90일 ≈ 13주)을 구하고
#   ④ 비트코인보다 많이 오른 알트코인의 비율(0~100)을 그 주의 지수로 삼는다
#   ⑤ 75 이상이면 알트코인 시즌, 25 미만이면 비트코인 시즌
#
# 결과: data/altseason-history.json
#   { generatedAt, altCount, weeks: [ { t, btc, ltc, score, sample }, ... ] }
#   btc = 비트코인 종가, eth = 이더리움 종가(그래프의 파란 선), score = 그 주의 지수(표본 5개 미만이면 null)

param(
  [int]$PoolCount = 250,   # 후보 풀(야후 스크리너 최대치)
  [int]$Target = 100,      # 제외 후 대상 알트코인 수
  [int]$SleepMs = 120
)

$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = "Stop"
$UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
$headers = @{ "User-Agent" = $UA }
$scriptDir = $PSScriptRoot
$rootDataDir = Join-Path (Split-Path (Split-Path $scriptDir -Parent) -Parent) "data"
$fromUnix = [int64]([datetime]::new(2017, 1, 1, 0, 0, 0, [DateTimeKind]::Utc) - [datetime]::new(1970, 1, 1, 0, 0, 0, [DateTimeKind]::Utc)).TotalSeconds
$toUnix = [int64]([datetime]::UtcNow - [datetime]::new(1970, 1, 1, 0, 0, 0, [DateTimeKind]::Utc)).TotalSeconds
$WEEK = 604800
$WEEKS_90D = 13

# 화면(app.js의 altseasonExcluded)과 같은 규칙 — 한쪽만 고치면 점수와 그래프가 어긋나므로 함께 고칠 것
$ExcludeBases = @(
  "WETH", "RETH", "STETH", "WSTETH", "WBETH", "WEETH", "RSETH", "AETHWETH", "AETHUSDT",
  "JITOSOL", "BNSOL", "KHYPE", "WTRX", "WBNB", "XAUT", "PAXG"
)
function Get-BaseTicker($symbol) {
  $b = ($symbol + "").ToUpper() -replace '-USD$', ''
  return ($b -replace '\d+$', '')
}
function Test-Excluded($symbol, $rawName) {
  $base = Get-BaseTicker $symbol
  if (-not $base) { return $true }
  if ($base -eq "BTC") { return $true }          # 비교 기준 자신
  if ($base -like "*BTC*") { return $true }      # WBTC·cbBTC·BTCB·BTCT·LBTC 등 비트코인 연동
  if ($ExcludeBases -contains $base) { return $true }
  if ($base -match '^USD|USD$') { return $true } # USDT·USDC·PYUSD·RLUSD 등
  $name = (($rawName + "") -replace '\s+USD$', '').Trim()
  if (-not $name) { return $false }
  if ($name -match '(?i)usd|tether|\bdai\b|stable|dollar|gold') { return $true }
  if ($name -match '(?i)wrapped|restaked|\bstaked\b|^lido\b|rocket pool') { return $true }
  return $false
}

# 주봉 종가 → @{ 주버킷 = 종가 }
function Get-WeeklyCloses($symbol) {
  try {
    $url = "https://query1.finance.yahoo.com/v8/finance/chart/$([uri]::EscapeDataString($symbol))?period1=$fromUnix&period2=$toUnix&interval=1wk"
    $resp = Invoke-RestMethod -Uri $url -Headers $headers -TimeoutSec 30
    $res = $resp.chart.result[0]
    if (-not $res) { return $null }
    $ts = $res.timestamp; $cl = $res.indicators.quote[0].close
    if (-not $ts -or -not $cl) { return $null }
    $map = @{}
    for ($i = 0; $i -lt $ts.Count; $i++) {
      if ($null -ne $cl[$i]) {
        # 야후는 코인마다 주봉 기준 요일이 다르다(비트코인 일요일, 이더리움 월요일) — 7일 버킷으로 묶어 맞춘다
        $bucket = [int64]([Math]::Floor([double]$ts[$i] / $WEEK) * $WEEK)
        $map[$bucket] = [double]$cl[$i]
      }
    }
    return $map
  } catch { return $null }
}

Write-Host "후보 목록(시총 상위 ${PoolCount}개) 조회..."
$scr = Invoke-RestMethod -Uri "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=US&scrIds=all_cryptocurrencies_us&count=$PoolCount" -Headers $headers -TimeoutSec 40
$pool = @($scr.finance.result[0].quotes | Where-Object { $_ -and $_.symbol })
Write-Host ("   후보 {0}종목" -f $pool.Count)

$alts = @($pool | Where-Object { -not (Test-Excluded $_.symbol ($_.shortName)) } | Select-Object -First $Target)
Write-Host ("   제외 후 대상 {0}종목" -f $alts.Count)
if ($alts.Count -lt 20) { throw "대상 알트코인이 너무 적습니다($($alts.Count)개)." }

Write-Host "비트코인·이더리움 주봉..."
$btcMap = Get-WeeklyCloses "BTC-USD"
if (-not $btcMap) { throw "비트코인 주봉을 가져오지 못했습니다." }
$ethMap = Get-WeeklyCloses "ETH-USD"
if (-not $ethMap) { $ethMap = @{} }

$weeks = @($btcMap.Keys | Sort-Object)
Write-Host ("   주 {0}개 ({1} ~ {2})" -f $weeks.Count, ([datetimeoffset]::FromUnixTimeSeconds($weeks[0]).ToString("yyyy-MM-dd")), ([datetimeoffset]::FromUnixTimeSeconds($weeks[-1]).ToString("yyyy-MM-dd")))

Write-Host "알트코인 주봉 수집..."
$altMaps = @()
$idx = 0
foreach ($a in $alts) {
  $idx++
  $m = Get-WeeklyCloses $a.symbol
  if ($m -and $m.Count -gt $WEEKS_90D) { $altMaps += , $m }
  if ($idx % 20 -eq 0) { Write-Host ("   진행 {0}/{1} (확보 {2})" -f $idx, $alts.Count, $altMaps.Count) }
  Start-Sleep -Milliseconds $SleepMs
}
Write-Host ("   -> 주봉 확보 {0}종목" -f $altMaps.Count)

# 주별 지수 계산
$rows = New-Object System.Collections.Generic.List[object]
for ($i = 0; $i -lt $weeks.Count; $i++) {
  $t = $weeks[$i]
  $btc = $btcMap[$t]
  $eth = if ($ethMap.ContainsKey($t)) { [Math]::Round($ethMap[$t], 4) } else { $null }
  $score = $null
  $sample = 0
  if ($i -ge $WEEKS_90D) {
    $tPrev = $weeks[$i - $WEEKS_90D]
    $btcPrev = $btcMap[$tPrev]
    if ($btcPrev -gt 0) {
      $btcRet = $btc / $btcPrev - 1.0
      $beat = 0
      foreach ($m in $altMaps) {
        if (-not $m.ContainsKey($t) -or -not $m.ContainsKey($tPrev)) { continue }
        $p0 = $m[$tPrev]
        if ($p0 -le 0) { continue }
        $sample++
        if (($m[$t] / $p0 - 1.0) -gt $btcRet) { $beat++ }
      }
      if ($sample -ge 5) { $score = [Math]::Round($beat / $sample * 100.0, 1) }
    }
  }
  $rows.Add([ordered]@{ t = $t; btc = [Math]::Round($btc, 2); eth = $eth; score = $score; sample = $sample })
}

$outPath = Join-Path $rootDataDir "altseason-history.json"
[ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  description = "알트코인 시즌지수 주간 이력(2017~). score = 그 주 기준 90일(13주) 수익률이 비트코인보다 높은 알트코인 비율. btc/eth는 그래프용 주간 종가."
  altCount    = $altMaps.Count
  weeks       = $rows
} | ConvertTo-Json -Depth 5 -Compress | Set-Content $outPath -Encoding UTF8
$scored = @($rows | Where-Object { $null -ne $_.score })
Write-Host ("저장 -> data/altseason-history.json (주 {0}개 · 지수 산출 {1}주 · 알트 {2}종목)" -f $rows.Count, $scored.Count, $altMaps.Count)
