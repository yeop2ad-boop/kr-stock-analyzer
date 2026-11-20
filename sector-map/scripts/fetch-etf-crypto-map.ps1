# 지도 ETF200·비트코인50 보기용 데이터 생성 스크립트 (2026-09-01)
# 미국 ETF 순자산 TOP100 + 한국 ETF 시총 TOP100(= ETF200)과 암호화폐 시총 TOP50 각각에 대해
# 종목당 야후 차트 1회(1y)로 등락률·거래대금·52주 위치·상승압력·투자안정(각 전용 배점, 본체 app.js와 동일 공식)을
# 계산해 sector-map/data/etf-crypto-map.js(ETF_MAP_DATA/CRYPTO_MAP_DATA)로 저장한다.
# 시총·순자산은 data/etf-marketcap.json(DB)을 사용. 갱신: 이 스크립트 재실행 후 커밋.
#   powershell -NoProfile -ExecutionPolicy Bypass -File sector-map/scripts/fetch-etf-crypto-map.ps1
#
# 2026-11-20: 9/13 이후 자동 배치에 들어 있지 않아 종목 명단·시가총액·52주 위치·등락률·거래대금이 9/13 값에서 멈춰 있었다
# (매일 바뀌던 것은 fetch-winrate-scores.ps1 이 덧쓰는 승률·RSI뿐) → daily-sp500-data.yml 에 넣고, 매일 돌려도 안전하게 고쳤다.
#   - 직전 파일 값 이어받기: 이 스크립트가 만들지 않는 필드(winRateScore·rsiWeekly·ret10yAvg·vol3m 등)는 종목별로 직전 값을 그대로 둔다.
#   - 일시적인 조회 실패(시간 초과·429·5xx)는 3번까지 다시 시도하고, 그래도 안 되면 그 종목은 직전 값을 통째로 유지한다
#     (종목이 하루 걸러 사라졌다 나타나지 않게). 야후에 없는 종목(404)과 가격 단절 종목은 예전처럼 뺀다.
#   - 덮어쓰기 전 검증: 필수 필드가 비었거나 중복인 행은 그 행만 빼고, ETF·코인 각각 종목 수가 150개 미만이거나
#     직전의 80% 미만, 새로 받아 온 종목이 80% 미만이면 그 묶음은 직전 내용(generatedAt 포함)을 그대로 둔다.
#     둘 다 비정상이면 파일을 쓰지 않는다.
#   - 경로를 Join-Path 한 단계씩으로(CI ubuntu pwsh 7 에서 .NET 파일 쓰기가 역슬래시 경로를 못 읽는 문제 방지).

$ProgressPreference = 'SilentlyContinue'
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}
$headers = @{ "User-Agent" = "Mozilla/5.0" }
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$dataDir = Join-Path $root "data"
$outPath = Join-Path (Join-Path (Join-Path $root "sector-map") "data") "etf-crypto-map.js"
function Write-Warn($msg) { Write-Host "::warning::$msg" }

# ---------- 직전 파일(이어받기·검증 기준) ----------
function Read-PrevVar($text, $varName) {
  # 파일은 "const X = {...};" 한 줄씩(2줄) — 줄 단위로 잘라 끝 세미콜론만 뗀다
  try {
    $prefix = "const $varName = "
    $start = $text.IndexOf($prefix)
    if ($start -lt 0) { return $null }
    $jsonStart = $start + $prefix.Length
    $lineEnd = $text.IndexOf("`n", $jsonStart)
    if ($lineEnd -lt 0) { $lineEnd = $text.Length }
    $jsonText = $text.Substring($jsonStart, $lineEnd - $jsonStart).Trim()
    if ($jsonText.EndsWith(";")) { $jsonText = $jsonText.Substring(0, $jsonText.Length - 1) }
    return ($jsonText | ConvertFrom-Json)
  } catch { return $null }
}
$prevEtf = $null; $prevCrypto = $null
if (Test-Path $outPath) {
  $prevText = Get-Content -Path $outPath -Raw -Encoding UTF8
  $prevEtf = Read-PrevVar $prevText "ETF_MAP_DATA"
  $prevCrypto = Read-PrevVar $prevText "CRYPTO_MAP_DATA"
}
$prevEtfMap = @{}; $prevCryptoMap = @{}
if ($prevEtf -and $prevEtf.companies) { foreach ($c in @($prevEtf.companies)) { if ($c.symbol) { $prevEtfMap[[string]$c.symbol] = $c } } }
if ($prevCrypto -and $prevCrypto.companies) { foreach ($c in @($prevCrypto.companies)) { if ($c.symbol) { $prevCryptoMap[[string]$c.symbol] = $c } } }
function ConvertTo-OrderedEntry($obj) {
  $o = [ordered]@{}
  foreach ($p in $obj.PSObject.Properties) { $o[$p.Name] = $p.Value }
  return $o
}
# 조회 실패 원인이 "야후에 없는 종목(404)"인지 — 그 경우는 직전 값을 붙들지 않고 뺀다
function Test-NotFound($err) {
  try { if ([int]$err.Exception.Response.StatusCode -eq 404) { return $true } } catch {}
  return $false
}

