# ETF 운용보수·보유종목 수집(2026-09-11 사용자 요청)
#
# 화면 두 곳에서 쓴다.
#  - ETF 상단 "운용보수" 버튼: 연간 총보수가 싼 순 순위
#  - ETF 검색상세 맨 위 "보유 종목": 비중 상위 종목
#
# 출처
#  - 미국: 야후 quoteSummary(topHoldings·fundProfile). 인증(쿠키+crumb)이 필요해 브라우저에서 직접 못 부르고,
#          여기서 미리 받아 data/etf-info.json으로 떨궈둔다. fc.yahoo.com 쿠키 → /v1/test/getcrumb 순서로 crumb을 얻는다.
#  - 한국: 네이버 m.stock.naver.com/api/stock/{코드}/etfAnalysis — 총보수(totalFee)와 상위 10 구성종목을 같이 준다.
#
# 두 출처 모두 "비중 상위 10종목"까지만 공개한다. 그래서 화면의 "더보기"는 11위 이하 종목이 아니라
# 업종·자산 비중(그 아래 남은 구성 정보)을 펼치는 용도로 쓴다 — 화면 문구도 그렇게 적어둘 것.

param(
  [int]$KrCount = 300,      # 국내는 시가총액 상위 몇 개까지 받을지(전체 1,163개는 시간이 오래 걸림)
  [switch]$SkipUs,
  [switch]$SkipKr
)

$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot
$rootDir = Split-Path (Split-Path $scriptDir -Parent) -Parent
$dataDir = Join-Path $rootDir "data"
$UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

function Get-Pct($node) {
  # 야후는 비율을 소수(0.0009)로 준다 — 화면 표기는 %라서 100을 곱해둔다
  if ($null -eq $node) { return $null }
  if ($null -eq $node.raw) { return $null }
  return [Math]::Round([double]$node.raw * 100.0, 4)
}

$usOut = [ordered]@{}
$krOut = [ordered]@{}

