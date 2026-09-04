# 승률점수(월간 승률) + 주간 RSI(14) 배치 수집 스크립트
# (2026-09-02 신설 → 같은 날 RSI·지도 병합 확장 → 같은 날 국내주식/ETF/코인 유니버스 확장
#  → 2026-09-04 검색상세 9개 지표 표 개편: 작년승률/상승률/RSI 평균 + 최근 12개월 월간 등락 추가)
# [승률점수] 최근 10년(최대 120개월) 동안 월봉 종가가 전월 대비 상승한 개월 수 / 총 개월 수 * 100 (소수 1자리)
#   상장 10년 미만 종목은 상장(데이터 시작) 이후 개월만으로 계산. 진행 중인 이번 달(미완성 월봉)은 제외.
# [RSI] 주봉 11년치(약 570개)로 와일더 방식 RSI(14) 롤링 시리즈 — 현재값(rsi) + 520주 평균(rsi10y) + 직전 52주 평균(rsi1y).
# [추가 지표(2026-09-04)] wr1y=직전12개월 승률%, ret10y=연평균 상승률%(전체 상승률 ÷ 상장연수, 최대 10년 — 단순 나눗셈), ret1y=직전12개월 상승률%,
#   m12=최근 12개월 월간 등락% 배열(과거→최신). 검색상세 개요 9칸 표 + 12개월 승패(OX) 표에 사용.
# 유니버스 4개: 미국 S&P500(sp500-sectors.json) / 국내 코스피200+코스닥150(kr-sectors.json) /
#               ETF 200(etf-crypto-map.js ETF_MAP_DATA) / 코인 100(etf-crypto-map.js CRYPTO_MAP_DATA)
# 결과 1: data/winrate-scores-us.json — scores(미국주식, S&P500 구성 판별용으로도 사용)·scoresKr·scoresEtf·scoresCrypto 4개 맵
# 결과 2: sp500-sectors.json/kr-sectors.json/etf-crypto-map.js에 winRateScore/rsiWeekly 필드 병합(지도 필터 칩용)
#   — 주식 지도 반영은 regenerate-core-extra.ps1 추가 실행 필요(etf-crypto-map.js는 직접 병합돼 즉시 반영).
# 야간 워크플로(daily-sp500-data.yml)가 fetch-momentum-scores 다음, regenerate-core-extra 전에 매일 실행.

$ProgressPreference = 'SilentlyContinue'
$headers = @{ "User-Agent" = "Mozilla/5.0" }
$scriptDir = $PSScriptRoot
$dataDir = Join-Path (Split-Path $scriptDir -Parent) "data"
$rootDataDir = Join-Path (Split-Path (Split-Path $scriptDir -Parent) -Parent) "data"

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

# 와일더 RSI(14) 롤링 시리즈 — 첫 period개 단순평균으로 시딩 후 매 봉마다 RSI 값을 산출해 배열로 반환
function Compute-WilderRsiSeries($closes, $period) {
  if (-not $closes -or $closes.Count -lt ($period + 2)) { return $null }
  $series = New-Object System.Collections.Generic.List[double]
  $gain = 0.0; $loss = 0.0
  for ($i = 1; $i -le $period; $i++) {
    $d = $closes[$i] - $closes[$i - 1]
    if ($d -gt 0) { $gain += $d } else { $loss -= $d }
  }
  $avgGain = $gain / $period
  $avgLoss = $loss / $period
  if ($avgLoss -eq 0) { $series.Add(100.0) } else { $series.Add(100.0 - 100.0 / (1.0 + $avgGain / $avgLoss)) }
  for ($i = $period + 1; $i -lt $closes.Count; $i++) {
    $d = $closes[$i] - $closes[$i - 1]
    $g = 0.0; $l = 0.0
    if ($d -gt 0) { $g = $d } else { $l = -$d }
    $avgGain = ($avgGain * ($period - 1) + $g) / $period
    $avgLoss = ($avgLoss * ($period - 1) + $l) / $period
    if ($avgLoss -eq 0) { $series.Add(100.0) } else { $series.Add(100.0 - 100.0 / (1.0 + $avgGain / $avgLoss)) }
  }
  return $series
}