# ---------- 미국 ETF TOP100 (app.js의 US_ETF_TOP100과 동일 순서 — 순자산 순 큐레이션) ----------
$US_ETF_TOP100 = @(
  @("VOO","Vanguard S&P 500"),@("IVV","iShares Core S&P 500"),@("SPY","SPDR S&P 500"),@("VTI","Vanguard Total Stock Market"),
  @("QQQ","Invesco QQQ Trust"),@("VUG","Vanguard Growth"),@("VEA","Vanguard FTSE Developed Markets"),@("IEFA","iShares Core MSCI EAFE"),
  @("GLD","SPDR Gold Shares"),@("VTV","Vanguard Value"),@("BND","Vanguard Total Bond Market"),@("AGG","iShares Core U.S. Aggregate Bond"),
  @("IWF","iShares Russell 1000 Growth"),@("IBIT","iShares Bitcoin Trust"),@("SPLG","SPDR Portfolio S&P 500"),@("IJH","iShares Core S&P Mid-Cap"),
  @("VGT","Vanguard Information Technology"),@("IEMG","iShares Core MSCI Emerging Markets"),@("VXUS","Vanguard Total International Stock"),
  @("VWO","Vanguard FTSE Emerging Markets"),@("VIG","Vanguard Dividend Appreciation"),@("XLK","Technology Select Sector SPDR"),
  @("IJR","iShares Core S&P Small-Cap"),@("SCHD","Schwab U.S. Dividend Equity"),@("ITOT","iShares Core S&P Total Market"),
  @("RSP","Invesco S&P 500 Equal Weight"),@("IVW","iShares S&P 500 Growth"),@("SGOV","iShares 0-3 Month Treasury Bond"),
  @("IWM","iShares Russell 2000"),@("QQQM","Invesco NASDAQ 100"),@("BIL","SPDR 1-3 Month T-Bill"),@("VO","Vanguard Mid-Cap"),
  @("SCHX","Schwab U.S. Large-Cap"),@("SMH","VanEck Semiconductor"),@("TLT","iShares 20+ Year Treasury Bond"),
  @("IWD","iShares Russell 1000 Value"),@("VYM","Vanguard High Dividend Yield"),@("EFA","iShares MSCI EAFE"),
  @("JEPI","JPMorgan Equity Premium Income"),@("VB","Vanguard Small-Cap"),@("IAU","iShares Gold Trust"),
  @("DIA","SPDR Dow Jones Industrial Average"),@("QUAL","iShares MSCI USA Quality Factor"),@("VT","Vanguard Total World Stock"),
  @("JEPQ","JPMorgan Nasdaq Equity Premium Income"),@("SCHG","Schwab U.S. Large-Cap Growth"),@("LQD","iShares iBoxx $ IG Corporate Bond"),
  @("VCIT","Vanguard Intermediate-Term Corporate Bond"),@("MUB","iShares National Muni Bond"),@("JPST","JPMorgan Ultra-Short Income"),
  @("DGRO","iShares Core Dividend Growth"),@("XLF","Financial Select Sector SPDR"),@("VCSH","Vanguard Short-Term Corporate Bond"),
  @("MBB","iShares MBS"),@("GOVT","iShares U.S. Treasury Bond"),@("IEF","iShares 7-10 Year Treasury Bond"),
  @("USMV","iShares MSCI USA Min Vol Factor"),@("SCHF","Schwab International Equity"),@("SCHB","Schwab U.S. Broad Market"),
  @("DFAC","Dimensional U.S. Core Equity 2"),@("VTEB","Vanguard Tax-Exempt Bond"),@("XLV","Health Care Select Sector SPDR"),
  @("IXUS","iShares Core MSCI Total International"),@("VNQ","Vanguard Real Estate"),@("IUSB","iShares Core Total USD Bond Market"),
  @("SHY","iShares 1-3 Year Treasury Bond"),@("BSV","Vanguard Short-Term Bond"),@("COWZ","Pacer US Cash Cows 100"),
  @("VGIT","Vanguard Intermediate-Term Treasury"),@("AVUV","Avantis U.S. Small Cap Value"),@("IWB","iShares Russell 1000"),
  @("IWR","iShares Russell Mid-Cap"),@("MGK","Vanguard Mega Cap Growth"),@("SOXX","iShares Semiconductor"),
  @("XLE","Energy Select Sector SPDR"),@("SHV","iShares Short Treasury Bond"),@("BIV","Vanguard Intermediate-Term Bond"),
  @("EMB","iShares J.P. Morgan USD EM Bond"),@("VOOG","Vanguard S&P 500 Growth"),@("SPYG","SPDR Portfolio S&P 500 Growth"),
  @("SPYV","SPDR Portfolio S&P 500 Value"),@("USFR","WisdomTree Floating Rate Treasury"),@("PFF","iShares Preferred & Income Securities"),
  @("MDY","SPDR S&P MidCap 400"),@("XLY","Consumer Discretionary Select SPDR"),@("XLI","Industrial Select Sector SPDR"),
  @("VHT","Vanguard Health Care"),@("FBTC","Fidelity Wise Origin Bitcoin"),@("GLDM","SPDR Gold MiniShares"),
  @("VDC","Vanguard Consumer Staples"),@("ACWI","iShares MSCI ACWI"),@("EWJ","iShares MSCI Japan"),@("VV","Vanguard Large-Cap"),
  @("DVY","iShares Select Dividend"),@("FTEC","Fidelity MSCI Information Technology"),@("VBR","Vanguard Small-Cap Value"),
  @("TQQQ","ProShares UltraPro QQQ"),@("SDY","SPDR S&P Dividend"),@("NOBL","ProShares S&P 500 Dividend Aristocrats"),
  @("MOAT","VanEck Morningstar Wide Moat")
)

