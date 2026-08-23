# S&P 500 전종목 (티커/종목명/섹터/시가총액) 수집 스크립트
# Node.js가 로컬에 없어 PowerShell로 작성. Wikipedia(구성종목+GICS섹터) + Yahoo Finance 섹터 스크리너(시가총액)를 합쳐 정적 JSON 생성.

$ProgressPreference = 'SilentlyContinue'
$headers = @{ "User-Agent" = "Mozilla/5.0" }

# GICS 섹터(Wikipedia 표기) -> Yahoo Morningstar 스크리너 ID + 한글 라벨
$sectorMap = @{
  "Information Technology" = @{ scr = "ms_technology";              ko = "기술" }
  "Health Care"             = @{ scr = "ms_healthcare";               ko = "헬스케어" }
  "Financials"              = @{ scr = "ms_financial_services";       ko = "금융" }
  "Consumer Discretionary"  = @{ scr = "ms_consumer_cyclical";        ko = "경기소비재" }
  "Consumer Staples"        = @{ scr = "ms_consumer_defensive";       ko = "필수소비재" }
  "Communication Services"  = @{ scr = "ms_communication_services";   ko = "커뮤니케이션" }
  "Industrials"             = @{ scr = "ms_industrials";              ko = "산업재" }
  "Energy"                  = @{ scr = "ms_energy";                   ko = "에너지" }
  "Utilities"               = @{ scr = "ms_utilities";                ko = "유틸리티" }
  "Real Estate"             = @{ scr = "ms_real_estate";              ko = "부동산" }
  "Materials"                = @{ scr = "ms_basic_materials";          ko = "소재" }
}

Write-Host "1) Wikipedia S&P500 구성종목 목록 가져오는 중..."
$wikiUrl = "https://en.wikipedia.org/w/api.php?action=parse&page=List_of_S%26P_500_companies&format=json&prop=wikitext&section=1"
$wikiResp = Invoke-RestMethod -Uri $wikiUrl -Headers $headers
$wikitext = $wikiResp.parse.wikitext.'*'

# 표 행 파싱: || {{XxxSymbol|TICKER}} \n || [[Name]] \n || Sector \n || SubIndustry ...
$rowPattern = '\{\{\w+Symbol\|([A-Za-z0-9.\-]+)\}\}\s*\r?\n\|\|\s*\[\[([^\]|]+)(?:\|[^\]]+)?\]\]\s*\r?\n\|\|\s*([^\r\n|]+)'
$matches = [regex]::Matches($wikitext, $rowPattern)

$companies = @()
foreach ($m in $matches) {
  $symbol = $m.Groups[1].Value.Trim().ToUpper()
  $name = $m.Groups[2].Value.Trim()
  $sector = $m.Groups[3].Value.Trim()
  $companies += [PSCustomObject]@{ symbol = $symbol; name = $name; sector = $sector }
}
Write-Host "   -> $($companies.Count)개 종목 파싱 완료"

Write-Host "2) 섹터별 Yahoo 스크리너로 시가총액 수집 중..."
$capBySymbol = @{}
$nameBySymbol = @{}
$chgBySymbol = @{}
$peBySymbol = @{}
$epsBySymbol = @{}
$divBySymbol = @{}
foreach ($key in $sectorMap.Keys) {
  $scrId = $sectorMap[$key].scr
  try {
    $url = "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=US&scrIds=$scrId&count=250"
    $resp = Invoke-RestMethod -Uri $url -Headers $headers
    $quotes = $resp.finance.result[0].quotes
    foreach ($q in $quotes) {
      if ($null -ne $q.symbol -and $null -ne $q.marketCap) {
        $capBySymbol[$q.symbol] = $q.marketCap
        $nameBySymbol[$q.symbol] = $q.longName
        if ($null -ne $q.regularMarketChangePercent) { $chgBySymbol[$q.symbol] = $q.regularMarketChangePercent }
        if ($null -ne $q.trailingPE) { $peBySymbol[$q.symbol] = $q.trailingPE }
        if ($null -ne $q.epsTrailingTwelveMonths) { $epsBySymbol[$q.symbol] = $q.epsTrailingTwelveMonths }
        if ($null -ne $q.dividendYield) { $divBySymbol[$q.symbol] = $q.dividendYield }
      }
    }
    Write-Host "   - $scrId : $($quotes.Count)건 (전체 $($resp.finance.result[0].total))"
  } catch {
    Write-Host "   - $scrId 실패: $_"
  }
  Start-Sleep -Milliseconds 300
}

Write-Host "3) 매칭 및 병합 중..."
$result = @()
$unmatched = @()
foreach ($c in $companies) {
  $sym = $c.symbol
  $lookupSym = $sym
  $cap = $capBySymbol[$sym]
  if ($null -eq $cap) {
    $altSym = $sym -replace '\.', '-'
    $cap = $capBySymbol[$altSym]
    if ($null -ne $cap) { $lookupSym = $altSym }
  }
  if ($null -eq $cap) {
    $unmatched += $sym
  }
  $chg = $chgBySymbol[$lookupSym]
  $pe = $peBySymbol[$lookupSym]
  $eps = $epsBySymbol[$lookupSym]
  $div = $divBySymbol[$lookupSym]
  $sectorInfo = $sectorMap[$c.sector]
  $sectorKo = if ($sectorInfo) { $sectorInfo.ko } else { $c.sector }
  $result += [PSCustomObject]@{
    symbol        = $sym
    name          = $c.name
    sector        = $c.sector
    sectorKo      = $sectorKo
    marketCap     = $cap
    changePercent = $chg
    per           = $pe
    eps           = $eps
    dividendYield = $div
  }
}

Write-Host "   -> 매칭 실패: $($unmatched.Count)개 ($($unmatched -join ', '))"

Write-Host "4) JSON 저장 중..."
$output = [PSCustomObject]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  count       = $result.Count
  unmatched   = $unmatched
  companies   = $result
}
$output | ConvertTo-Json -Depth 5 | Set-Content -Path "$PSScriptRoot\..\data\sp500-sectors.json" -Encoding utf8
Write-Host "완료: data/sp500-sectors.json"
