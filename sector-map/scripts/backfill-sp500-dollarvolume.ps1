# S&P500 스냅샷(sp500-sectors.json)에 거래대금(dollarVolume)만 채워 넣는 1회성 보정 스크립트.
# 2026-09-11 사용자 보고("S리포트 거래대금이 왜 준비중이야") — 미국 스냅샷엔 거래대금 필드가 아예 없어
# 순위를 낼 수 없었다. 정식 수집은 fetch-sp500-data.ps1에 넣었고, 이 스크립트는 다음 배치 전까지의 공백을 메운다.
# 다른 필드는 일절 건드리지 않고 dollarVolume만 추가/갱신한다.
$ErrorActionPreference = "Stop"
$headers = @{ "User-Agent" = "Mozilla/5.0" }

$scrIds = @(
  "ms_technology", "ms_healthcare", "ms_financial_services", "ms_consumer_cyclical",
  "ms_consumer_defensive", "ms_communication_services", "ms_industrials", "ms_energy",
  "ms_utilities", "ms_real_estate", "ms_basic_materials"
)

$dvBySymbol = @{}
foreach ($scrId in $scrIds) {
  try {
    $url = "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=US&scrIds=$scrId&count=250"
    $resp = Invoke-RestMethod -Uri $url -Headers $headers -TimeoutSec 40
    $quotes = $resp.finance.result[0].quotes
    $n = 0
    foreach ($q in $quotes) {
      if ($null -ne $q.symbol -and $null -ne $q.regularMarketPrice -and $null -ne $q.regularMarketVolume) {
        $dvBySymbol[$q.symbol] = [double]$q.regularMarketPrice * [double]$q.regularMarketVolume
        $n++
      }
    }
    Write-Host ("  - {0}: {1}건" -f $scrId, $n)
  } catch {
    Write-Host ("  - {0} 실패: {1}" -f $scrId, $_.Exception.Message)
  }
  Start-Sleep -Milliseconds 300
}
Write-Host ("거래대금 수집 완료: {0}종목" -f $dvBySymbol.Count)

$path = Join-Path $PSScriptRoot "..\data\sp500-sectors.json"
$json = Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json
$filled = 0
foreach ($c in $json.companies) {
  $dv = $dvBySymbol[$c.symbol]
  if ($null -eq $dv) { $dv = $dvBySymbol[($c.symbol -replace '-', '.')] }
  if ($null -ne $dv) {
    $c | Add-Member -NotePropertyName dollarVolume -NotePropertyValue ([Math]::Round($dv)) -Force
    $filled++
  } elseif (-not ($c.PSObject.Properties.Name -contains "dollarVolume")) {
    $c | Add-Member -NotePropertyName dollarVolume -NotePropertyValue $null -Force
  }
}
$json | ConvertTo-Json -Depth 10 -Compress | Set-Content $path -Encoding UTF8
Write-Host ("sp500-sectors.json 갱신: {0}/{1}종목에 거래대금 기록" -f $filled, $json.companies.Count)