# ---------- 코인 한글명(본체 app.js의 CRYPTO_KO_BY_TICKER 발췌 — 기본 티커 기준) ----------
$CRYPTO_KO = @{
  BTC="비트코인"; ETH="이더리움"; USDT="테더"; XRP="엑스알피(리플)"; BNB="비엔비(BNB)"; SOL="솔라나"; USDC="유에스디코인(USDC)"
  DOGE="도지코인"; ADA="에이다(카르다노)"; TRX="트론"; LINK="체인링크"; AVAX="아발란체"; XLM="스텔라루멘"; SUI="수이"; SHIB="시바이누"
  HBAR="헤데라"; TON="톤코인"; DOT="폴카닷"; LTC="라이트코인"; BCH="비트코인캐시"; UNI="유니스왑"; PEPE="페페"; NEAR="니어프로토콜"
  APT="앱토스"; ICP="인터넷컴퓨터"; AAVE="아베"; ETC="이더리움클래식"; POL="폴리곤(POL)"; MATIC="폴리곤(MATIC)"; RENDER="렌더"
  VET="비체인"; ARB="아비트럼"; OP="옵티미즘"; FIL="파일코인"; ATOM="코스모스"; KAS="카스파"; INJ="인젝티브"; SEI="세이"; MNT="맨틀"
  CRO="크로노스"; IMX="이뮤터블엑스"; TAO="비텐서(TAO)"; WLD="월드코인"; GRT="더그래프"; ONDO="온도파이낸스"; STX="스택스"
  ALGO="알고랜드"; JUP="주피터"; FLOKI="플로키"; BONK="봉크"; HYPE="하이퍼리퀴드"; ENA="에테나"; FET="페치(FET)"; TIA="셀레스티아"
  OKB="오케이비(OKB)"; LEO="레오토큰"; WBTC="랩트비트코인"; STETH="리도스테이킹이더"; WSTETH="랩트스테이킹이더"; WBETH="랩트비콘이더"
  DAI="다이"; USDE="에테나달러(USDe)"; XMR="모네로"; BGB="비트겟토큰"; TRUMP="트럼프코인"; PENGU="펭구"; PUMP="펌프펀"
  XAUT="테더골드"; PAXG="팍스골드"; S="소닉(S)"; ZEC="지캐시"; DASH="대시"; WETH="랩트이더리움(WETH)"; CBBTC="코인베이스 랩트비트코인"
  BTCB="비트코인 BEP2(BTCB)"; WEETH="랩트 eETH(weETH)"; AETHWETH="아베 랩트이더(aWETH)"; AETHUSDT="아베 테더(aUSDT)"
  USDS="스카이달러(USDS)"; USDG="글로벌달러(USDG)"; PYUSD="페이팔달러(PYUSD)"; RAIN="레인(RAIN)"; GRAM="그램(구 톤코인)"
  DEL="데시멀(DEL)"; CC="캔톤(CC)"; USD="월드리버티달러(USD1)"; M="밈코어(M)"
  # 시총 51~100위권(2026-09-02 TOP100 확장)
  FLR="플레어"; XDC="XDC네트워크"; QNT="퀀트"; NEXO="넥소"; GT="게이트토큰(GT)"; KCS="쿠코인토큰(KCS)"
  CAKE="팬케이크스왑"; CRV="커브다오"; LDO="리도다오"; AR="알위브"; ENS="이더리움네임서비스"; BSV="비트코인SV"
  MKR="메이커"; SKY="스카이(SKY)"; RON="로닌"; EGLD="멀티버스X(EGLD)"; AXS="엑시인피니티"; CFX="콘플럭스"
  MINA="미나"; GNO="노시스"; ETHFI="이더파이"; PENDLE="펜들"; RAY="레이디움"; WIF="도그위프햇"
  POPCAT="팝캣"; NOT="낫코인"; JASMY="재스미코인"; BTT="비트토렌트"; TWT="트러스트월렛토큰"; USDD="트론달러(USDD)"
  TUSD="트루USD"; FDUSD="퍼스트디지털USD"; USDT0="테더제로(USDT0)"; SOLVBTC="솔브BTC"; LBTC="롬바드BTC"
  RETH="로켓풀 ETH(rETH)"; METH="맨틀 mETH"; EZETH="렌조 ezETH"; JITOSOL="지토솔(JitoSOL)"; MSOL="마리네이드솔(mSOL)"
  BNSOL="바이낸스솔(BNSOL)"; JLP="주피터LP(JLP)"; VIRTUAL="버추얼프로토콜"; SPX="SPX6900"; FARTCOIN="파트코인"
  MOG="모그코인"; BRETT="브렛"; AERO="에어로드롬"; MORPHO="모르포"; STRK="스타크넷"; ZK="지케이싱크(ZK)"; W="웜홀(W)"
}

function Clamp($v, $min, $max) { if ($v -lt $min) { return $min }; if ($v -gt $max) { return $max }; return $v }
function Round1($v) { return [math]::Round($v, 1) }

function Get-Chart($symbol, $range) {
  $uri = "https://query1.finance.yahoo.com/v8/finance/chart/$([uri]::EscapeDataString($symbol))?range=$range&interval=1d"
  for ($attempt = 1; $attempt -le 3; $attempt++) {
    try {
      return Invoke-RestMethod -Uri $uri -Headers $headers -TimeoutSec 20
    } catch {
      # 404(야후에 없는 종목)는 다시 불러도 같으므로 바로 넘긴다
      if ((Test-NotFound $_) -or $attempt -eq 3) { throw }
      Start-Sleep -Milliseconds (700 * $attempt)
    }
  }
}

