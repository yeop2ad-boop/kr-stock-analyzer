# ETF 시가총액(순자산) DB 생성 스크립트 (2026-09-01)
# ETF 시총은 자주 안 바뀌므로 실시간 API 대신 data/etf-marketcap.json(정적 DB)으로 관리한다(사용자 요청).
# - 한국: 네이버 금융 ETF 목록 API(전체, 시총 억원 단위) → 전 종목 저장
# - 미국: 야후 top_etfs_us 스크리너(netAssets) + 스크리너에 빠진 대형 ETF는 근사치 표로 보완
#
# 2026-11-20: 9/1 이후 한 번도 안 돌아 80일 전 값이 "오늘 기준"처럼 보이던 문제 → 자동 배치(daily-sp500-data.yml)에 넣음.
#   자동으로 돌려도 안전하도록 아래를 바꿨다.
#   - 덮어쓰기 전 검증: 한국 목록이 500개 미만이거나 직전의 80% 미만, 이름이 깨졌으면(한글 없음) 파일을 그대로 둔다.
#     미국 스크리너가 실패하면(200개 미만) 미국 값은 직전 파일 것을 그대로 쓴다.
#   - 미국 스크리너를 끝까지(250개씩 여러 쪽) 읽는다. 첫 250개만 읽으면 그날그날 걸리는 종목이 달라져
#     같은 ETF가 하루는 야후 값, 하루는 근사치로 오락가락한다.
#   - 뱅가드 ETF는 근사치 표에 있으면 표 값을 쓴다. 야후 netAssets 는 뱅가드만 '펀드 전체(뮤추얼펀드 클래스 포함)' 순자산이라
#     ETF만의 규모보다 2~4배 크게 나온다(예: VOO 1.7조 달러, VTI 1.8조 달러).
#   - 네이버 응답(EUC-KR)을 직접 디코딩한다(CI의 pwsh 7·로컬 5.1 어디서나 한글 이름이 깨지지 않게).
# 수동 실행:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/fetch-etf-marketcap.ps1

$ProgressPreference = 'SilentlyContinue'
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}
$root = Split-Path $PSScriptRoot -Parent
$outPath = Join-Path (Join-Path $root "data") "etf-marketcap.json"
$ua = @{ 'User-Agent' = 'Mozilla/5.0' }

function Write-Warn($msg) { Write-Host "::warning::$msg" }

# ---------- 직전 파일 ----------
$prev = $null
if (Test-Path $outPath) {
  try { $prev = Get-Content -Path $outPath -Raw -Encoding UTF8 | ConvertFrom-Json } catch { $prev = $null }
}
$prevKrCount = 0; if ($prev -and $prev.kr) { $prevKrCount = @($prev.kr).Count }
$prevUsCount = 0; if ($prev -and $prev.us) { $prevUsCount = @($prev.us).Count }

# ---------- 한국: 네이버 ETF 목록(시총순) ----------
function Get-NaverEtfList() {
  $resp = Invoke-WebRequest -Uri 'https://finance.naver.com/api/sise/etfItemList.nhn' -TimeoutSec 30 -Headers $ua -UseBasicParsing
  $bytes = $resp.RawContentStream.ToArray()
  $text = $null
  try {
    # UTF-8로 엄격하게 읽어 보고(잘못된 바이트가 있으면 예외), 안 되면 EUC-KR
    $text = (New-Object System.Text.UTF8Encoding($false, $true)).GetString($bytes)
  } catch {
    $enc = $null
    try { $enc = [System.Text.Encoding]::GetEncoding(51949) } catch {
      # PowerShell 7(.NET) 에서 코드 페이지가 등록돼 있지 않은 경우
      try { [System.Text.Encoding]::RegisterProvider([System.Text.CodePagesEncodingProvider]::Instance) } catch {}
      $enc = [System.Text.Encoding]::GetEncoding(51949)
    }
    $text = $enc.GetString($bytes)
  }
  return ($text | ConvertFrom-Json)
}

Write-Host "네이버 ETF 목록 조회 중..."
$kr = @()
try {
  $naver = Get-NaverEtfList
  $krItems = @($naver.result.etfItemList | Where-Object { $_.itemcode -and $_.itemname -and $null -ne $_.marketSum } | Sort-Object -Property @{ Expression = { [double]$_.marketSum }; Descending = $true })
  foreach ($it in $krItems) {
    $kr += [ordered]@{ s = "$($it.itemcode).KS"; n = [string]$it.itemname; m = [double]$it.marketSum } # m = 시총(억원)
  }
} catch {
  Write-Warn "네이버 ETF 목록 조회 실패: $($_.Exception.Message)"
}
Write-Host "  -> 한국 ETF $($kr.Count)개"

