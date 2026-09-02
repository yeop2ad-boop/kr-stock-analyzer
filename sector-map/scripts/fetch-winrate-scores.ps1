# 승률점수(월간 승률) + 주간 RSI(14) 배치 수집 스크립트 (2026-09-02 신설, 같은 날 RSI·지도 병합 확장)
# [승률점수] 최근 10년(최대 120개월) 동안 월봉 종가가 전월 대비 상승한 개월 수 / 총 개월 수 * 100 (소수 1자리)
#   상장 10년 미만 종목은 상장(데이터 시작) 이후 개월만으로 계산. 진행 중인 이번 달(미완성 월봉)은 제외.
# [RSI] 주봉 3년치(약 156개)로 와일더 방식 RSI(14) — 본체 app.js computeWilderRsi와 동일 공식, 진행 중인 주봉 포함.
# 결과 1: data/winrate-scores-us.json (본체 상세 승률점수/RSI 섹션 + 시장동향 순위가 사용)
# 결과 2: sector-map/data/sp500-sectors.json에 winRateScore/rsiWeekly 필드 병합 (지도 10년승률·RSI 필터 칩용)
#   — 병합 후 regenerate-core-extra.ps1을 실행해야 sp500-data-core/-extra.js에 반영됨.
# 야간 워크플로(daily-sp500-data.yml)가 fetch-momentum-scores 다음, regenerate-core-extra 전에 매일 실행.

$ProgressPreference = 'SilentlyContinue'
$headers = @{ "User-Agent" = "Mozilla/5.0" }
$scriptDir = $PSScriptRoot
$dataDir = Join-Path (Split-Path $scriptDir -Parent) "data"
$rootDataDir = Join-Path (Split-Path (Split-Path $scriptDir -Parent) -Parent) "data"

$sectorsPath = Join-Path $dataDir "sp500-sectors.json"
$sectorsRaw = Get-Content -Path $sectorsPath -Raw -Encoding UTF8 | ConvertFrom-Json
$symbols = @($sectorsRaw.companies | ForEach-Object { $_.symbol } | Where-Object { $_ } | Sort-Object -Unique)
Write-Output ("대상 종목 수: {0}" -f $symbols.Count)

# 와일더 방식 RSI — 첫 period개 변화량 단순평균 후 지수평활 (본체 computeWilderRsi와 동일)
function Compute-WilderRsi($closes, $period) {
  if (-not $closes -or $closes.Count -lt ($period + 1)) { return $null }
  $gain = 0.0; $loss = 0.0
  for ($i = 1; $i -le $period; $i++) {
    $d = $closes[$i] - $closes[$i - 1]
    if ($d -gt 0) { $gain += $d } else { $loss -= $d }
  }
  $avgGain = $gain / $period
  $avgLoss = $loss / $period
  for ($i = $period + 1; $i -lt $closes.Count; $i++) {
    $d = $closes[$i] - $closes[$i - 1]
    $g = 0.0; $l = 0.0
    if ($d -gt 0) { $g = $d } else { $l = -$d }
    $avgGain = ($avgGain * ($period - 1) + $g) / $period
    $avgLoss = ($avgLoss * ($period - 1) + $l) / $period
  }
  if ($avgLoss -eq 0) { return 100.0 }
  return 100.0 - 100.0 / (1.0 + $avgGain / $avgLoss)
}

function Get-SortedClosePairs($resp) {
  $r = $resp.chart.result[0]
  $ts = $r.timestamp
  $closes = $r.indicators.quote[0].close
  $pairs = New-Object System.Collections.Generic.List[object]
  for ($i = 0; $i -lt $ts.Count; $i++) {
    if ($null -ne $closes[$i]) {
      $pairs.Add([PSCustomObject]@{ t = [int64]$ts[$i]; c = [double]$closes[$i] })
    }
  }
  return @($pairs | Sort-Object t)
}

$nowUtc = [DateTimeOffset]::UtcNow
$scores = [ordered]@{}
$failed = @()
$idx = 0