# 차트에서 지표 일괄 계산 — 본체 computeChartDerivedMetrics와 동일 로직.
# $fiveYear 스위치를 켜면 5y 차트로 조회해 5년 CAGR(ETF 투자안정 ③)까지 계산하되,
# 나머지 지표는 본체처럼 "최근 1년 구간"만 슬라이스해서 계산한다(2026-09-03 배점 개편)
function Get-DerivedMetrics($symbol, $fiveYear) {
  $range = "1y"; if ($fiveYear) { $range = "5y" }
  $chart = Get-Chart $symbol $range
  $result = $chart.chart.result[0]
  if (-not $result) { return $null }
  $ts = $result.timestamp
  $q = $result.indicators.quote[0]
  $allPairs = @()
  for ($i = 0; $i -lt $ts.Count; $i++) {
    if ($null -ne $q.close[$i]) {
      $v = 0; if ($null -ne $q.volume[$i]) { $v = [double]$q.volume[$i] }
      $allPairs += [PSCustomObject]@{ t = $ts[$i]; c = [double]$q.close[$i]; v = $v }
    }
  }
  if ($allPairs.Count -lt 10) { return $null }
  $allPairs = @($allPairs | Sort-Object t)
  # 2026-11-20: 야후는 한국 등 미국 밖 거래소의 '가장 최근 거래일' 일봉 종가를 장 마감 뒤 몇 시간 동안 null로 준다.
  # 그 시간대에 돌면 마지막 날이 빠져 등락률이 이틀치가 되고 52주 위치·거래대금도 하루 전 기준이 된다 →
  # 마지막 유효 일봉의 거래일이 현재가의 거래일(거래소 현지 날짜)보다 앞서면 현재가·당일 거래량을 마지막 날로 붙인다.
  $meta0 = $result.meta
  if ($null -ne $meta0.regularMarketTime -and $null -ne $meta0.regularMarketPrice) {
    $off0 = 0.0; if ($null -ne $meta0.gmtoffset) { $off0 = [double]$meta0.gmtoffset }
    $lastValid = $allPairs[$allPairs.Count - 1]
    $dLast = [math]::Floor(([double]$lastValid.t + $off0) / 86400)
    $dNow = [math]::Floor(([double]$meta0.regularMarketTime + $off0) / 86400)
    if ($dNow -gt $dLast) {
      $v0 = 0; if ($null -ne $meta0.regularMarketVolume) { $v0 = [double]$meta0.regularMarketVolume }
      $allPairs += [PSCustomObject]@{ t = $lastValid.t + 86400 * ($dNow - $dLast); c = [double]$meta0.regularMarketPrice; v = $v0 }
    }
  }
  $lastAll = $allPairs[$allPairs.Count - 1]
  $pairs = $allPairs
  if ($fiveYear) { $pairs = @($allPairs | Where-Object { $_.t -ge $lastAll.t - 365 * 86400 }) }
  if ($pairs.Count -lt 10) { return $null }
  # 가격 단절 종목 제외(2026-09-13 사용자 요청): 최근 1년 중 하루에 20배 이상 뛰거나 1/20 이하로 떨어진 날이 있으면
  # 실제 등락이 아니라 액면 변경·토큰 교환(예: 그램·데시멀 1,000:1)이라 순위·지도·승률 계산을 모두 왜곡 → 목록에서 뺀다
  for ($i = 1; $i -lt $pairs.Count; $i++) {
    $a = $pairs[$i - 1].c; $b = $pairs[$i].c
    if ($a -gt 0 -and $b -gt 0 -and (($b / $a) -ge 20 -or ($a / $b) -ge 20)) { return $null }
  }
  $last = $pairs[$pairs.Count - 1]
  $prev = $pairs[$pairs.Count - 2]

  $dvs = $pairs | ForEach-Object { $_.c * $_.v }
  $recent = $dvs[[Math]::Max(0, $dvs.Count - 5)..($dvs.Count - 1)]
  $recentDv = ($recent | Measure-Object -Average).Average
  $avgDv = ($dvs | Measure-Object -Average).Average
  # 최근 3개월 평균 거래대금(코인 상승압력 ①)
  $dv3mArr = @($pairs | Where-Object { $_.t -ge $last.t - 91 * 86400 } | ForEach-Object { $_.c * $_.v })
  $avgDv3m = $null; if ($dv3mArr.Count) { $avgDv3m = ($dv3mArr | Measure-Object -Average).Average }

  $target3m = $last.t - 91 * 86400
  $base3m = $null; $minDiff = [double]::MaxValue
  foreach ($p in $pairs) { $d = [math]::Abs($p.t - $target3m); if ($d -lt $minDiff) { $minDiff = $d; $base3m = $p } }
  $momentum3m = $null; if ($base3m -and $base3m.c) { $momentum3m = (($last.c - $base3m.c) / $base3m.c) * 100 }
  $oneYearReturn = $null; if ($pairs[0].c) { $oneYearReturn = (($last.c - $pairs[0].c) / $pairs[0].c) * 100 }
  # 한달 수익률(코인 상승압력 ②)
  $target1m = $last.t - 30 * 86400
  $base1m = $null; $minDiff1m = [double]::MaxValue
  foreach ($p in $pairs) { $d = [math]::Abs($p.t - $target1m); if ($d -lt $minDiff1m) { $minDiff1m = $d; $base1m = $p } }
  $monthReturn = $null; if ($base1m -and $base1m.c) { $monthReturn = (($last.c - $base1m.c) / $base1m.c) * 100 }

  $rets = @()
  for ($i = 1; $i -lt $pairs.Count; $i++) { if ($pairs[$i - 1].c) { $rets += [math]::Abs(($pairs[$i].c - $pairs[$i - 1].c) / $pairs[$i - 1].c) * 100 } }
  $r30 = $rets[[Math]::Max(0, $rets.Count - 30)..($rets.Count - 1)]
  $volatility = $null; if ($r30.Count) { $volatility = ($r30 | Measure-Object -Average).Average }

  $meta = $result.meta
  $price = $last.c; if ($null -ne $meta.regularMarketPrice) { $price = [double]$meta.regularMarketPrice }
  $changePct = $null; if ($prev.c) { $changePct = (($price - $prev.c) / $prev.c) * 100 }

  $closes = $pairs | ForEach-Object { $_.c }
  $high = ($closes | Measure-Object -Maximum).Maximum
  $low = ($closes | Measure-Object -Minimum).Minimum
  $week52 = $null; if ($high -gt $low) { $week52 = Clamp ((($price - $low) / ($high - $low)) * 100) 0 100 }

  # 5년 CAGR(ETF 투자안정 ③) — 5년 미만 상장이면 상장 후부터, 1년 미만은 N/A
  $fiveYearCagr = $null
  if ($fiveYear -and $allPairs[0].c) {
    $spanYears = ($lastAll.t - $allPairs[0].t) / (365.25 * 86400)
    if ($spanYears -ge 1) { $fiveYearCagr = ([math]::Pow($lastAll.c / $allPairs[0].c, 1 / $spanYears) - 1) * 100 }
  }
  $firstTrade = $allPairs[0].t; if ($null -ne $meta.firstTradeDate) { $firstTrade = [double]$meta.firstTradeDate }

  return [PSCustomObject]@{
    price = $price; changePct = $changePct; recentDv = $recentDv; avgDv = $avgDv; avgDv3m = $avgDv3m
    momentum3m = $momentum3m; monthReturn = $monthReturn; oneYearReturn = $oneYearReturn; volatility = $volatility
    week52 = $week52; fiveYearCagr = $fiveYearCagr; firstTrade = $firstTrade
  }
}

