# 나스닥 100 중 S&P500 비편입이라 기존 지도 데이터에 없는 종목을 야후에서 수집해 data/ndx-extra.js 생성(2026-08-31)
#
# 2026-11-20: 8/31 이후 한 번도 안 돌아 시가총액·PER이 8월 값이던 문제 → 자동 배치(daily-sp500-data.yml)에 넣고 아래를 바꿨다.
#   - 구성종목 명단을 매번 네이버 지수 API(.NDX enrollStocks, 무료·무인증)에서 받아 NDX_EXTRA_DATA.constituents 에 같이 저장한다
#     (지도 app.js 의 NDX100_SET 하드코딩을 이 값으로 바꿔 끼울 수 있게). 95~110개가 아니면 직전 명단을 그대로 둔다.
#   - 수집 대상 = 명단 중 sp500-sectors.json 에 없는 종목(예전에는 아래 15개 고정). 명단을 못 받으면 직전 파일의 종목 → 아래 고정 목록 순.
#   - 종목별 조회가 3번 다 실패하면 그 종목은 직전 값을 그대로 둔다. fetch-winrate-scores.ps1 이 덧써 둔
#     winRateScore/rsiWeekly/ret10yAvg 등 이 스크립트가 만들지 않는 필드는 직전 값에서 이어받는다.
#   - 등락률을 '직전 거래일 종가 대비'로 고침: 예전 계산(meta.chartPreviousClose, range=5d)은 5거래일 전 종가 대비였다.
#   - 덮어쓰기 전 검증: 대상의 80% 미만만 모였거나 새로 받은 종목이 절반 미만이면 파일을 그대로 둔다.
# 사용: ./scripts/fetch-ndx-extra.ps1 [-DryRun]
param([switch]$DryRun)

$ProgressPreference = 'SilentlyContinue'
$headers = @{ "User-Agent" = "Mozilla/5.0" }
$dataDir = Join-Path (Split-Path $PSScriptRoot -Parent) "data"
$outPath = Join-Path $dataDir "ndx-extra.js"
$fallbackSyms = @("SPCX","ASML","ARM","SHOP","PDD","MELI","NBIS","ALAB","MSTR","CCEP","CRWV","TRI","FER","RKLB","ALNY")
function Write-Warn($msg) { Write-Host "::warning::$msg" }

$sectorTranslate = @{
  "Technology" = @{ gics = "Information Technology"; ko = "기술" }
  "Healthcare" = @{ gics = "Health Care"; ko = "헬스케어" }
  "Financial Services" = @{ gics = "Financials"; ko = "금융" }
  "Consumer Cyclical" = @{ gics = "Consumer Discretionary"; ko = "경기소비재" }
  "Consumer Defensive" = @{ gics = "Consumer Staples"; ko = "필수소비재" }
  "Communication Services" = @{ gics = "Communication Services"; ko = "커뮤니케이션" }
  "Industrials" = @{ gics = "Industrials"; ko = "산업재" }
  "Energy" = @{ gics = "Energy"; ko = "에너지" }
  "Utilities" = @{ gics = "Utilities"; ko = "유틸리티" }
  "Real Estate" = @{ gics = "Real Estate"; ko = "부동산" }
  "Basic Materials" = @{ gics = "Materials"; ko = "소재" }
}

# ---------- 직전 파일 ----------
$prev = $null
if (Test-Path $outPath) {
  try {
    $prevText = (Get-Content -Path $outPath -Raw -Encoding UTF8).TrimStart([char]0xFEFF).Trim()
    $prevJson = $prevText.Substring($prevText.IndexOf("=") + 1).Trim()
    if ($prevJson.EndsWith(";")) { $prevJson = $prevJson.Substring(0, $prevJson.Length - 1) }
    $prev = $prevJson | ConvertFrom-Json
  } catch { $prev = $null }
}
$prevMap = @{}
if ($prev -and $prev.companies) { foreach ($c in @($prev.companies)) { if ($c.symbol) { $prevMap[[string]$c.symbol] = $c } } }

