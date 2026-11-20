# kr-sectors.json / sp500-sectors.json(원본 데이터)로 지도가 실제 로드하는 파일
# kr-data-core.js/-extra.js, sp500-data-core.js/-extra.js("const X_DATA = " + JSON)를 다시 만든다.
#
# 2026-11-20 개편: 예전에는 "이미 지도에 있는 종목의 값만" 갱신해서 지수 편입·편출이 지도에 반영되지 않았다
# (8/26 구성 그대로 — S&P500 새 편입 7종목이 없고 빠진 7종목이 남아 있었음). 이제 값과 함께 구성도 원본에 맞춘다.
#   - 원본에 새로 생긴 종목은 추가, 원본에서 빠진 종목은 제거
#   - core/extra 나누는 기준(2026-08-26 분리 때와 동일)대로 매번 다시 나눔
#       해외: core = 시가총액 상위 200개(S&P200 보기는 core만 씀), extra = 나머지 — 둘 다 시가총액 내림차순
#       국내: core = 코스피 상위 100 + 코스닥 상위 50, extra = 나머지 코스피 + 나머지 코스닥 — 각각 시가총액 내림차순
#   - 알파벳은 GOOGL만 지도에 올린다(GOOG 행도 회사 전체 시가총액이라 둘 다 올리면 두 배가 됨, 2026-08-26 결정 유지)
#   - 지도 파일에만 있는 부가 필드(원본에 없는 값)는 종목별로 이어받는다
# 덮어쓰기 전 검증: 원본 종목 수가 너무 적거나(해외 450·국내 300 미만, 직전 지도의 80% 미만), 필수 필드가 빈 행이 많거나,
# 시가총액이 빈 종목이 10%를 넘으면 그 시장의 지도 파일은 건드리지 않고 경고만 남긴다(다른 시장은 계속 진행).
#
# 사용: ./scripts/regenerate-core-extra.ps1 [-Market all|us|kr] [-DryRun]
#   -DryRun: 파일을 쓰지 않고 무엇이 바뀌는지만 출력
# Windows PowerShell 5.1 과 PowerShell 7(CI ubuntu) 양쪽에서 돈다.

param(
  [ValidateSet("all", "us", "kr")][string]$Market = "all",
  [switch]$DryRun
)

$dataDir = Join-Path (Split-Path $PSScriptRoot -Parent) "data"
# 주의: 심볼을 키로 쓰는 해시테이블은 .Keys/.Count 대신 get_Keys()/get_Count()를 쓴다 —
# 티커 "KEYS"(키사이트)가 들어 있으면 $h.Keys 가 그 종목의 값을 돌려준다.
$script:skipped = @()

function Write-Warn($msg) {
  # GitHub Actions 실행 화면에 경고로 뜨게(로컬에서는 그냥 한 줄)
  Write-Host "::warning::$msg"
}

function Read-JsData($path, $varName) {
  if (-not (Test-Path $path)) { return $null }
  try {
    $text = Get-Content -Path $path -Raw -Encoding UTF8
    $prefix = "const $varName = "
    $at = $text.IndexOf($prefix)
    if ($at -lt 0) { return $null }
    $jsonStart = $text.IndexOf("{", $at)
    $jsonText = $text.Substring($jsonStart).TrimEnd()
    if ($jsonText.EndsWith(";")) { $jsonText = $jsonText.Substring(0, $jsonText.Length - 1) }
    return ($jsonText | ConvertFrom-Json)
  } catch {
    return $null
  }
}

function Get-CapValue($c) {
  $v = $c.marketCap
  if ($null -eq $v) { return 0.0 }
  $d = 0.0
  try { $d = [double]$v } catch { return 0.0 }
  if ([double]::IsNaN($d) -or [double]::IsInfinity($d) -or $d -lt 0) { return 0.0 }
  return $d
}