# ---------- 배점(본체 app.js와 동일 공식 — 2026-09-03 사용자 개편) ----------
# ETF 상승압력(2026-09-03 사용자 통일): 코인과 동일한 공통 배점 — ①거래량(5일/3개월) ②한달상승 ③RSI
function Get-EtfPressure($m, $rsi) {
  return Get-CryptoPressure $m $rsi
}
# ETF 투자안정: ①우상향(4, 승률 60↑ 만점·40↓ 0점) ②변동성(3, 0.5%↓ 만점·3%↑ 0점) ③5년 CAGR(3, 15%↑ 만점·0%↓ 0점)
function Get-EtfRisk($m, $winRate) {
  $win = 2; if ($null -ne $winRate) { $win = Clamp ((4 * ($winRate - 40)) / 20) 0 4 }
  $vol = 1.5; if ($null -ne $m.volatility) { $vol = Clamp ((3 * (3 - $m.volatility)) / 2.5) 0 3 }
  $gro = 1.5; if ($null -ne $m.fiveYearCagr) { $gro = Clamp ((3 * $m.fiveYearCagr) / 15) 0 3 }
  return Round1 (Clamp ($win + $vol + $gro) 0 10)
}
# 코인 상승압력: ①거래량(3, 5일/3개월 3배↑ 만점·0.5배↓ 0점) ②한달상승(3, 50%↑ 만점·0%↓ 0점) ③RSI(4, 70↑ 만점·30↓ 0점)
function Get-CryptoPressure($m, $rsi) {
  $baseDv = $m.avgDv3m; if (-not $baseDv) { $baseDv = $m.avgDv }
  $vol = 1.5; if ($m.recentDv -and $baseDv) { $vol = Clamp ((3 * ($m.recentDv / $baseDv - 0.5)) / 2.5) 0 3 }
  $mon = 0; if ($null -ne $m.monthReturn) { $mon = Clamp (($m.monthReturn / 50) * 3) 0 3 }
  $rsiScore = 2; if ($null -ne $rsi) { $rsiScore = Clamp ((4 * ($rsi - 30)) / 40) 0 4 }
  return Round1 (Clamp ($vol + $mon + $rsiScore) 0 10)
}
# 코인 투자안정(2026-09-03 재개편, 총 7점 — 본체 app.js computeCryptoRiskScore와 동일 공식):
# ①업력 가점(2, 10년↑ 만점·3년↓ 0점) ②우상향(3, 승률 60↑ 만점·40↓ 0점) ③BTC 대비 모멘텀(2, 40%p 미만 만점·100%p↑ 0점)
function Get-CryptoRisk($m, $winRate, $btcReturn) {
  $age = 1
  if ($m.firstTrade) {
    $years = ([DateTimeOffset]::UtcNow.ToUnixTimeSeconds() - $m.firstTrade) / (365.25 * 86400)
    $age = Clamp ((2 * ($years - 3)) / 7) 0 2
  }
  $win = 1.5; if ($null -ne $winRate) { $win = Clamp ((3 * ($winRate - 40)) / 20) 0 3 }
  $mkt = 1
  if ($null -ne $m.oneYearReturn -and $null -ne $btcReturn) {
    $relDiff = [math]::Abs($m.oneYearReturn - $btcReturn)
    if ($relDiff -lt 40) { $mkt = 2 } else { $mkt = Clamp ((2 * (100 - $relDiff)) / 60) 0 2 }
  }
  return Round1 (Clamp ($age + $win + $mkt) 0 7)
}

# ---------- 기준 데이터 ----------
Write-Host "기준 데이터(시총 DB·S&P500·비트코인 1년 수익률·환율) 조회 중..."
$capDb = $null
try { $capDb = Get-Content (Join-Path $dataDir "etf-marketcap.json") -Raw -Encoding UTF8 | ConvertFrom-Json } catch {}
if (-not $capDb -or @($capDb.kr).Count -lt 100 -or @($capDb.us).Count -lt 50) {
  Write-Warn "ETF 규모 DB(data/etf-marketcap.json)를 읽지 못했거나 비어 있어 ETF·코인 지도 파일을 그대로 둡니다."
  Write-Host "ALL_DONE"
  exit 0
}
$krCapMap = @{}; foreach ($it in $capDb.kr) { $krCapMap[[string]$it.s] = [double]$it.m }
$usCapMap = @{}; foreach ($it in $capDb.us) { $usCapMap[[string]$it.s] = [double]$it.a }
$krEtfTop100 = @($capDb.kr | Sort-Object -Property @{ Expression = { [double]$_.m }; Descending = $true } | Select-Object -First 100)