if (-not $SkipUs) {
  Write-Host "1) 미국 ETF — 야후 인증(crumb) 획득..."
  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  try { Invoke-WebRequest "https://fc.yahoo.com" -WebSession $session -UserAgent $UA -TimeoutSec 20 -UseBasicParsing -ErrorAction SilentlyContinue | Out-Null } catch { }
  $crumb = (Invoke-WebRequest "https://query1.finance.yahoo.com/v1/test/getcrumb" -WebSession $session -UserAgent $UA -TimeoutSec 20 -UseBasicParsing).Content
  if (-not $crumb -or $crumb.Length -gt 30) { throw "야후 crumb을 받지 못했습니다: [$crumb]" }
  Write-Host "   crumb=$crumb"

  # 대상 티커는 app.js의 US_ETF_TOP100을 그대로 읽어 쓴다(목록이 바뀌어도 자동으로 따라감)
  $appJs = Get-Content (Join-Path $rootDir "app.js") -Raw -Encoding UTF8
  $block = [regex]::Match($appJs, 'const US_ETF_TOP100 = \[(.*?)\n\];', 'Singleline')
  if (-not $block.Success) { throw "app.js에서 US_ETF_TOP100을 찾지 못했습니다." }
  $usTickers = @([regex]::Matches($block.Groups[1].Value, '\{\s*t:\s*"([A-Z.]+)"') | ForEach-Object { $_.Groups[1].Value })
  Write-Host ("   대상 {0}종목" -f $usTickers.Count)

  $i = 0
  foreach ($sym in $usTickers) {
    $i++
    try {
      $url = "https://query2.finance.yahoo.com/v10/finance/quoteSummary/$sym" +
             "?modules=topHoldings,fundProfile&crumb=" + [uri]::EscapeDataString($crumb)
      $resp = Invoke-RestMethod $url -WebSession $session -UserAgent $UA -TimeoutSec 25
      $r = $resp.quoteSummary.result[0]
      if (-not $r) { continue }
      $fee = Get-Pct $r.fundProfile.feesExpensesInvestment.annualReportExpenseRatio
      $holdings = @()
      foreach ($h in @($r.topHoldings.holdings)) {
        if (-not $h.symbol) { continue }
        $holdings += [ordered]@{ s = $h.symbol; n = ($h.holdingName + ""); w = (Get-Pct $h.holdingPercent) }
      }
      $sectors = @()
      foreach ($sw in @($r.topHoldings.sectorWeightings)) {
        foreach ($p in $sw.PSObject.Properties) {
          $w = Get-Pct $p.Value
          if ($null -ne $w -and $w -gt 0) { $sectors += [ordered]@{ k = $p.Name; w = $w } }
        }
      }
      $assets = @()
      foreach ($pair in @(@("주식", $r.topHoldings.stockPosition), @("채권", $r.topHoldings.bondPosition), @("현금", $r.topHoldings.cashPosition), @("기타", $r.topHoldings.otherPosition))) {
        $w = Get-Pct $pair[1]
        if ($null -ne $w -and $w -gt 0) { $assets += [ordered]@{ k = $pair[0]; w = $w } }
      }
      # 야후 topHoldings는 10종목까지만 준다. 화면에서 "더보기 = 20위까지"를 채우려면 더 긴 목록이 필요해
      # stockanalysis.com의 보유종목 표(25행)를 같이 읽어, 더 길게 나오면 그쪽으로 교체한다.
      try {
        $saUrl = "https://stockanalysis.com/etf/$($sym.ToLower())/holdings/"
        $sa = Invoke-WebRequest $saUrl -Headers @{ "User-Agent" = $UA; "Accept" = "text/html" } -TimeoutSec 25 -UseBasicParsing
        $tbl = [regex]::Match($sa.Content, '(?s)<table[^>]*>.*?</table>')
        if ($tbl.Success) {
          $more = @()
          foreach ($tr in [regex]::Matches($tbl.Value, '(?s)<tr[^>]*>(.*?)</tr>')) {
            $cells = @([regex]::Matches($tr.Groups[1].Value, '(?s)<td[^>]*>(.*?)</td>') | ForEach-Object {
                ($_.Groups[1].Value -replace '<[^>]+>', '' -replace '&amp;', '&' -replace '\s+', ' ').Trim()
              })
            # 열 구성: 순번 / 티커 / 종목명 / 비중% / 주식수
            if ($cells.Count -ge 4 -and $cells[1] -match '^[A-Z.\-]{1,6}$') {
              $wv = 0.0
              [void][double]::TryParse((($cells[3] + "") -replace '[^0-9.\-]', ''), [ref]$wv)
              $more += [ordered]@{ s = $cells[1]; n = $cells[2]; w = [Math]::Round($wv, 4) }
            }
          }
          if ($more.Count -gt $holdings.Count) { $holdings = @($more | Select-Object -First 20) }
        }
      } catch { }
      Start-Sleep -Milliseconds 200

      $usOut[$sym] = [ordered]@{
        fee      = $fee
        family   = ($r.fundProfile.family + "")
        category = ($r.fundProfile.categoryName + "")
        holdings = $holdings
        sectors  = $sectors
        assets   = $assets
      }
    } catch {
      Write-Host ("   {0} 실패: {1}" -f $sym, $_.Exception.Message)
    }
    if ($i % 20 -eq 0) { Write-Host ("   진행 {0}/{1} (수집 {2})" -f $i, $usTickers.Count, $usOut.Count) }
    Start-Sleep -Milliseconds 150
  }
  Write-Host ("   -> 미국 {0}종목" -f $usOut.Count)
}

