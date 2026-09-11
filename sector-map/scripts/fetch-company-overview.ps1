# 종목별 "뭐하는 회사인지" 한 줄 개요 수집(2026-09-11 사용자 요청: "개요가 안적힌게 너무많아")
#
# 원래 검색상세의 개요는 위키백과를 이름으로 검색해 첫 문장을 가져왔다. 대기업은 잘 나오지만
# 중소형주·신규 상장주는 문서 자체가 없어 "사업 개요 정보를 찾을 수 없습니다"로 비고, 가끔 엉뚱한 문서가 잡혔다.
# 그래서 회사가 직접 신고·공시한 자료로 개요를 미리 만들어 둔다.
#
# 한국: 한국거래소 상장법인목록(kind.krx.co.kr/corpgeneral/corpList.do)의 업종·주요제품 — 전 상장사 2,800여 곳.
# 미국: 야후 assetProfile.longBusinessSummary(회사가 제출한 사업 설명) 첫 문장을 구글 번역으로 한글화.
#       (야후 quoteSummary는 쿠키+crumb 인증이 필요하다)
#
# 결과: data/company-overview.json  { "005930.KS": "...", "AAPL": "..." }

param(
  [switch]$SkipKr,
  [switch]$SkipUs,
  [int]$UsLimit = 0   # 0이면 전체
)

$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = "Stop"
$UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
$scriptDir = $PSScriptRoot
$rootDataDir = Join-Path (Split-Path (Split-Path $scriptDir -Parent) -Parent) "data"
$outPath = Join-Path $rootDataDir "company-overview.json"

$out = [ordered]@{}
if (Test-Path $outPath) {
  $prev = Get-Content $outPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($prev.overviews) { foreach ($p in $prev.overviews.PSObject.Properties) { $out[$p.Name] = $p.Value } }
}

# ============================== 한국 ==============================
if (-not $SkipKr) {
  Write-Host "1) 한국 — 거래소 상장법인목록의 업종·주요제품..."
  $resp = Invoke-WebRequest "https://kind.krx.co.kr/corpgeneral/corpList.do?method=download&searchType=13" -UserAgent $UA -TimeoutSec 90 -UseBasicParsing
  $html = [Text.Encoding]::GetEncoding(949).GetString($resp.Content)
  $n = 0
  foreach ($tr in [regex]::Matches($html, '(?s)<tr[^>]*>(.*?)</tr>')) {
    $tds = @([regex]::Matches($tr.Groups[1].Value, '(?s)<td[^>]*>(.*?)</td>') | ForEach-Object {
        ($_.Groups[1].Value -replace '<[^>]+>', '' -replace '&amp;', '&' -replace '\s+', ' ').Trim()
      })
    if ($tds.Count -lt 6) { continue }
    $code = $tds[2]
    if ($code -notmatch '^[0-9A-Z]{6}$') { continue }
    $ind = $tds[3]; $prod = $tds[4]
    if (-not $ind -and -not $prod) { continue }
    # "전자부품 제조업 — FPCB(연성인쇄회로기판) 등을 만듭니다" 형태로 한 줄 개요를 만든다
    $text = if ($ind -and $prod) { "$ind 회사로, 주요 제품은 $prod 입니다." } elseif ($prod) { "주요 제품은 $prod 입니다." } else { "$ind 회사입니다." }
    # 유가=코스피(.KS), 코스닥=.KQ. 어느 쪽인지 모르면 둘 다 넣어둔다(조회는 심볼로 하므로 충돌 없음)
    $suffix = if ($tds[1] -match '유가|코스피') { ".KS" } elseif ($tds[1] -match '코스닥') { ".KQ" } else { $null }
    if ($suffix) { $out["$code$suffix"] = $text; $n++ }
  }
  Write-Host ("   -> 국내 {0}종목" -f $n)
}