function Get-1yReturnOf($symbol) {
  try {
    $c = Get-Chart $symbol "1y"; $r = $c.chart.result[0]
    $closes = @(); foreach ($v in $r.indicators.quote[0].close) { if ($null -ne $v) { $closes += [double]$v } }
    if ($closes.Count -lt 2 -or -not $closes[0]) { return $null }
    return (($closes[-1] - $closes[0]) / $closes[0]) * 100
  } catch { return $null }
}
$btcReturn = Get-1yReturnOf "BTC-USD"
$usdkrw = 1350.0
try { $fx = Get-Chart "KRW=X" "5d"; $usdkrw = [double]$fx.chart.result[0].meta.regularMarketPrice } catch {}
Write-Host "   BTC 1y=$btcReturn / USDKRW=$usdkrw"

# 승률·주간 RSI DB(새 배점 입력, 2026-09-03) — fetch-winrate-scores.ps1이 만들어둔 데이터를 그대로 사용
$wrPath = Join-Path $dataDir "winrate-scores-us.json"
$wrEtfMap = $null; $wrCryptoMap = $null
if (Test-Path $wrPath) {
  $wrDb = Get-Content -Path $wrPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $wrEtfMap = $wrDb.scoresEtf
  $wrCryptoMap = $wrDb.scoresCrypto
  Write-Host "   승률/RSI DB 로드 완료"
} else {
  Write-Host "   경고: winrate-scores-us.json 없음 — RSI·우상향 항목은 중립값으로 계산됨"
}
function Get-WrEntry($map, $symbol) {
  if (-not $map) { return $null }
  return $map.$symbol
}

# ---------- ETF 200 스캔 ----------
$etfCompanies = @()
$etfFresh = 0; $etfKept = @(); $etfDropped = @()
$done = 0
foreach ($e in $US_ETF_TOP100) {
  $sym = $e[0]; $name = $e[1]
  try {
    $m = Get-DerivedMetrics $sym $true
    if ($m) {
      $capUsd = $usCapMap[$sym]
      $wrE = Get-WrEntry $wrEtfMap $sym
      $etfCompanies += [ordered]@{
        symbol = $sym; name = $name; displayName = $sym; sector = "US ETF"; sectorKo = "미국 ETF"; currency = "USD"
        marketCap = if ($capUsd) { [math]::Round($capUsd) } else { 1e10 }
        changePercent = if ($null -ne $m.changePct) { [math]::Round($m.changePct, 2) } else { $null }
        dollarVolume = [math]::Round($m.recentDv)
        week52RangePct = if ($null -ne $m.week52) { [math]::Round($m.week52, 1) } else { $null }
        pressureScore = Get-EtfPressure $m ($(if ($wrE) { $wrE.rsi } else { $null }))
        stabilityScore = Get-EtfRisk $m ($(if ($wrE) { $wrE.score } else { $null }))
      }
      $etfFresh++
    } else { $etfDropped += $sym }
  } catch {
    if (-not (Test-NotFound $_) -and $prevEtfMap.ContainsKey($sym)) { $etfCompanies += (ConvertTo-OrderedEntry $prevEtfMap[$sym]); $etfKept += $sym }
    else { $etfDropped += $sym }
  }
  $done++; if ($done % 25 -eq 0) { Write-Host "   미국 ETF $done/100" }
  Start-Sleep -Milliseconds 80
}
$done = 0
foreach ($e in $krEtfTop100) {
  $sym = $e.s; $name = $e.n; $capEok = [double]$e.m
  try {
    $m = Get-DerivedMetrics $sym $true
    if ($m) {
      $wrE = Get-WrEntry $wrEtfMap $sym
      $etfCompanies += [ordered]@{
        symbol = $sym; name = $name; displayName = $name; sector = "KR ETF"; sectorKo = "한국 ETF"; currency = "KRW"
        marketCap = [math]::Round($capEok * 1e8 / $usdkrw) # 미국 ETF와 크기 비교 가능하게 USD 환산(원 크기용)
        marketCapKrw = [math]::Round($capEok * 1e8) # 상세시트 표시용 원화 시총
        changePercent = if ($null -ne $m.changePct) { [math]::Round($m.changePct, 2) } else { $null }
        dollarVolume = [math]::Round($m.recentDv / $usdkrw) # USD 환산(거래대금 순위 혼합용)
        week52RangePct = if ($null -ne $m.week52) { [math]::Round($m.week52, 1) } else { $null }
        pressureScore = Get-EtfPressure $m ($(if ($wrE) { $wrE.rsi } else { $null }))
        stabilityScore = Get-EtfRisk $m ($(if ($wrE) { $wrE.score } else { $null }))
      }
      $etfFresh++
    } else { $etfDropped += $sym }
  } catch {
    if (-not (Test-NotFound $_) -and $prevEtfMap.ContainsKey($sym)) { $etfCompanies += (ConvertTo-OrderedEntry $prevEtfMap[$sym]); $etfKept += $sym }
    else { $etfDropped += $sym }
  }
  $done++; if ($done % 25 -eq 0) { Write-Host "   한국 ETF $done/100" }
  Start-Sleep -Milliseconds 80
}
Write-Host "   -> ETF $($etfCompanies.Count)개 (새로 받음 $etfFresh, 직전 값 유지 $($etfKept.Count), 제외 $($etfDropped.Count))"
if ($etfKept.Count) { Write-Host "      직전 값 유지: $($etfKept -join ', ')" }
if ($etfDropped.Count) { Write-Host "      제외(시세 없음·가격 단절): $($etfDropped -join ', ')" }