if (-not $SkipKr) {
  Write-Host "2) 국내 ETF — 네이버 etfAnalysis..."
  $headers = @{ "User-Agent" = $UA; "Accept" = "application/json" }
  $mc = Get-Content (Join-Path $dataDir "etf-marketcap.json") -Raw -Encoding UTF8 | ConvertFrom-Json
  $krList = @($mc.kr | Where-Object { $_ -and $_.s } | Sort-Object -Property @{ Expression = { [double]$_.m }; Descending = $true } | Select-Object -First $KrCount)
  Write-Host ("   대상 {0}종목" -f $krList.Count)
  $i = 0
  foreach ($it in $krList) {
    $i++
    $code = ($it.s -replace '\.KS$|\.KQ$', '')
    try {
      $r = Invoke-RestMethod "https://m.stock.naver.com/api/stock/$code/etfAnalysis" -Headers $headers -TimeoutSec 20
      $holdings = @()
      foreach ($h in @($r.etfTop10MajorConstituentAssets)) {
        if (-not $h.itemName) { continue }
        $w = $null
        $tmp = 0.0
        if ([double]::TryParse((($h.etfWeight + "") -replace '[^0-9.\-]', ''), [ref]$tmp)) { $w = [Math]::Round($tmp, 2) }
        # 해외 지수를 추종하는 국내 ETF는 네이버가 구성종목의 종목코드·비중을 "-"로 비워 준다 —
        # 이름과 보유 주식수(c)만 오므로 화면에서 비중 대신 주식수를 보여줄 수 있게 같이 담아둔다.
        $cnt = ($h.stockCount + "") -replace '[^0-9]', ''
        $holdings += [ordered]@{ s = ($h.itemCode + ""); n = ($h.itemName + ""); w = $w; c = $cnt }
      }
      $sectors = @()
      foreach ($p in @($r.sectorPortfolioList)) { if ([double]$p.weight -gt 0) { $sectors += [ordered]@{ k = ($p.detailTypeCode + ""); w = [Math]::Round([double]$p.weight, 2) } } }
      $assets = @()
      foreach ($p in @($r.assetPortfolioList)) { if ([double]$p.weight -gt 0) { $assets += [ordered]@{ k = ($p.detailTypeCode + ""); w = [Math]::Round([double]$p.weight, 2) } } }
      $countries = @()
      foreach ($p in @($r.countryPortfolioList)) { if ([double]$p.weight -gt 0) { $countries += [ordered]@{ k = ($p.detailTypeCode + ""); w = [Math]::Round([double]$p.weight, 2) } } }
      $fee = $null
      if ($null -ne $r.totalFee) { $fee = [Math]::Round([double]$r.totalFee, 4) }
      $krOut[$it.s] = [ordered]@{
        fee       = $fee
        issuer    = ($r.issuerName + "")
        index     = ($r.etfBaseIndex + "")
        holdings  = $holdings
        sectors   = $sectors
        assets    = $assets
        countries = $countries
      }
    } catch {
      # 상장폐지·신규상장 직후 등은 네이버에 분석 정보가 없다 — 조용히 건너뜀
    }
    if ($i % 50 -eq 0) { Write-Host ("   진행 {0}/{1} (수집 {2})" -f $i, $krList.Count, $krOut.Count) }
    Start-Sleep -Milliseconds 120
  }
  Write-Host ("   -> 국내 {0}종목" -f $krOut.Count)
}

$outPath = Join-Path $dataDir "etf-info.json"
# 부분 실행(-SkipUs/-SkipKr) 시 반대쪽 데이터를 날리지 않도록 기존 파일과 합친다
if (($SkipUs -or $SkipKr) -and (Test-Path $outPath)) {
  $prev = Get-Content $outPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($SkipUs -and $prev.us) { foreach ($p in $prev.us.PSObject.Properties) { $usOut[$p.Name] = $p.Value } }
  if ($SkipKr -and $prev.kr) { foreach ($p in $prev.kr.PSObject.Properties) { $krOut[$p.Name] = $p.Value } }
}

[ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  description = "ETF 연간 총보수(fee, %)와 비중 상위 구성종목. 미국=야후 fundProfile/topHoldings, 한국=네이버 etfAnalysis. 두 출처 모두 상위 10종목까지만 공개한다."
  us          = $usOut
  kr          = $krOut
} | ConvertTo-Json -Depth 6 -Compress | Set-Content $outPath -Encoding UTF8
Write-Host ("저장 -> data/etf-info.json (미국 {0} · 국내 {1})" -f $usOut.Count, $krOut.Count)