# ============================== 미국 ==============================
if (-not $SkipUs) {
  Write-Host "2) 미국 — 야후 assetProfile + 구글 번역..."
  # 대상: 배치 점수 DB(S&P500)와 IPO 목록의 미국 종목
  $targets = New-Object System.Collections.Generic.HashSet[string]
  $wr = Join-Path $rootDataDir "winrate-scores-us.json"
  if (Test-Path $wr) {
    $w = Get-Content $wr -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($p in $w.scores.PSObject.Properties) { [void]$targets.Add($p.Name) }
  }
  $ipo = Join-Path $rootDataDir "ipo-list.json"
  if (Test-Path $ipo) {
    $ij = Get-Content $ipo -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($r in $ij.us) { if (-not $r.isSpac) { [void]$targets.Add($r.symbol) } }
  }
  $list = @($targets) | Where-Object { -not $out.Contains($_) }   # 이미 받아둔 건 건너뜀
  if ($UsLimit -gt 0) { $list = @($list | Select-Object -First $UsLimit) }
  Write-Host ("   대상 {0}종목(기존 보유분 제외)" -f $list.Count)

  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  try { Invoke-WebRequest "https://fc.yahoo.com" -WebSession $session -UserAgent $UA -TimeoutSec 20 -UseBasicParsing -ErrorAction SilentlyContinue | Out-Null } catch { }
  $crumb = (Invoke-WebRequest "https://query1.finance.yahoo.com/v1/test/getcrumb" -WebSession $session -UserAgent $UA -TimeoutSec 20 -UseBasicParsing).Content
  if (-not $crumb -or $crumb.Length -gt 30) { throw "야후 crumb을 받지 못했습니다: [$crumb]" }

  $i = 0; $hit = 0
  foreach ($sym in $list) {
    $i++
    try {
      $u = "https://query2.finance.yahoo.com/v10/finance/quoteSummary/$sym`?modules=assetProfile&crumb=" + [uri]::EscapeDataString($crumb)
      $r = Invoke-RestMethod $u -WebSession $session -UserAgent $UA -TimeoutSec 20
      $summary = ($r.quoteSummary.result[0].assetProfile.longBusinessSummary + "").Trim()
      if ($summary) {
        # 첫 두 문장까지만 — 개요 줄은 화면에서 220자로 잘리므로 통째로 번역할 필요가 없다
        $m = [regex]::Match($summary, '^(?:[^.]+\.){1,2}')
        $short = if ($m.Success) { $m.Value.Trim() } else { $summary.Substring(0, [Math]::Min(300, $summary.Length)) }
        $ko = $null
        try {
          $t = Invoke-RestMethod ("https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=" + [uri]::EscapeDataString($short)) -UserAgent $UA -TimeoutSec 20
          $ko = (($t[0] | ForEach-Object { $_[0] }) -join "").Trim()
        } catch { }
        if ($ko) { $out[$sym] = $ko; $hit++ }
        elseif ($short) { $out[$sym] = $short; $hit++ }   # 번역 실패 시 원문이라도
      }
    } catch { }
    if ($i % 100 -eq 0) {
      Write-Host ("   진행 {0}/{1} (확보 {2})" -f $i, $list.Count, $hit)
      # 중간 저장 — 오래 도는 배치라 중간에 끊겨도 지금까지 받은 건 남게
      [ordered]@{ generatedAt = (Get-Date).ToUniversalTime().ToString("s"); overviews = $out } |
        ConvertTo-Json -Depth 3 -Compress | Set-Content $outPath -Encoding UTF8
    }
    Start-Sleep -Milliseconds 120
  }
  Write-Host ("   -> 미국 {0}종목 추가" -f $hit)
}

[ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  description = "종목별 한 줄 사업 개요. 한국=거래소 상장법인목록의 업종·주요제품, 미국=야후 assetProfile 사업설명 첫 문장을 한글 번역. 검색상세 개요가 위키백과에서 안 잡힐 때 쓰는 기본값."
  overviews   = $out
} | ConvertTo-Json -Depth 3 -Compress | Set-Content $outPath -Encoding UTF8
Write-Host ("저장 -> data/company-overview.json ({0}종목)" -f $out.Count)
