# 지도 ETF200·비트코인50 보기용 데이터 생성 스크립트 (2026-09-01)
# 미국 ETF 순자산 TOP100 + 한국 ETF 시총 TOP100(= ETF200)과 암호화폐 시총 TOP50 각각에 대해
# 종목당 야후 차트 1회(1y)로 등락률·거래대금·52주 위치·상승압력·투자안정(각 전용 배점, 본체 app.js와 동일 공식)을
# 계산해 sector-map/data/etf-crypto-map.js(ETF_MAP_DATA/CRYPTO_MAP_DATA)로 저장한다.
# 시총·순자산은 data/etf-marketcap.json(DB)을 사용. 갱신: 이 스크립트 재실행 후 커밋.
#   powershell -NoProfile -ExecutionPolicy Bypass -File sector-map/scripts/fetch-etf-crypto-map.ps1

$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$headers = @{ "User-Agent" = "Mozilla/5.0" }
$root = Join-Path $PSScriptRoot "..\.."
$outPath = Join-Path $root "sector-map\data\etf-crypto-map.js"

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
}

function Clamp($v, $min, $max) { if ($v -lt $min) { return $min }; if ($v -gt $max) { return $max }; return $v }
function Round1($v) { return [math]::Round($v, 1) }

function Get-Chart($symbol, $range) {
  $uri = "https://query1.finance.yahoo.com/v8/finance/chart/$([uri]::EscapeDataString($symbol))?range=$range&interval=1d"
  return Invoke-RestMethod -Uri $uri -Headers $headers -TimeoutSec 15
}

# 1y 차트에서 지표 일괄 계산 — 본체 computeChartDerivedMetrics와 동일 로직
function Get-DerivedMetrics($symbol) {
  $chart = Get-Chart $symbol "1y"
  $result = $chart.chart.result[0]
  if (-not $result) { return $null }
  $ts = $result.timestamp
  $q = $result.indicators.quote[0]
  $pairs = @()
  for ($i = 0; $i -lt $ts.Count; $i++) {
    if ($null -ne $q.close[$i]) {
      $v = 0; if ($null -ne $q.volume[$i]) { $v = [double]$q.volume[$i] }
      $pairs += [PSCustomObject]@{ t = $ts[$i]; c = [double]$q.close[$i]; v = $v }
    }
  }
  if ($pairs.Count -lt 10) { return $null }
  $pairs = $pairs | Sort-Object t
  $last = $pairs[$pairs.Count - 1]
  $prev = $pairs[$pairs.Count - 2]

  $dvs = $pairs | ForEach-Object { $_.c * $_.v }
  $recent = $dvs[[Math]::Max(0, $dvs.Count - 5)..($dvs.Count - 1)]
  $recentDv = ($recent | Measure-Object -Average).Average
  $avgDv = ($dvs | Measure-Object -Average).Average

  $target3m = $last.t - 91 * 86400
  $base3m = $null; $minDiff = [double]::MaxValue
  foreach ($p in $pairs) { $d = [math]::Abs($p.t - $target3m); if ($d -lt $minDiff) { $minDiff = $d; $base3m = $p } }
  $momentum3m = $null; if ($base3m -and $base3m.c) { $momentum3m = (($last.c - $base3m.c) / $base3m.c) * 100 }
  $oneYearReturn = $null; if ($pairs[0].c) { $oneYearReturn = (($last.c - $pairs[0].c) / $pairs[0].c) * 100 }

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

  return [PSCustomObject]@{
    price = $price; changePct = $changePct; recentDv = $recentDv; avgDv = $avgDv
    momentum3m = $momentum3m; oneYearReturn = $oneYearReturn; volatility = $volatility; week52 = $week52
  }
}