# ---------- 코인 100 스캔 (2026-09-02 TOP50 → TOP100 확장) ----------
Write-Host "암호화폐 TOP100 목록 조회 중..."
$coins = @()
$screenerOk = $false
for ($attempt = 1; $attempt -le 3; $attempt++) {
  try {
    $scr = Invoke-RestMethod -Uri 'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=US&scrIds=all_cryptocurrencies_us&count=100' -TimeoutSec 20 -Headers $headers
    $coins = @($scr.finance.result[0].quotes | Where-Object { $_.symbol })
    if ($coins.Count -ge 80) { $screenerOk = $true; break }
  } catch {}
  Start-Sleep -Seconds (2 * $attempt)
}
if (-not $screenerOk) { Write-Warn "야후 코인 스크리너 조회 실패 — 코인 묶음은 직전 내용을 그대로 둡니다." }
# 관리 대상 200개(2026-09-14 사용자 요청): 야후 시총 상위 100 + 업비트 KRW 마켓 중 그 100에 없는 코인 시총순 100개
# (data/crypto-extra-upbit.json). 업비트 한글명을 우선 사용한다.
$extraKo = @{}
$extraPath = Join-Path $dataDir "crypto-extra-upbit.json"
if (Test-Path $extraPath) {
  $extra = (Get-Content $extraPath -Raw -Encoding UTF8) | ConvertFrom-Json
  $coins = @($coins | Where-Object { @("GRAM-USD", "DEL-USD") -notcontains $_.symbol })
  $haveSyms = @{}; $coins | ForEach-Object { $haveSyms[$_.symbol] = $true }
  foreach ($c in $extra.coins) {
    if (-not $haveSyms.ContainsKey($c.symbol)) {
      $coins += [pscustomobject]@{ symbol = $c.symbol; shortName = $c.nameEn; marketCap = $c.marketCapUsd }
      $extraKo[$c.symbol] = $c.nameKo
    }
  }
}
$cryptoCompanies = @()
$cryptoFresh = 0; $cryptoKept = @()
$n = $coins.Count
for ($i = 0; $i -lt $n; $i++) {
  # 딱 200개(2026-09-14 사용자 요청): 시세를 못 받거나 제외된 코인만큼 업비트 여유분에서 이어서 채우고, 200개가 차면 멈춘다
  if ($cryptoCompanies.Count -ge 200) { break }
  $qq = $coins[$i]
  $sym = $qq.symbol
  # 가격 단절(액면 변경)이 확인돼 영구 제외한 코인(2026-09-13 사용자 요청) — 앱 PRICE_BREAK_EXCLUDED와 같은 목록
  if (@("GRAM-USD", "DEL-USD") -contains $sym) { continue }
  $base = ($sym -replace '-USD$', '') -replace '\d+$', ''
  $ko = $CRYPTO_KO[$base]
  $name = if ($ko) { $ko } elseif ($extraKo.ContainsKey($sym)) { $extraKo[$sym] } else { ("$($qq.shortName)" -replace '\s+USD$', '') }
  try {
    $m = Get-DerivedMetrics $sym $false
    if ($m) {
      $wrE = Get-WrEntry $wrCryptoMap $sym
      $cryptoCompanies += [ordered]@{
        symbol = $sym; name = $name; displayName = $base; sector = "Crypto"; sectorKo = "암호화폐"; currency = "USD"
        marketCap = if ($qq.marketCap) { [double]$qq.marketCap } else { 1e9 }
        changePercent = if ($null -ne $m.changePct) { [math]::Round($m.changePct, 2) } else { $null }
        dollarVolume = [math]::Round($m.recentDv)
        week52RangePct = if ($null -ne $m.week52) { [math]::Round($m.week52, 1) } else { $null }
        pressureScore = Get-CryptoPressure $m ($(if ($wrE) { $wrE.rsi } else { $null }))
        stabilityScore = Get-CryptoRisk $m ($(if ($wrE) { $wrE.score } else { $null })) $btcReturn
      }
      $cryptoFresh++
    }
  } catch {
    if (-not (Test-NotFound $_) -and $prevCryptoMap.ContainsKey($sym)) { $cryptoCompanies += (ConvertTo-OrderedEntry $prevCryptoMap[$sym]); $cryptoKept += $sym }
  }
  if (($i + 1) % 25 -eq 0) { Write-Host "   코인 $($i + 1)/$n" }
  Start-Sleep -Milliseconds 80
}
Write-Host "   -> 코인 $($cryptoCompanies.Count)개 (새로 받음 $cryptoFresh, 직전 값 유지 $($cryptoKept.Count))"
if ($cryptoKept.Count) { Write-Host "      직전 값 유지: $($cryptoKept -join ', ')" }

$generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

# 승률점수·주간RSI 재병합(2026-09-02): 이 스크립트는 파일을 처음부터 다시 만들기 때문에, fetch-winrate-scores.ps1이
# 병합해둔 winRateScore/rsiWeekly/ret10yAvg가 여기서 사라지지 않도록 기존 DB(data/winrate-scores-us.json)에서 다시 붙여준다
if (Test-Path $wrPath) {
  $wr = Get-Content -Path $wrPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $mergeWr = {
    param($companies, $scoreMap)
    $n = 0
    foreach ($c in $companies) {
      $e = if ($scoreMap) { $scoreMap.($c["symbol"]) } else { $null }
      if ($e) {
        $c["winRateScore"] = $e.score
        $c["rsiWeekly"] = $e.rsi
        $c["ret10yAvg"] = $e.ret10y
        $n++
      }
    }
    return $n
  }
  $ne = & $mergeWr $etfCompanies $wr.scoresEtf
  $nc = & $mergeWr $cryptoCompanies $wr.scoresCrypto
  Write-Host "   승률/RSI 재병합: ETF $ne 건, 코인 $nc 건"
}

# 직전 파일에만 있던 필드 이어받기(2026-11-20): 다른 배치가 덧써 둔 값(winRateScore·rsiWeekly·ret10yAvg·vol3m 등)이
# 이 스크립트가 다시 만든 파일에서 사라지지 않게 한다. 이 스크립트가 새로 계산한 값은 건드리지 않는다.
function Add-PrevFields($companies, $prevMap) {
  $n = 0
  foreach ($c in $companies) {
    $p = $prevMap[[string]$c["symbol"]]
    if (-not $p) { continue }
    foreach ($prop in $p.PSObject.Properties) {
      if (-not $c.Contains($prop.Name)) { $c[$prop.Name] = $prop.Value; $n++ }
    }
  }
  return $n
}
$ce = Add-PrevFields $etfCompanies $prevEtfMap
$cc = Add-PrevFields $cryptoCompanies $prevCryptoMap
Write-Host "   직전 파일 필드 이어받기: ETF $ce 개 값, 코인 $cc 개 값"

