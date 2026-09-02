# 승률점수(월간 승률) 배치 수집 스크립트 (2026-09-02 신설)
# 정의: 최근 10년(최대 120개월) 동안 월봉 종가가 전월 대비 상승한 개월 수 / 총 개월 수 * 100 (소수 1자리)
# 상장 10년 미만 종목은 상장(데이터 시작) 이후 개월만으로 계산. 진행 중인 이번 달(미완성 월봉)은 제외.
# 데이터: Yahoo 차트 API range=11y&interval=1mo. 결과는 data/winrate-scores-us.json 으로 저장.
# 재실행 방법: powershell -File fetch-winrate-scores.ps1 (전체 재수집, 약 6~10분)

$ProgressPreference = 'SilentlyContinue'
$headers = @{ "User-Agent" = "Mozilla/5.0" }
$scriptDir = $PSScriptRoot
$root = Join-Path $scriptDir "..\.."

$sectorsRaw = Get-Content -Path (Join-Path $scriptDir "..\data\sp500-sectors.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$symbols = @($sectorsRaw.companies | ForEach-Object { $_.symbol } | Where-Object { $_ } | Sort-Object -Unique)
Write-Output ("대상 종목 수: {0}" -f $symbols.Count)

$nowUtc = [DateTimeOffset]::UtcNow
$scores = [ordered]@{}
$failed = @()
$idx = 0

foreach ($sym in $symbols) {
  $idx++
  $ok = $false
  for ($attempt = 1; $attempt -le 3; $attempt++) {
    try {
      $url = "https://query1.finance.yahoo.com/v8/finance/chart/$([uri]::EscapeDataString($sym))?range=11y&interval=1mo"
      $resp = Invoke-RestMethod -Uri $url -Headers $headers -TimeoutSec 30
      $r = $resp.chart.result[0]
      $ts = $r.timestamp
      $closes = $r.indicators.quote[0].close

      $pairs = New-Object System.Collections.Generic.List[object]
      for ($i = 0; $i -lt $ts.Count; $i++) {
        if ($null -ne $closes[$i]) {
          $pairs.Add([PSCustomObject]@{ t = [int64]$ts[$i]; c = [double]$closes[$i] })
        }
      }
      $sorted = @($pairs | Sort-Object t)

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

      $score = [Math]::Round($up / $total * 100, 1)
      $scores[$sym] = [ordered]@{
        score = $score
        up    = $up
        total = $total
        from  = [DateTimeOffset]::FromUnixTimeSeconds($sorted[0].t).ToString("yyyy-MM")
        to    = [DateTimeOffset]::FromUnixTimeSeconds($sorted[$sorted.Count - 1].t).ToString("yyyy-MM")
      }
      $ok = $true
      break
    } catch {
      if ($attempt -lt 3) { Start-Sleep -Seconds (2 * $attempt) }
      else { $failed += [PSCustomObject]@{ symbol = $sym; error = $_.Exception.Message } }
    }
  }
  if ($idx % 25 -eq 0) { Write-Output ("진행 {0}/{1} (실패 {2})" -f $idx, $symbols.Count, $failed.Count) }
  Start-Sleep -Milliseconds 350
}

$out = [ordered]@{
  generatedAt = $nowUtc.ToString("yyyy-MM-ddTHH:mm:ssZ")
  description = "승률점수: 최근 10년(최대 120개월) 월봉 종가 기준 상승개월수/총개월수*100. 상장 10년 미만은 데이터 시작 이후만."
  count       = $scores.Count
  failed      = @($failed | ForEach-Object { $_.symbol })
  scores      = $scores
}

$outPath = Join-Path $root "data\winrate-scores-us.json"
$json = $out | ConvertTo-Json -Depth 5
[IO.File]::WriteAllText($outPath, $json, (New-Object System.Text.UTF8Encoding $false))
Write-Output ("완료: {0}개 저장, 실패 {1}개 -> {2}" -f $scores.Count, $failed.Count, $outPath)
if ($failed.Count -gt 0) { $failed | ForEach-Object { Write-Output ("실패: {0} - {1}" -f $_.symbol, $_.error) } }
