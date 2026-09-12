# IPO 목록에 "1년 수익률"(oneYearReturn)만 덧붙이는 보정 스크립트 (2026-09-12 사용자 요청)
#
# IPO 화면의 정렬 기준이 1년 수익률로 바뀌었는데, 기존 data/ipo-list.json에는 그 값이 없다.
# 전체 재수집(fetch-ipo-list.ps1)은 나스닥 캘린더 126개월 + 시총·홈페이지 조회까지 도는 무거운 작업이라,
# 여기서는 야후 월봉 한 번씩만 받아 oneYearReturn을 채워 넣는다(다음 정기 배치부터는 본 스크립트 없이도 값이 들어온다).
#
# 값 정의: 12개월 전 월봉 종가 대비 현재가. 상장 1년이 안 된 종목은 $null(화면에서 연평균 상승으로 대신 정렬).

param(
  [switch]$SkipUs,
  [switch]$SkipKr,
  [int]$SleepMs = 90
)

$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = "Stop"
$UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
$yahooHeaders = @{ "User-Agent" = $UA }
$scriptDir = $PSScriptRoot
$outPath = Join-Path (Join-Path (Split-Path (Split-Path $scriptDir -Parent) -Parent) "data") "ipo-list.json"

if (-not (Test-Path $outPath)) { throw "data/ipo-list.json 이 없습니다. 먼저 fetch-ipo-list.ps1 을 돌리세요." }
$db = Get-Content $outPath -Raw -Encoding UTF8 | ConvertFrom-Json

function Get-OneYearReturn($symbol) {
  try {
    $url = "https://query1.finance.yahoo.com/v8/finance/chart/$([uri]::EscapeDataString($symbol))?range=2y&interval=1mo"
    $resp = Invoke-RestMethod -Uri $url -Headers $yahooHeaders -TimeoutSec 25
    $res = $resp.chart.result[0]
    if (-not $res) { return $null }
    $ts = $res.timestamp; $cl = $res.indicators.quote[0].close
    if (-not $ts -or -not $cl) { return $null }
    $pairs = @()
    for ($i = 0; $i -lt $ts.Count; $i++) { if ($null -ne $cl[$i]) { $pairs += [PSCustomObject]@{ t = [int64]$ts[$i]; c = [double]$cl[$i] } } }
    if ($pairs.Count -lt 13) { return $null }
    $pairs = @($pairs | Sort-Object t)
    $meta = $res.meta
    $price = if ($null -ne $meta.regularMarketPrice) { [double]$meta.regularMarketPrice } else { $pairs[$pairs.Count - 1].c }
    $base = $pairs[$pairs.Count - 13].c
    if ($base -le 0) { return $null }
    return [Math]::Round(($price / $base - 1.0) * 100.0, 1)
  } catch { return $null }
}

function Patch-Rows($rows, $label) {
  $idx = 0; $filled = 0
  foreach ($r in $rows) {
    $idx++
    # 스팩·이전상장은 화면에서 기본 제외라 조회를 건너뛴다(시간 절약)
    if ($r.isSpac -or $r.isRelisted) {
      $r | Add-Member -NotePropertyName oneYearReturn -NotePropertyValue $null -Force
      continue
    }
    $v = Get-OneYearReturn $r.symbol
    $r | Add-Member -NotePropertyName oneYearReturn -NotePropertyValue $v -Force
    if ($null -ne $v) { $filled++ }
    if ($idx % 50 -eq 0) { Write-Host ("   {0} 진행 {1}/{2} (값 확보 {3})" -f $label, $idx, $rows.Count, $filled) }
    Start-Sleep -Milliseconds $SleepMs
  }
  Write-Host ("   -> {0} {1}종목 중 {2}개에 1년 수익률 채움" -f $label, $rows.Count, $filled)
}

if (-not $SkipUs -and $db.us) { Write-Host "미국 IPO 1년 수익률..."; Patch-Rows $db.us "미국" }
if (-not $SkipKr -and $db.kr) { Write-Host "한국 IPO 1년 수익률..."; Patch-Rows $db.kr "한국" }

$db.description = "최근 5년 신규 상장 종목. 미국=나스닥 IPO 캘린더, 한국=거래소 상장법인목록. 상장 첫날 종가 대비 등락률, 1년 수익률(oneYearReturn), 상장 후 월간 승률, 현재/상장 시총. isSpac=true는 스팩(기업인수목적회사)."
$db | ConvertTo-Json -Depth 5 -Compress | Set-Content $outPath -Encoding UTF8
Write-Host ("저장 -> data/ipo-list.json")