# ---------- 1) 나스닥 100 구성종목(네이버 지수 API) ----------
$constituents = @()
$constituentsAsOf = $null
$naverName = @{}
try {
  $all = @()
  for ($page = 1; $page -le 5; $page++) {
    $resp = Invoke-RestMethod -Uri "https://api.stock.naver.com/index/.NDX/enrollStocks?page=$page&pageSize=60" -Headers $headers -TimeoutSec 20
    $stocks = @($resp.stocks)
    if ($stocks.Count -eq 0) { break }
    $all += $stocks
    if ($stocks.Count -lt 60) { break }
    Start-Sleep -Milliseconds 200
  }
  $seen = @{}
  foreach ($s in $all) {
    $sym = ([string]$s.symbolCode).Trim().ToUpper() -replace '\.', '-'
    if ($sym -notmatch '^[A-Z][A-Z0-9\-]{0,6}$' -or $seen.ContainsKey($sym)) { continue }
    $seen[$sym] = $true
    $constituents += $sym
    if ($s.stockNameEng) { $naverName[$sym] = [string]$s.stockNameEng }
  }
} catch {
  Write-Host "네이버 나스닥100 구성종목 조회 실패: $($_.Exception.Message)"
}
if ($constituents.Count -ge 95 -and $constituents.Count -le 110) {
  $constituentsAsOf = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd")
  Write-Host "나스닥100 구성종목 $($constituents.Count)개(네이버)"
} else {
  if ($constituents.Count -gt 0) { Write-Warn "네이버 나스닥100 구성종목이 $($constituents.Count)개(95~110 밖) — 직전 명단을 그대로 둡니다." }
  $constituents = @()
  if ($prev -and $prev.PSObject.Properties["constituents"] -and @($prev.constituents).Count -ge 95) {
    $constituents = @($prev.constituents | ForEach-Object { [string]$_ })
    $constituentsAsOf = $prev.constituentsAsOf
    # PowerShell 7 의 ConvertFrom-Json 이 날짜 모양 문자열을 DateTime 으로 바꿔 줄 수 있어 다시 "yyyy-MM-dd" 문자열로 맞춘다
    if ($constituentsAsOf -is [datetime]) { $constituentsAsOf = $constituentsAsOf.ToString("yyyy-MM-dd") }
    Write-Host "나스닥100 구성종목: 직전 명단 $($constituents.Count)개 유지($constituentsAsOf)"
  }
}

# ---------- 2) 수집 대상 = 구성종목 중 S&P500 원본에 없는 종목 ----------
$syms = @()
if ($constituents.Count -gt 0) {
  $spSet = @{}
  try {
    $sp = Get-Content -Path (Join-Path $dataDir "sp500-sectors.json") -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($c in @($sp.companies)) { if ($c.symbol) { $spSet[[string]$c.symbol] = $true } }
  } catch {}
  if ($spSet.get_Count() -ge 450) {
    $syms = @($constituents | Where-Object { -not $spSet.ContainsKey($_) })
    if ($syms.Count -lt 1 -or $syms.Count -gt 40) {
      Write-Warn "S&P500 밖 나스닥100 종목이 $($syms.Count)개로 계산됨(1~40 밖) — 직전 대상 목록을 씁니다."
      $syms = @()
    }
  } else {
    Write-Host "sp500-sectors.json 종목 수가 $($spSet.get_Count())개라 대상 계산을 건너뜀(직전 대상 목록 사용)"
  }
}
if ($syms.Count -eq 0) {
  if ($prevMap.get_Count() -gt 0) { $syms = @($prev.companies | ForEach-Object { [string]$_.symbol } | Where-Object { $_ }) }
  else { $syms = $fallbackSyms }
}
Write-Host "수집 대상 $($syms.Count)개: $($syms -join ', ')"