# ---------- 배점(본체 app.js와 동일 공식) ----------
function Get-EtfPressure($m) {
  $vol = 1.5; if ($m.recentDv -and $m.avgDv) { $vol = Clamp (2 * ($m.recentDv / $m.avgDv - 0.5)) 0 3 }
  $mom = 0; if ($null -ne $m.momentum3m) { $mom = Clamp (($m.momentum3m / 20) * 3) 0 3 }
  $yr = 0; if ($null -ne $m.oneYearReturn) { $yr = Clamp (($m.oneYearReturn / 50) * 4) 0 4 }
  return Round1 (Clamp ($vol + $mom + $yr) 0 10)
}
function Get-EtfRisk($m, $spyReturn, $isKr, $capKrEok, $capUsd) {
  $vol = 1.5; if ($null -ne $m.volatility) { $vol = Clamp ((3 * (5 - $m.volatility)) / 4) 0 3 }
  $mkt = 1.5; if ($null -ne $m.oneYearReturn -and $null -ne $spyReturn) { $mkt = Clamp ((3 * (100 - [math]::Abs($m.oneYearReturn - $spyReturn))) / 90) 0 3 }
  $cap = 0.1
  if ($isKr -and $capKrEok) { $cap = Clamp ((4 * ($capKrEok - 10000)) / 90000) 0 4 }
  elseif ((-not $isKr) -and $capUsd) { $cap = Clamp ((4 * ($capUsd / 1e9 - 10)) / 90) 0 4 }
  return Round1 (Clamp ($vol + $mkt + $cap) 0 10)
}
function Get-CryptoPressure($m) {
  $vol = 1.5; if ($m.recentDv -and $m.avgDv) { $vol = Clamp (2 * ($m.recentDv / $m.avgDv - 0.5)) 0 3 }
  $mom = 0; if ($null -ne $m.momentum3m) { $mom = Clamp (($m.momentum3m / 40) * 3) 0 3 }
  $yr = 0; if ($null -ne $m.oneYearReturn) { $yr = Clamp (($m.oneYearReturn / 200) * 4) 0 4 }
  return Round1 (Clamp ($vol + $mom + $yr) 0 10)
}
function Get-CryptoRisk($m, $btcReturn, $capPercentile) {
  $vol = 1.5; if ($null -ne $m.volatility) { $vol = Clamp ((3 * (10 - $m.volatility)) / 8) 0 3 }
  $mkt = 1.5; if ($null -ne $m.oneYearReturn -and $null -ne $btcReturn) { $mkt = Clamp ((3 * (100 - [math]::Abs($m.oneYearReturn - $btcReturn))) / 90) 0 3 }
  $cap = 0.1; if ($null -ne $capPercentile) { $cap = Clamp ((4 * $capPercentile) / 100) 0 4 }
  return Round1 (Clamp ($vol + $mkt + $cap) 0 10)
}