function Get-TailAverage($list, $n) {
  if (-not $list -or $list.Count -eq 0) { return $null }
  $take = [Math]::Min($n, $list.Count)
  $sum = 0.0
  for ($i = $list.Count - $take; $i -lt $list.Count; $i++) { $sum += $list[$i] }
  return [Math]::Round($sum / $take, 1)
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

# 한 유니버스(심볼 배열)를 돌면서 {score,up,total,from,to,rsi} 맵을 만들어 반환
function Get-UniverseScores($symbols, $label) {
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
        if ($sorted.Count -gt 0) {
          $lastDate = [DateTimeOffset]::FromUnixTimeSeconds($sorted[$sorted.Count - 1].t)
          if ($lastDate.Year -eq ([DateTimeOffset]::UtcNow).Year -and $lastDate.Month -eq ([DateTimeOffset]::UtcNow).Month) {
            $sorted = $sorted[0..($sorted.Count - 2)]
          }
        }
        if ($sorted.Count -gt 121) { $sorted = $sorted[($sorted.Count - 121)..($sorted.Count - 1)] }
        $up = 0
        for ($i = 1; $i -lt $sorted.Count; $i++) {
          if ($sorted[$i].c - $sorted[$i - 1].c -gt 0) { $up++ }
        }
        $total = $sorted.Count - 1
        if ($total -lt 6) { throw "월봉 데이터 부족(total=$total)" }  # 상장 6개월 미만은 점수 무의미 -> 제외

        # ---------- 추가 지표(2026-09-04): 작년승률·연평균/작년 상승률·최근 12개월 등락 ----------
        $m12 = @()      # 최근 최대 12개월 월간 등락%(과거→최신, 소수 1자리)
        $wr1y = $null   # 직전 12개월 승률%
        $ret1y = $null  # 직전 12개월 상승률%
        $ret10y = $null # 연평균 상승률% = 전체 기간 상승% ÷ 보유 연수(총개월/12)
        $tail = [Math]::Min(12, $total)
        $upRecent = 0
        for ($i = $sorted.Count - $tail; $i -lt $sorted.Count; $i++) {
          $prev = $sorted[$i - 1].c
          if ($prev -ne 0) {
            $chg = ($sorted[$i].c / $prev - 1.0) * 100.0
            $m12 += [Math]::Round($chg, 1)
            if ($chg -gt 0) { $upRecent++ }
          }
        }
        if ($m12.Count -gt 0) { $wr1y = [Math]::Round($upRecent / $m12.Count * 100, 1) }
        $base1y = $sorted[$sorted.Count - 1 - $tail].c
        if ($base1y -ne 0) { $ret1y = [Math]::Round(($sorted[$sorted.Count - 1].c / $base1y - 1.0) * 100.0, 1) }
        if ($sorted[0].c -gt 0 -and $total -ge 12) {
          # 2026-09-04 사용자 최종 확정(3차): 전체 상승률 ÷ 상장 연수(단순 연평균, 최대 10년) — "상장일부터 지금까지 년도로 나눠줘"
          $totalRet = ($sorted[$sorted.Count - 1].c / $sorted[0].c - 1.0) * 100.0
          $ret10y = [Math]::Round($totalRet / ($total / 12.0), 1)
        }

        # ---------- 주간 RSI(14) (주봉 11년 롤링 시리즈: 현재값 + 520주 평균 + 52주 평균) ----------
        $rsi = $null; $rsi10y = $null; $rsi1y = $null
        try {
          Start-Sleep -Milliseconds 250
          $urlWk = "https://query1.finance.yahoo.com/v8/finance/chart/$([uri]::EscapeDataString($sym))?range=11y&interval=1wk"
          $respWk = Invoke-RestMethod -Uri $urlWk -Headers $headers -TimeoutSec 30
          $wkPairs = Get-SortedClosePairs $respWk
          $wkCloses = @($wkPairs | ForEach-Object { $_.c })
          $rsiSeries = Compute-WilderRsiSeries $wkCloses 14
          if ($rsiSeries -and $rsiSeries.Count -gt 0) {
            $rsi = [Math]::Round($rsiSeries[$rsiSeries.Count - 1], 1)
            $rsi10y = Get-TailAverage $rsiSeries 520
            $rsi1y = Get-TailAverage $rsiSeries 52
          }
        } catch { $rsi = $null }  # RSI만 실패해도 승률점수는 저장

        $scores[$sym] = [ordered]@{
          score  = [Math]::Round($up / $total * 100, 1)
          up     = $up
          total  = $total
          from   = [DateTimeOffset]::FromUnixTimeSeconds($sorted[0].t).ToString("yyyy-MM")
          to     = [DateTimeOffset]::FromUnixTimeSeconds($sorted[$sorted.Count - 1].t).ToString("yyyy-MM")
          rsi    = $rsi
          wr1y   = $wr1y
          ret10y = $ret10y
          ret1y  = $ret1y
          rsi10y = $rsi10y
          rsi1y  = $rsi1y
          m12    = $m12
        }
        break
      } catch {
        if ($attempt -lt 3) { Start-Sleep -Seconds (2 * $attempt) }
        else { $failed += [PSCustomObject]@{ symbol = $sym; error = $_.Exception.Message } }
      }
    }
    # 주의: 함수 안에서 Write-Output을 쓰면 반환값 파이프라인에 섞여 호출부의 $result가 오염됨 — 진행 로그는 반드시 Write-Host
    if ($idx % 25 -eq 0) { Write-Host ("[{0}] 진행 {1}/{2} (실패 {3})" -f $label, $idx, $symbols.Count, $failed.Count) }
    Start-Sleep -Milliseconds 250
  }
  return @{ scores = $scores; failed = $failed }
}