# ---------- 덮어쓰기 전 검증 ----------
# 필수 필드가 비었거나 중복인 행은 그 행만 뺀다(한두 종목 때문에 묶음 전체가 멈추지 않게). 많이 빠지면 아래 개수 검증에 걸린다.
function Remove-BadRows($label, $companies) {
  $out = @(); $badRows = @(); $seen = @{}
  foreach ($c in $companies) {
    $sym = [string]$c["symbol"]
    $ok = $true
    foreach ($k in @("symbol", "name", "displayName", "sector", "sectorKo", "currency")) {
      if ($null -eq $c[$k] -or [string]::IsNullOrWhiteSpace([string]$c[$k])) { $ok = $false }
    }
    $cap = 0.0; try { $cap = [double]$c["marketCap"] } catch {}
    if (-not ($cap -gt 0)) { $ok = $false }
    if ($null -eq $c["dollarVolume"]) { $ok = $false }
    if ($seen.ContainsKey($sym)) { $ok = $false }
    if ($ok) { $seen[$sym] = $true; $out += $c } else { $badRows += $sym }
  }
  if ($badRows.Count -gt 0) { Write-Host "   [$label] 필수 필드가 비었거나 중복이라 뺀 행: $($badRows -join ', ')" }
  return $out
}
$etfCompanies = @(Remove-BadRows "ETF" $etfCompanies)
$cryptoCompanies = @(Remove-BadRows "코인" $cryptoCompanies)
function Test-Section($label, $companies, $fresh, $prevCount, $extraProblems) {
  $problems = @()
  if ($extraProblems) { $problems += $extraProblems }
  $count = @($companies).Count
  if ($count -lt 150) { $problems += "$count 개 < 150" }
  if ($prevCount -gt 0 -and $count -lt [math]::Ceiling($prevCount * 0.8)) { $problems += "$count 개가 직전($prevCount)의 80% 미만" }
  if ($count -gt 0 -and $fresh -lt [math]::Ceiling($count * 0.8)) { $problems += "새로 받은 종목 $fresh/$count (80% 미만)" }
  if ($problems.Count -gt 0) {
    Write-Warn "[$label] 비정상이라 직전 내용을 그대로 둡니다: $($problems -join ' / ')"
    return $false
  }
  return $true
}
$usEtfCount = @($etfCompanies | Where-Object { $_["sector"] -eq "US ETF" }).Count
$krEtfCount = @($etfCompanies | Where-Object { $_["sector"] -eq "KR ETF" }).Count
$etfExtra = @()
if ($usEtfCount -lt 80) { $etfExtra += "미국 ETF $usEtfCount 개 < 80" }
if ($krEtfCount -lt 80) { $etfExtra += "한국 ETF $krEtfCount 개 < 80" }
$cryptoExtra = @()
if (-not $screenerOk) { $cryptoExtra += "코인 스크리너 조회 실패" }
$etfOk = Test-Section "ETF" $etfCompanies $etfFresh $prevEtfMap.get_Count() $etfExtra
$cryptoOk = Test-Section "코인" $cryptoCompanies $cryptoFresh $prevCryptoMap.get_Count() $cryptoExtra

if (-not $etfOk -and -not $cryptoOk) {
  Write-Warn "ETF·코인 둘 다 비정상 — sector-map/data/etf-crypto-map.js 를 덮어쓰지 않았습니다."
  Write-Host "ALL_DONE"
  exit 0
}
if ((-not $etfOk -and -not $prevEtf) -or (-not $cryptoOk -and -not $prevCrypto)) {
  Write-Warn "비정상인 묶음을 대신할 직전 내용이 없어 파일을 덮어쓰지 않았습니다."
  Write-Host "ALL_DONE"
  exit 0
}

$etfObj = $prevEtf
if ($etfOk) { $etfObj = [ordered]@{ companies = @($etfCompanies); generatedAt = $generatedAt } }
$cryptoObj = $prevCrypto
if ($cryptoOk) { $cryptoObj = [ordered]@{ companies = @($cryptoCompanies); generatedAt = $generatedAt } }
$etfJson = $etfObj | ConvertTo-Json -Depth 4 -Compress
$cryptoJson = $cryptoObj | ConvertTo-Json -Depth 4 -Compress
# 되읽어 개수 확인(직렬화가 어긋나면 쓰지 않는다)
$chkE = -1; $chkC = -1
try { $chkE = @(($etfJson | ConvertFrom-Json).companies).Count } catch {}
try { $chkC = @(($cryptoJson | ConvertFrom-Json).companies).Count } catch {}
if ($chkE -ne @($etfObj.companies).Count -or $chkC -ne @($cryptoObj.companies).Count -or $etfJson.Contains("`n") -or $cryptoJson.Contains("`n")) {
  Write-Warn "JSON 되읽기 개수가 달라 sector-map/data/etf-crypto-map.js 를 덮어쓰지 않았습니다(ETF $chkE, 코인 $chkC)."
  Write-Host "ALL_DONE"
  exit 0
}
$js = "const ETF_MAP_DATA = $etfJson;`nconst CRYPTO_MAP_DATA = $cryptoJson;`n"
[System.IO.File]::WriteAllText($outPath, $js, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "저장 완료: $outPath (ETF $chkE · 코인 $chkC, 직전 ETF $($prevEtfMap.get_Count()) · 코인 $($prevCryptoMap.get_Count()))"
Write-Host "ALL_DONE"