# 시가총액 내림차순(같으면 심볼순 — 실행할 때마다 같은 순서가 나오게)
function Sort-ByCapDesc($list) {
  if (-not $list -or @($list).Count -eq 0) { return @() }
  return @($list | Sort-Object -Property @{ Expression = { Get-CapValue $_ }; Descending = $true }, @{ Expression = { [string]$_.symbol }; Descending = $false })
}

function Test-Blank($v) {
  return ($null -eq $v -or [string]::IsNullOrWhiteSpace([string]$v))
}

function New-MapObject($prev, $companies, $source) {
  $o = [ordered]@{}
  $o["count"] = @($companies).Count
  $o["companies"] = @($companies)
  $ratios = $null
  if ($source.PSObject.Properties["ratiosUpdatedAt"]) { $ratios = $source.ratiosUpdatedAt }
  elseif ($prev -and $prev.PSObject.Properties["ratiosUpdatedAt"]) { $ratios = $prev.ratiosUpdatedAt }
  if ($null -ne $ratios) { $o["ratiosUpdatedAt"] = $ratios }
  $o["generatedAt"] = $source.generatedAt
  # 지도 파일 최상위에만 있던 다른 키가 있으면 그대로 둔다
  if ($prev) {
    foreach ($p in $prev.PSObject.Properties) {
      if (-not $o.Contains($p.Name)) { $o[$p.Name] = $p.Value }
    }
  }
  return $o
}