# JSON 원본(companies 배열)에 winRateScore/rsiWeekly 병합해 저장
function Merge-IntoSectors($sectorsPath, $scoreMap) {
  $raw = Get-Content -Path $sectorsPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $merged = 0
  foreach ($c in $raw.companies) {
    $entry = $scoreMap[$c.symbol]
    if ($entry) {
      $c | Add-Member -NotePropertyName "winRateScore" -NotePropertyValue $entry.score -Force
      $c | Add-Member -NotePropertyName "rsiWeekly" -NotePropertyValue $entry.rsi -Force
      $c | Add-Member -NotePropertyName "ret10yAvg" -NotePropertyValue $entry.ret10y -Force
      $merged++
    }
  }
  [IO.File]::WriteAllText($sectorsPath, ($raw | ConvertTo-Json -Depth 6), (New-Object System.Text.UTF8Encoding $false))
  return $merged
}

# ---------- 유니버스 로드 ----------
$spPath = Join-Path $dataDir "sp500-sectors.json"
$krPath = Join-Path $dataDir "kr-sectors.json"
$usSymbols = @((Get-Content -Path $spPath -Raw -Encoding UTF8 | ConvertFrom-Json).companies | ForEach-Object { $_.symbol } | Where-Object { $_ } | Sort-Object -Unique)
$krSymbols = @((Get-Content -Path $krPath -Raw -Encoding UTF8 | ConvertFrom-Json).companies | ForEach-Object { $_.symbol } | Where-Object { $_ } | Sort-Object -Unique)

# etf-crypto-map.js — "const ETF_MAP_DATA = {...};\nconst CRYPTO_MAP_DATA = {...};" 형태의 JS에서 두 JSON을 추출
$etfMapPath = Join-Path $dataDir "etf-crypto-map.js"
$etfMapText = Get-Content -Path $etfMapPath -Raw -Encoding UTF8
function Extract-JsVarJson($text, $varName) {
  # 파일이 "const X = {...};" 한 줄씩(2줄)이라 줄 단위로 잘라 끝 세미콜론만 제거 — JSON 문자열 안 ";"에 안전
  $prefix = "const $varName = "
  $start = $text.IndexOf($prefix)
  if ($start -lt 0) { throw "$varName 없음" }
  $jsonStart = $start + $prefix.Length
  $lineEnd = $text.IndexOf("`n", $jsonStart)
  if ($lineEnd -lt 0) { $lineEnd = $text.Length }
  $jsonText = $text.Substring($jsonStart, $lineEnd - $jsonStart).Trim()
  if ($jsonText.EndsWith(";")) { $jsonText = $jsonText.Substring(0, $jsonText.Length - 1) }
  return $jsonText | ConvertFrom-Json
}
$etfData = Extract-JsVarJson $etfMapText "ETF_MAP_DATA"
$cryptoData = Extract-JsVarJson $etfMapText "CRYPTO_MAP_DATA"
$etfSymbols = @($etfData.companies | ForEach-Object { $_.symbol } | Where-Object { $_ } | Sort-Object -Unique)
$cryptoSymbols = @($cryptoData.companies | ForEach-Object { $_.symbol } | Where-Object { $_ } | Sort-Object -Unique)

Write-Output ("대상: 미국 {0} / 국내 {1} / ETF {2} / 코인 {3}" -f $usSymbols.Count, $krSymbols.Count, $etfSymbols.Count, $cryptoSymbols.Count)

