# DART OpenAPI(majorstock.json, 대량보유 상황보고)를 전체 상장사에 대해 순회 조회해
# 국민연금/한국투자공사/삼성·미래에셋·KB자산운용의 실제 5%룰 공시를 원문 기준으로 수집한다.
# 사용법: powershell -File fetch-dart-institutions.ps1 -ApiKey <DART_API_KEY> -OutFile <path>
# 주의: API 키는 절대 이 스크립트 파일 안에 하드코딩하지 말 것(파라미터로만 전달, git에 커밋되는 건 이 스크립트뿐).
param(
  [Parameter(Mandatory = $true)][string]$ApiKey,
  [string]$OutFile = "$PSScriptRoot\dart-institutions-result.json",
  [string]$ProgressFile = "$PSScriptRoot\dart-institutions-progress.txt"
)

$ErrorActionPreference = "Stop"

# 대량보유자명(repror)에 이 패턴 중 하나가 포함되면 해당 기관으로 분류(회사명 표기가 종종 "(주)" 등으로 조금씩 다름)
$targets = @(
  @{ key = "nps"; patterns = @("국민연금") },
  @{ key = "kic"; patterns = @("한국투자공사") },
  @{ key = "samsungAm"; patterns = @("삼성자산운용") },
  @{ key = "miraeAm"; patterns = @("미래에셋자산운용") },
  @{ key = "kbAm"; patterns = @("케이비자산운용", "KB자산운용", "국민은행자산운용") }
)

function Test-Institution([string]$repror) {
  foreach ($t in $targets) {
    foreach ($p in $t.patterns) {
      if ($repror -like "*$p*") { return $t.key }
    }
  }
  return $null
}

Write-Host "corpCode.xml 다운로드 중..."
$zipPath = "$PSScriptRoot\corpCode.zip"
$xmlDir = "$PSScriptRoot\corpCode_extracted"
Invoke-WebRequest -Uri "https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=$ApiKey" -OutFile $zipPath
if (Test-Path $xmlDir) { Remove-Item $xmlDir -Recurse -Force }
Expand-Archive -Path $zipPath -DestinationPath $xmlDir -Force
$xmlPath = Get-ChildItem $xmlDir -Filter "*.xml" | Select-Object -First 1 -ExpandProperty FullName
Write-Host "corpCode.xml 위치: $xmlPath"

[xml]$corpXml = Get-Content $xmlPath -Encoding UTF8
$allCorps = $corpXml.result.list
$listed = $allCorps | Where-Object { $_.stock_code -and $_.stock_code.Trim() -ne "" }
Write-Host "전체 상장사 수: $($listed.Count)"

$results = New-Object System.Collections.Generic.List[object]
$total = $listed.Count
$i = 0
$errors = 0

foreach ($corp in $listed) {
  $i++
  if ($i % 100 -eq 0) {
    $msg = "[$i/$total] 진행 중... (수집 $($results.Count)건, 오류 $errors)"
    Write-Host $msg
    Set-Content -Path $ProgressFile -Value $msg -Encoding UTF8
  }
  $corpCode = $corp.corp_code
  $stockCode = $corp.stock_code.Trim()
  $corpName = $corp.corp_name
  $url = "https://opendart.fss.or.kr/api/majorstock.json?crtfc_key=$ApiKey&corp_code=$corpCode"
  try {
    $resp = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 15
  } catch {
    $errors++
    Start-Sleep -Milliseconds 300
    continue
  }
  # DART 서버에 과부하를 주지 않도록 요청 사이 짧은 간격을 둠
  Start-Sleep -Milliseconds 120
  if ($resp.status -ne "000" -or -not $resp.list) { continue }

  # repror(대표보고자)별로 가장 최근 rcept_dt 한 건만 남김(같은 회사에 대해 같은 기관이 여러 번 보고했을 수 있음)
  $latestByRepror = @{}
  foreach ($row in $resp.list) {
    $key = Test-Institution $row.repror
    if (-not $key) { continue }
    $existing = $latestByRepror[$row.repror]
    if (-not $existing -or ([datetime]$row.rcept_dt) -gt ([datetime]$existing.rcept_dt)) {
      $latestByRepror[$row.repror] = $row
    }
  }
  foreach ($repror in $latestByRepror.Keys) {
    $row = $latestByRepror[$repror]
    $instKey = Test-Institution $repror
    $results.Add([PSCustomObject]@{
      institution = $instKey
      repror      = $repror
      corpCode    = $corpCode
      stockCode   = $stockCode
      corpName    = $corpName
      rceptNo     = $row.rcept_no
      rceptDt     = $row.rcept_dt
      stkqy       = $row.stkqy
      stkqyIrds   = $row.stkqy_irds
      stkrt       = $row.stkrt
      stkrtIrds   = $row.stkrt_irds
      reportResn  = $row.report_resn
    })
  }
}

$results | ConvertTo-Json -Depth 5 | Set-Content -Path $OutFile -Encoding UTF8
Write-Host "완료: 총 $($results.Count)건 수집, 오류 $errors 건. 결과 파일: $OutFile"