# ---------- 3) 종목별 수집 ----------
$now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$fiveYearsAgo = $now - 5 * 365 * 24 * 3600
$result = @()
$fresh = 0
$kept = @()
$failed = @()
foreach ($sym in $syms) {
  $entry = $null
  for ($attempt = 1; $attempt -le 3; $attempt++) {
    try {
      $chart = Invoke-RestMethod -Uri "https://query1.finance.yahoo.com/v8/finance/chart/$sym`?range=5d&interval=1d" -Headers $headers -TimeoutSec 20
      $r0 = $chart.chart.result[0]
      $meta = $r0.meta
      $price = $meta.regularMarketPrice
      # 전일 종가 = 현재가와 같은 거래일(거래소 현지 날짜)보다 앞선 마지막 일봉 종가.
      # meta.chartPreviousClose 는 range=5d 에서 '5거래일 전 종가'라 쓰지 않는다(일봉이 하나뿐일 때만 대신 씀).
      $prevClose = $null
      $off = 0.0; if ($null -ne $meta.gmtoffset) { $off = [double]$meta.gmtoffset }
      $ts = @($r0.timestamp)
      $cl = @($r0.indicators.quote[0].close)
      if ($null -ne $meta.regularMarketTime) {
        $curDay = [math]::Floor(([double]$meta.regularMarketTime + $off) / 86400)
        for ($i = 0; $i -lt $ts.Count; $i++) {
          if ($null -ne $cl[$i] -and [math]::Floor(([double]$ts[$i] + $off) / 86400) -lt $curDay) { $prevClose = [double]$cl[$i] }
        }
      }
      if ($null -eq $prevClose) { $prevClose = $meta.chartPreviousClose }
      $chg = $null
      if ($price -and $prevClose -and $prevClose -ne 0) { $chg = [math]::Round((($price - $prevClose) / $prevClose) * 100, 2) }

      $p = $prevMap[$sym]
      $name = $null; $sectorGics = $null; $sectorKo = $null
      try {
        $search = Invoke-RestMethod -Uri "https://query1.finance.yahoo.com/v1/finance/search?q=$sym&quotesCount=1&newsCount=0" -Headers $headers -TimeoutSec 20
        $q = $search.quotes[0]
        if ($q -and [string]$q.symbol -eq $sym) {
          $name = if ($q.shortname) { $q.shortname } elseif ($q.longname) { $q.longname } else { $null }
          $sectorInfo = $null; if ($q.sectorDisp) { $sectorInfo = $sectorTranslate[[string]$q.sectorDisp] }
          if ($sectorInfo) { $sectorGics = $sectorInfo.gics; $sectorKo = $sectorInfo.ko }
        }
      } catch {}
      # 이름·섹터를 못 받으면 직전 값 → 네이버 영문명 → 기본값 순
      if (-not $name) { if ($p -and $p.name) { $name = $p.name } elseif ($naverName.ContainsKey($sym)) { $name = $naverName[$sym] } else { $name = $sym } }
      if (-not $sectorGics) {
        if ($p -and $p.sector) { $sectorGics = $p.sector; $sectorKo = $p.sectorKo }
        else { $sectorGics = "Information Technology"; $sectorKo = "기술" }
      }

      $fund = Invoke-RestMethod -Uri "https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/$sym`?type=annualShareIssued,annualBasicEPS&period1=$fiveYearsAgo&period2=$now&merge=false&lang=en-US&region=US" -Headers $headers -TimeoutSec 20
      $blocks = $fund.timeseries.result
      $shareS = ($blocks | Where-Object { $_.annualShareIssued }).annualShareIssued | Sort-Object asOfDate
      $epsS = ($blocks | Where-Object { $_.annualBasicEPS }).annualBasicEPS | Sort-Object asOfDate
      $shares = if ($shareS) { @($shareS)[-1].reportedValue.raw } else { $null }
      $eps = if ($epsS) { @($epsS)[-1].reportedValue.raw } else { $null }
      $cap = if ($price -and $shares) { $price * $shares } else { $null }
      $per = if ($price -and $eps -and $eps -gt 0) { [math]::Round($price / $eps, 2) } else { $null }
      if ($null -eq $cap) { throw "marketCap null" }

      $entry = [ordered]@{
        symbol = $sym; name = $name; sector = $sectorGics; sectorKo = $sectorKo
        marketCap = $cap; changePercent = $chg; per = $per; eps = $eps; dividendYield = $null
      }
      break
    } catch { Start-Sleep -Milliseconds (500 * $attempt) }
  }
  if ($entry) {
    # 이 스크립트가 만들지 않는 필드(승률·RSI 등)는 직전 값에서 이어받기
    $p = $prevMap[$sym]
    if ($p) {
      foreach ($prop in $p.PSObject.Properties) {
        if (-not $entry.Contains($prop.Name)) { $entry[$prop.Name] = $prop.Value }
      }
    }
    $result += $entry
    $fresh++
  } elseif ($prevMap.ContainsKey($sym)) {
    $o = [ordered]@{}
    foreach ($prop in $prevMap[$sym].PSObject.Properties) { $o[$prop.Name] = $prop.Value }
    $result += $o
    $kept += $sym
  } else {
    $failed += $sym
  }
  Start-Sleep -Milliseconds 200
}
Write-Host ("새로 받음: {0} / 직전 값 유지: {1} / 실패(뺌): {2}" -f $fresh, ($kept -join ","), ($failed -join ","))