# ---------- 수집 ----------
$us = Get-UniverseScores $usSymbols "미국"
$kr = Get-UniverseScores $krSymbols "국내"
$etf = Get-UniverseScores $etfSymbols "ETF"
$crypto = Get-UniverseScores $cryptoSymbols "코인"

# ---------- 결과 1: 본체용 DB 저장 ----------
$allFailed = @($us.failed + $kr.failed + $etf.failed + $crypto.failed)
$out = [ordered]@{
  generatedAt  = $nowUtc.ToString("yyyy-MM-ddTHH:mm:ssZ")
  description  = "승률점수: 최근 10년(최대 120개월) 월봉 종가 기준 상승개월수/총개월수*100(상장 10년 미만은 데이터 시작 이후만). rsi: 주간 RSI(14, 주봉 11년 롤링) 현재값, rsi10y=520주 평균, rsi1y=직전 52주 평균. wr1y=직전 12개월 승률%, ret10y=연평균 상승률%(전체 상승률/상장연수, 최대 10년), ret1y=직전 12개월 상승률%, m12=최근 12개월 월간 등락%(과거->최신). scores=미국 S&P500, scoresKr=코스피200+코스닥150, scoresEtf=ETF200(미국+국내), scoresCrypto=코인100."
  count        = $us.scores.Count + $kr.scores.Count + $etf.scores.Count + $crypto.scores.Count
  failed       = @($allFailed | ForEach-Object { $_.symbol })
  scores       = $us.scores
  scoresKr     = $kr.scores
  scoresEtf    = $etf.scores
  scoresCrypto = $crypto.scores
}
$outPath = Join-Path $rootDataDir "winrate-scores-us.json"
[IO.File]::WriteAllText($outPath, ($out | ConvertTo-Json -Depth 5), (New-Object System.Text.UTF8Encoding $false))
Write-Output ("본체 DB 저장: 미국 {0}/국내 {1}/ETF {2}/코인 {3}, 실패 {4} -> {5}" -f $us.scores.Count, $kr.scores.Count, $etf.scores.Count, $crypto.scores.Count, $allFailed.Count, $outPath)

# ---------- 결과 2: 지도 데이터 병합 ----------
$m1 = Merge-IntoSectors $spPath $us.scores
$m2 = Merge-IntoSectors $krPath $kr.scores
Write-Output ("지도 병합: sp500-sectors {0}건, kr-sectors {1}건" -f $m1, $m2)

# etf-crypto-map.js — 두 companies 배열에 병합 후 JS 파일 재작성
$em = 0
foreach ($c in $etfData.companies) {
  $entry = $etf.scores[$c.symbol]
  if ($entry) {
    $c | Add-Member -NotePropertyName "winRateScore" -NotePropertyValue $entry.score -Force
    $c | Add-Member -NotePropertyName "rsiWeekly" -NotePropertyValue $entry.rsi -Force
    $c | Add-Member -NotePropertyName "ret10yAvg" -NotePropertyValue $entry.ret10y -Force
    $em++
  }
}
$cm = 0
foreach ($c in $cryptoData.companies) {
  $entry = $crypto.scores[$c.symbol]
  if ($entry) {
    $c | Add-Member -NotePropertyName "winRateScore" -NotePropertyValue $entry.score -Force
    $c | Add-Member -NotePropertyName "rsiWeekly" -NotePropertyValue $entry.rsi -Force
    $c | Add-Member -NotePropertyName "ret10yAvg" -NotePropertyValue $entry.ret10y -Force
    $cm++
  }
}
$etfJson = $etfData | ConvertTo-Json -Depth 6 -Compress
$cryptoJson = $cryptoData | ConvertTo-Json -Depth 6 -Compress
[IO.File]::WriteAllText($etfMapPath, "const ETF_MAP_DATA = $etfJson;`nconst CRYPTO_MAP_DATA = $cryptoJson;`n", (New-Object System.Text.UTF8Encoding $false))
Write-Output ("etf-crypto-map.js 병합: ETF {0}건, 코인 {1}건" -f $em, $cm)
Write-Output "완료 — 주식 지도 반영은 regenerate-core-extra.ps1 실행 필요"
if ($allFailed.Count -gt 0) { $allFailed | ForEach-Object { Write-Output ("실패: {0} - {1}" -f $_.symbol, $_.error) } }
