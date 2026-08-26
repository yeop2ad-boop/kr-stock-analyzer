# kr-sectors.json / sp500-sectors.json(원본 데이터)의 최신 필드를 kr-data-core.js/-extra.js, sp500-data-core.js/-extra.js
# ("const X_DATA = " + JSON 형태로 지도가 실제 로드하는 파일)에 종목(symbol) 기준으로 병합해 다시 저장한다.
# core/extra 파일 자체의 종목 구성(어떤 350개가 core, 어떤 게 extra인지)은 건드리지 않고, 이미 있는 종목들의
# 필드 값만 원본 기준으로 최신화한다. 신규 배치 스크립트(fetch-momentum-scores.ps1 등)로 원본을 갱신한 뒤 실행.

$dataDir = "$PSScriptRoot\..\data"

function Merge-DataFile($sourcePath, $targetPath, $varName) {
  $source = Get-Content -Path $sourcePath -Raw -Encoding UTF8 | ConvertFrom-Json
  $sourceMap = @{}
  foreach ($c in $source.companies) { $sourceMap[$c.symbol] = $c }

  $targetText = Get-Content -Path $targetPath -Raw -Encoding UTF8
  $prefix = "const $varName = "
  $jsonStart = $targetText.IndexOf("{", $targetText.IndexOf($prefix))
  $jsonText = $targetText.Substring($jsonStart).TrimEnd()
  if ($jsonText.EndsWith(";")) { $jsonText = $jsonText.Substring(0, $jsonText.Length - 1) }
  $target = $jsonText | ConvertFrom-Json

  $updated = 0
  $missing = 0
  foreach ($c in $target.companies) {
    $src = $sourceMap[$c.symbol]
    if ($src) {
      foreach ($prop in $src.PSObject.Properties) {
        $c | Add-Member -NotePropertyName $prop.Name -NotePropertyValue $prop.Value -Force
      }
      $updated++
    } else {
      $missing++
    }
  }

  $target | Add-Member -NotePropertyName "generatedAt" -NotePropertyValue $source.generatedAt -Force
  $newJson = $target | ConvertTo-Json -Depth 6
  Set-Content -Path $targetPath -Value "$prefix$newJson;" -Encoding utf8
  Write-Host "$targetPath : 갱신 $updated 건, 원본에 없음 $missing 건"
}

Merge-DataFile "$dataDir\sp500-sectors.json" "$dataDir\sp500-data-core.js" "SP500_CORE_DATA"
Merge-DataFile "$dataDir\sp500-sectors.json" "$dataDir\sp500-data-extra.js" "SP500_EXTRA_DATA"
Merge-DataFile "$dataDir\kr-sectors.json" "$dataDir\kr-data-core.js" "KR_CORE_DATA"
Merge-DataFile "$dataDir\kr-sectors.json" "$dataDir\kr-data-extra.js" "KR_EXTRA_DATA"

Write-Host "ALL_DONE"

