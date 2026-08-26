# Sector mismatch audit (2026-08-26): compares the stored "sector" field in kr-sectors.json /
# sp500-sectors.json against Yahoo v1/finance/search's live sectorDisp (same source the detail
# page uses). Mismatches are written to sector-map/scripts/audit-sectors-result.csv
# (ASCII-only file on purpose -- a UTF-8-without-BOM .ps1 with Korean text broke Windows PowerShell 5.1's parser)
$ProgressPreference = 'SilentlyContinue'
$headers = @{ "User-Agent" = "Mozilla/5.0" }
$results = New-Object System.Collections.Generic.List[object]

function Audit-File($dataPath, $label) {
  $data = Get-Content -Path $dataPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $companies = $data.companies
  Write-Host "=== $label : $($companies.Count) companies ==="
  $done = 0
  $failed = 0
  foreach ($c in $companies) {
    $sym = $c.symbol
    try {
      $r = Invoke-RestMethod -Uri "https://query1.finance.yahoo.com/v1/finance/search?q=$sym&newsCount=0&quotesCount=5" -Headers $headers -TimeoutSec 15
      $match = $r.quotes | Where-Object { $_.symbol -eq $sym } | Select-Object -First 1
      $liveSector = if ($match) { $match.sectorDisp } else { $null }
      if ($liveSector -and $liveSector -ne $c.sector) {
        $results.Add([PSCustomObject]@{
          dataset = $label
          symbol = $sym
          name = $c.name
          storedSector = $c.sector
          storedSectorKo = $c.sectorKo
          liveSector = $liveSector
        })
        Write-Host "MISMATCH: $sym $($c.name) : $($c.sector) -> $liveSector"
      }
    } catch {
      $failed++
    }
    $done++
    if ($done % 50 -eq 0) { Write-Host "   - $done / $($companies.Count) done (failed $failed, mismatches $($results.Count))" }
    Start-Sleep -Milliseconds 120
  }
  Write-Host "   -> $label done: $done processed, $failed failed"
}

Audit-File "$PSScriptRoot\..\data\kr-sectors.json" "KR"
Audit-File "$PSScriptRoot\..\data\sp500-sectors.json" "SP500"

$results | Export-Csv -Path "$PSScriptRoot\audit-sectors-result.csv" -NoTypeInformation -Encoding UTF8
Write-Host "ALL_DONE : total mismatches = $($results.Count), saved to sector-map/scripts/audit-sectors-result.csv"