foreach ($sym in $symbols) {
  $idx++
  for ($attempt = 1; $attempt -le 3; $attempt++) {
    try {
      # ---------- 승률점수 (월봉 11년) ----------
      $urlMo = "https://query1.finance.yahoo.com/v8/finance/chart/$([uri]::EscapeDataString($sym))?range=11y&interval=1mo"
      $respMo = Invoke-RestMethod -Uri $urlMo -Headers $headers -TimeoutSec 30
      $sorted = Get-SortedClosePairs $respMo

      # 진행 중인 이번 달 월봉 제외
      if ($sorted.Count -gt 0) {
        $lastDate = [DateTimeOffset]::FromUnixTimeSeconds($sorted[$sorted.Count - 1].t)
        if ($lastDate.Year -eq $nowUtc.Year -and $lastDate.Month -eq $nowUtc.Month) {
          $sorted = $sorted[0..($sorted.Count - 2)]
        }
      }
      # 최근 121개 종가 -> 최대 120회 월간 비교
      if ($sorted.Count -gt 121) { $sorted = $sorted[($sorted.Count - 121)..($sorted.Count - 1)] }

      $up = 0
      for ($i = 1; $i -lt $sorted.Count; $i++) {
        if ($sorted[$i].c - $sorted[$i - 1].c -gt 0) { $up++ }
      }
      $total = $sorted.Count - 1
      if ($total -lt 6) { throw "월봉 데이터 부족(total=$total)" }  # 상장 6개월 미만은 점수 무의미 -> 실패 처리

      # ---------- 주간 RSI(14) (주봉 3년) ----------
      $rsi = $null
      try {
        Start-Sleep -Milliseconds 250
        $urlWk = "https://query1.finance.yahoo.com/v8/finance/chart/$([uri]::EscapeDataString($sym))?range=3y&interval=1wk"
        $respWk = Invoke-RestMethod -Uri $urlWk -Headers $headers -TimeoutSec 30
        $wkPairs = Get-SortedClosePairs $respWk
        $wkCloses = @($wkPairs | ForEach-Object { $_.c })
        $rsiRaw = Compute-WilderRsi $wkCloses 14
        if ($null -ne $rsiRaw) { $rsi = [Math]::Round($rsiRaw, 1) }
      } catch { $rsi = $null }  # RSI만 실패해도 승률점수는 저장

      $scores[$sym] = [ordered]@{
        score = [Math]::Round($up / $total * 100, 1)
        up    = $up
        total = $total
        from  = [DateTimeOffset]::FromUnixTimeSeconds($sorted[0].t).ToString("yyyy-MM")
        to    = [DateTimeOffset]::FromUnixTimeSeconds($sorted[$sorted.Count - 1].t).ToString("yyyy-MM")
        rsi   = $rsi
      }
      break
    } catch {
      if ($attempt -lt 3) { Start-Sleep -Seconds (2 * $attempt) }
      else { $failed += [PSCustomObject]@{ symbol = $sym; error = $_.Exception.Message } }
    }
  }
  if ($idx % 25 -eq 0) { Write-Output ("진행 {0}/{1} (실패 {2})" -f $idx, $symbols.Count, $failed.Count) }
  Start-Sleep -Milliseconds 250
}

# ---------- 결과 1: 본체용 DB 저장 ----------
$out = [ordered]@{
  generatedAt = $nowUtc.ToString("yyyy-MM-ddTHH:mm:ssZ")
  description = "승률점수: 최근 10년(최대 120개월) 월봉 종가 기준 상승개월수/총개월수*100(상장 10년 미만은 데이터 시작 이후만). rsi: 주간 RSI(14) 와일더 방식."
  count       = $scores.Count
  failed      = @($failed | ForEach-Object { $_.symbol })
  scores      = $scores
}
$outPath = Join-Path $rootDataDir "winrate-scores-us.json"
$json = $out | ConvertTo-Json -Depth 5
[IO.File]::WriteAllText($outPath, $json, (New-Object System.Text.UTF8Encoding $false))
Write-Output ("본체 DB 저장: {0}개, 실패 {1}개 -> {2}" -f $scores.Count, $failed.Count, $outPath)

# ---------- 결과 2: 지도용 sp500-sectors.json에 winRateScore/rsiWeekly 병합 ----------
$merged = 0
foreach ($c in $sectorsRaw.companies) {
  $entry = $scores[$c.symbol]
  if ($entry) {
    $c | Add-Member -NotePropertyName "winRateScore" -NotePropertyValue $entry.score -Force
    $c | Add-Member -NotePropertyName "rsiWeekly" -NotePropertyValue $entry.rsi -Force
    $merged++
  }
}
$sectorsJson = $sectorsRaw | ConvertTo-Json -Depth 6
[IO.File]::WriteAllText($sectorsPath, $sectorsJson, (New-Object System.Text.UTF8Encoding $false))
Write-Output ("지도 병합: {0}개 종목에 winRateScore/rsiWeekly 기록 -> {1}" -f $merged, $sectorsPath)
Write-Output "완료 — 지도 반영은 regenerate-core-extra.ps1 실행 필요"
if ($failed.Count -gt 0) { $failed | ForEach-Object { Write-Output ("실패: {0} - {1}" -f $_.symbol, $_.error) } }
