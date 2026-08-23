# 이미 받아둔 logos/*.png(250x250 원본)를 저/중/고화질 3단계로 리사이즈해서
# logos/low(32px)/mid(80px)/high(원본 그대로 복사) 폴더에 저장.
# 지도를 축소해서 볼 땐 low만 받게 하고, 특정 섹터로 확대했을 때만 필요한 종목만 mid/high를 받게 해서
# 초기 로딩 바이트 수를 크게 줄이는 게 목적(app.js의 updateLogoQuality가 화면상 크기를 보고 자동 전환).

Add-Type -AssemblyName System.Drawing

$srcDir = "$PSScriptRoot\..\logos"
$lowDir = "$srcDir\low"
$midDir = "$srcDir\mid"
$highDir = "$srcDir\high"
foreach ($d in @($lowDir, $midDir, $highDir)) {
  if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d | Out-Null }
}

function Resize-PngTo($srcPath, $destPath, $size) {
  $src = [System.Drawing.Image]::FromFile($srcPath)
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $bmp.SetResolution($src.HorizontalResolution, $src.VerticalResolution)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.DrawImage($src, 0, 0, $size, $size)
  $g.Dispose()
  $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $src.Dispose()
}

$files = Get-ChildItem $srcDir -Filter "*.png" -File
Write-Host "1) $($files.Count)개 로고를 저/중/고화질로 변환 시작..."

$done = 0
foreach ($f in $files) {
  $sym = $f.BaseName
  try {
    Resize-PngTo $f.FullName (Join-Path $lowDir "$sym.png") 32
    Resize-PngTo $f.FullName (Join-Path $midDir "$sym.png") 80
    Copy-Item $f.FullName (Join-Path $highDir "$sym.png") -Force
  } catch {
    Write-Host "   실패: $sym - $_"
  }
  $done++
  if ($done % 150 -eq 0) { Write-Host "   - $done / $($files.Count)" }
}

Write-Host "완료: $done 개 처리"
$lowSize = (Get-ChildItem $lowDir -File | Measure-Object Length -Sum).Sum / 1MB
$midSize = (Get-ChildItem $midDir -File | Measure-Object Length -Sum).Sum / 1MB
$highSize = (Get-ChildItem $highDir -File | Measure-Object Length -Sum).Sum / 1MB
Write-Host ("low: {0:N2}MB, mid: {1:N2}MB, high: {2:N2}MB" -f $lowSize, $midSize, $highSize)
