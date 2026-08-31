# 나스닥 100 중 S&P500 비편입이라 기존 지도 데이터에 없는 종목을 야후에서 수집해 data/ndx-extra.js 생성(2026-08-31)
# 구성종목 목록 소스: 네이버 지수 API(.NDX enrollStocks). 재실행 시 목록이 바뀌었으면 $syms만 갱신하면 됨.
$ProgressPreference = 'SilentlyContinue'
$headers = @{ "User-Agent" = "Mozilla/5.0" }
$syms = @("SPCX","ASML","ARM","SHOP","PDD","MELI","NBIS","ALAB","MSTR","CCEP","CRWV","TRI","FER","RKLB","ALNY")

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

$now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$fiveYearsAgo = $now - 5 * 365 * 24 * 3600
$result = @()
$failed = @()
foreach ($sym in $syms) {
  $ok = $false
  for ($attempt = 1; $attempt -le 3; $attempt++) {
    try {
      $chart = Invoke-RestMethod -Uri "https://query1.finance.yahoo.com/v8/finance/chart/$sym`?range=5d&interval=1d" -Headers $headers -TimeoutSec 20
      $meta = $chart.chart.result[0].meta
      $price = $meta.regularMarketPrice
      $prev = $meta.chartPreviousClose
      $chg = $null
      if ($price -and $prev -and $prev -ne 0) { $chg = [math]::Round((($price - $prev) / $prev) * 100, 2) }

      $search = Invoke-RestMethod -Uri "https://query1.finance.yahoo.com/v1/finance/search?q=$sym&quotesCount=1&newsCount=0" -Headers $headers -TimeoutSec 20
      $q = $search.quotes[0]
      $name = if ($q.shortname) { $q.shortname } elseif ($q.longname) { $q.longname } else { $sym }
      $sectorInfo = $sectorTranslate[$q.sectorDisp]
      $sectorGics = if ($sectorInfo) { $sectorInfo.gics } else { "Information Technology" }
      $sectorKo = if ($sectorInfo) { $sectorInfo.ko } else { "기술" }

      $fund = Invoke-RestMethod -Uri "https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/$sym`?type=annualShareIssued,annualBasicEPS&period1=$fiveYearsAgo&period2=$now&merge=false&lang=en-US&region=US" -Headers $headers -TimeoutSec 20
      $blocks = $fund.timeseries.result
      $shareS = ($blocks | Where-Object { $_.annualShareIssued }).annualShareIssued | Sort-Object asOfDate
      $epsS = ($blocks | Where-Object { $_.annualBasicEPS }).annualBasicEPS | Sort-Object asOfDate
      $shares = if ($shareS) { $shareS[-1].reportedValue.raw } else { $null }
      $eps = if ($epsS) { $epsS[-1].reportedValue.raw } else { $null }
      $cap = if ($price -and $shares) { $price * $shares } else { $null }
      $per = if ($price -and $eps -and $eps -gt 0) { [math]::Round($price / $eps, 2) } else { $null }
      if ($null -eq $cap) { throw "marketCap null" }

      $result += [PSCustomObject]@{
        symbol = $sym; name = $name; sector = $sectorGics; sectorKo = $sectorKo
        marketCap = $cap; changePercent = $chg; per = $per; eps = $eps; dividendYield = $null
      }
      $ok = $true
      break
    } catch { Start-Sleep -Milliseconds (500 * $attempt) }
  }
  if (-not $ok) { $failed += $sym }
  Start-Sleep -Milliseconds 200
}
Write-Output ("성공: " + $result.Count + " / 실패: " + ($failed -join ","))
$output = [PSCustomObject]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  count = $result.Count
  companies = $result
}
Set-Content -Path "$PSScriptRoot\..\data\ndx-extra.js" -Value ("const NDX_EXTRA_DATA = " + ($output | ConvertTo-Json -Depth 5) + ";") -Encoding utf8
Write-Output "완료: data/ndx-extra.js"

