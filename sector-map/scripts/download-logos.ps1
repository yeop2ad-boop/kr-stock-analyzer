# 종목 로고 이미지를 financialmodelingprep에서 미리 받아 logos/ 폴더에 저장하는 스크립트.
# 매번 방문할 때마다 500~800개 로고를 외부 서버에서 개별 요청하면 느려서, 한 번 받아두고
# app.js가 로컬 파일(logos/{심볼}.png)을 바로 쓰도록 함. 지수 구성종목이 바뀔 때만 가끔 다시 돌리면 됨.

$ProgressPreference = 'SilentlyContinue'
$headers = @{ "User-Agent" = "Mozilla/5.0" }
$logosDir = "$PSScriptRoot\..\logos"
if (-not (Test-Path $logosDir)) { New-Item -ItemType Directory -Path $logosDir | Out-Null }

$usData = Get-Content "$PSScriptRoot\..\data\sp500-sectors.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$krData = Get-Content "$PSScriptRoot\..\data\kr-sectors.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$symbols = @($usData.companies.symbol) + @($krData.companies.symbol) | Sort-Object -Unique

Write-Host "1) 총 $($symbols.Count)개 심볼의 로고 확인/다운로드 시작..."

$downloaded = 0
$skipped = 0
$failed = 0
$done = 0
foreach ($sym in $symbols) {
  $outPath = Join-Path $logosDir "$sym.png"
  if (Test-Path $outPath) {
    $skipped++
  } else {
    try {
      $url = "https://financialmodelingprep.com/image-stock/$sym.png"
      Invoke-WebRequest -Uri $url -Headers $headers -OutFile $outPath -TimeoutSec 10 -ErrorAction Stop
      if ((Get-Item $outPath).Length -lt 100) {
        Remove-Item $outPath -Force
        $failed++
      } else {
        $downloaded++
      }
    } catch {
      $failed++
    }
    Start-Sleep -Milliseconds 40
  }
  $done++
  if ($done % 100 -eq 0) { Write-Host "   - $done / $($symbols.Count) 처리(신규 $downloaded, 기존 $skipped, 실패 $failed)" }
}

Write-Host "완료: 신규 $downloaded, 기존 $skipped, 실패 $failed (총 $($symbols.Count))"
