# fetch-dart-institutions.ps1이 만든 원자료(dart-institutions-result.json)를 받아
# data/insight-kr-institutions.json을 재생성한다: 기관별 5% 이상 보유 상위 N개 추리기,
# 티커 결정(kr-universe 파일 우선, 없으면 DART company.json의 corp_cls로 KS/KQ 판정),
# Yahoo Finance로 현재가를 조회해 총 신고가치(=보유주식수*현재가)와 그 변동분까지 채운다.
# 사용법: powershell -File build-kr-institutions-data.ps1 -ApiKey <DART_API_KEY>
# 주의: API 키는 파라미터로만 전달(이 스크립트 자체에는 하드코딩하지 말 것).
param(
  [Parameter(Mandatory = $true)][string]$ApiKey,
  [string]$ResultFile = "$PSScriptRoot\dart-institutions-result.json",
  [string]$UniverseFile = "$PSScriptRoot\..\..\data\kr-universe-kospi200-kosdaq150.json",
  [string]$OutFile = "$PSScriptRoot\..\..\data\insight-kr-institutions.json",
  [int]$TopN = 30
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ResultFile)) {
  throw "원자료 파일이 없습니다: $ResultFile — 먼저 fetch-dart-institutions.ps1을 실행하세요."
}

$data = Get-Content $ResultFile -Raw -Encoding UTF8 | ConvertFrom-Json
$universeRoot = Get-Content $UniverseFile -Raw -Encoding UTF8 | ConvertFrom-Json
$nameToSymbol = @{}
foreach ($u in $universeRoot.kospi200) { $nameToSymbol[$u.name] = $u.symbol }
foreach ($u in $universeRoot.kosdaq150) { $nameToSymbol[$u.name] = $u.symbol }

function Get-TopRows($instKey, $topN) {
  $rows = $data | Where-Object { $_.institution -eq $instKey -and [double]$_.stkrt -ge 5.0 } | Sort-Object { [double]$_.stkrt } -Descending
  if ($topN -gt 0) { $rows = $rows | Select-Object -First $topN }
  return $rows
}

$allSelected = @()
foreach ($k in @("nps", "samsungAm", "miraeAm", "kbAm")) { $allSelected += Get-TopRows $k $TopN }
Write-Host "선택된 행: $($allSelected.Count)"

# 1) 티커 결정 — 유니버스 파일에 없으면 DART company.json의 corp_cls(Y=코스피/K=코스닥)로 판정
$corpCodeToTicker = @{}
$uniqueCorps = $allSelected | Select-Object -Property corpCode, stockCode, corpName -Unique
$i = 0
foreach ($c in $uniqueCorps) {
  $i++
  if ($nameToSymbol.ContainsKey($c.corpName)) {
    $corpCodeToTicker[$c.corpCode] = $nameToSymbol[$c.corpName]
    continue
  }
  try {
    $comp = Invoke-RestMethod -Uri "https://opendart.fss.or.kr/api/company.json?crtfc_key=$ApiKey&corp_code=$($c.corpCode)" -TimeoutSec 10
    if ($comp.corp_cls -eq "Y") { $corpCodeToTicker[$c.corpCode] = "$($c.stockCode).KS" }
    elseif ($comp.corp_cls -eq "K") { $corpCodeToTicker[$c.corpCode] = "$($c.stockCode).KQ" }
  } catch {}
  Start-Sleep -Milliseconds 100
  if ($i % 20 -eq 0) { Write-Host "  티커 조회 $i/$($uniqueCorps.Count)" }
}
Write-Host "티커 확정: $($corpCodeToTicker.Count)/$($uniqueCorps.Count)"

# 2) Yahoo Finance로 현재가 조회 — 총 신고가치(=보유주식수 x 현재가)를 계산하기 위함(DART API 자체엔 가치 필드가 없음)
$tickers = $corpCodeToTicker.Values | Select-Object -Unique
$yHeaders = @{ "User-Agent" = "Mozilla/5.0" }
$priceMap = @{}
$i = 0
foreach ($t in $tickers) {
  $i++
  try {
    $resp = Invoke-RestMethod -Uri "https://query1.finance.yahoo.com/v8/finance/chart/$t`?interval=1d&range=1d" -Headers $yHeaders -TimeoutSec 10
    $price = $resp.chart.result[0].meta.regularMarketPrice
    if ($price) { $priceMap[$t] = [double]$price }
  } catch {}
  Start-Sleep -Milliseconds 150
  if ($i % 20 -eq 0) { Write-Host "  현재가 조회 $i/$($tickers.Count)" }
}
Write-Host "현재가 확정: $($priceMap.Count)/$($tickers.Count)"

# 3) 최종 JSON 조립
function Build-Holdings($instKey, $topN) {
  $rows = Get-TopRows $instKey $topN
  $out = @()
  foreach ($r in $rows) {
    $weightPct = [math]::Round([double]$r.stkrt, 2)
    $changePt = [math]::Round([double]$r.stkrtIrds, 2)
    $isNew = [math]::Abs($weightPct - $changePt) -lt 0.06
    $obj = [ordered]@{ name = $r.corpName; weightPct = $weightPct; asOfDate = $r.rceptDt }
    $ticker = $corpCodeToTicker[$r.corpCode]
    if ($ticker) {
      $obj.ticker = $ticker
      if ($priceMap.ContainsKey($ticker)) {
        $price = $priceMap[$ticker]
        $shares = [double]($r.stkqy -replace ",", "")
        $sharesIrds = [double]($r.stkqyIrds -replace ",", "")
        $obj.valueKRW = [math]::Round($shares * $price)
        $obj.valueChangeKRW = [math]::Round($sharesIrds * $price)
      }
    }
    if ($isNew) { $obj.isNew = $true } else { $obj.weightChangePt = $changePt }
    $out += [PSCustomObject]$obj
  }
  return $out
}

$final = [ordered]@{
  updatedAt = (Get-Date -Format "yyyy-MM-dd")
  institutions = [ordered]@{
    nps = [ordered]@{ name = "국민연금공단"; holdings = (Build-Holdings "nps" $TopN) }
    kic = [ordered]@{ name = "한국투자공사"; holdings = @(); unavailableNote = "한국투자공사법 제31조④에 따라 위탁자산(외환보유고)은 해외에만 운용해야 해서, 국내 상장주식 5%룰 공시 대상 사례가 구조적으로 없습니다(DART 대량보유 상황보고 전수 조회로 재확인)." }
    samsungAm = [ordered]@{ name = "삼성자산운용"; holdings = (Build-Holdings "samsungAm" $TopN) }
    miraeAm = [ordered]@{ name = "미래에셋자산운용"; holdings = (Build-Holdings "miraeAm" $TopN) }
    kbAm = [ordered]@{ name = "KB자산운용"; holdings = (Build-Holdings "kbAm" $TopN) }
  }
}

$json = $final | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($OutFile, $json, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "완료: $OutFile"
