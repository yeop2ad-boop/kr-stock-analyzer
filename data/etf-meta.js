// ETF 로고(이모지) 분류표 — 2026-09-11 사용자 요청
//
// ETF는 운용사 CI가 전부 똑같이 생겨서 목록에서 뭐가 뭔지 구분이 안 된다는 지적에 따라,
// 상품명으로 무엇을 추종하는지 알아내 대표 이모지를 붙인다
// (코스피·코스닥=태극기, S&P500=성조기, 금=금괴, 채권=관공서, 원유=기름통, 기술주=컴퓨터, 우주·방산=로켓 …).
// 레버리지·인버스는 배수를 X2·X3로 같이 표시하고, 색은 레버리지=상승색 / 인버스=하락색이라
// 사용자가 상승·하락 색상을 초록·빨강으로 바꾸면 배지 색도 같이 바뀐다.
//
// 티커별 표가 아니라 이름 기반 규칙인 이유: 국내 ETF만 1,163개라 표로는 다 못 덮고,
// 상품명이 "TIGER 미국S&P500", "KODEX 골드선물(H)"처럼 추종 대상을 그대로 담고 있어 규칙이 더 정확하다.
//
// 운용보수·보유종목은 이 파일이 아니라 data/etf-info.json(batch: sector-map/scripts/fetch-etf-info.ps1)에서 읽는다.

// 위에서부터 먼저 맞는 규칙을 쓴다 — 순서가 곧 우선순위.
// (파생·원자재를 위에 둔 이유: "KODEX 골드선물", "TIGER 미국채10년"처럼 이름에 지수명이 같이 들어가는 상품이 많다)
window.ETF_THEME_RULES = [
  { key: "crypto", emoji: "₿", label: "가상자산", test: /비트코인|Bitcoin|이더리움|Ethereum|가상자산|Crypto|Blockchain/i },
  { key: "gold", emoji: "🪙", label: "금", test: /금현물|골드|Gold|KRX금/i },
  { key: "silver", emoji: "🥈", label: "은", test: /은선물|은현물|Silver/i },
  { key: "oil", emoji: "🛢️", label: "원유·에너지", test: /원유|WTI|오일|Oil|천연가스|Natural Gas|Energy|에너지/i },
  { key: "money", emoji: "💵", label: "금리·현금성", test: /머니마켓|CD금리|KOFR|초단기|단기통안|금리액티브|T-?Bill|Ultra-?Short|Floating Rate|0-3 Month/i },
  { key: "bond", emoji: "🏛️", label: "채권", test: /채권|국채|국고채|통안채|물가채|회사채|크레딧|금융채|Bond|Treasury|Muni|Aggregate|Corporate|MBS|Preferred/i },
  { key: "space", emoji: "🚀", label: "우주·방산", test: /우주|방산|항공우주|K-?방산|Aerospace|Defense|Space/i },
  { key: "semi", emoji: "🔲", label: "반도체", test: /반도체|HBM|소부장|Semiconductor|필라델피아/i },
  { key: "ai", emoji: "🤖", label: "AI·로봇", test: /\bAI\b|인공지능|로봇|Robot|머신러닝/i },
  { key: "battery", emoji: "🔋", label: "2차전지", test: /2차전지|이차전지|배터리|Battery|리튬|Lithium/i },
  { key: "ship", emoji: "🚢", label: "조선·해운", test: /조선|해운|Shipping/i },
  { key: "bio", emoji: "💊", label: "헬스케어", test: /바이오|헬스케어|제약|Health|Biotech|Pharma|Medical/i },
  { key: "reit", emoji: "🏢", label: "리츠·부동산", test: /리츠|부동산|REIT|Real Estate/i },
  { key: "finance", emoji: "🏦", label: "금융", test: /은행|증권|보험|금융|Financial|Bank/i },
  { key: "dividend", emoji: "💰", label: "배당", test: /배당|커버드콜|Dividend|Covered Call|Premium Income|Aristocrat/i },
  { key: "tech", emoji: "💻", label: "기술주", test: /나스닥|NASDAQ|QQQ|빅테크|테크|\bIT\b|소프트웨어|플랫폼|Technology|Software/i },
  { key: "china", emoji: "🇨🇳", label: "중국", test: /중국|차이나|China|CSI|항셍|Hang Seng/i },
  { key: "japan", emoji: "🇯🇵", label: "일본", test: /일본|니케이|Japan|Nikkei|TOPIX/i },
  { key: "india", emoji: "🇮🇳", label: "인도", test: /인도|India|Nifty/i },
  { key: "europe", emoji: "🇪🇺", label: "유럽", test: /유럽|Europe|EAFE|Euro|독일|DAX/i },
  { key: "world", emoji: "🌏", label: "글로벌·신흥국", test: /신흥국|이머징|Emerging|글로벌|Global|World|International|ACWI|선진국|Developed/i },
  { key: "us", emoji: "🇺🇸", label: "미국", test: /S&P\s?500|S&P500|미국|US\b|U\.S\.|다우|Dow|러셀|Russell|Total Stock Market|Large-?Cap|Mid-?Cap|Small-?Cap|MidCap|Core S&P/i },
  { key: "kr", emoji: "🇰🇷", label: "한국", test: /코스피|코스닥|KOSPI|KOSDAQ|MSCI Korea|코리아|Korea|밸류업|200\b|150\b|Top\s?5/i },
];

// 못 맞히면 이거 — 지수 추종이라는 뜻의 차트.
// 단, 국내 ETF는 이름에 지수가 없으면(예: "KODEX 레버리지", "KODEX 인버스") 거의 코스피200 계열이라 태극기를 쓴다.
window.ETF_THEME_FALLBACK = { key: "etc", emoji: "📊", label: "지수·기타" };
window.ETF_THEME_FALLBACK_KR = { key: "kr", emoji: "🇰🇷", label: "한국" };

// 배수·방향(레버리지/인버스) 판별. 위에서부터 먼저 맞는 규칙을 쓴다 —
// "인버스2X"가 "레버리지"보다 먼저 걸려야 하므로 인버스 계열을 위에 둔다.
window.ETF_LEVERAGE_RULES = [
  { test: /인버스\s?2X|2X\s?인버스|곱버스|-2X|\bSDS\b|\bQID\b|UltraShort/i, mult: 2, dir: "short" },
  { test: /인버스\s?3X|3X\s?인버스|-3X|\bSQQQ\b|\bSPXS\b|\bSOXS\b|UltraPro Short/i, mult: 3, dir: "short" },
  { test: /인버스|Inverse|Bear\b|\bPSQ\b|\bDOG\b|\bSH\b/i, mult: 1, dir: "short" },
  { test: /3X|3배|\bTQQQ\b|\bUPRO\b|\bSPXL\b|\bSOXL\b|UltraPro/i, mult: 3, dir: "long" },
  { test: /레버리지|Leveraged|2X|2배|Ultra\b/i, mult: 2, dir: "long" },
];
