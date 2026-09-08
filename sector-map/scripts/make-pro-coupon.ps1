# 마켓맵 Pro 무료 이용권 쿠폰 생성기(2026-09-09)
# 사용법:  powershell -File sector-map/scripts/make-pro-coupon.ps1 -Days 1 -Count 5
# 형식: MM + 일수(1~2자리) + 무작위 4자 + 검사 2자  (예: MM7ABCDBT)
# 검사 로직은 app.js의 proCouponHash/proParseCoupon과 동일해야 함(djb2 해시 → base36 대문자 뒤 2자).
# 쿠폰은 앱 '더보기 → Pro → 무료이용권' 탭에서 등록. 서버가 없어 같은 코드는 기기당 1회만 등록되며,
# 같은 코드를 여러 사람에게 주면 각자 1회씩 쓸 수 있음(1인 1회로 제한하려면 사람마다 다른 코드를 줄 것).
param(
  [int]$Days = 1,
  [int]$Count = 1
)
$secret = "marketmap-pro-2026-gullyeobolkka"
function Get-CouponHash([string]$s) {
  [uint32]$h = 5381
  foreach ($ch in $s.ToCharArray()) {
    $h = [uint32]((([uint64]$h * 33) -bxor [uint32][int]$ch) -band [uint64]4294967295)
  }
  $digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  $out = ""
  [uint64]$n = $h
  if ($n -eq 0) { $out = "0" }
  while ($n -gt 0) { $out = $digits[[int]($n % 36)] + $out; $n = [math]::Floor($n / 36) }
  $out = $out.PadLeft(4, "0")
  return $out.Substring($out.Length - 2)
}
if ($Days -lt 1 -or $Days -gt 99) { Write-Error "Days는 1~99"; exit 1 }
$alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".ToCharArray()
$rng = New-Object System.Random
for ($i = 0; $i -lt $Count; $i++) {
  $rand = -join (1..4 | ForEach-Object { $alphabet[$rng.Next($alphabet.Length)] })
  $body = "MM" + $Days + $rand
  $code = $body + (Get-CouponHash ($secret + $body))
  Write-Output $code
}