$krProblems = @()
if ($kr.Count -lt 500) { $krProblems += "한국 ETF $($kr.Count)개 < 500" }
if ($prevKrCount -gt 0 -and $kr.Count -lt [math]::Ceiling($prevKrCount * 0.8)) { $krProblems += "한국 ETF $($kr.Count)개가 직전($prevKrCount)의 80% 미만" }
if ($kr.Count -gt 0) {
  $hangul = @($kr | Where-Object { $_.n -match '[가-힣]' }).Count
  $broken = @($kr | Where-Object { $_.n.Contains([string][char]0xFFFD) }).Count
  if ($hangul -lt [math]::Floor($kr.Count * 0.3) -or $broken -gt 0) { $krProblems += "이름이 깨진 것으로 보임(한글 있는 이름 $hangul/$($kr.Count), 깨진 글자 $broken)" }
  $positive = @($kr | Where-Object { $_.m -gt 0 }).Count
  if ($positive -lt [math]::Floor($kr.Count * 0.9)) { $krProblems += "시가총액이 0인 종목이 많음($positive/$($kr.Count))" }
}
if ($krProblems.Count -gt 0) {
  Write-Warn "ETF 규모 DB를 그대로 둡니다(한국 목록 비정상): $($krProblems -join ' / ')"
  Write-Host "ALL_DONE"
  exit 0
}

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
$screened = 0
$vanguardKept = @()
for ($page = 0; $page -lt 6; $page++) {
  $start = $page * 250
  $quotes = $null
  for ($attempt = 1; $attempt -le 3; $attempt++) {
    try {
      $scr = Invoke-RestMethod -Uri "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=US&scrIds=top_etfs_us&count=250&start=$start" -TimeoutSec 30 -Headers $ua
      $quotes = @($scr.finance.result[0].quotes)
      break
    } catch {
      if ($attempt -eq 3) { Write-Host "  스크리너 $start 번째부터 조회 실패($($_.Exception.Message))" }
      else { Start-Sleep -Seconds (2 * $attempt) }
    }
  }
  if ($null -eq $quotes) { break }
  foreach ($q in $quotes) {
    if (-not $q.symbol -or -not $q.netAssets) { continue }
    $sym = [string]$q.symbol
    $screened++
    $fundName = "$($q.longName) $($q.shortName)"
    if ($fundName -match 'Vanguard' -and $approxB.ContainsKey($sym)) { $vanguardKept += $sym; continue } # 뱅가드는 표 값 우선(위 설명)
    $usMap[$sym] = [double]$q.netAssets
  }
  if ($quotes.Count -lt 250) { break }
  Start-Sleep -Milliseconds 300
}
Write-Host "  -> 스크리너에서 $screened 개 netAssets 확보(뱅가드라 표 값을 쓴 것 $($vanguardKept.Count)개)"

$us = @()
if ($screened -ge 200) {
  foreach ($t in @($approxB.get_Keys())) {
    if (-not $usMap.ContainsKey($t)) { $usMap[$t] = [double]$approxB[$t] * 1e9 }
  }
  # 스크리너 구성은 날마다 조금씩 바뀐다 — 오늘 빠진 종목은 지우지 않고 직전 값을 그대로 둔다(예: XLU가 통째로 사라지는 것 방지)
  $carriedUs = 0
  if ($prev -and $prev.us) {
    foreach ($it in @($prev.us)) {
      $s = [string]$it.s
      if ($s -and $it.a -and -not $usMap.ContainsKey($s)) { $usMap[$s] = [double]$it.a; $carriedUs++ }
    }
  }
  if ($carriedUs) { Write-Host "  -> 오늘 스크리너에 없어 직전 값을 이어받은 미국 ETF $carriedUs 개" }
  foreach ($kv in ($usMap.GetEnumerator() | Sort-Object -Property @{ Expression = { $_.Value }; Descending = $true }, @{ Expression = { $_.Key }; Descending = $false })) {
    $us += [ordered]@{ s = $kv.Key; a = [math]::Round($kv.Value) } # a = 순자산(USD)
  }
} elseif ($prevUsCount -gt 0) {
  Write-Warn "야후 ETF 스크리너가 $screened 개만 돌려줘 미국 ETF 값은 직전 파일 것을 그대로 씁니다."
  foreach ($it in @($prev.us)) { $us += [ordered]@{ s = [string]$it.s; a = $it.a } }
} else {
  foreach ($t in @($approxB.get_Keys())) { $usMap[$t] = [double]$approxB[$t] * 1e9 }
  foreach ($kv in ($usMap.GetEnumerator() | Sort-Object -Property @{ Expression = { $_.Value }; Descending = $true }, @{ Expression = { $_.Key }; Descending = $false })) {
    $us += [ordered]@{ s = $kv.Key; a = [math]::Round($kv.Value) }
  }
}
Write-Host "  -> 미국 ETF $($us.Count)개"

$out = [ordered]@{
  updatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  kr        = $kr
  us        = $us
}
$json = $out | ConvertTo-Json -Depth 4 -Compress
# 되읽어 개수 확인 후 저장
$chk = $null
try { $chk = $json | ConvertFrom-Json } catch {}
if (-not $chk -or @($chk.kr).Count -ne $kr.Count -or @($chk.us).Count -ne $us.Count) {
  Write-Warn "ETF 규모 DB를 그대로 둡니다(JSON 되읽기 개수 불일치)."
  Write-Host "ALL_DONE"
  exit 0
}
[System.IO.File]::WriteAllText($outPath, $json, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "저장 완료: $outPath (한국 $($kr.Count) · 미국 $($us.Count), 직전 한국 $prevKrCount · 미국 $prevUsCount)"
Write-Host "ALL_DONE"
