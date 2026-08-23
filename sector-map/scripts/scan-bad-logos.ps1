# logos/high/*.png 중 "진짜 로고"가 아니라 사진(회사 건물 등)처럼 보이는 파일을 자동으로 골라낸다.
# 로고는 보통 색이 몇 개 안 되는 평면 벡터 스타일이고, 사진은 그라데이션·질감 때문에 고유 색상 수가 훨씬 많다는 점을 이용.
# (완벽하지 않은 휴리스틱 — 여기서 걸러진 것만 사람이 눈으로 최종 확인)

Add-Type -AssemblyName System.Drawing

$dir = "$PSScriptRoot\..\logos\high"
$files = Get-ChildItem $dir -File | Where-Object { $_.Name -match '\.K[SQ]\.png$' }

Write-Host "총 $($files.Count)개 국내 로고 스캔 중..."

$results = @()
foreach ($f in $files) {
  try {
    $bmp = New-Object System.Drawing.Bitmap($f.FullName)
    $colors = New-Object 'System.Collections.Generic.HashSet[int]'
    $stepX = [math]::Max(1, [int]($bmp.Width / 40))
    $stepY = [math]::Max(1, [int]($bmp.Height / 40))
    for ($x = 0; $x -lt $bmp.Width; $x += $stepX) {
      for ($y = 0; $y -lt $bmp.Height; $y += $stepY) {
        $p = $bmp.GetPixel($x, $y)
        if ($p.A -lt 20) { continue }
        # 16단계로 양자화해서 미세한 안티에일리어싱/노이즈는 같은 색으로 취급
        $key = ([int]($p.R/16)*16*256) + ([int]($p.G/16)*16) + [int]($p.B/16)
        [void]$colors.Add($key)
      }
    }
    $bmp.Dispose()
    $results += [PSCustomObject]@{ symbol = $f.BaseName; uniqueColors = $colors.Count }
  } catch {
    Write-Host "실패: $($f.Name)"
  }
}

$results | Sort-Object uniqueColors -Descending | Select-Object -First 60 |
  ForEach-Object { "{0,-16} {1}" -f $_.symbol, $_.uniqueColors } |
  Out-File -FilePath "$PSScriptRoot\..\data\suspect-logos.txt" -Encoding utf8

Write-Host "완료: data/suspect-logos.txt 에 고유색상 많은 순 상위 60개 저장"