function Rebuild-Market($label, $sourceFile, $coreFile, $coreVar, $extraFile, $extraVar, $minSource, $mode) {
  $sourcePath = Join-Path $dataDir $sourceFile
  $corePath = Join-Path $dataDir $coreFile
  $extraPath = Join-Path $dataDir $extraFile

  $source = $null
  try { $source = Get-Content -Path $sourcePath -Raw -Encoding UTF8 | ConvertFrom-Json } catch {}
  if (-not $source -or -not $source.companies) {
    Write-Warn "[$label] 원본 $sourceFile 을 읽지 못해 지도 파일을 그대로 둡니다."
    $script:skipped += $label
    return
  }

  # ---- 원본 정리: 필수 필드 확인, 중복 제거 ----
  $rows = New-Object System.Collections.ArrayList
  $seen = @{}
  $bad = @()
  foreach ($c in @($source.companies)) {
    if ($null -eq $c -or (Test-Blank $c.symbol)) { $bad += "(심볼 없음)"; continue }
    $sym = [string]$c.symbol
    if ((Test-Blank $c.name) -or (Test-Blank $c.sector)) { $bad += $sym; continue }
    if ($seen.ContainsKey($sym)) { continue }
    $seen[$sym] = $true
    [void]$rows.Add($c)
  }
  $srcCount = @($source.companies).Count

  # 알파벳: GOOGL이 있으면 GOOG는 지도에서 뺀다(2026-08-26 결정 — 두 행 모두 회사 전체 시가총액)
  $dupClass = @{}
  if ($mode -eq "us") { $dupClass["GOOG"] = "GOOGL" }
  $dropped = @()
  foreach ($k in @($dupClass.get_Keys())) {
    if ($seen.ContainsKey($k) -and $seen.ContainsKey($dupClass[$k])) {
      $rows = [System.Collections.ArrayList]@($rows | Where-Object { [string]$_.symbol -ne $k })
      $dropped += $k
    }
  }

  # ---- 직전 지도 파일(비교·부가 필드 이어받기용) ----
  $prevCore = Read-JsData $corePath $coreVar
  $prevExtra = Read-JsData $extraPath $extraVar
  $prevMap = @{}
  $prevCoreSet = @{}
  if ($prevCore -and $prevCore.companies) { foreach ($c in @($prevCore.companies)) { if ($c.symbol) { $prevMap[[string]$c.symbol] = $c; $prevCoreSet[[string]$c.symbol] = $true } } }
  if ($prevExtra -and $prevExtra.companies) { foreach ($c in @($prevExtra.companies)) { if ($c.symbol -and -not $prevMap.ContainsKey([string]$c.symbol)) { $prevMap[[string]$c.symbol] = $c } } }
  $prevTotal = $prevMap.get_Count()

  # ---- 덮어쓰기 전 검증 ----
  $withCap = @($rows | Where-Object { (Get-CapValue $_) -gt 0 }).Count
  $problems = @()
  if ($rows.Count -lt $minSource) { $problems += "원본 종목 수 $($rows.Count)개 < 최소 $minSource" }
  if ($prevTotal -gt 0 -and $rows.Count -lt [math]::Ceiling($prevTotal * 0.8)) { $problems += "원본 종목 수 $($rows.Count)개가 직전 지도($prevTotal)의 80% 미만" }
  if ($bad.Count -gt [math]::Max(5, [math]::Floor($srcCount * 0.02))) { $problems += "이름·섹터가 빈 행 $($bad.Count)개" }
  if ($rows.Count -gt 0 -and $withCap -lt [math]::Ceiling($rows.Count * 0.9)) { $problems += "시가총액이 있는 종목 $withCap/$($rows.Count) (90% 미만)" }
  if ($problems.Count -gt 0) {
    Write-Warn "[$label] 원본이 비정상이라 지도 파일을 그대로 둡니다: $($problems -join ' / ')"
    $script:skipped += $label
    return
  }
  if ($bad.Count -gt 0) { Write-Host "[$label] 이름·섹터가 비어 제외한 행: $($bad -join ', ')" }

  # ---- 지도 파일에만 있던 부가 필드 이어받기(원본 값이 항상 우선) ----
  $carried = 0
  foreach ($c in $rows) {
    $p = $prevMap[[string]$c.symbol]
    if (-not $p) { continue }
    foreach ($prop in $p.PSObject.Properties) {
      if ($null -eq $c.PSObject.Properties[$prop.Name]) {
        $c | Add-Member -NotePropertyName $prop.Name -NotePropertyValue $prop.Value -Force
        $carried++
      }
    }
  }

  # ---- core/extra 나누기 ----
  $core = @(); $extra = @()
  if ($mode -eq "kr") {
    $kospi = @(Sort-ByCapDesc @($rows | Where-Object { $_.exchange -eq "KOSPI" -or ((Test-Blank $_.exchange) -and ([string]$_.symbol).EndsWith(".KS")) }))
    $kospiSet = @{}; foreach ($c in $kospi) { $kospiSet[[string]$c.symbol] = $true }
    $kosdaq = @(Sort-ByCapDesc @($rows | Where-Object { -not $kospiSet.ContainsKey([string]$_.symbol) }))
    $nK = [math]::Min(100, $kospi.Count); $nQ = [math]::Min(50, $kosdaq.Count)
    if ($nK -gt 0) { $core += @($kospi[0..($nK - 1)]) }
    if ($nQ -gt 0) { $core += @($kosdaq[0..($nQ - 1)]) }
    if ($kospi.Count -gt $nK) { $extra += @($kospi[$nK..($kospi.Count - 1)]) }
    if ($kosdaq.Count -gt $nQ) { $extra += @($kosdaq[$nQ..($kosdaq.Count - 1)]) }
  } else {
    $sorted = @(Sort-ByCapDesc $rows)
    $n = [math]::Min(200, $sorted.Count)
    if ($n -gt 0) { $core = @($sorted[0..($n - 1)]) }
    if ($sorted.Count -gt $n) { $extra = @($sorted[$n..($sorted.Count - 1)]) }
  }

  # ---- 결과 검증(합계·중복) ----
  $outSet = @{}
  foreach ($c in ($core + $extra)) { $outSet[[string]$c.symbol] = $true }
  if (($core.Count + $extra.Count) -ne $rows.Count -or $outSet.get_Count() -ne $rows.Count -or $core.Count -eq 0) {
    Write-Warn "[$label] 나눈 결과가 맞지 않아 지도 파일을 그대로 둡니다(core $($core.Count) + extra $($extra.Count) / 원본 $($rows.Count) / 고유 $($outSet.get_Count()))."
    $script:skipped += $label
    return
  }

  $coreJson = (New-MapObject $prevCore $core $source) | ConvertTo-Json -Depth 6
  $extraJson = (New-MapObject $prevExtra $extra $source) | ConvertTo-Json -Depth 6
  # 직렬화가 제대로 됐는지 되읽어 개수 확인(여기서 어긋나면 파일을 쓰지 않는다)
  $chkCore = -1; $chkExtra = -1
  try { $chkCore = @(($coreJson | ConvertFrom-Json).companies).Count } catch {}
  try { $chkExtra = @(($extraJson | ConvertFrom-Json).companies).Count } catch {}
  if ($chkCore -ne $core.Count -or $chkExtra -ne $extra.Count) {
    Write-Warn "[$label] JSON 되읽기 개수가 달라 지도 파일을 그대로 둡니다(core $chkCore/$($core.Count), extra $chkExtra/$($extra.Count))."
    $script:skipped += $label
    return
  }

  # ---- 변경 요약 ----
  $added = @($outSet.get_Keys() | Where-Object { -not $prevMap.ContainsKey($_) } | Sort-Object)
  $removed = @($prevMap.get_Keys() | Where-Object { -not $outSet.ContainsKey($_) } | Sort-Object)
  $coreSet = @{}; foreach ($c in $core) { $coreSet[[string]$c.symbol] = $true }
  $coreIn = @($coreSet.get_Keys() | Where-Object { -not $prevCoreSet.ContainsKey($_) } | Sort-Object)
  $coreOut = @($prevCoreSet.get_Keys() | Where-Object { -not $coreSet.ContainsKey($_) } | Sort-Object)
  Write-Host "[$label] core $($core.Count) + extra $($extra.Count) = $($rows.Count) (원본 $srcCount, 직전 지도 $prevTotal, 시총 있음 $withCap)"
  if ($dropped.Count) { Write-Host "[$label]   중복 클래스 제외: $($dropped -join ', ')" }
  if ($added.Count) { Write-Host "[$label]   새로 넣음 $($added.Count): $($added -join ', ')" }
  if ($removed.Count) { Write-Host "[$label]   뺌 $($removed.Count): $($removed -join ', ')" }
  if ($coreIn.Count) { Write-Host "[$label]   core 편입 $($coreIn.Count): $($coreIn -join ', ')" }
  if ($coreOut.Count) { Write-Host "[$label]   core 제외 $($coreOut.Count): $($coreOut -join ', ')" }
  if ($carried) { Write-Host "[$label]   지도 전용 필드 이어받기 $carried 개 값" }

  if ($DryRun) {
    Write-Host "[$label] -DryRun: 파일은 쓰지 않았습니다."
    return
  }
  Set-Content -Path $corePath -Value "const $coreVar = $coreJson;" -Encoding utf8
  Set-Content -Path $extraPath -Value "const $extraVar = $extraJson;" -Encoding utf8
  Write-Host "[$label] 저장: $coreFile, $extraFile"
}

if ($Market -eq "all" -or $Market -eq "us") {
  Rebuild-Market "해외" "sp500-sectors.json" "sp500-data-core.js" "SP500_CORE_DATA" "sp500-data-extra.js" "SP500_EXTRA_DATA" 450 "us"
}
if ($Market -eq "all" -or $Market -eq "kr") {
  Rebuild-Market "국내" "kr-sectors.json" "kr-data-core.js" "KR_CORE_DATA" "kr-data-extra.js" "KR_EXTRA_DATA" 300 "kr"
}

if ($script:skipped.Count -gt 0) { Write-Host "건너뜀: $($script:skipped -join ', ') (위 경고 참고)" }
Write-Host "ALL_DONE"