# ---------- 기준 데이터 ----------
Write-Host "기준 데이터(시총 DB·S&P500·비트코인 1년 수익률·환율) 조회 중..."
$capDb = Get-Content (Join-Path $root "data\etf-marketcap.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$krCapMap = @{}; foreach ($it in $capDb.kr) { $krCapMap[$it.s] = [double]$it.m }
$usCapMap = @{}; foreach ($it in $capDb.us) { $usCapMap[$it.s] = [double]$it.a }
$krEtfTop100 = $capDb.kr | Sort-Object -Property m -Descending | Select-Object -First 100

function Get-1yReturnOf($symbol) {
  try {
    $c = Get-Chart $symbol "1y"; $r = $c.chart.result[0]
    $closes = @(); foreach ($v in $r.indicators.quote[0].close) { if ($null -ne $v) { $closes += [double]$v } }
    if ($closes.Count -lt 2 -or -not $closes[0]) { return $null }
    return (($closes[-1] - $closes[0]) / $closes[0]) * 100
  } catch { return $null }
}
$spyReturn = Get-1yReturnOf "^GSPC"
$btcReturn = Get-1yReturnOf "BTC-USD"
$usdkrw = 1350.0
try { $fx = Get-Chart "KRW=X" "5d"; $usdkrw = [double]$fx.chart.result[0].meta.regularMarketPrice } catch {}
Write-Host "   S&P500 1y=$spyReturn / BTC 1y=$btcReturn / USDKRW=$usdkrw"

# ---------- ETF 200 스캔 ----------
$etfCompanies = @()
$done = 0
foreach ($e in $US_ETF_TOP100) {
  $sym = $e[0]; $name = $e[1]
  try {
    $m = Get-DerivedMetrics $sym
    if ($m) {
      $capUsd = $usCapMap[$sym]
      $etfCompanies += [ordered]@{
        symbol = $sym; name = $name; displayName = $sym; sector = "US ETF"; sectorKo = "미국 ETF"; currency = "USD"
        marketCap = if ($capUsd) { [math]::Round($capUsd) } else { 1e10 }
        changePercent = if ($null -ne $m.changePct) { [math]::Round($m.changePct, 2) } else { $null }
        dollarVolume = [math]::Round($m.recentDv)
        week52RangePct = if ($null -ne $m.week52) { [math]::Round($m.week52, 1) } else { $null }
        pressureScore = Get-EtfPressure $m
        stabilityScore = Get-EtfRisk $m $spyReturn $false $null $capUsd
      }
    }
  } catch {}
  $done++; if ($done % 25 -eq 0) { Write-Host "   미국 ETF $done/100" }
  Start-Sleep -Milliseconds 80
}
$done = 0
foreach ($e in $krEtfTop100) {
  $sym = $e.s; $name = $e.n; $capEok = [double]$e.m
  try {
    $m = Get-DerivedMetrics $sym
    if ($m) {
      $etfCompanies += [ordered]@{
        symbol = $sym; name = $name; displayName = $name; sector = "KR ETF"; sectorKo = "한국 ETF"; currency = "KRW"
        marketCap = [math]::Round($capEok * 1e8 / $usdkrw) # 미국 ETF와 크기 비교 가능하게 USD 환산(원 크기용)
        marketCapKrw = [math]::Round($capEok * 1e8) # 상세시트 표시용 원화 시총
        changePercent = if ($null -ne $m.changePct) { [math]::Round($m.changePct, 2) } else { $null }
        dollarVolume = [math]::Round($m.recentDv / $usdkrw) # USD 환산(거래대금 순위 혼합용)
        week52RangePct = if ($null -ne $m.week52) { [math]::Round($m.week52, 1) } else { $null }
        pressureScore = Get-EtfPressure $m
        stabilityScore = Get-EtfRisk $m $spyReturn $true $capEok $null
      }
    }
  } catch {}
  $done++; if ($done % 25 -eq 0) { Write-Host "   한국 ETF $done/100" }
  Start-Sleep -Milliseconds 80
}
Write-Host "   -> ETF $($etfCompanies.Count)개"

# ---------- 코인 50 스캔 ----------
Write-Host "암호화폐 TOP50 목록 조회 중..."
$scr = Invoke-RestMethod -Uri 'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=US&scrIds=all_cryptocurrencies_us&count=50' -TimeoutSec 20 -Headers $headers
$coins = @($scr.finance.result[0].quotes | Where-Object { $_.symbol })
$cryptoCompanies = @()
$n = $coins.Count
for ($i = 0; $i -lt $n; $i++) {
  $qq = $coins[$i]
  $sym = $qq.symbol
  $base = ($sym -replace '-USD$', '') -replace '\d+$', ''
  $ko = $CRYPTO_KO[$base]
  $name = if ($ko) { $ko } else { ("$($qq.shortName)" -replace '\s+USD$', '') }
  try {
    $m = Get-DerivedMetrics $sym
    if ($m) {
      $pct = (($n - 1 - $i) / [Math]::Max(1, $n - 1)) * 100
      $cryptoCompanies += [ordered]@{
        symbol = $sym; name = $name; displayName = $base; sector = "Crypto"; sectorKo = "암호화폐"; currency = "USD"
        marketCap = if ($qq.marketCap) { [double]$qq.marketCap } else { 1e9 }
        changePercent = if ($null -ne $m.changePct) { [math]::Round($m.changePct, 2) } else { $null }
        dollarVolume = [math]::Round($m.recentDv)
        week52RangePct = if ($null -ne $m.week52) { [math]::Round($m.week52, 1) } else { $null }
        pressureScore = Get-CryptoPressure $m
        stabilityScore = Get-CryptoRisk $m $btcReturn $pct
      }
    }
  } catch {}
  if (($i + 1) % 25 -eq 0) { Write-Host "   코인 $($i + 1)/$n" }
  Start-Sleep -Milliseconds 80
}
Write-Host "   -> 코인 $($cryptoCompanies.Count)개"

$generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$etfJson = @{ generatedAt = $generatedAt; companies = $etfCompanies } | ConvertTo-Json -Depth 4 -Compress
$cryptoJson = @{ generatedAt = $generatedAt; companies = $cryptoCompanies } | ConvertTo-Json -Depth 4 -Compress
$js = "const ETF_MAP_DATA = $etfJson;`nconst CRYPTO_MAP_DATA = $cryptoJson;`n"
[System.IO.File]::WriteAllText((Join-Path (Resolve-Path $root) "sector-map\data\etf-crypto-map.js"), $js, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "저장 완료: $outPath"
Write-Host "ALL_DONE"
