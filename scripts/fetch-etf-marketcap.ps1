# ETF 시가총액(순자산) DB 생성 스크립트 (2026-09-01)
# ETF 시총은 자주 안 바뀌므로 실시간 API 대신 data/etf-marketcap.json(정적 DB)으로 관리한다(사용자 요청).
# - 한국: 네이버 금융 ETF 목록 API(전체, 시총 억원 단위) → 전 종목 저장
# - 미국: 야후 top_etfs_us 스크리너(netAssets, 250개) + 스크리너에 빠진 대형 ETF는 근사치 표로 보완
# 갱신 방법: 이 스크립트를 다시 실행하고 data/etf-marketcap.json을 커밋하면 됨(분기 1회 정도면 충분).
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/fetch-etf-marketcap.ps1

$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$root = Join-Path $PSScriptRoot ".."
$outPath = Join-Path $root "data\etf-marketcap.json"

# ---------- 한국: 네이버 ETF 목록(시총순) ----------
Write-Host "네이버 ETF 목록 조회 중..."
$naver = Invoke-RestMethod -Uri 'https://finance.naver.com/api/sise/etfItemList.nhn' -TimeoutSec 20 -Headers @{ 'User-Agent' = 'Mozilla/5.0' }
$krItems = $naver.result.etfItemList | Where-Object { $_.itemcode } | Sort-Object -Property marketSum -Descending
$kr = @()
foreach ($it in $krItems) {
  $kr += [ordered]@{ s = "$($it.itemcode).KS"; n = $it.itemname; m = [double]$it.marketSum } # m = 시총(억원)
}
Write-Host "  -> 한국 ETF $($kr.Count)개"

# ---------- 미국: 야후 스크리너 netAssets + 대형 ETF 근사치 보완 ----------
# 아래 근사치 표($B)는 app.js의 US_ETF_AUM_APPROX_B와 같은 값 — 스크리너 풀(top_etfs_us)엔 SPY·VOO 등
# 초대형 ETF가 빠져 있어 이 표로 보완한다. 값이 크게 달라지면 여기와 app.js 큐레이션 목록을 함께 갱신할 것.
$approxB = @{
  SPY = 630; IVV = 640; VOO = 700; VTI = 490; VUG = 180; IEFA = 145; BND = 130; AGG = 130; IWF = 120; IBIT = 80
  SPLG = 75; IJH = 100; IEMG = 100; VXUS = 105; VWO = 110; VIG = 110; IJR = 90; SCHD = 70; ITOT = 70; RSP = 75
  IVW = 65; SGOV = 45; IWM = 80; QQQM = 60; BIL = 35; VO = 85; SCHX = 60; TLT = 50; IWD = 65; VYM = 65
  EFA = 55; JEPI = 40; VB = 65; DIA = 40; QUAL = 50; VT = 45; JEPQ = 30; SCHG = 45; LQD = 30; VCIT = 55
  MUB = 40; JPST = 30; DGRO = 30; XLF = 50; VCSH = 45; MBB = 35; GOVT = 27; IEF = 35; USMV = 25; SCHF = 45
  SCHB = 35; DFAC = 35; VTEB = 35; XLV = 40; IXUS = 40; VNQ = 35; IUSB = 35; SHY = 25; BSV = 35; COWZ = 25
  VGIT = 30; AVUV = 20; IWB = 40; IWR = 35; MGK = 25; SHV = 20; BIV = 20; EMB = 15; VOOG = 15; SPYG = 25
  SPYV = 25; USFR = 15; PFF = 15; MDY = 20; VHT = 18; FBTC = 20; GLDM = 15; VDC = 12; ACWI = 20; EWJ = 15
  VV = 15; DVY = 20; FTEC = 12; VBR = 30; SDY = 20; NOBL = 12; QQQ = 460; GLD = 130; XLK = 85; SMH = 30
  IAU = 45; XLE = 35; TQQQ = 25; MOAT = 12
}

Write-Host "야후 ETF 스크리너(netAssets) 조회 중..."
$usMap = @{}
try {
  $scr = Invoke-RestMethod -Uri 'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=US&scrIds=top_etfs_us&count=250' -TimeoutSec 20 -Headers @{ 'User-Agent' = 'Mozilla/5.0' }
  foreach ($q in $scr.finance.result[0].quotes) {
    if ($q.symbol -and $q.netAssets) { $usMap[$q.symbol] = [double]$q.netAssets }
  }
  Write-Host "  -> 스크리너에서 $($usMap.Count)개 netAssets 확보"
} catch {
  Write-Host "  ⚠️ 스크리너 조회 실패($($_.Exception.Message)) — 근사치 표만 사용"
}
foreach ($t in $approxB.Keys) {
  if (-not $usMap.ContainsKey($t)) { $usMap[$t] = [double]$approxB[$t] * 1e9 }
}
$us = @()
foreach ($kv in ($usMap.GetEnumerator() | Sort-Object -Property Value -Descending)) {
  $us += [ordered]@{ s = $kv.Key; a = [math]::Round($kv.Value) } # a = 순자산(USD)
}
Write-Host "  -> 미국 ETF $($us.Count)개"

$out = [ordered]@{
  updatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  kr        = $kr
  us        = $us
}
$json = $out | ConvertTo-Json -Depth 4 -Compress
[System.IO.File]::WriteAllText((Join-Path (Resolve-Path $root) "data\etf-marketcap.json"), $json, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "저장 완료: $outPath"
Write-Host "ALL_DONE"