# ---------- 4) 검증 후 저장 ----------
$problems = @()
if ($result.Count -lt [math]::Ceiling($syms.Count * 0.8)) { $problems += "모인 종목 $($result.Count)/$($syms.Count) (80% 미만)" }
if ($fresh -lt [math]::Ceiling($syms.Count * 0.5)) { $problems += "새로 받은 종목 $fresh/$($syms.Count) (절반 미만)" }
foreach ($c in $result) {
  $cap = 0.0; try { $cap = [double]$c["marketCap"] } catch {}
  if (-not $c["symbol"] -or -not $c["name"] -or -not $c["sector"] -or -not ($cap -gt 0)) { $problems += "필수 필드가 빈 행: $($c['symbol'])" }
}
if ($problems.Count -gt 0) {
  Write-Warn "ndx-extra.js 를 그대로 둡니다: $($problems -join ' / ')"
  Write-Host "ALL_DONE"
  exit 0
}

$output = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  count = $result.Count
}
if ($constituents.Count -gt 0) {
  $output["constituentsAsOf"] = $constituentsAsOf
  $output["constituents"] = @($constituents)
}
$output["companies"] = @($result)
$json = $output | ConvertTo-Json -Depth 5
$chk = -1
try { $chk = @(($json | ConvertFrom-Json).companies).Count } catch {}
if ($chk -ne $result.Count) {
  Write-Warn "ndx-extra.js 를 그대로 둡니다(JSON 되읽기 개수 $chk/$($result.Count))."
  Write-Host "ALL_DONE"
  exit 0
}
$added = @($result | ForEach-Object { [string]$_["symbol"] } | Where-Object { -not $prevMap.ContainsKey($_) })
$resultSet = @{}; foreach ($c in $result) { $resultSet[[string]$c["symbol"]] = $true }
$removed = @($prevMap.get_Keys() | Where-Object { -not $resultSet.ContainsKey($_) })
if ($added.Count) { Write-Host "새로 넣음: $($added -join ', ')" }
if ($removed.Count) { Write-Host "뺌: $($removed -join ', ')" }
if ($DryRun) {
  Write-Host "-DryRun: 파일은 쓰지 않았습니다($($result.Count)종목, 구성종목 $($constituents.Count)개)."
  Write-Host "ALL_DONE"
  exit 0
}
Set-Content -Path $outPath -Value ("const NDX_EXTRA_DATA = " + $json + ";") -Encoding utf8
Write-Host "완료: data/ndx-extra.js ($($result.Count)종목, 구성종목 $($constituents.Count)개)"
Write-Host "ALL_DONE"
