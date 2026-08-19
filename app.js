// ===== 미국 기업 분석기 (API 키 불필요 버전) =====
// 데이터 소스: Yahoo Finance 비공식 엔드포인트(공개 CORS 프록시 경유) + Wikipedia(공식 CORS 지원)
// 주의: 비공식 API이므로 언제든 응답 형식이 바뀌거나 차단될 수 있습니다.

const el = (id) => document.getElementById(id);

// ---------- 핵심 내비게이션(탭바/서브탭/위저드) 아이콘 — 이모지 대신 로고와 동일한 주황(#e6983c) 단색 라인 아이콘 ----------
const WIZ_ORANGE = "#e6983c";
function svgIcon(inner) {
  return `<svg class="btn-icon-svg" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="${WIZ_ORANGE}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
const ICONS = {
  star: svgIcon(`<path fill="${WIZ_ORANGE}" stroke="none" d="M12 2.7l2.85 6.02 6.65.68-4.98 4.5 1.46 6.53L12 17.9l-5.98 3.53 1.46-6.53-4.98-4.5 6.65-.68L12 2.7z"/>`),
  search: svgIcon(`<circle cx="10" cy="10" r="7"/><line x1="21" y1="21" x2="15.2" y2="15.2"/>`),
  "trending-up": svgIcon(`<path d="M3 17l6-6 4 4 8-8"/><path d="M15 6h6v6"/>`),
  "trending-down": svgIcon(`<path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/>`),
  flame: svgIcon(`<path fill="${WIZ_ORANGE}" stroke="none" d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11Z"/>`),
  barrel: svgIcon(`<rect x="6" y="4" width="12" height="16" rx="2"/><path d="M6 9h12M6 15h12"/>`),
  exchange: svgIcon(`<path d="M4 8h13l-3-3M17 8l-3 3"/><path d="M20 16H7l3-3M7 16l3 3"/>`),
  coin: svgIcon(`<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10c0-1.2 1.2-2 2.5-2s2.5.7 2.5 1.8-1.2 1.5-2.5 1.5-2.5.6-2.5 1.7 1.2 1.8 2.5 1.8 2.5-.7 2.5-1.8"/>`),
  scroll: svgIcon(`<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8.5 9h7M8.5 12.5h7M8.5 16h4"/>`),
  bank: svgIcon(`<path d="M4 10l8-5 8 5"/><path d="M5 10v9M9 10v9M15 10v9M19 10v9M3 19h18"/>`),
  trophy: svgIcon(`<path d="M8 3h8v6a4 4 0 0 1-8 0V3Z"/><path d="M8 4.5H5.5a2.5 2.5 0 0 0 2.5 4M16 4.5h2.5a2.5 2.5 0 0 1-2.5 4"/><path d="M12 13v3M9 20h6M10 20l.5-3h3l.5 3"/>`),
  flask: svgIcon(`<path d="M10 3h4v5l4 9a2 2 0 0 1-2 3H8a2 2 0 0 1-2-3l4-9V3Z"/><path d="M9 3h6"/>`),
  calendar: svgIcon(`<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>`),
  newspaper: svgIcon(`<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M7.5 8h6M7.5 12h9M7.5 16h9"/>`),
  rocket: svgIcon(
    `<path d="M12 2c2.5 2 4 5.5 4 9 0 2-1 4-2 5v3l-2-1-2 1v-3c-1-1-2-3-2-5 0-3.5 1.5-7 4-9Z"/><circle cx="12" cy="10" r="1.4" fill="${WIZ_ORANGE}" stroke="none"/><path d="M9 16l-2 4M15 16l2 4"/>`
  ),
  wallet: svgIcon(`<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="17" cy="14.5" r="1.2" fill="${WIZ_ORANGE}" stroke="none"/>`),
  dollar: svgIcon(`<path d="M12 5v14"/><path d="M15.5 8.3c0-1.3-1.6-2.1-3.5-2.1s-3.5.9-3.5 2.1 1.6 1.7 3.5 2 3.5.9 3.5 2.1-1.6 2.1-3.5 2.1-3.5-.8-3.5-2.1"/>`),
  calculator: svgIcon(
    `<rect x="5" y="3" width="14" height="18" rx="2"/><rect x="7.5" y="5.5" width="9" height="3.5" rx="0.5"/><path stroke-width="2.6" d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 17h.01M12 17h.01M15.5 17h.01"/>`
  ),
  scale: svgIcon(`<path d="M12 3v17"/><path d="M6 7h12"/><path d="M6 7l-3 6a3 3 0 0 0 6 0L6 7Z"/><path d="M18 7l-3 6a3 3 0 0 0 6 0l-3-6Z"/><path d="M8 20h8"/>`),
  medal: svgIcon(`<circle cx="12" cy="15" r="5"/><path d="M9.5 10.5 7 4M14.5 10.5 17 4"/>`),
  building: svgIcon(`<path d="M5 21V9l7-5 7 5v12"/><path d="M3 21h18M9 21v-6h6v6"/>`),
  thumbsup: svgIcon(`<path d="M7 10v10H4V10h3Z"/><path d="M7 10l3-6a2 2 0 0 1 2 2v3h5.5a2 2 0 0 1 2 2.3l-1.3 6A2 2 0 0 1 16.2 20H9a2 2 0 0 1-2-2v-8Z"/>`),
  basket: svgIcon(`<path d="M4 9h16l-2 10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L4 9Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/>`),
};
function iconHtml(name) {
  return ICONS[name] || "";
}
function mountIcons() {
  document.querySelectorAll("[data-icon]").forEach((iconEl) => {
    iconEl.innerHTML = iconHtml(iconEl.dataset.icon);
  });
}
mountIcons();

// 시장 패널이 열릴 때 openMarketPanel()이 곧바로 startIndexAutoRefresh()를 호출함 — 그 함수가
// 참조하기 전에 값이 준비되어 있어야 하므로 파일 맨 앞에 둠(TDZ 에러 방지)
const INDEX_AUTO_REFRESH_MS = 20000;

const tickerInput = el("tickerInput");
const tickerSuggest = el("tickerSuggest");
const analyzeBtn = el("analyzeBtn");
const searchOpenBtn = el("searchOpenBtn");
const searchOverlay = el("searchOverlay");
const searchOverlayCloseBtn = el("searchOverlayCloseBtn");
const recentSearchList = el("recentSearchList");
const popularSearchList = el("popularSearchList");
const groundOpenBtn = el("groundOpenBtn");
const groundModal = el("groundModal");
const groundModalCloseBtn = el("groundModalCloseBtn");
const groundBody = el("groundBody");
const groundShareOpenBtn = el("groundShareOpenBtn");
const shareSheet = el("shareSheet");
const shareSheetBackdrop = el("shareSheetBackdrop");
const shareSheetCloseBtn = el("shareSheetCloseBtn");
const shareKakaoBtn = el("shareKakaoBtn");
const shareInstaBtn = el("shareInstaBtn");
const shareSaveBtn = el("shareSaveBtn");
const statusBox = el("statusBox");
const siteLogo = el("siteLogo");
const results = el("results");
const fixedHeader = el("fixedHeader");
const loadingSplash = el("loadingSplash");
const carouselViewport = el("carouselViewport");
const historicalStatus = el("historicalStatus");
const historicalResults = el("historicalResults");
const historicalFullUpBtn = el("historicalFullUpBtn");
const historicalFullDownBtn = el("historicalFullDownBtn");
const historicalMajorBtn = el("historicalMajorBtn");
const historicalInlineWrap = el("historicalInlineWrap");
const futureInlineWrap = el("futureInlineWrap");
const sReportInlineWrap = el("sReportInlineWrap");
const indexStatus = el("indexStatus");
const indexResults = el("indexResults");
const valuationStatus = el("valuationStatus");
const valuationResults = el("valuationResults");
const trendStatus = el("trendStatus");
const trendResults = el("trendResults");
const futureStatus = el("futureStatus");
// 가격/차트보기 링크 클릭 시 새 탭 대신 앱 내 전체화면 모달로 TradingView 차트를 띄움(요약 카드·순위표 등 여러 곳에서 동적으로 삽입되므로 이벤트 위임 사용)
el("chartModalCloseBtn").addEventListener("click", closeChartModal);
document.addEventListener("click", (e) => {
  const linkEl = e.target.closest(".price-chart-link, .chart-link-btn");
  if (!linkEl) return;
  e.preventDefault();
  openChartModal(linkEl.dataset.chartSymbol);
});
// 지수 카드는 <a>가 아니라 role="button" div라 클릭 외에 키보드(Enter/Space) 접근성도 함께 지원
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const rowEl = e.target.closest(".idx-row-clickable");
  if (!rowEl) return;
  e.preventDefault();
  openChartModal(rowEl.dataset.chartSymbol);
});
// ---------- 로그인/회원가입 (Firebase Authentication) ----------
// 구글·이메일은 Firebase가 직접 처리하고, 카카오·네이버는 Firebase가 네이티브 지원하지 않으므로
// OAuth authorization code를 Worker(/auth/kakao, /auth/naver)로 전달해 검증받은 뒤 발급받는
// Firebase 커스텀 토큰으로 signInWithCustomToken 합니다. 안드로이드 앱 출시 시에도 같은 Firebase
// 프로젝트 + 같은 Worker 엔드포인트를 그대로 재사용해 동일 계정으로 로그인할 수 있습니다.
const AUTH_ORIGIN = "https://us-stock.yeop2ad.workers.dev";
const loginModal = el("loginModal");
const loginModalCloseBtn = el("loginModalCloseBtn");
const loginGoogleBtn = el("loginGoogleBtn");
const loginKakaoBtn = el("loginKakaoBtn");
const loginNaverBtn = el("loginNaverBtn");
const loginEmailForm = el("loginEmailForm");
const loginEmailInput = el("loginEmailInput");
const loginPasswordInput = el("loginPasswordInput");
const loginError = el("loginError");
const loginEmailSubmitBtn = el("loginEmailSubmitBtn");
const loginSwitchText = el("loginSwitchText");
const loginSwitchModeBtn = el("loginSwitchModeBtn");
const loginForgotPasswordBtn = el("loginForgotPasswordBtn");
const userMenu = el("userMenu");
const userAvatarBtn = el("userAvatarBtn");
const userAvatarImg = el("userAvatarImg");
const userAvatarInitial = el("userAvatarInitial");
const userDropdown = el("userDropdown");
const userDropdownName = el("userDropdownName");
const userDropdownEmail = el("userDropdownEmail");
const logoutBtn = el("logoutBtn");

let isSignupMode = false;

function openLoginModal() {
  setLoginError("");
  loginModal.style.display = "flex";
}
function closeLoginModal() {
  loginModal.style.display = "none";
}
function setLoginError(message) {
  if (!message) {
    loginError.style.display = "none";
    return;
  }
  loginError.textContent = message;
  loginError.style.display = "block";
}
function setSignupMode(next) {
  isSignupMode = next;
  loginEmailSubmitBtn.textContent = isSignupMode ? "회원가입" : "로그인";
  loginSwitchText.textContent = isSignupMode ? "이미 계정이 있으신가요?" : "계정이 없으신가요?";
  loginSwitchModeBtn.textContent = isSignupMode ? "로그인" : "회원가입";
  setLoginError("");
}

const FIREBASE_ERROR_MESSAGES = {
  "auth/invalid-email": "올바른 이메일 형식이 아닙니다.",
  "auth/user-not-found": "가입되지 않은 이메일입니다.",
  "auth/wrong-password": "비밀번호가 일치하지 않습니다.",
  "auth/invalid-credential": "이메일 또는 비밀번호가 일치하지 않습니다.",
  "auth/email-already-in-use": "이미 가입된 이메일입니다.",
  "auth/weak-password": "비밀번호는 6자 이상이어야 합니다.",
  "auth/popup-closed-by-user": "로그인 창이 닫혔습니다.",
  "auth/too-many-requests": "잠시 후 다시 시도해주세요.",
};
function friendlyAuthError(err) {
  return FIREBASE_ERROR_MESSAGES[err && err.code] || "로그인에 실패했습니다. 잠시 후 다시 시도해주세요.";
}

loginModalCloseBtn.addEventListener("click", closeLoginModal);
loginSwitchModeBtn.addEventListener("click", () => setSignupMode(!isSignupMode));

loginGoogleBtn.addEventListener("click", async () => {
  setLoginError("");
  try {
    await firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
    closeLoginModal();
  } catch (err) {
    console.error("구글 로그인 실패:", err);
    setLoginError(friendlyAuthError(err));
  }
});

loginEmailForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setLoginError("");
  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value;
  loginEmailSubmitBtn.disabled = true;
  try {
    if (isSignupMode) {
      await firebase.auth().createUserWithEmailAndPassword(email, password);
    } else {
      await firebase.auth().signInWithEmailAndPassword(email, password);
    }
    closeLoginModal();
  } catch (err) {
    setLoginError(friendlyAuthError(err));
  } finally {
    loginEmailSubmitBtn.disabled = false;
  }
});

loginForgotPasswordBtn.addEventListener("click", async () => {
  const email = loginEmailInput.value.trim();
  if (!email) {
    setLoginError("비밀번호를 재설정할 이메일을 먼저 입력해주세요.");
    return;
  }
  try {
    await firebase.auth().sendPasswordResetEmail(email);
    setLoginError("");
    alert("비밀번호 재설정 메일을 보냈습니다. 메일함을 확인해주세요.");
  } catch (err) {
    setLoginError(friendlyAuthError(err));
  }
});

document.addEventListener("click", (e) => {
  if (userDropdown.style.display === "none") return;
  if (!userDropdown.contains(e.target) && e.target !== userAvatarBtn) {
    userDropdown.style.display = "none";
  }
});
userAvatarBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  userDropdown.style.display = userDropdown.style.display === "none" ? "block" : "none";
});
logoutBtn.addEventListener("click", async () => {
  await firebase.auth().signOut();
  userDropdown.style.display = "none";
});

function renderAuthState(user) {
  if (user) {
    userMenu.style.display = "block";
    const name = user.displayName || (user.email ? user.email.split("@")[0] : "회원");
    userDropdownName.textContent = name;
    userDropdownEmail.textContent = user.email || "";
    userDropdownEmail.style.display = user.email ? "block" : "none";
    if (user.photoURL) {
      userAvatarImg.src = user.photoURL;
      userAvatarImg.style.display = "block";
      userAvatarInitial.style.display = "none";
    } else {
      userAvatarImg.style.display = "none";
      userAvatarInitial.style.display = "block";
      userAvatarInitial.textContent = name.charAt(0).toUpperCase();
    }
  } else {
    userMenu.style.display = "none";
    userDropdown.style.display = "none";
  }
}
if (typeof firebase !== "undefined") {
  firebase.auth().onAuthStateChanged(renderAuthState);
}

// ---------- 카카오/네이버 로그인 (OAuth authorization code 리다이렉트 방식 — 팝업 SDK 대신 리다이렉트를 쓰는 이유는
// 나중에 안드로이드 앱 WebView 안에서도 동일하게 동작하도록 하기 위함) ----------
function buildOAuthState(provider) {
  const state = `${provider}_${Math.random().toString(36).slice(2)}${Date.now()}`;
  sessionStorage.setItem("oauthState", state);
  return state;
}
function oauthRedirectUri() {
  return window.location.origin + window.location.pathname;
}

loginKakaoBtn.addEventListener("click", () => {
  const state = buildOAuthState("kakao");
  const url = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${encodeURIComponent(KAKAO_REST_API_KEY)}&redirect_uri=${encodeURIComponent(oauthRedirectUri())}&state=${encodeURIComponent(state)}`;
  window.location.href = url;
});

loginNaverBtn.addEventListener("click", () => {
  const state = buildOAuthState("naver");
  const url = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${encodeURIComponent(NAVER_CLIENT_ID)}&redirect_uri=${encodeURIComponent(oauthRedirectUri())}&state=${encodeURIComponent(state)}`;
  window.location.href = url;
});

async function completeSocialLogin(provider, code, state) {
  openLoginModal();
  setLoginError("로그인 처리 중...");
  try {
    const res = await fetch(`${AUTH_ORIGIN}/auth/${provider}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state, redirectUri: oauthRedirectUri() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.customToken) {
      setLoginError(data.error || "로그인에 실패했습니다.");
      return;
    }
    await firebase.auth().signInWithCustomToken(data.customToken);
    const profile = data.profile || {};
    if (profile.name || profile.picture) {
      await firebase.auth().currentUser.updateProfile({
        displayName: profile.name || null,
        photoURL: profile.picture || null,
      });
      renderAuthState(firebase.auth().currentUser);
    }
    closeLoginModal();
  } catch {
    setLoginError("로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }
}

// 카카오/네이버 인증 서버가 이 페이지로 ?code=&state= 를 붙여 되돌아온 경우를 처음 로드 시 한 번 확인
(function handleOAuthRedirectReturn() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  const oauthErr = params.get("error");
  if (!code && !oauthErr) return;

  const savedState = sessionStorage.getItem("oauthState");
  sessionStorage.removeItem("oauthState");
  window.history.replaceState(null, "", window.location.pathname);

  if (oauthErr || !state || state !== savedState) return;
  const provider = state.startsWith("kakao_") ? "kakao" : state.startsWith("naver_") ? "naver" : null;
  if (!provider) return;
  completeSocialLogin(provider, code, state);
})();

// ---------- CORS 프록시 (여러 개를 순서대로 시도) ----------
// 직접 만든 Cloudflare Worker(우리 서버)를 최우선으로 사용 — 야후 파이낸스는 빠르고 안정적으로 중계되지만,
// FRED(fred.stlouisfed.org)는 그 사이트가 Cloudflare Workers발 요청 자체를 막고 있어(520) 실패하며,
// 이 경우 아래 jina.ai로 자동 폴백되어 FRED는 계속 정상 작동한다.
// corsproxy.io는 "localhost/개발 환경"이 아닌 실제 도메인(예: 커스텀 도메인)에서의 무료 사용을 막는다.
// jina.ai는 공유 인프라 부하에 따라 응답 속도 편차가 매우 커서(수백ms~20초 이상), 한 요청이 오래 걸리면
// 포기하고 재시도/다음 프록시로 넘어가도록 요청마다 제한 시간을 둔다.
const PROXY_TIMEOUT_MS = 7000;
// own-worker는 평소 1초 미만으로 응답하므로, 막히면(아마 버스트 시 Yahoo/Cloudflare 쪽 순간 속도 제한)
// 굳이 오래 기다리지 말고 훨씬 짧은 시간 안에 포기하고 다음 프록시로 넘어가는 게 더 빠름
const OWN_WORKER_TIMEOUT_MS = 2500;

const PROXIES = [
  {
    name: "own-worker",
    fetch: async (targetUrl) => {
      const res = await fetch("https://us-stock.yeop2ad.workers.dev/?url=" + encodeURIComponent(targetUrl), {
        signal: AbortSignal.timeout(OWN_WORKER_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  },
  {
    name: "jina",
    fetch: async (targetUrl) => {
      // X-Return-Format: text 로 요청하면 markdown 변환 과정을 건너뛰고 원본을 그대로 반환해 더 빠르고 파싱도 단순해짐
      const res = await fetch("https://r.jina.ai/" + targetUrl, {
        headers: { "X-Return-Format": "text" },
        signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        // 혹시 래핑된 형식으로 오면 예전 방식으로 한 번 더 시도
        const marker = "Markdown Content:\n";
        const idx = text.indexOf(marker);
        return JSON.parse(idx !== -1 ? text.slice(idx + marker.length) : text);
      }
    },
  },
  {
    name: "corsproxy.io",
    fetch: async (targetUrl) => {
      const res = await fetch("https://corsproxy.io/?url=" + encodeURIComponent(targetUrl), {
        signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  },
  {
    name: "allorigins",
    fetch: async (targetUrl) => {
      const res = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(targetUrl), {
        signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 프록시가 일시적으로 요청량 제한에 걸릴 수 있어, 전체 프록시를 한 바퀴 실패하면 잠깐 쉬었다 한 번 더 시도
async function proxyFetchJson(targetUrl, retries = 1) {
  let lastErr;
  for (const proxy of PROXIES) {
    try {
      return await proxy.fetch(targetUrl);
    } catch (e) {
      lastErr = e;
    }
  }
  if (retries > 0) {
    await sleep(1200);
    return proxyFetchJson(targetUrl, retries - 1);
  }
  throw new Error("데이터 소스에 연결하지 못했습니다. 잠시 후 다시 시도해주세요. (" + (lastErr?.message || "") + ")");
}

// ---------- Yahoo Finance 헬퍼 ----------
async function yahooSearch(ticker) {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&newsCount=20&quotesCount=1`;
  return proxyFetchJson(url);
}

async function yahooChart(symbol, range = "1y", interval = "1d") {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
  return proxyFetchJson(url);
}

// range 대신 정확한 기간(period1~period2, 유닉스초)을 지정 — 미래예측 차트처럼 여러 해의 구간을 서로 어긋남 없이
// 정확한 실제 날짜 기준으로 겹쳐 그려야 할 때, range 프리셋의 간격 근사치에 의존하지 않기 위해 사용
async function yahooChartRange(symbol, period1, period2, interval = "1d") {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=${interval}`;
  return proxyFetchJson(url);
}

// 과거 배당 지급 이력(chart의 events=div) — 캘린더에서 다음 배당락일을 주기 기반으로 근사 추정하는 데 사용
async function yahooDividends(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2y&interval=1d&events=div`;
  return proxyFetchJson(url);
}

async function yahooFundamentals(symbol, types) {
  const now = Math.floor(Date.now() / 1000);
  const fiveYearsAgo = now - 5 * 365 * 24 * 3600;
  const url = `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}?type=${types}&period1=${fiveYearsAgo}&period2=${now}`;
  return proxyFetchJson(url);
}

async function yahooPeers(symbol) {
  const url = `https://query1.finance.yahoo.com/v6/finance/recommendationsbysymbol/${encodeURIComponent(symbol)}`;
  return proxyFetchJson(url);
}

// 분기 실적 발표 이력(earningsHistory)·다음 분기 애널리스트 컨센서스(earningsTrend)·다음 실적 발표 예정일(calendarEvents) 조회
async function yahooQuoteSummary(symbol, modules) {
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`;
  return proxyFetchJson(url);
}

async function yahooScreener(scrId, count = 50) {
  const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=US&scrIds=${scrId}&count=${count}`;
  return proxyFetchJson(url);
}

async function yahooMostActive(count = 50) {
  return yahooScreener("most_actives", count);
}

// Yahoo 검색 결과의 sector(영문)를 섹터별 예약 스크리너 ID로 매핑 — 경쟁사(동일 섹터) 후보 조회용
const SECTOR_SCREENER_ID = {
  Technology: "ms_technology",
  Healthcare: "ms_healthcare",
  "Financial Services": "ms_financial_services",
  "Consumer Cyclical": "ms_consumer_cyclical",
  "Consumer Defensive": "ms_consumer_defensive",
  "Communication Services": "ms_communication_services",
  Industrials: "ms_industrials",
  Energy: "ms_energy",
  Utilities: "ms_utilities",
  "Real Estate": "ms_real_estate",
  "Basic Materials": "ms_basic_materials",
};

// GICS 11개 섹터(영문) → 한글 표기 — 요약 섹션의 "섹터" 항목용(고정된 11개라 정적 매핑으로 정확하게 표시)
const SECTOR_KO = {
  Technology: "기술",
  Healthcare: "헬스케어",
  "Financial Services": "금융",
  "Consumer Cyclical": "경기소비재",
  "Consumer Defensive": "필수소비재",
  "Communication Services": "커뮤니케이션 서비스",
  Industrials: "산업재",
  Energy: "에너지",
  Utilities: "유틸리티",
  "Real Estate": "부동산",
  "Basic Materials": "소재",
};

// 동일 섹터 종목을 시가총액 내림차순으로 반환(자기 자신 제외) — 경쟁사 TOP3(업종 일치 우선) + 시총 유사 종목 선정에 사용.
// Yahoo 스크리너 응답엔 세부 업종(industry) 필드가 없어, 섹터 후보 중 시총 상위 일부만 v1/finance/search로
// 하나씩 조회해 industryDisp가 자기 자신과 같은 후보를 골라낸다(과도한 API 호출을 막기 위해 상위 15개로 제한).
async function getSectorPeerCandidates(sector, selfSymbol, selfIndustry) {
  const scrId = SECTOR_SCREENER_ID[sector];
  if (!scrId) return null;
  const data = await yahooScreener(scrId, 60);
  const quotes = (data && data.finance && data.finance.result && data.finance.result[0] && data.finance.result[0].quotes) || [];
  const candidates = quotes
    .filter((q) => q && q.symbol && q.symbol !== selfSymbol && q.marketCap !== undefined && q.marketCap !== null)
    .map((q) => ({ symbol: q.symbol, marketCap: q.marketCap }))
    .sort((a, b) => b.marketCap - a.marketCap);

  let industryCandidates = [];
  if (selfIndustry && candidates.length > 0) {
    const top = candidates.slice(0, 15);
    const checked = await mapWithConcurrency(top, 5, async (c) => {
      try {
        const s = await yahooSearch(c.symbol);
        const q = s && s.quotes && s.quotes[0];
        const ind = q && (q.industryDisp || q.industry);
        return ind === selfIndustry ? c : null;
      } catch {
        return null;
      }
    });
    industryCandidates = checked.filter(Boolean);
  }

  return { candidates, industryCandidates };
}

// ---------- FRED(세인트루이스 연은) 헬퍼 : 내부 차트 API를 프록시로 조회 (비공식, 문서화되지 않음) ----------
async function fetchFredSeries(seriesId) {
  const url = `https://fred.stlouisfed.org/graph/api/series/?id=${encodeURIComponent(seriesId)}&obs=true`;
  const data = await proxyFetchJson(url);
  const line = data && data.observations && data.observations[0];
  if (!line) throw new Error(`${seriesId} 데이터를 가져오지 못했습니다.`);
  return line.filter((p) => p[1] !== null && p[1] !== undefined);
}

// 종목과 무관한 데이터라 세션 내에서 한 번만 조회해 재사용(무거운 응답이라 재요청을 줄임)
let macroMetricsPromise = null;
function getMacroMetrics() {
  if (!macroMetricsPromise) {
    macroMetricsPromise = (async () => {
      const chart = await yahooChart("^VIX", "5d", "1d");
      const snap = yahooSnapshot(chart);
      if (!snap || snap.price === null || snap.price === undefined) throw new Error("VIX 데이터를 가져오지 못했습니다.");
      return {
        vix: snap.price,
        vixChangePct: snap.changePct,
        vixDate: snap.date,
      };
    })().catch((e) => {
      macroMetricsPromise = null; // 실패 시 다음 조회에서 재시도할 수 있도록 캐시 초기화
      throw e;
    });
  }
  return macroMetricsPromise;
}

// "투자황금기(공포지수연동)" 점수 — VIX(공포지수)가 높을수록(시장이 패닉일수록) 역발상 매수 기회로 보고 점수를 올림.
// VIX 25 이하는 평시로 보고 5점 고정, 25~35 구간은 5~10점 선형(VIX 2당 1점), 35를 넘으면 상한 없이 계속 상승하되
// 상승 속도는 완만해짐(VIX 5당 1점). 10점을 넘어가면 배지 색이 더 진한 골드로 바뀜(macroGoldStyle 참고)
function computeMacroScore({ vix }) {
  let total = 5;
  if (vix !== null && vix !== undefined) {
    if (vix <= 25) total = 5;
    else if (vix <= 35) total = 5 + (vix - 25) * 0.5;
    else total = 10 + (vix - 35) * 0.2;
  }
  total = Math.round(total * 10) / 10;
  return { total, vix };
}

// 점수가 10점을 넘으면(VIX 극단적 공포) 은은한 amber(--warn)에서 점점 더 쨍한 골드로 — 15점 이상에서 최대 강도
function macroGoldColor(score) {
  if (score === null || score === undefined || score < 10) return null;
  const intensity = clamp((score - 10) / 5, 0, 1);
  const from = [201, 138, 26]; // --warn
  const to = [255, 215, 0]; // 쨍한 골드
  const mix = from.map((f, i) => Math.round(f + (to[i] - f) * intensity));
  return { color: `rgb(${mix.join(",")})`, intensity };
}

function macroGoldStyle(score) {
  const gold = macroGoldColor(score);
  if (!gold) return "";
  const glow = `box-shadow:0 0 ${(6 + gold.intensity * 12).toFixed(0)}px rgba(255,215,0,${(0.3 + gold.intensity * 0.5).toFixed(2)});`;
  return ` style="border-color:${gold.color};color:${gold.color};${glow}"`;
}

// 요약 배지 라벨 아래에 붙일 "VIX : 값(변동%)" 줄(중앙정렬은 .mini-score-label의 text-align:center가 담당)
function vixLineHtml({ vix, vixChangePct } = {}) {
  if (vix === null || vix === undefined) return "";
  const pctStr =
    vixChangePct !== null && vixChangePct !== undefined && Number.isFinite(vixChangePct)
      ? `(${vixChangePct >= 0 ? "+" : ""}${vixChangePct.toFixed(2)}%)`
      : "";
  return `<br>VIX : ${vix.toFixed(1)}${pctStr}`;
}

// ---------- 종목별 지표 조회 + 상승압력도 점수 계산 (사업요약/경쟁사비교/점수 섹션에서 공용으로 사용) ----------
// 차트 데이터에서 (타임스탬프, 종가) 쌍을 과거→최근 순으로 정렬해 추출
function chartClosePairs(chartResult) {
  const result = chartResult && chartResult.chart && chartResult.chart.result && chartResult.chart.result[0];
  if (!result) return [];
  const timestamps = result.timestamp || [];
  const closes = (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
  const pairs = timestamps.map((t, i) => ({ t, c: closes[i] })).filter((p) => p.c !== null && p.c !== undefined);
  pairs.sort((a, b) => a.t - b.t);
  return pairs;
}

// 캔들 차트용: 종가뿐 아니라 시가/고가/저가까지 포함(하나라도 없으면 그 봉은 제외)
function chartOhlcPairs(chartResult) {
  const result = chartResult && chartResult.chart && chartResult.chart.result && chartResult.chart.result[0];
  if (!result) return [];
  const timestamps = result.timestamp || [];
  const q = (result.indicators && result.indicators.quote && result.indicators.quote[0]) || {};
  const { open = [], high = [], low = [], close = [] } = q;
  const pairs = timestamps
    .map((t, i) => ({ t, o: open[i], h: high[i], l: low[i], c: close[i] }))
    .filter((p) => [p.o, p.h, p.l, p.c].every((v) => v !== null && v !== undefined));
  pairs.sort((a, b) => a.t - b.t);
  return pairs;
}

// 목표 시점(유닉스 타임스탬프)에 가장 가까운 종가 쌍을 찾음
function closestPair(pairs, targetTimestamp) {
  let closest = null;
  let minDiff = Infinity;
  for (const p of pairs) {
    const diff = Math.abs(p.t - targetTimestamp);
    if (diff < minDiff) {
      minDiff = diff;
      closest = p;
    }
  }
  return closest;
}

// 차트 데이터에서 (타임스탬프, 거래대금=종가×거래량) 쌍을 과거→최근 순으로 정렬해 추출 — chartClosePairs의 거래대금 버전
function chartDollarVolumePairs(chartResult) {
  const result = chartResult && chartResult.chart && chartResult.chart.result && chartResult.chart.result[0];
  if (!result) return [];
  const timestamps = result.timestamp || [];
  const quote = result.indicators && result.indicators.quote && result.indicators.quote[0];
  const closes = (quote && quote.close) || [];
  const volumes = (quote && quote.volume) || [];
  const pairs = timestamps
    .map((t, i) => ({
      t,
      dv: closes[i] !== null && closes[i] !== undefined && volumes[i] !== null && volumes[i] !== undefined ? closes[i] * volumes[i] : null,
    }))
    .filter((p) => p.dv !== null);
  pairs.sort((a, b) => a.t - b.t);
  return pairs;
}

// asOfTimestamp 기준 최근 5거래일 평균 거래대금과 그 직전 1년간 평균 거래대금 — 상승압력도의 "총 거래대금" 항목용
function dollarVolumeStatsEndingAt(dollarVolumePairs, asOfTimestamp) {
  if (dollarVolumePairs.length === 0) return { recent5dAvg: null, avg1y: null };
  const latest = closestPair(dollarVolumePairs, asOfTimestamp);
  if (!latest) return { recent5dAvg: null, avg1y: null };
  const latestIndex = dollarVolumePairs.findIndex((p) => p.t === latest.t);
  const recentSlice = dollarVolumePairs.slice(Math.max(0, latestIndex - 4), latestIndex + 1); // 최근 5거래일(해당일 포함)
  const recent5dAvg = recentSlice.length ? recentSlice.reduce((a, p) => a + p.dv, 0) / recentSlice.length : null;
  const target = latest.t - YEAR_SECONDS;
  const windowValues = dollarVolumePairs.filter((p) => p.t <= latest.t && p.t >= target - HISTORY_TOLERANCE_SECONDS).map((p) => p.dv);
  const avg1y = windowValues.length ? windowValues.reduce((a, b) => a + b, 0) / windowValues.length : null;
  return { recent5dAvg, avg1y };
}

// 차트 데이터 자체의 최신 시점 기준 거래대금 통계(오늘 기준 지표용) — dollarVolumeStatsEndingAt의 "최신 시점" 버전
function currentDollarVolumeStats(chartResult) {
  const dollarVolumePairs = chartDollarVolumePairs(chartResult);
  const latest = dollarVolumePairs[dollarVolumePairs.length - 1];
  if (!latest) return { recent5dAvg: null, avg1y: null };
  return dollarVolumeStatsEndingAt(dollarVolumePairs, latest.t);
}

const YEAR_SECONDS = 365.25 * 24 * 3600;
const HISTORY_TOLERANCE_SECONDS = 20 * 24 * 3600; // 주말·휴장일 여유분
const THREE_MONTH_SECONDS = 91 * 24 * 3600;
const MOMENTUM_TOLERANCE_SECONDS = 10 * 24 * 3600; // 3개월 구간은 1년보다 짧으므로 여유 허용치도 비례해 축소

// 최근 1년 수익률(%) — 데이터가 실제로 1년치 이상 있을 때만 계산(최신 종가 시점 기준 1년 전과 비교, 차트 조회 범위와 무관하게 정확)
function get1yReturnFromChart(chartResult) {
  const pairs = chartClosePairs(chartResult);
  if (pairs.length < 2) return null;
  const latest = pairs[pairs.length - 1];
  const target = latest.t - YEAR_SECONDS;
  if (pairs[0].t > target + HISTORY_TOLERANCE_SECONDS) return null;
  const base = closestPair(pairs, target);
  if (!base || !base.c) return null;
  return ((latest.c - base.c) / base.c) * 100;
}

// 임의 시점(asOfTimestamp) 기준 직전 windowSeconds 구간의 수익률(%) — "상승 모멘텀"의 3개월 버전과 과거분석에서 공용으로 사용
function returnOverWindowEndingAt(pairs, asOfTimestamp, windowSeconds, toleranceSeconds) {
  if (pairs.length < 2) return null;
  const latest = closestPair(pairs, asOfTimestamp);
  if (!latest) return null;
  const target = latest.t - windowSeconds;
  if (pairs[0].t > target + toleranceSeconds) return null;
  const base = closestPair(pairs, target);
  if (!base || !base.c) return null;
  return ((latest.c - base.c) / base.c) * 100;
}

// 최근 3개월 누적 수익률(%) — 상승압력도의 "상승 모멘텀" 항목용(기존 10거래일 상승일수 방식 대체)
function get3MonthReturn(chartResult) {
  const pairs = chartClosePairs(chartResult);
  const latest = pairs[pairs.length - 1];
  if (!latest) return null;
  return returnOverWindowEndingAt(pairs, latest.t, THREE_MONTH_SECONDS, MOMENTUM_TOLERANCE_SECONDS);
}

// 최근 거래일 대비 등락률(요약 카드의 현재가 옆 괄호 표시용) — 일봉 마지막 두 종가를 비교
function getDailyChangePercent(chartResult) {
  const result = chartResult && chartResult.chart && chartResult.chart.result && chartResult.chart.result[0];
  if (!result) return null;
  const timestamps = result.timestamp || [];
  const closes = (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
  const pairs = timestamps.map((t, i) => ({ t, c: closes[i] })).filter((p) => p.c !== null && p.c !== undefined);
  if (pairs.length < 2) return null;
  pairs.sort((a, b) => a.t - b.t);
  const prevClose = pairs[pairs.length - 2].c;
  const latest = pairs[pairs.length - 1].c;
  if (!prevClose) return null;
  return ((latest - prevClose) / prevClose) * 100;
}

// 최근 5거래일 중 하루라도 ±10% 이상 급등/급락한 날이 있었는지(급등락 이모지 표시용) — 누적 5일 수익률이 아닌 일별 등락률 각각을 확인
function get5dExtremeMoves(chartResult) {
  const result = chartResult && chartResult.chart && chartResult.chart.result && chartResult.chart.result[0];
  if (!result) return { hasSurge: false, hasPlunge: false };
  const timestamps = result.timestamp || [];
  const closes = (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
  const pairs = timestamps.map((t, i) => ({ t, c: closes[i] })).filter((p) => p.c !== null && p.c !== undefined);
  pairs.sort((a, b) => a.t - b.t);
  const recent = pairs.slice(-6); // 종가 6개 = 일별 등락률 5개
  let hasSurge = false;
  let hasPlunge = false;
  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1].c;
    const cur = recent[i].c;
    if (!prev) continue;
    const pct = ((cur - prev) / prev) * 100;
    if (pct >= 10) hasSurge = true;
    if (pct <= -10) hasPlunge = true;
  }
  return { hasSurge, hasPlunge };
}

// ---------- 과거분석(1년 전 스냅샷 vs 현재 비교)용 헬퍼 — 위 함수들의 "임의 시점 기준" 버전 ----------
// 목표 시점 이후 첫 거래일 쌍을 찾음(주말·휴장일이면 다음 거래일로 자동 이동)
function firstTradingDayOnOrAfter(pairs, targetTimestamp) {
  for (const p of pairs) {
    if (p.t >= targetTimestamp) return p;
  }
  return null;
}

// 임의 시점(asOfTimestamp) 기준 직전 1년 수익률(%) — get1yReturnFromChart의 시점 지정 버전
function returnOverYearEndingAt(pairs, asOfTimestamp) {
  if (pairs.length < 2) return null;
  const latest = closestPair(pairs, asOfTimestamp);
  if (!latest) return null;
  const target = latest.t - YEAR_SECONDS;
  if (pairs[0].t > target + HISTORY_TOLERANCE_SECONDS) return null;
  const base = closestPair(pairs, target);
  if (!base || !base.c) return null;
  return ((latest.c - base.c) / base.c) * 100;
}

// 과거분석 기준 시점: "1년 전 + 다음 달 1일" (매달 1일이 지나면 자동으로 기준월이 한 달씩 이동)
function getHistoricalReferenceDate() {
  const now = new Date();
  return new Date(now.getFullYear() - 1, now.getMonth() + 1, 1);
}

// 나스닥·다우존스·S&P500 1년 수익률 (여러 섹션이 공유해서 중복 요청을 줄임)
async function getMarketReturns() {
  try {
    const [nasdaqChart, dowChart, sp500Chart] = await Promise.all([
      yahooChart("^IXIC"),
      yahooChart("^DJI"),
      yahooChart("^GSPC"),
    ]);
    const nasdaqReturn = get1yReturnFromChart(nasdaqChart);
    const dowReturn = get1yReturnFromChart(dowChart);
    const sp500Return = get1yReturnFromChart(sp500Chart);
    const valid = [nasdaqReturn, dowReturn].filter((v) => v !== null);
    const avgIndexReturn = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
    return { nasdaqReturn, dowReturn, sp500Return, avgIndexReturn };
  } catch {
    return { nasdaqReturn: null, dowReturn: null, sp500Return: null, avgIndexReturn: null };
  }
}

// 세션 내 반복 호출 시 매번 지수 3종을 다시 조회하지 않도록 캐싱(기업가치 랭킹 표에서 종목마다 투자등급을 계산할 때 공용으로 사용)
let _marketReturnsCache = null;
async function getMarketReturnsCached() {
  if (!_marketReturnsCache) _marketReturnsCache = getMarketReturns();
  return _marketReturnsCache;
}

// 개별 종목의 가격/52주 범위/매출/순이익/1년 수익률을 한 번에 조회
async function getCompanyMetrics(symbol) {
  const [chartData, fundData] = await Promise.all([
    yahooChart(symbol),
    yahooFundamentals(
      symbol,
      "annualTotalRevenue,annualBasicEPS,annualNetIncome,annualShareIssued,quarterlyTotalRevenue"
    ).catch(() => null),
  ]);

  const result = chartData && chartData.chart && chartData.chart.result && chartData.chart.result[0];
  if (!result) throw new Error(`${symbol} 데이터를 가져오지 못했습니다.`);
  const meta = result.meta;

  let revenue = null;
  let eps = null;
  let netIncome = null;
  let sharesOutstanding = null;
  const resultArr = fundData && fundData.timeseries && fundData.timeseries.result;
  if (resultArr) {
    for (const block of resultArr) {
      if (block.annualTotalRevenue) revenue = await latestFundamentalValue(block, "annualTotalRevenue", meta.currency);
      if (block.annualBasicEPS) eps = await latestFundamentalValue(block, "annualBasicEPS", meta.currency);
      if (block.annualNetIncome) netIncome = await latestFundamentalValue(block, "annualNetIncome", meta.currency);
      if (block.annualShareIssued)
        sharesOutstanding = await latestFundamentalValue(block, "annualShareIssued", meta.currency, { convert: false });
    }
  }
  const marketCap = meta.regularMarketPrice !== undefined && sharesOutstanding ? meta.regularMarketPrice * sharesOutstanding : null;
  const revenueQuarterlySeries = resultArr ? await fundamentalSeries(resultArr, "quarterlyTotalRevenue", meta.currency) : [];

  const { recent5dAvg, avg1y } = currentDollarVolumeStats(chartData);

  return {
    symbol,
    price: meta.regularMarketPrice,
    revenue,
    eps,
    netIncome,
    marketCap,
    currency: meta.currency,
    oneYearReturn: get1yReturnFromChart(chartData),
    momentum3m: get3MonthReturn(chartData),
    revenueGrowthYoY: latestQuarterRevenueYoY(revenueQuarterlySeries),
    recentDollarVolume: recent5dAvg,
    avgDollarVolume1y: avg1y,
    firstTradeDate: meta.firstTradeDate ?? null,
  };
}

// 총 거래대금 + 최근 분기 매출 YoY 성장성 + 상승 모멘텀을 조합한 참고용 상승압력도 점수(10점 만점)
function computeAttractivenessScore(metrics) {
  const { recentDollarVolume, avgDollarVolume1y, momentum3m, revenueGrowthYoY } = metrics;

  // 1) 총 거래대금 (0~3점) — 최근 5거래일 평균 거래대금이 1년 평균 대비 2배 이상이면 만점, 0.5배면 0점 (선형)
  // 거래대금 데이터가 부족한 경우 중립값 1.5점 처리
  let volumeScore = 1.5;
  let volumeRatio = null;
  if (recentDollarVolume !== undefined && recentDollarVolume !== null && avgDollarVolume1y) {
    volumeRatio = recentDollarVolume / avgDollarVolume1y;
    volumeScore = clamp(2 * (volumeRatio - 0.5), 0, 3);
  }

  // 2) 가장 최근 분기 매출의 전년 동기 대비(YoY) 성장률 (0~3점) — 30% 이상 3점, 0% 이하 0점 (10%p마다 1점, 선형)
  // 데이터가 부족해 성장률을 계산할 수 없는 경우(N/A)도 0점 처리
  let growthScore = 0;
  if (revenueGrowthYoY !== undefined && revenueGrowthYoY !== null) {
    growthScore = clamp(revenueGrowthYoY / 10, 0, 3);
  }

  // 3) 상승 모멘텀 = 최근 3개월 누적 수익률 (0~4점) — 25% 이상이면 만점, 0% 이하면 0점 (선형)
  // 데이터가 부족한 경우(N/A)도 0점 처리
  let momentumScore = 0;
  if (momentum3m !== undefined && momentum3m !== null) {
    momentumScore = clamp((momentum3m / 25) * 4, 0, 4);
  }

  const total = Math.round(clamp(volumeScore + growthScore + momentumScore, 0, 10) * 10) / 10;
  return { total, volumeScore, volumeRatio, growthScore, revenueGrowthYoY, momentumScore, momentum3m };
}

// 통화쌍 환율(세션 내 캐시) — 재무제표가 시세와 다른 현지 통화로 내려오는 해외 상장 종목(TSM·SKHY 등) 환산용
const fxRateCache = new Map();
async function getFxRate(fromCurrency, toCurrency) {
  if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) return 1;
  const cacheKey = `${fromCurrency}${toCurrency}`;
  if (fxRateCache.has(cacheKey)) return fxRateCache.get(cacheKey);
  const rate = await yahooChart(`${fromCurrency}${toCurrency}=X`)
    .then((c) => c?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null)
    .catch(() => null);
  fxRateCache.set(cacheKey, rate);
  return rate;
}

// fundamentals-timeseries 응답 블록에서 특정 항목의 가장 최근 값을 추출
// 보고 통화가 시세 통화와 다르면(예: TSM은 매출이 USD 시세인데 TWD로 내려옴) 환율을 적용해 시세 통화로 환산.
// convert=false인 항목(발행주식수 등 금액이 아닌 값)은 환산이 의미 없으므로 통화가 다르면 신뢰할 수 없다고 보고 제외
async function latestFundamentalValue(block, key, quoteCurrency, { convert = true } = {}) {
  const items = (block && block[key]) || [];
  const valid = items.filter((it) => it && it.reportedValue && it.reportedValue.raw !== undefined);
  if (!valid.length) return null;
  valid.sort((a, b) => new Date(a.asOfDate) - new Date(b.asOfDate));
  const latest = valid[valid.length - 1];
  const raw = latest.reportedValue.raw;
  if (!quoteCurrency || !latest.currencyCode || latest.currencyCode === quoteCurrency) return raw;
  if (!convert) return null;
  const rate = await getFxRate(latest.currencyCode, quoteCurrency);
  return rate !== null ? raw * rate : null;
}

// fundamentals-timeseries 응답에서 특정 항목의 시계열(과거→최근 정렬, 환율 자동 환산)을 추출 — annual/quarterly 등 여러 기간 값이 필요한 계산용
async function fundamentalSeries(resultArr, key, quoteCurrency) {
  const items = [];
  for (const block of resultArr || []) {
    for (const it of block[key] || []) {
      if (it && it.asOfDate && it.reportedValue && it.reportedValue.raw !== undefined) items.push(it);
    }
  }
  if (items.length === 0) return [];
  items.sort((a, b) => new Date(a.asOfDate) - new Date(b.asOfDate));
  const reportCurrency = items.find((it) => it.currencyCode)?.currencyCode;
  const fxRate =
    reportCurrency && quoteCurrency && reportCurrency !== quoteCurrency ? await getFxRate(reportCurrency, quoteCurrency) : 1;
  if (fxRate === null) return [];
  return items.map((it) => ({ date: it.asOfDate, value: it.reportedValue.raw * fxRate }));
}

// 가장 최근 분기 매출의 전년 동기 대비(YoY) 성장률(%) — 분기 매출 시계열에서 최신 분기 vs 4분기 전(작년 같은 분기) 비교
function latestQuarterRevenueYoY(revenueQuarterlySeries) {
  const series = revenueQuarterlySeries || [];
  if (series.length < 5) return null;
  const latest = series[series.length - 1].value;
  const yearAgo = series[series.length - 5].value;
  if (!yearAgo) return null;
  return ((latest - yearAgo) / Math.abs(yearAgo)) * 100;
}

// 가장 최근 회계연도의 전년 대비(YoY) 성장률(%) — 연간 시계열의 마지막 두 회계연도를 비교(가치평가 탭: 매출액·현금흐름·순이익 증가 랭킹용)
function latestAnnualGrowth(annualSeries) {
  const series = annualSeries || [];
  if (series.length < 2) return null;
  const latest = series[series.length - 1].value;
  const prior = series[series.length - 2].value;
  if (!prior) return null;
  return ((latest - prior) / Math.abs(prior)) * 100;
}

// 최근 연간 매출의 전년 대비(YoY) 성장률(%) — Yahoo 분기 시계열이 최근 5개 분기만 제공해 과거분석 기준 시점에는
// 분기 YoY를 계산할 만큼 데이터가 남아있지 않을 때가 많아, 연간 데이터로 대체 계산하는 과거분석 전용 폴백
function latestAnnualRevenueYoY(revenueAnnualSeries) {
  const series = revenueAnnualSeries || [];
  if (series.length < 2) return null;
  const latest = series[series.length - 1].value;
  const prev = series[series.length - 2].value;
  if (!prev) return null;
  return ((latest - prev) / Math.abs(prev)) * 100;
}

// 상승압력도 + 투자 안정성 점수 계산에 필요한 모든 지표를 한 번(차트 1회 + 재무제표 1회)에 조회 (TOP30 랭킹용)
async function getFullMetrics(symbol) {
  const [chartData, fundData] = await Promise.all([
    yahooChart(symbol),
    yahooFundamentals(
      symbol,
      "annualTotalRevenue,annualBasicEPS,annualNetIncome,annualShareIssued,quarterlyTotalRevenue,annualOperatingCashFlow"
    ),
  ]);

  const result = chartData && chartData.chart && chartData.chart.result && chartData.chart.result[0];
  if (!result) throw new Error(`${symbol} 데이터를 가져오지 못했습니다.`);
  const meta = result.meta;

  let revenue = null;
  let eps = null;
  let netIncome = null;
  let sharesOutstanding = null;
  const resultArr = (fundData && fundData.timeseries && fundData.timeseries.result) || [];
  for (const block of resultArr) {
    if (block.annualTotalRevenue) revenue = await latestFundamentalValue(block, "annualTotalRevenue", meta.currency);
    if (block.annualBasicEPS) eps = await latestFundamentalValue(block, "annualBasicEPS", meta.currency);
    if (block.annualNetIncome) netIncome = await latestFundamentalValue(block, "annualNetIncome", meta.currency);
    if (block.annualShareIssued)
      sharesOutstanding = await latestFundamentalValue(block, "annualShareIssued", meta.currency, { convert: false });
  }
  const marketCap = meta.regularMarketPrice !== undefined && sharesOutstanding ? meta.regularMarketPrice * sharesOutstanding : null;
  const revenueQuarterlySeries = await fundamentalSeries(resultArr, "quarterlyTotalRevenue", meta.currency);
  const revenueAnnualSeries = await fundamentalSeries(resultArr, "annualTotalRevenue", meta.currency);
  const netIncomeAnnualSeries = await fundamentalSeries(resultArr, "annualNetIncome", meta.currency);
  const operatingCashFlowAnnualSeries = await fundamentalSeries(resultArr, "annualOperatingCashFlow", meta.currency);
  const { recent5dAvg, avg1y } = currentDollarVolumeStats(chartData);

  return {
    symbol,
    name: meta.shortName || meta.longName || symbol,
    price: meta.regularMarketPrice,
    eps,
    revenue,
    netIncome,
    marketCap,
    currency: meta.currency,
    oneYearReturn: get1yReturnFromChart(chartData),
    fiveDayExtremes: get5dExtremeMoves(chartData),
    momentum3m: get3MonthReturn(chartData),
    revenueGrowthYoY: latestQuarterRevenueYoY(revenueQuarterlySeries),
    // 가치평가 탭(매출액·현금흐름·순이익 증가, PER)용 — 최근 회계연도 기준
    revenueGrowthAnnual: latestAnnualGrowth(revenueAnnualSeries),
    netIncomeGrowthAnnual: latestAnnualGrowth(netIncomeAnnualSeries),
    operatingCashFlowGrowthAnnual: latestAnnualGrowth(operatingCashFlowAnnualSeries),
    per: meta.regularMarketPrice !== undefined && eps > 0 ? meta.regularMarketPrice / eps : null,
    recentDollarVolume: recent5dAvg,
    avgDollarVolume1y: avg1y,
    firstTradeDate: meta.firstTradeDate ?? null,
  };
}

// 상장(IPO)한 지 약 3개월(92일) 이내인지 — 데이터가 부족해 점수 신뢰도가 낮은 종목을 점수 대신 "IPO"로 표기하는 데 사용
function isRecentIPO(firstTradeDateEpoch) {
  if (!firstTradeDateEpoch) return false;
  return (Date.now() / 1000 - firstTradeDateEpoch) / 86400 <= 92;
}

// 점수 셀 표시용 — 최근 IPO 종목은 데이터가 부족해 신뢰도 낮은 점수 대신 "IPO"로 표기
function scoreCellText(score, isIPO) {
  if (isIPO) return "IPO";
  return score !== null && score !== undefined ? score : "N/A";
}

// 미국 시장 전체 시가총액 추정치 — S&P500 전체 종목 시가총액 합계로 근사(2026-08 기준 관측값, 시간이 지나며 실제 시장 규모와 달라질 수 있어 주기적 갱신 필요)
// "시가총액 가점" 항목에서 VTSAX 등 미국 전체 시장 인덱스펀드 내 예상 시총 비중을 추정하는 분모로 사용
const US_TOTAL_MARKET_CAP_ESTIMATE = 87.4e12;

// 참고용 신용등급(S&P Global Ratings 장기 발행자 등급 기준) 테이블 — 자체 조사로 수동 입력한 정적 데이터로,
// 실시간 갱신되지 않으므로 등급 변동 시 수동 업데이트가 필요함. 목록에 없는 종목은 "S&P 등급 없음"으로 1점 처리
// 회사채를 발행한 적이 없어(순현금·무차입 경영 등) 신용등급 자체가 존재하지 않는 종목 표시용 값 — S&P 등급 없음과 구분해 2점 처리
const NO_DEBT_RATING = "회사채 없음";
// 유이자부채(회사채·term loan 등)는 있으나 S&P가 발행자 등급을 매기지 않는 종목 표시용 값(다른 평가사만 평가 등) — 1점 처리
// 위 두 값은 화면 세부점수에 숫자 대신 사유 문자열로 그대로 표시됨(투자등급이 없으면 점수가 아니라 사유를 노출)
const UNRATED_REASON = "미평가";

const TICKER_CREDIT_RATING = {
  PLTR: NO_DEBT_RATING,
  CRCL: NO_DEBT_RATING, // 서클(2025 IPO, USDC 발행사) — S&P·Moody's 발행자 등급 미확인, 유이자부채 거의 없음(D/E~0.01)
  MSFT: "AAA", JNJ: "AAA", ADP: "AAA",
  AAPL: "AA+", GOOGL: "AA+", GOOG: "AA+",
  "BRK-B": "AA", "BRK-A": "AA", AMZN: "AA", WMT: "AA", CVX: "AA",
  XOM: "AA-", PG: "AA-", V: "AA-", ABT: "AA-", ACN: "AA-",
  COST: "A+", KO: "A+", PEP: "A+", UNH: "A+", MA: "A+", MRK: "A+", NVDA: "A+",
  HD: "A", ORCL: "A", TXN: "A", ADBE: "A", LIN: "A", PFE: "A", QCOM: "A", CAT: "A", UPS: "A", CRM: "A",
  JPM: "A-", BAC: "A-", WFC: "A-", CSCO: "A-", IBM: "A-", DIS: "A-", TMO: "A-", AMD: "A-", NFLX: "A-", CMCSA: "A-", ABBV: "A-",
  SCHW: "A-", EQR: "A-",
  MCD: "BBB+", SBUX: "BBB+", LOW: "BBB+", VZ: "BBB+", AVGO: "BBB+", PYPL: "BBB+", GS: "BBB+", ESS: "BBB+", APP: "BBB+", EA: "BBB+",
  CME: "AA-", SPG: "A", PLD: "A", PSA: "A",
  T: "BBB", INTC: "BBB", MU: "BBB", UBER: "BBB", GM: "BBB", SPCX: "BBB",
  VICI: "BBB-", MSCI: "BBB-", BA: "BBB-", F: "BBB-",
  AAL: "B+",

  // 아래는 S&P500 시가총액 상위 100개 전수 조사로 추가(2026-08 기준 웹검색으로 확인, S&P Global Ratings 장기 발행자 등급만)
  // 재조사(2026-08): PANW·ANET는 회사채 없음(순현금), SPGI는 유이자부채 있으나 자사 미평가
  PANW: NO_DEBT_RATING, ANET: NO_DEBT_RATING, SPGI: UNRATED_REASON,
  META: "AA-", BLK: "AA-",
  LLY: "A+",
  AMAT: "A", DE: "A", TRV: "A", BNY: "A", TJX: "A", PGR: "A", BMY: "A",
  LRCX: "A-", MS: "A-", PM: "A-", GE: "A-", BKNG: "A-", UNP: "A-", COP: "A-", KLAC: "A-", ALL: "A-", AXP: "A-",
  APH: "A-", ADI: "A-", AMP: "A-", DHR: "A-", NEE: "A-", ETN: "A-", AFL: "A-", WELL: "A-", MCO: "A-",
  C: "BBB+", RTX: "BBB+", GLW: "BBB+", MCK: "BBB+", TMUS: "BBB+", AMGN: "BBB+", EBAY: "BBB+", PH: "BBB+", MO: "BBB+", MMM: "BBB+", GILD: "BBB+",
  TSLA: "BBB", DELL: "BBB", MPC: "BBB", GEV: "BBB", VLO: "BBB", CVS: "BBB",
  CRWD: "BBB-", MRVL: "BBB-", STX: "BBB-",
  SNDK: "BB+",

  // 아래는 S&P500 시가총액 101~500위 전수 조사 1차분으로 추가(2026-08 기준 웹검색으로 확인, S&P Global Ratings 장기 발행자 등급만)
  // 재조사(2026-08): VRTX·MNST·DASH·MPWR는 회사채 없음(순현금), MTD는 유이자부채 있으나 S&P 미평가(Moody's만)
  VRTX: NO_DEBT_RATING, MNST: NO_DEBT_RATING, DASH: NO_DEBT_RATING, MPWR: NO_DEBT_RATING, MTD: UNRATED_REASON,
  HON: "A", GD: "A", MDT: "A", TGT: "A", BX: "A+",
  TT: "A-", MET: "A-", CI: "A-", CDNS: "A-", ABNB: "A-", MRSH: "A-", ECL: "A-", NUE: "A-", ICE: "A-", AEP: "A-", TFC: "A-", TEL: "A-",
  SYK: "BBB+", NEM: "BBB+", FTNT: "BBB+", HWM: "BBB+", REGN: "BBB+", SO: "BBB+", JCI: "BBB+", DUK: "BBB+", COR: "BBB+",
  CSX: "BBB+", AME: "BBB+", RSG: "BBB+", DLR: "BBB+", NXPI: "BBB+", AJG: "BBB+",
  MDLZ: "BBB", PWR: "BBB", KR: "BBB", VRSN: "BBB", VRSK: "BBB", EQIX: "BBB", RCL: "BBB", MAR: "BBB",
  KMI: "BBB", WAT: "BBB", BDX: "BBB", SYY: "BBB", CAH: "BBB",
  FCX: "BBB-", VRT: "BBB-", JBL: "BBB-", SYF: "BBB-",
  HLT: "BB+", OXY: "BB+", URI: "BB+",
  COHR: "BB",

  // 2차분 (101~500위 조사, 예산 소진 전 완료분)
  // 재조사(2026-08): ISRG는 회사채 없음(무부채, 순현금)
  ISRG: NO_DEBT_RATING,
  ITW: "A+", GWW: "A+", CL: "A+",
  EMR: "A", CB: "A", CMI: "A", USB: "A", NOW: "A",
  CTAS: "A-", AIG: "A-", WM: "A-", PNC: "A-", LMT: "A-",
  PSX: "BBB+", NVR: "BBB+", WMB: "BBB+", NSC: "BBB+", NOC: "BBB+", CEG: "BBB+",
  COF: "BBB", EXPE: "BBB", SHW: "BBB", HCA: "BBB-",
  WDC: "BBB-",
  STT: "A", KKR: "A", ELV: "A", PRU: "A", SLB: "A",
  INTU: "A-", BSX: "A-", ROST: "A-", WEC: "A-",
  FICO: "BB+",

  // 3차분 (101~500위 조사, 예산 소진 전 완료분)
  // 재조사(2026-08): VEEV는 회사채 없음(순현금), RMD·DXCM는 유이자부채 있으나 S&P 현행 발행자등급 미확인
  VEEV: NO_DEBT_RATING, RMD: UNRATED_REASON, DXCM: UNRATED_REASON,
  ADM: "A", KVUE: "A", CINF: "A+",
  DGX: "BBB+", VMC: "BBB+", NTAP: "BBB+", ZTS: "BBB+", OMC: "BBB+", BIIB: "BBB+", IBKR: "BBB+",
  LVS: "BBB", LII: "BBB", IR: "BBB", EFX: "BBB",
  IRM: "BB-",

  // 4차분 (101~500위 조사, 예산 소진 전 완료분)
  HAL: "BBB+", MLM: "BBB+", WTW: "BBB+", EXR: "BBB+", ARES: "BBB+", CHD: "BBB+",
  TPR: "BBB", GEHC: "BBB", CCI: "BBB", TDY: "BBB", OTIS: "BBB", KHC: "BBB", XYL: "BBB", TSCO: "BBB", ZBH: "BBB", NDSN: "BBB",
  EQT: "BBB-", CASY: "BBB-", IT: "BBB-",

  // 5차분 (101~500위 조사, 예산 소진 전 완료분)
  // 재조사(2026-08): CMG는 회사채 없음(회사채 미발행, 리스부채만 존재)
  CMG: NO_DEBT_RATING,
  KMB: "A", HSY: "A",
  ROP: "BBB+", CBRE: "BBB+", PAYX: "BBB+", A: "BBB+", PEG: "BBB+",
  LUV: "BBB", FISV: "BBB",
  CCL: "BBB-", KDP: "BBB-",
  BALL: "BB+", UAL: "BB+", YUM: "BB+", CNC: "BB+",
  LYV: "BB-", COIN: "BB-",

  // 6차분 (101~500위 조사, 예산 소진 전 완료분)
  // 재조사(2026-08): FIX는 회사채 없음(순현금, 신용라인 무차입)
  FIX: NO_DEBT_RATING,
  PCAR: "A+",
  APD: "A", APO: "A",
  EOG: "A-", AON: "A-",
  ORLY: "BBB+", CRH: "BBB+", PPG: "BBB+",
  SNPS: "BBB", HUM: "BBB", FDX: "BBB", STLD: "BBB", HPE: "BBB", KEYS: "BBB",
  MSI: "BBB-", VST: "BBB-",
  WBD: "BB+",
  TDG: "BB-",

  // 7차분 (101~500위 조사, 예산 소진 전 완료분)
  // 재조사(2026-08): ODFL는 회사채 없음(무차입), MCHP는 유이자부채 있으나 S&P 미평가(Fitch·Moody's만)
  ODFL: NO_DEBT_RATING, MCHP: UNRATED_REASON,
  NTRS: "A+",
  HIG: "A-", EXC: "A-", RJF: "A-",
  FERG: "BBB+", XEL: "BBB+", CFG: "BBB+", MTB: "BBB+", JBHT: "BBB+", VTR: "BBB+",
  WAB: "BBB", WDAY: "BBB",
  EME: "BBB-", FLEX: "BBB-",
  XYZ: "BB+",
  PCG: "BB",
  CVNA: "B",

  // 8차분 (101~500위 조사, 예산 소진 전 완료분)
  WRB: "A-", PFG: "A-", RL: "A-", EL: "A-", CTVA: "A-",
  NDAQ: "BBB+", DOV: "BBB+", SRE: "BBB+", HONA: "BBB+", ADSK: "BBB+", FITB: "BBB+",
  OKE: "BBB", LHX: "BBB", FANG: "BBB", AZO: "BBB", TTWO: "BBB",
  AXON: "BB+", CPAY: "BB+", ON: "BB+",

  // 9차분 (101~500위 조사, 예산 소진 전 완료분)
  // 재조사(2026-08): FSLR·WST 모두 회사채 없음(순현금, 부채는 소액/리스 수준)
  FSLR: NO_DEBT_RATING, WST: NO_DEBT_RATING,
  AWK: "A",
  PPL: "A-", AVB: "A-",
  HUBB: "BBB+", CHRW: "BBB+", CNP: "BBB+", PHM: "BBB+",
  FIS: "BBB", FOXA: "BBB", LEN: "BBB", LH: "BBB", IP: "BBB", TSN: "BBB", DLTR: "BBB",
  EIX: "BBB-",
  ZBRA: "BB+",
  ECHO: "CCC+",

  // 10차분 (101~500위 조사, 예산 소진 전 완료분)
  // 재조사(2026-08): WSM·CPRT는 회사채 없음(순현금·무차입), CTSH는 term loan 있으나 S&P 미평가
  WSM: NO_DEBT_RATING, CPRT: NO_DEBT_RATING, CTSH: UNRATED_REASON,
  SNA: "A-", ATO: "A-",
  AEE: "BBB+", DTE: "BBB+", RF: "BBB+", DVN: "BBB+", EG: "BBB+", ES: "BBB+", HBAN: "BBB+", FE: "BBB+",
  STZ: "BBB", KEY: "BBB", DG: "BBB", GIS: "BBB", HPQ: "BBB",
  Q: "BB+",

  // 11차분 (101~500위 조사, 예산 소진 전 완료분)
  // 재조사(2026-08): GRMN·FAST·TER는 회사채 없음(순현금), IDXX는 사모 senior notes 있으나 S&P 미평가, CIEN은 S&P BB+ 확인(2025-01)
  GRMN: NO_DEBT_RATING, FAST: NO_DEBT_RATING, TER: NO_DEBT_RATING, IDXX: UNRATED_REASON, CIEN: "BB+",
  NKE: "A+",
  ACGL: "A", BKR: "A",
  ETR: "BBB+", DHI: "BBB+", CARR: "BBB+", D: "BBB+",
  ROK: "A-", O: "A-",
  TRGP: "BBB", EW: "BBB",
  DAL: "BBB-",
  IQV: "BB+",
  LITE: "B",

  // 12차분 (101~500위 조사, 예산 소진 전 완료분)
  // 재조사(2026-08): JKHY는 회사채 없음(소액 리볼버뿐), COO·TYL은 유이자부채(전환사채 등) 있으나 S&P 미평가, LULU는 S&P BBB 확인
  JKHY: NO_DEBT_RATING, COO: UNRATED_REASON, TYL: UNRATED_REASON, LULU: "BBB",
  GL: "A",
  KIM: "A-", MAA: "A-",
  BBY: "BBB+", DOC: "BBB+",
  MAS: "BBB", TXT: "BBB", AIZ: "BBB", ALLE: "BBB",
  AKAM: "BBB-", HST: "BBB-", NWSA: "BBB-", ALB: "BBB-",
  GNRC: "BB+",
  TKO: "B+",

  // 13차분 (101~500위 재조사분)
  // 재조사(2026-08): ERIE는 회사채 없음(무차입, 보험사라 AM Best만 평가)
  ERIE: NO_DEBT_RATING,
  BG: "A-",
  CMS: "BBB+", IEX: "BBB+", NI: "BBB+", DD: "BBB+", EVRG: "BBB+",
  AMCR: "BBB", AVY: "BBB", HAS: "BBB", LYB: "BBB", SBAC: "BBB", BR: "BBB",
  EXE: "BBB-", FDXF: "BBB-", GPN: "BBB-", BAX: "BBB-",
  VTRS: "BB+", CHTR: "BB+",

  // 14차분 (101~500위 재조사분)
  // 재조사(2026-08): SMCI는 전환사채 약 $4.8B 보유하나 S&P 발행자 등급 미평가
  SMCI: UNRATED_REASON,
  BEN: "A",
  SWK: "BBB+", IVZ: "BBB+", LNT: "BBB+",
  INVH: "BBB", WY: "BBB", ROL: "BBB", SJM: "BBB", CF: "BBB",
  GPC: "BBB-", APA: "BBB-", NWS: "BBB-", CDW: "BBB-", HII: "BBB-", LDOS: "BBB-", J: "BBB-",
  PTC: "BB+",
  GEN: "BB",

  // 15차분 (101~500위 재조사분)
  // 재조사(2026-08): DECK·ALGN은 회사채 없음(순현금), CSGP·FDS는 유이자부채(senior notes) 있으나 S&P 미평가
  DECK: NO_DEBT_RATING, ALGN: NO_DEBT_RATING, CSGP: UNRATED_REASON, FDS: UNRATED_REASON,
  REG: "A-", HRL: "A-", CPT: "A-",
  CLX: "BBB+", UDR: "BBB+", PNW: "BBB+",
  SOLV: "BBB", MKC: "BBB", RVTY: "BBB",
  TRMB: "BBB-", AES: "BBB-",
  CRL: "BB+",
  WYNN: "BB-",
  DVA: "BB", GDDY: "BB",

  // 16차분 (101~500위 재조사분)
  // 재조사(2026-08): EXPD·INCY·TPL·MRNA 모두 회사채 없음(순현금, 부채는 리스/소액 수준)
  EXPD: NO_DEBT_RATING, INCY: NO_DEBT_RATING, TPL: NO_DEBT_RATING, MRNA: NO_DEBT_RATING,
  TROW: "A+", L: "A",
  ULTA: "BBB", SW: "BBB", VLTO: "BBB", DRI: "BBB", FOX: "BBB", IFF: "BBB",
  BRO: "BBB-", STE: "BBB-",
  NRG: "BB",

  // 17차분 (16차분에서 접속 차단으로 보류했던 종목 재조사)
  // 재조사(2026-08): FFIV(F5)는 회사채 없음(무차입 기조)
  FFIV: NO_DEBT_RATING,
  PKG: "BBB", FTV: "BBB",
  DOW: "BBB-", // S&P 2026-02-18 BBB→BBB- 하향(부정적)

  // 한국인 인기(서학개미) 개별주 조사분 (2026-08, 대부분 S&P500 미편입)
  // 실제 S&P 발행자 등급 확인:
  TSM: "AA-", BABA: "A+",
  DKNG: "BB", SNAP: "BB-",
  MSTR: "B-", // 스트래티지(구 마이크로스트래티지) — 비트코인 전략, S&P B- 정크
  // 순현금·무차입이라 S&P 등급 자체가 없음 → 회사채 없음(2점):
  ARM: NO_DEBT_RATING, IONQ: NO_DEBT_RATING, PDD: NO_DEBT_RATING, LI: NO_DEBT_RATING,
  CELH: NO_DEBT_RATING, GME: NO_DEBT_RATING, RDDT: NO_DEBT_RATING,
  // 유이자부채(회사채·전환사채 등)는 있으나 S&P 발행자 등급 없음 → 미평가(1점):
  HOOD: UNRATED_REASON, CPNG: UNRATED_REASON, SOFI: UNRATED_REASON,
  RIVN: UNRATED_REASON, NIO: UNRATED_REASON, LCID: UNRATED_REASON,
  RKLB: UNRATED_REASON, RBLX: UNRATED_REASON, U: UNRATED_REASON,
  XPEV: UNRATED_REASON, AFRM: UNRATED_REASON,
};

// S&P 신용등급 문자를 0~4점으로 환산. BBB 및 그 이하 등급은 0점
const CREDIT_RATING_SCORE = {
  AAA: 4, "AA+": 3.5, AA: 3, "AA-": 2.5, "A+": 2, A: 1.5, "A-": 1, "BBB+": 0.5,
};

// 투자등급(신용등급) + S&P500 대비 모멘텀 + 순이익률 + 시가총액 가점을 조합한 참고용 투자 안정성 점수(10점 만점, 높을수록 위험이 낮음)
function computeRiskScore(metrics, sp500Return) {
  const { symbol, oneYearReturn, netIncome, revenue, marketCap, currency } = metrics;

  // 1) 투자등급 (0~4점) — S&P 신용등급 기준. AAA 4점, AA+ 3.5점, AA 3점, AA- 2.5점, A+ 2점, A 1.5점, A- 1점, BBB+ 0.5점, BBB 이하 0점
  // 회사채 자체가 없는 종목(NO_DEBT_RATING)은 2점, S&P 미평가(UNRATED_REASON)·목록 미포함은 1점 처리
  let creditScore = 1;
  const rating = symbol ? TICKER_CREDIT_RATING[symbol] : undefined;
  if (rating === NO_DEBT_RATING) {
    creditScore = 2;
  } else if (rating === UNRATED_REASON) {
    creditScore = 1;
  } else if (rating !== undefined) {
    creditScore = CREDIT_RATING_SCORE[rating] !== undefined ? CREDIT_RATING_SCORE[rating] : 0;
  }

  // 2) S&P500 대비 모멘텀 (0~2점) — S&P500 연 수익률과의 차이(절대값)가 0%p면 만점,
  // 200%p 이상 벌어지면 0점 (50%p 멀어질 때마다 0.5점 감점, 선형)
  let marketScore = 1;
  let relDiff = null;
  if (oneYearReturn !== null && sp500Return !== null && sp500Return !== undefined) {
    relDiff = Math.abs(sp500Return - oneYearReturn);
    marketScore = clamp(2 * (1 - relDiff / 200), 0, 2);
  }

  // 3) 순이익률 = 순이익÷매출 (0~2점) — 0%는 1/3점, 10%p마다 1/3점씩 늘어 50% 이상이면 만점.
  // 적자(음수 순이익률)는 무조건 0점 처리
  let marginScore = 1;
  let netMargin = null;
  if (revenue !== null && revenue > 0 && netIncome !== null) {
    netMargin = netIncome / revenue;
    marginScore = netMargin < 0 ? 0 : clamp(((2 / 3) * (0.5 + netMargin * 5)), 0, 2);
  }

  // 4) 시가총액 가점 = 시가총액 ÷ 미국 시장 전체 시가총액 추정치(VTSAX 등 인덱스펀드가 이 비중만큼 보유한다고 가정) (0~2점)
  // 6% 이상이면 만점, 0%면 0점 (3%p마다 1점, 선형). 시가총액을 신뢰할 수 없는 경우(N/A)는 0.1점 처리
  let vtsaxScore = 0.1;
  let vtsaxWeightPct = null;
  if (marketCap !== undefined && marketCap !== null && (!currency || currency === "USD")) {
    vtsaxWeightPct = (marketCap / US_TOTAL_MARKET_CAP_ESTIMATE) * 100;
    vtsaxScore = clamp((vtsaxWeightPct / 6) * 2, 0, 2);
  }

  const total = Math.round(clamp(creditScore + marketScore + marginScore + vtsaxScore, 0, 10) * 10) / 10;
  return {
    total,
    creditScore,
    rating: rating || null,
    marketScore,
    marginScore,
    relDiff,
    netMargin,
    vtsaxScore,
    vtsaxWeightPct,
  };
}

// ---------- Wikipedia 헬퍼 (프록시 불필요, 공식 CORS 지원) ----------
// 한국어 위키백과 문서가 있으면 그대로 사용하고, 없으면 영문 요약을 번역해서 반환
async function getBusinessSummaryKo(companyName) {
  const searchRes = await fetch(
    `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(companyName)}&limit=1&namespace=0&format=json&origin=*`
  );
  const searchData = await searchRes.json();
  const enTitle = searchData && searchData[1] && searchData[1][0];
  if (!enTitle) throw new Error("위키백과에서 관련 문서를 찾지 못했습니다.");

  let koTitle = null;
  try {
    const llRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&prop=langlinks&lllang=ko&titles=${encodeURIComponent(enTitle)}&format=json&origin=*`
    );
    const llData = await llRes.json();
    const pages = llData && llData.query && llData.query.pages;
    const page = pages && Object.values(pages)[0];
    koTitle = (page && page.langlinks && page.langlinks[0] && page.langlinks[0]["*"]) || null;
  } catch {
    koTitle = null;
  }

  if (koTitle) {
    try {
      const koRes = await fetch(`https://ko.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(koTitle)}`);
      if (koRes.ok) {
        const koData = await koRes.json();
        if (koData.extract) return extractFirstSentence(koData.extract);
      }
    } catch {
      // 한국어 문서 조회 실패 시 아래 영문 요약 번역으로 폴백
    }
  }

  const enRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(enTitle)}`);
  if (!enRes.ok) throw new Error("위키백과 요약을 가져오지 못했습니다.");
  const enData = await enRes.json();
  const enSentence = extractFirstSentence(enData.extract || "");
  return translateToKorean(enSentence);
}

// ---------- 번역 헬퍼 (프록시 불필요, Google 실패 시 MyMemory로 폴백) ----------
async function translateToKorean(text) {
  if (!text) return "";
  try {
    const url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=" + encodeURIComponent(text);
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const combined = (data[0] || []).map((seg) => seg[0]).join("");
      if (combined) return combined;
    }
  } catch {
    // Google 실패 시 아래 MyMemory로 폴백
  }
  try {
    const url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text) + "&langpair=en|ko";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.responseData && data.responseData.translatedText) return data.responseData.translatedText;
    }
  } catch {
    // 둘 다 실패하면 원문 그대로 반환
  }
  return text;
}

// ---------- S&P500 종목 목록 (위키백과, 프록시 불필요) ----------
// 세션 내에서 한 번만 조회해 재사용
let sp500TickersPromise = null;
function getSP500Tickers() {
  if (!sp500TickersPromise) {
    sp500TickersPromise = (async () => {
      const title = "List of S&P 500 companies";
      const url =
        "https://en.wikipedia.org/w/api.php?action=parse&page=" +
        encodeURIComponent(title) +
        "&prop=wikitext&section=1&format=json&origin=*";
      const res = await fetch(url);
      const data = await res.json();
      const text = data && data.parse && data.parse.wikitext && data.parse.wikitext["*"];
      if (!text) throw new Error("S&P500 종목 목록을 가져오지 못했습니다.");

      const symbols = [];
      const re = /\{\{\w+Symbol\|([A-Za-z0-9.\-]+)\}\}/g;
      let m;
      while ((m = re.exec(text))) {
        symbols.push(m[1].toUpperCase());
      }
      if (symbols.length === 0) throw new Error("S&P500 종목 목록을 파싱하지 못했습니다.");
      return [...new Set(symbols)];
    })().catch((e) => {
      sp500TickersPromise = null; // 실패 시 재시도 가능하도록 캐시 초기화
      throw e;
    });
  }
  return sp500TickersPromise;
}

// S&P500 종목을 "시가총액 상위 약 30개 먼저, 나머지는 원래 순서"로 재배열한 목록 — 가치평가·추세평가 탭에서
// 처음에 관심도 높은 대형주부터 빠르게 보여주기 위한 용도(시가총액 정렬 전용 스크리너는 인증이 필요해 막혀 있어서,
// 여러 활발한 종목 스크리너 결과를 합쳐 시가총액 내림차순으로 근사)
let sp500PriorityOrderPromise = null;
function getSP500PriorityOrder() {
  if (!sp500PriorityOrderPromise) {
    sp500PriorityOrderPromise = (async () => {
      const [allTickers, screenerResults] = await Promise.all([
        getSP500Tickers(),
        Promise.all(
          ["most_actives", "day_gainers", "day_losers", "undervalued_large_caps", "growth_technology_stocks"].map((id) =>
            yahooScreener(id, 100).catch(() => null)
          )
        ),
      ]);
      const sp500Set = new Set(allTickers);
      const marketCapBySymbol = new Map();
      for (const data of screenerResults) {
        const quotes = (data && data.finance && data.finance.result && data.finance.result[0] && data.finance.result[0].quotes) || [];
        for (const q of quotes) {
          if (!q || !q.symbol || !sp500Set.has(q.symbol)) continue;
          const existing = marketCapBySymbol.get(q.symbol);
          if (existing === undefined || (q.marketCap || 0) > existing) marketCapBySymbol.set(q.symbol, q.marketCap || 0);
        }
      }
      const topByMarketCap = [...marketCapBySymbol.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([symbol]) => symbol)
        .slice(0, 30);
      const topSet = new Set(topByMarketCap);
      const rest = allTickers.filter((t) => !topSet.has(t));
      return [...topByMarketCap, ...rest];
    })().catch((e) => {
      sp500PriorityOrderPromise = null;
      throw e;
    });
  }
  return sp500PriorityOrderPromise;
}

// 동시 실행 개수를 제한하며 배열 각 항목에 비동기 작업을 적용 (프록시 과부하 방지 + 진행률 콜백)
async function mapWithConcurrency(items, limit, worker, onProgress) {
  const results = new Array(items.length);
  let nextIndex = 0;
  let completed = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      // 프록시에 요청이 몰리지 않도록 살짝 텀을 둠(부하가 크면 무료 프록시가 일시적으로 요청을 거부함)
      if (current > 0) await sleep(120);
      try {
        results[current] = await worker(items[current], current);
      } catch {
        results[current] = null; // 개별 실패는 건너뛰고 순위 계산에서 제외
      }
      completed++;
      if (onProgress) onProgress(completed, items.length);
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, runWorker));
  return results;
}

// ---------- 유틸 ----------
function fmtCompactCurrency(num) {
  if (num === null || num === undefined || isNaN(num)) return "N/A";
  const abs = Math.abs(num);
  let str;
  if (abs >= 1e12) str = (num / 1e12).toFixed(2) + "T";
  else if (abs >= 1e9) str = (num / 1e9).toFixed(2) + "B";
  else if (abs >= 1e6) str = (num / 1e6).toFixed(2) + "M";
  else str = num.toFixed(2);
  return "$" + str;
}

function fmtPct(num, digits = 1) {
  if (num === null || num === undefined || isNaN(num)) return "N/A";
  const sign = num > 0 ? "+" : "";
  return `${sign}${num.toFixed(digits)}%`;
}

// 최근 5거래일 중 하루라도 ±10% 이상 급등/급락한 종목에 붙일 이모지(급등 🔥, 급락 ⚠️, 해당 없으면 빈 문자열)
const SURGE_WARNING_TITLE = "최근 5거래일 중 하루라도 ±10% 이상 급등락";
function surgeWarningEmoji(fiveDayExtremes) {
  if (!fiveDayExtremes) return "";
  const { hasSurge, hasPlunge } = fiveDayExtremes;
  if (!hasSurge && !hasPlunge) return "";
  const icons = `${hasSurge ? "🔥" : ""}${hasPlunge ? "⚠️" : ""}`;
  return ` <span title="${SURGE_WARNING_TITLE}">${icons}</span>`;
}
// 순위 표 위에 붙이는 경고 이모지 범례 + 상승압력/투자안정 점수 의미 설명
const SURGE_WARNING_LEGEND = `
  <p class="muted" style="font-size:11px;margin:0 0 4px;opacity:0.65;">🔥 급등 · ⚠️ 급락 — ${SURGE_WARNING_TITLE}</p>
  <p class="muted" style="font-size:11px;margin:0 0 2px;opacity:0.65;">📈 상승압력 — 현재 상승 압력이 높음을 의미<br>🛡️ 투자안정 — 1년 후 하락 가능성이 낮음을 의미</p>
`;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// "Inc.", "Corp." 같은 약어의 마침표를 문장 끝으로 오인하지 않도록 보호한 뒤 첫 문장만 추출
function extractFirstSentence(text) {
  if (!text) return "";
  const protectedText = text.replace(/\b(Inc|Corp|Co|Ltd|Jr|Sr|St|vs|U\.S|U\.K)\./g, "$1<DOT>");
  const firstPart = protectedText.split(/(?<=\.)\s+/)[0] || protectedText;
  return firstPart.replace(/<DOT>/g, ".");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// 실시간 시세 차트(TradingView)를 앱 내 전체화면 모달로 띄우기 위한 임베드 위젯 URL
// Yahoo Finance 차트보다 반응 속도가 빠름. TradingView는 클래스주 표기에 "-" 대신 "." 를 쓰므로(예: BRK-B → BRK.B) 변환 필요.
// 검은 배경 + 1년(12M) 기본 범위 + 좌측 그리기 툴바 숨김으로 모바일에서 차트만 크게 보이도록 구성
function tradingViewEmbedUrl(symbol) {
  const config = {
    symbol: symbol.replace(/-/g, "."),
    interval: "D",
    range: "12M",
    theme: "dark",
    style: "1",
    locale: "kr",
    hide_side_toolbar: true,
    save_image: false,
    allow_symbol_change: false,
    backgroundColor: "#000000",
    toolbar_bg: "#000000",
  };
  return `https://s.tradingview.com/embed-widget/advanced-chart/?locale=kr#${encodeURIComponent(JSON.stringify(config))}`;
}

function openChartModal(symbol) {
  if (!symbol) return;
  el("chartModalTitle").textContent = symbol;
  el("chartFrame").src = tradingViewEmbedUrl(symbol);
  el("chartModal").style.display = "flex";
}

function closeChartModal() {
  el("chartModal").style.display = "none";
  el("chartFrame").src = "about:blank";
}

function priceChartLink(symbol, priceHtml) {
  return `<a class="price-chart-link" href="#" data-chart-symbol="${escapeHtml(symbol)}">${priceHtml}</a>`;
}

function setStatus(type, message) {
  if (!message) {
    statusBox.style.display = "none";
    return;
  }
  statusBox.style.display = "block";
  statusBox.className = `status-box ${type}`;
  statusBox.innerHTML = type === "loading" ? `<span class="spinner"></span>${message}` : message;
}

// ---------- 고정 헤더 높이 동기화(카테고리 서브툴바가 열리고 닫힐 때마다 본문 padding-top을 다시 맞춤) ----------
function syncHeaderHeight() {
  document.documentElement.style.setProperty("--fixed-header-h", fixedHeader.offsetHeight + "px");
}
window.addEventListener("resize", syncHeaderHeight);
new ResizeObserver(syncHeaderHeight).observe(fixedHeader);
syncHeaderHeight();

// ---------- 스와이프 캐로셀(관심종목/기업가치/주식동향/인사이트) ----------
// 시장·투데이·기업검색은 캐러셀에서 빠지고 companyPanel과 동일한 슬라이드 오버레이 패턴(openMarketPanel 등)으로
// 별도 관리됨 — TAB_ORDER는 실제 스와이프되는 4개 패널만 담당
const TAB_ORDER = ["watchlist", "insight", "valuation", "trend"];
const panels = {
  watchlist: el("panelWatchlist"),
  valuation: el("panelValuation"),
  trend: el("panelTrend"),
  insight: el("panelInsight"),
};
const tabButtons = {
  watchlist: el("watchlistTabBtn"),
  valuation: el("tabValuationBtn"),
  trend: el("tabTrendBtn"),
  insight: el("tabInsightBtn"),
};
const searchTabBtn = el("searchTabBtn");
const valuationButtons = {
  revenue: el("valuationRevenueBtn"),
  cashFlow: el("valuationCashFlowBtn"),
  netIncome: el("valuationNetIncomeBtn"),
  eps: el("valuationEpsBtn"),
  per: el("valuationPerBtn"),
  stability: el("valuationStabilityBtn"),
  marketCap: el("valuationMarketCapBtn"),
};
const trendButtons = {
  volume: el("trendVolumeBtn"),
  plunge: el("trendPlungeBtn"),
  surge: el("trendSurgeBtn"),
  pressure: el("trendPressureBtn"),
  usEtf: el("trendUsEtfBtn"),
  krEtf: el("trendKrEtfBtn"),
};
const insightButtons = {
  blackrock: el("insightBlackrockBtn"),
  vanguard: el("insightVanguardBtn"),
  stateStreet: el("insightStateBtn"),
  berkshire: el("insightBerkshireBtn"),
  goldman: el("insightGoldmanBtn"),
  morganStanley: el("insightMorganStanleyBtn"),
  jpmorgan: el("insightJpmorganBtn"),
  ark: el("insightArkBtn"),
  softbank: el("insightSoftbankBtn"),
};
const insightCategoryButtons = {
  firms: el("insightCatFirmsBtn"),
  brand: el("insightCatBrandBtn"),
  tech: el("insightCatTechBtn"),
  calendar: el("insightCatCalendarBtn"),
  news: el("insightCatNewsBtn"),
  futureIndustry: el("insightCatFutureIndustryBtn"),
};

let activeTabIndex = 0;

// 패널 i의 위치 = (i - 활성 인덱스 + 드래그 진행률) * 100% — offsetFraction=0이면 정지 상태
function layoutPanels(offsetFraction = 0) {
  TAB_ORDER.forEach((key, i) => {
    panels[key].style.transform = `translateX(${(i - activeTabIndex + offsetFraction) * 100}%)`;
  });
}

// 패널마다 콘텐츠 높이가 달라서, 활성 패널의 높이가 바뀔 때마다(비동기 로딩·더보기 등) 뷰포트 높이를 맞춤
function syncCarouselHeight() {
  carouselViewport.style.height = panels[TAB_ORDER[activeTabIndex]].offsetHeight + "px";
}
const carouselResizeObserver = new ResizeObserver(syncCarouselHeight);
TAB_ORDER.forEach((key) => carouselResizeObserver.observe(panels[key]));
window.addEventListener("resize", syncCarouselHeight);

function updateTabBarActive() {
  const activeKey = TAB_ORDER[activeTabIndex];
  TAB_ORDER.forEach((key) => tabButtons[key].classList.toggle("active", key === activeKey));
}

function switchTab(index) {
  index = Math.max(0, Math.min(TAB_ORDER.length - 1, index));
  activeTabIndex = index;
  TAB_ORDER.forEach((key) => panels[key].classList.add("snapping"));
  layoutPanels(0);
  updateTabBarActive();
  syncCarouselHeight();
  window.setTimeout(() => {
    TAB_ORDER.forEach((key) => panels[key].classList.remove("snapping"));
  }, 320);
  ensureTabLoaded(TAB_ORDER[index]);
}

TAB_ORDER.forEach((key, i) => {
  tabButtons[key].addEventListener("click", () => switchTab(i));
});
searchTabBtn.addEventListener("click", openSearchWizardGate);

// ---------- 탭별 데이터 로딩 캐싱: 한 번 로딩된 탭은 다시 방문해도 재요청하지 않음 ----------
const TAB_LOADERS = {
  watchlist: () => renderWatchlistList(),
  valuation: () => runValueRevenue(), // 가치평가 진입 시 매출액 증가를 자동 표시
  trend: () => runMovers("surge"), // 추세평가 진입 시 급등주를 자동 표시
  // 인사이트 진입 시 기본은 첫 버튼(블랙록)이지만, 하단 네비게이션 등에서 이미 다른 카테고리(예: 캘린더)로
  // 먼저 전환해둔 상태로 진입했다면 그 카테고리를 존중함(안 그러면 비동기 로딩이 뒤늦게 firms로 덮어씀)
  insight: () => (insightActiveCategory === "firms" ? runInsight(insightActiveInstitution) : runInsightCategory(insightActiveCategory)),
};
const tabLoadPromises = {};
function ensureTabLoaded(key) {
  if (tabLoadPromises[key]) return tabLoadPromises[key];
  const loader = TAB_LOADERS[key];
  tabLoadPromises[key] = loader ? Promise.resolve().then(loader).catch(() => {}) : Promise.resolve();
  return tabLoadPromises[key];
}

// ---------- 가로 스와이프(포인터 드래그로 손가락을 따라 화면이 끌려오는 캐로셀) ----------
let dragState = null;

carouselViewport.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  const now = performance.now();
  dragState = {
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    lastX: e.clientX,
    // prevX/prevMoveTime은 "떼기 직전 마지막 구간"의 속도만 따로 재기 위한 값(전체 평균 속도로 재면
    // 손을 댄 뒤 잠깐 멈췄다가 빠르게 튕기는 실제 스와이프에서 속도가 과소평가되어 스냅이 안 먹힘)
    prevX: e.clientX,
    startTime: now,
    prevMoveTime: now,
    axisLocked: false,
    isHorizontal: false,
    viewportWidth: carouselViewport.clientWidth,
  };
});

carouselViewport.addEventListener("pointermove", (e) => {
  if (!dragState || e.pointerId !== dragState.pointerId) return;
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;
  if (!dragState.axisLocked) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    dragState.axisLocked = true;
    dragState.isHorizontal = Math.abs(dx) > Math.abs(dy);
    if (dragState.isHorizontal) {
      try {
        carouselViewport.setPointerCapture(dragState.pointerId);
      } catch {
        // 일부 브라우저에서 캡처가 실패해도 드래그 추적 자체는 계속 진행
      }
    }
  }
  if (!dragState.isHorizontal) return;
  e.preventDefault();
  dragState.prevX = dragState.lastX;
  dragState.prevMoveTime = dragState.lastMoveTime ?? dragState.startTime;
  dragState.lastX = e.clientX;
  dragState.lastMoveTime = performance.now();
  let offsetFraction = dx / dragState.viewportWidth;
  const atStart = activeTabIndex === 0 && offsetFraction > 0;
  const atEnd = activeTabIndex === TAB_ORDER.length - 1 && offsetFraction < 0;
  if (atStart || atEnd) offsetFraction *= 0.35; // 끝단에서는 고무줄처럼 저항감을 줌
  layoutPanels(offsetFraction);
});

function endDrag(e) {
  if (!dragState || e.pointerId !== dragState.pointerId) return;
  if (dragState.isHorizontal) {
    const dx = dragState.lastX - dragState.startX; // 전체 이동거리(먼 거리 스와이프 판정용)
    // 속도는 손을 뗀 직전 마지막 구간만으로 계산(전체 평균으로 재면 누르고 잠깐 멈췄다 튕기는
    // 실제 스와이프에서 속도가 희석돼 플릭으로 인식되지 않는 문제가 있었음)
    const recentDx = dragState.lastX - dragState.prevX;
    const recentElapsed = Math.max(1, dragState.lastMoveTime - dragState.prevMoveTime);
    const velocity = recentDx / recentElapsed; // px/ms
    const threshold = dragState.viewportWidth * 0.18;
    const isFastFlick = Math.abs(dx) > 10 && Math.abs(velocity) > 0.35; // 최소 이동거리 없이 속도만으로 판정되지 않도록 방지
    let target = activeTabIndex;
    if (dx <= -threshold || (isFastFlick && velocity < 0)) target = activeTabIndex + 1;
    else if (dx >= threshold || (isFastFlick && velocity > 0)) target = activeTabIndex - 1;
    switchTab(target); // target이 현재 인덱스와 같으면 제자리로 스냅(고무줄 복귀)
  }
  dragState = null;
}
carouselViewport.addEventListener("pointerup", endDrag);
carouselViewport.addEventListener("pointercancel", endDrag);

// ---------- 검색 오버레이(틀고정 검색"버튼"을 누르면 오른쪽에서 전체화면으로 슬라이드인) ----------
const RECENT_SEARCH_KEY = "recentSearches";
const RECENT_SEARCH_MAX = 5;
const POPULAR_SEARCH_MAX = 5;

function getRecentSearches() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_SEARCH_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}
function addRecentSearch(symbol) {
  const next = [symbol, ...getRecentSearches().filter((s) => s !== symbol)].slice(0, RECENT_SEARCH_MAX);
  localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
}
function searchChipHtml(symbol) {
  return `<button type="button" class="search-chip" data-symbol="${escapeHtml(symbol)}">${escapeHtml(symbol)}</button>`;
}
function renderRecentSearches() {
  const recent = getRecentSearches();
  recentSearchList.innerHTML = recent.length
    ? recent.map((s) => searchChipHtml(s)).join("")
    : `<p class="muted search-chip-empty">최근 검색한 티커가 없습니다.</p>`;
}
// 인기 검색 = 전체 방문자의 최근 24시간 검색 로그를 Worker(KV)에 집계해 받아옴(navigateToTicker에서 /search-log로 매번 기록)
let popularSearchCache = null;
async function renderPopularSearches() {
  if (popularSearchCache) {
    popularSearchList.innerHTML = popularSearchCache.map((r) => searchChipHtml(r.symbol)).join("");
    return;
  }
  try {
    const res = await fetch(`${AUTH_ORIGIN}/search-popular`);
    const data = await res.json();
    const popular = (data && data.popular) || [];
    if (popular.length === 0) {
      popularSearchList.innerHTML = `<p class="muted search-chip-empty">아직 인기 검색어가 없습니다.</p>`;
      return;
    }
    popularSearchCache = popular.slice(0, POPULAR_SEARCH_MAX);
    popularSearchList.innerHTML = popularSearchCache.map((r) => searchChipHtml(r.symbol)).join("");
  } catch {
    popularSearchList.innerHTML = `<p class="muted search-chip-empty">인기 검색을 불러오지 못했습니다.</p>`;
  }
}
// 검색 성공 시 서버에 기록(실패해도 UI에 영향 없도록 조용히 무시) — 최근 24시간 인기 검색어 집계용
function logSearchEvent(symbol) {
  fetch(`${AUTH_ORIGIN}/search-log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol }),
  }).catch(() => {});
}
function openSearchOverlay() {
  searchOverlay.style.display = "flex";
  requestAnimationFrame(() => searchOverlay.classList.add("open"));
  renderRecentSearches();
  renderPopularSearches();
  tickerInput.focus();
}
function closeSearchOverlay() {
  searchOverlay.classList.remove("open");
  window.setTimeout(() => {
    searchOverlay.style.display = "none";
  }, 280);
}
searchOpenBtn.addEventListener("click", openSearchOverlay);
searchOverlayCloseBtn.addEventListener("click", closeSearchOverlay);
document.addEventListener("click", (e) => {
  const chip = e.target.closest(".search-chip");
  if (!chip) return;
  navigateToTicker(chip.dataset.symbol);
});

// ---------- 하단 고정 네비게이션(홈=기업검색/캘린더/시장/더보기) ----------
const bottomNavButtons = {
  home: el("bottomNavHomeBtn"),
  calendar: el("bottomNavCalendarBtn"),
  market: el("bottomNavMarketBtn"),
  more: el("bottomNavMoreBtn"),
};
function setBottomNavActive(key) {
  Object.entries(bottomNavButtons).forEach(([k, btn]) => btn.classList.toggle("active", k === key));
}

// ---------- 더보기 패널: 전체화면이 아니라 오른쪽에서 최대 75%까지만 슬라이드인하는 드로어 ----------
const toastEl = el("toast");
let toastTimer = null;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
}

const morePanel = el("morePanel");
const morePanelBackdrop = el("morePanelBackdrop");
const morePanelCloseBtn = el("morePanelCloseBtn");
const morePanelUserRow = el("morePanelUserRow");
const morePanelUserName = el("morePanelUserName");
const morePanelAvatarImg = el("morePanelAvatarImg");
const morePanelAvatarInitial = el("morePanelAvatarInitial");

function renderMorePanelUser(user) {
  if (user) {
    const name = user.displayName || (user.email ? user.email.split("@")[0] : "회원");
    morePanelUserName.textContent = name;
    if (user.photoURL) {
      morePanelAvatarImg.src = user.photoURL;
      morePanelAvatarImg.style.display = "block";
      morePanelAvatarInitial.style.display = "none";
    } else {
      morePanelAvatarImg.style.display = "none";
      morePanelAvatarInitial.style.display = "block";
      morePanelAvatarInitial.textContent = name.charAt(0).toUpperCase();
    }
  } else {
    morePanelUserName.textContent = "로그인이 필요합니다";
    morePanelAvatarImg.style.display = "none";
    morePanelAvatarInitial.style.display = "block";
    morePanelAvatarInitial.textContent = "?";
  }
}
function openMorePanel() {
  renderMorePanelUser(typeof firebase !== "undefined" ? firebase.auth().currentUser : null);
  morePanel.style.display = "block";
  requestAnimationFrame(() => morePanel.classList.add("open"));
}
function closeMorePanel() {
  morePanel.classList.remove("open");
  window.setTimeout(() => {
    morePanel.style.display = "none";
  }, 280);
}
morePanelBackdrop.addEventListener("click", closeMorePanel);
morePanelCloseBtn.addEventListener("click", closeMorePanel);
morePanelUserRow.addEventListener("click", () => {
  closeMorePanel();
  if (typeof firebase !== "undefined" && firebase.auth().currentUser) {
    userAvatarBtn.click();
  } else {
    openLoginModal();
  }
});
document.querySelectorAll(".more-panel-item").forEach((btn) => {
  btn.addEventListener("click", () => showToast("준비중인 기능입니다."));
});
bottomNavButtons.home.addEventListener("click", () => {
  setBottomNavActive("home");
  closeCompanyPanel();
  openSearchWizardGate();
});
bottomNavButtons.calendar.addEventListener("click", () => {
  setBottomNavActive("calendar");
  closeCompanyPanel();
  openCalendarPanel();
});
bottomNavButtons.market.addEventListener("click", () => {
  setBottomNavActive("market");
  closeCompanyPanel();
  openMarketPanel();
});
bottomNavButtons.more.addEventListener("click", () => {
  openMorePanel();
});

// ---------- 시장/투데이: companyPanel과 동일한 슬라이드 오버레이 패턴(캐러셀 밖에서 독립 관리) ----------
let marketPanelOpen = false;
function openMarketPanel() {
  el("marketPanel").style.display = "flex";
  requestAnimationFrame(() => el("marketPanel").classList.add("open"));
  marketPanelOpen = true;
  startIndexAutoRefresh();
  runIndexTab();
  renderMarketWidget();
}
function closeMarketPanel() {
  el("marketPanel").classList.remove("open");
  window.setTimeout(() => { el("marketPanel").style.display = "none"; }, 280);
  marketPanelOpen = false;
  stopIndexAutoRefresh();
}
el("marketPanelCloseBtn").addEventListener("click", closeMarketPanel);

// ---------- 캘린더 패널: 하단 네비 캘린더 아이콘 전용 — 인사이트 탭의 텍스트 목록과는 별개로,
// 그리드+로고가 있는 화면을 독립된 슬라이드 오버레이로 보여줌(marketPanel과 동일한 패턴)
let calendarPanelLoaded = false;
function openCalendarPanel() {
  el("calendarPanel").style.display = "flex";
  requestAnimationFrame(() => el("calendarPanel").classList.add("open"));
  if (!calendarPanelLoaded) {
    calendarPanelLoaded = true;
    runCalendarPanel();
  }
}
function closeCalendarPanel() {
  el("calendarPanel").classList.remove("open");
  window.setTimeout(() => { el("calendarPanel").style.display = "none"; }, 280);
}
el("calendarPanelCloseBtn").addEventListener("click", closeCalendarPanel);

// ---------- 기업 패널: 틀고정 탭이 아니라 오른쪽에서 슬라이드인하는 전체화면 오버레이 ----------
const companyPanel = el("companyPanel");
const companyPanelCloseBtn = el("companyPanelCloseBtn");
const companyPanelSearchBtn = el("companyPanelSearchBtn");
const companyPanelAlertBtn = el("companyPanelAlertBtn");

function openCompanyPanel() {
  companyPanel.style.display = "flex";
  requestAnimationFrame(() => companyPanel.classList.add("open"));
}
function closeCompanyPanel({ push = true } = {}) {
  companyPanel.classList.remove("open");
  window.setTimeout(() => {
    companyPanel.style.display = "none";
  }, 280);
  if (push && new URLSearchParams(location.search).get("ticker")) {
    history.pushState(null, "", location.pathname);
    document.title = "미국 기업 분석기 (yeopinvest.com)";
  }
}
companyPanelCloseBtn.addEventListener("click", () => closeCompanyPanel());
companyPanelSearchBtn.addEventListener("click", openSearchOverlay);
companyPanelAlertBtn.addEventListener("click", () => alert("가격 알림 기능은 준비 중입니다."));

// 헤더의 종목이름/가격/등락률 표시 — 검정 배경 전체화면 상세 헤더용
function renderCompanyIdentity(ticker, quote, meta, changePct) {
  const displayName = TICKER_TO_KOREAN_NAME[ticker] || quote.longname || quote.shortname || meta.longName || ticker;
  const price = meta.regularMarketPrice;
  const currency = meta.currency === "KRW" ? "₩" : "$";
  el("companyPanelLogoWrap").innerHTML = tickerLogoHtml(ticker);
  el("companyPanelName").textContent = displayName;
  el("companyPanelPrice").textContent = price !== undefined && price !== null ? `${currency}${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "";
  const changeEl = el("companyPanelChange");
  if (changePct !== null && changePct !== undefined) {
    const sign = changePct >= 0 ? "+" : "";
    changeEl.textContent = `${sign}${changePct.toFixed(2)}%`;
    changeEl.className = `detail-identity-change ${changePct >= 0 ? "delta-up" : "delta-down"}`;
  } else {
    changeEl.textContent = "";
    changeEl.className = "detail-identity-change";
  }
}

// ---------- 관심종목 (localStorage 기반 — Firestore 등 서버 저장소가 없어 기기별로만 유지됨) ----------
const WATCHLIST_KEY = "watchlist_v1";
const WATCHLIST_GROUPS_KEY = "watchlist_groups_v1";
const WATCHLIST_ACTIVE_GROUP_KEY = "watchlist_active_group_v1";
const WATCHLIST_SORT_KEY = "watchlist_sort_v1";
const WATCHLIST_ALL_GROUP_ID = "__all__";
const WATCHLIST_DEFAULT_GROUP_ID = "default";

function getWatchlist() {
  try {
    const list = JSON.parse(localStorage.getItem(WATCHLIST_KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function isWatchlisted(symbol) {
  const sym = (symbol || "").toUpperCase();
  return getWatchlist().some((w) => w.symbol === sym);
}
function saveWatchlist(list) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
  tabLoadPromises.watchlist = null; // 다음에 관심종목 탭에 들어갈 때 최신 목록으로 다시 렌더링되도록 캐시 무효화
}

// ---------- 관심종목 그룹(가로스크롤 탭) ----------
function getWatchlistGroups() {
  try {
    const groups = JSON.parse(localStorage.getItem(WATCHLIST_GROUPS_KEY));
    if (Array.isArray(groups) && groups.length) return groups;
  } catch {
    // 저장된 값이 없거나 손상된 경우 기본 그룹으로 대체
  }
  return [{ id: WATCHLIST_DEFAULT_GROUP_ID, name: "기본" }];
}
function saveWatchlistGroups(groups) {
  localStorage.setItem(WATCHLIST_GROUPS_KEY, JSON.stringify(groups));
}
function addWatchlistGroup(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return null;
  const groups = getWatchlistGroups();
  const id = `g_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  groups.push({ id, name: trimmed });
  saveWatchlistGroups(groups);
  return id;
}
function renameWatchlistGroup(id, name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return;
  const groups = getWatchlistGroups();
  const g = groups.find((g) => g.id === id);
  if (g) {
    g.name = trimmed;
    saveWatchlistGroups(groups);
  }
}
function deleteWatchlistGroup(id) {
  let groups = getWatchlistGroups();
  if (groups.length <= 1) return; // 최소 1개 그룹은 유지
  groups = groups.filter((g) => g.id !== id);
  saveWatchlistGroups(groups);
  const fallbackId = groups[0].id; // 삭제된 그룹의 종목은 남은 첫 그룹으로 이동
  saveWatchlist(getWatchlist().map((w) => (w.groupId === id ? { ...w, groupId: fallbackId } : w)));
  if (getActiveWatchlistGroup() === id) setActiveWatchlistGroup(WATCHLIST_ALL_GROUP_ID);
}
function getActiveWatchlistGroup() {
  return localStorage.getItem(WATCHLIST_ACTIVE_GROUP_KEY) || WATCHLIST_ALL_GROUP_ID;
}
function setActiveWatchlistGroup(id) {
  localStorage.setItem(WATCHLIST_ACTIVE_GROUP_KEY, id);
}

const WATCHLIST_SORT_OPTIONS = [
  { id: "manual", label: "직접설정순" },
  { id: "name", label: "이름순" },
  { id: "changePct", label: "등락률순" },
  { id: "price", label: "현재가순" },
];
function getWatchlistSort() {
  const id = localStorage.getItem(WATCHLIST_SORT_KEY);
  return WATCHLIST_SORT_OPTIONS.some((o) => o.id === id) ? id : "manual";
}
function setWatchlistSort(id) {
  localStorage.setItem(WATCHLIST_SORT_KEY, id);
}
function sortWatchlistRows(rows) {
  const mode = getWatchlistSort();
  const arr = [...rows];
  if (mode === "name") {
    arr.sort((a, b) => (TICKER_TO_KOREAN_NAME[a.symbol] || a.name).localeCompare(TICKER_TO_KOREAN_NAME[b.symbol] || b.name, "ko"));
  } else if (mode === "changePct") {
    arr.sort((a, b) => (b.changePct ?? -Infinity) - (a.changePct ?? -Infinity));
  } else if (mode === "price") {
    arr.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
  }
  // manual(직접설정순)은 저장된(추가된) 순서를 그대로 유지하므로 별도 정렬 없음
  return arr;
}

function addToWatchlist(symbol, groupId) {
  const sym = symbol.toUpperCase();
  if (isWatchlisted(sym)) return;
  const active = getActiveWatchlistGroup();
  const gid = groupId || (active === WATCHLIST_ALL_GROUP_ID ? WATCHLIST_DEFAULT_GROUP_ID : active);
  saveWatchlist([...getWatchlist(), { symbol: sym, addedAt: Date.now(), groupId: gid }]);
}
function removeFromWatchlist(symbol) {
  const sym = symbol.toUpperCase();
  saveWatchlist(getWatchlist().filter((w) => w.symbol !== sym));
}
function toggleWatchlist(symbol) {
  if (isWatchlisted(symbol)) removeFromWatchlist(symbol);
  else addToWatchlist(symbol);
  updateCompanyPanelWatchlistBtn(symbol);
}
const companyPanelWatchlistBtn = el("companyPanelWatchlistBtn");
function updateCompanyPanelWatchlistBtn(symbol) {
  companyPanelWatchlistBtn.classList.toggle("active", isWatchlisted(symbol));
}
companyPanelWatchlistBtn.addEventListener("click", () => {
  const ticker = new URLSearchParams(location.search).get("ticker") || tickerInput.value;
  if (ticker) toggleWatchlist(ticker);
});

// ---------- 관심종목 상단 그룹 탭 ----------
function wlGroupTabsHtml(groups, activeId) {
  const allTab = `<button type="button" class="wl-group-tab${activeId === WATCHLIST_ALL_GROUP_ID ? " active" : ""}" data-group-id="${WATCHLIST_ALL_GROUP_ID}">전체</button>`;
  const groupTabs = groups
    .map((g) => `<button type="button" class="wl-group-tab${activeId === g.id ? " active" : ""}" data-group-id="${escapeHtml(g.id)}">${escapeHtml(g.name)}</button>`)
    .join("");
  const addTab = `<button type="button" class="wl-group-tab wl-group-tab-add" id="wlGroupAddBtn">+ 새 그룹</button>`;
  return allTab + groupTabs + addTab;
}
el("wlGroupTabs").addEventListener("click", (e) => {
  if (e.target.closest("#wlGroupAddBtn")) {
    openWlGroupModal();
    return;
  }
  const tab = e.target.closest(".wl-group-tab");
  if (!tab) return;
  setActiveWatchlistGroup(tab.dataset.groupId);
  renderWatchlistList();
});
el("wlGroupManageBtn").addEventListener("click", () => openWlGroupModal());

// ---------- 관심종목 그룹 관리 모달(이름 변경·삭제·추가) ----------
function wlGroupModalRowHtml(g) {
  return `
    <div class="wl-group-modal-row" data-group-id="${escapeHtml(g.id)}">
      <input type="text" class="wl-group-name-input" value="${escapeHtml(g.name)}" maxlength="12" />
      <button type="button" class="wl-group-row-btn wl-group-save-btn" title="이름 저장">✓</button>
      <button type="button" class="wl-group-row-btn wl-group-delete-btn" title="삭제">🗑</button>
    </div>`;
}
function renderWlGroupModal() {
  const groups = getWatchlistGroups();
  el("wlGroupModalBody").innerHTML = `
    <div class="wl-group-modal-list">${groups.map(wlGroupModalRowHtml).join("")}</div>
    <div class="wl-group-modal-new">
      <input type="text" id="wlGroupNewInput" class="wl-group-name-input" placeholder="새 그룹 이름" maxlength="12" />
      <button type="button" id="wlGroupNewAddBtn" class="wl-group-row-btn wl-group-save-btn" title="추가">+</button>
    </div>`;
}
function openWlGroupModal() {
  renderWlGroupModal();
  el("wlGroupModal").style.display = "flex";
}
function closeWlGroupModal() {
  el("wlGroupModal").style.display = "none";
}
el("wlGroupModalCloseBtn").addEventListener("click", closeWlGroupModal);
el("wlGroupModalBody").addEventListener("click", (e) => {
  const saveBtn = e.target.closest(".wl-group-save-btn");
  const deleteBtn = e.target.closest(".wl-group-delete-btn");
  const addBtn = e.target.closest("#wlGroupNewAddBtn");
  if (saveBtn) {
    const row = saveBtn.closest(".wl-group-modal-row");
    if (row) {
      renameWatchlistGroup(row.dataset.groupId, row.querySelector(".wl-group-name-input").value);
      renderWlGroupModal();
      renderWatchlistList();
    }
  } else if (deleteBtn) {
    const row = deleteBtn.closest(".wl-group-modal-row");
    if (row) {
      if (getWatchlistGroups().length <= 1) {
        alert("최소 1개의 그룹은 남아 있어야 합니다.");
        return;
      }
      deleteWatchlistGroup(row.dataset.groupId);
      renderWlGroupModal();
      renderWatchlistList();
    }
  } else if (addBtn) {
    const input = el("wlGroupNewInput");
    const id = addWatchlistGroup(input.value);
    if (id) {
      setActiveWatchlistGroup(id);
      renderWlGroupModal();
      renderWatchlistList();
    }
  }
});

// ---------- 관심종목 정렬 드롭다운 ----------
function wlSortMenuHtml() {
  const current = getWatchlistSort();
  return WATCHLIST_SORT_OPTIONS.map(
    (o) => `<button type="button" class="wl-sort-option${o.id === current ? " active" : ""}" data-sort-id="${o.id}">${o.label}</button>`
  ).join("");
}
const wlSortBtn = el("wlSortBtn");
const wlSortMenu = el("wlSortMenu");
wlSortBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (wlSortMenu.style.display !== "none") {
    wlSortMenu.style.display = "none";
    return;
  }
  wlSortMenu.innerHTML = wlSortMenuHtml();
  wlSortMenu.style.display = "block";
});
wlSortMenu.addEventListener("click", (e) => {
  const opt = e.target.closest(".wl-sort-option");
  if (!opt) return;
  setWatchlistSort(opt.dataset.sortId);
  wlSortMenu.style.display = "none";
  renderWatchlistList();
});
document.addEventListener("click", (e) => {
  if (wlSortMenu.style.display !== "none" && !e.target.closest(".wl-sort-wrap")) wlSortMenu.style.display = "none";
});

// ---------- 관심종목 종목추가·공유 버튼 ----------
el("wlAddStockBtn").addEventListener("click", () => openSearchOverlay());

async function shareWatchlist() {
  const groups = getWatchlistGroups();
  const activeGroup = getActiveWatchlistGroup();
  const list = getWatchlist().map((w) => (w.groupId ? w : { ...w, groupId: WATCHLIST_DEFAULT_GROUP_ID }));
  const filtered = activeGroup === WATCHLIST_ALL_GROUP_ID ? list : list.filter((w) => w.groupId === activeGroup);
  if (filtered.length === 0) {
    alert("공유할 관심종목이 없습니다.");
    return;
  }
  const groupName = activeGroup === WATCHLIST_ALL_GROUP_ID ? "전체" : (groups.find((g) => g.id === activeGroup) || {}).name || "관심종목";
  const lines = filtered.map((w) => `· ${TICKER_TO_KOREAN_NAME[w.symbol] || w.symbol} (${w.symbol})`);
  const text = `📌 내 관심종목 - ${groupName}\n${lines.join("\n")}\n\nyeopinvest.com`;
  try {
    if (navigator.share) {
      await navigator.share({ title: `내 관심종목 - ${groupName}`, text });
      return;
    }
    throw new Error("no-web-share");
  } catch (err) {
    if (err && err.name === "AbortError") return; // 사용자가 공유 시트를 취소한 경우
    try {
      await navigator.clipboard.writeText(text);
      alert("관심종목 목록을 클립보드에 복사했습니다. 카카오톡 등에 붙여넣기 해보세요.");
    } catch {
      alert("공유에 실패했습니다.");
    }
  }
}
el("wlShareBtn").addEventListener("click", shareWatchlist);

async function renderWatchlistList() {
  const statusEl = el("watchlistStatus");
  const listEl = el("watchlistList");

  const groups = getWatchlistGroups();
  const rawList = getWatchlist();
  let migrated = false; // 그룹 도입 이전에 저장된 항목엔 groupId가 없어 1회 마이그레이션
  const list = rawList.map((w) => {
    if (w.groupId) return w;
    migrated = true;
    return { ...w, groupId: WATCHLIST_DEFAULT_GROUP_ID };
  });
  if (migrated) saveWatchlist(list);

  const validIds = new Set([WATCHLIST_ALL_GROUP_ID, ...groups.map((g) => g.id)]);
  let activeGroup = getActiveWatchlistGroup();
  if (!validIds.has(activeGroup)) {
    activeGroup = WATCHLIST_ALL_GROUP_ID;
    setActiveWatchlistGroup(activeGroup);
  }
  el("wlGroupTabs").innerHTML = wlGroupTabsHtml(groups, activeGroup);
  el("wlSortBtnLabel").textContent = (WATCHLIST_SORT_OPTIONS.find((o) => o.id === getWatchlistSort()) || WATCHLIST_SORT_OPTIONS[0]).label;

  const filtered = activeGroup === WATCHLIST_ALL_GROUP_ID ? list : list.filter((w) => w.groupId === activeGroup);

  if (filtered.length === 0) {
    statusEl.style.display = "none";
    listEl.innerHTML = `<p class="muted" style="padding:12px 0;">${iconHtml("star")} 관심종목이 없습니다. 종목 상세 화면에서 별 아이콘을 눌러 추가해보세요.</p>`;
    return;
  }
  statusEl.style.display = "block";
  statusEl.textContent = "관심종목을 불러오는 중...";
  try {
    const rows = (
      await mapWithConcurrency(filtered, 5, async (w) => {
        try {
          const chart = await yahooChart(w.symbol, "5d");
          const snap = yahooSnapshot(chart);
          const meta = chart && chart.chart && chart.chart.result && chart.chart.result[0] && chart.chart.result[0].meta;
          const volume = meta && meta.regularMarketVolume !== undefined ? meta.regularMarketVolume : null;
          return snap && { ...snap, symbol: w.symbol, name: w.symbol, time: snap.date, volume, currency: (meta && meta.currency) || "USD" };
        } catch {
          return null;
        }
      })
    ).filter(Boolean);
    statusEl.style.display = "none";
    const sorted = sortWatchlistRows(rows);
    listEl.innerHTML = sorted.length
      ? `<div class="idx-list">${sorted.map((r) => stockCardRowHtml(r)).join("")}</div>`
      : `<p class="muted" style="padding:12px 0;">종목 정보를 불러오지 못했습니다.</p>`;
  } catch (e) {
    statusEl.style.display = "block";
    statusEl.textContent = `❌ ${e.message || "관심종목을 불러오지 못했습니다."}`;
  }
}

// ---------- 기업검색 위저드 (챗봇처럼 단계별로 질문 → 선택 → 다음 질문으로 넘어가는 검색 보드) ----------
let searchWizardStep = "root";
let searchWizardAnswers = {};

function openSearchWizardGate() {
  if (typeof firebase !== "undefined" && firebase.auth().currentUser) {
    openSearchWizard();
  } else {
    openLoginModal();
  }
}
function openSearchWizard() {
  searchWizardStep = "root";
  searchWizardAnswers = {};
  el("searchWizardPanel").style.display = "flex";
  requestAnimationFrame(() => el("searchWizardPanel").classList.add("open"));
  renderSearchWizardStep();
}
function closeSearchWizard() {
  el("searchWizardPanel").classList.remove("open");
  window.setTimeout(() => { el("searchWizardPanel").style.display = "none"; }, 280);
}
el("searchWizardCloseBtn").addEventListener("click", closeSearchWizard);

function wizardUserName() {
  const user = typeof firebase !== "undefined" && firebase.auth().currentUser;
  if (!user) return "회원";
  return user.displayName || (user.email ? user.email.split("@")[0] : "회원");
}

function renderSearchWizardStep() {
  const renderers = {
    root: renderWizardRoot,
    branchA: renderWizardBranchA,
    branchB1: renderWizardBranchB1,
    branchB2: renderWizardBranchB2,
    branchB3: renderWizardBranchB3,
    branchBResult: renderWizardBranchBResult,
    branchC: renderWizardBranchC,
    branchCStyle: renderWizardBranchCStyle,
    branchCResult: renderWizardBranchCResult,
  };
  el("searchWizardBody").innerHTML = renderers[searchWizardStep]();
}

// 패널 오픈 시가 아니라 스크립트 로딩 시 1회만 위임 리스너를 붙여서, innerHTML 교체마다 재바인딩할 필요가 없게 함
el("searchWizardBody").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-wizard-action]");
  if (!btn) return;
  const action = btn.dataset.wizardAction;
  if (action === "back") {
    searchWizardStep = btn.dataset.wizardBackStep;
    renderSearchWizardStep();
  } else if (action === "root-a") {
    searchWizardStep = "branchA";
    renderSearchWizardStep();
  } else if (action === "root-b") {
    searchWizardStep = "branchB1";
    searchWizardAnswers = { sectors: [] };
    renderSearchWizardStep();
  } else if (action === "root-c") {
    searchWizardStep = "branchC";
    renderSearchWizardStep();
  } else if (action === "rank-nav") {
    const entry = RANKING_ENTRIES[Number(btn.dataset.rankIdx)];
    closeSearchWizard();
    switchTab(TAB_ORDER.indexOf(entry.tab));
    entry.run();
  } else if (action === "sector-toggle") {
    const sector = btn.dataset.sector;
    const set = new Set(searchWizardAnswers.sectors);
    if (set.has(sector)) set.delete(sector);
    else set.add(sector);
    searchWizardAnswers.sectors = [...set];
    btn.classList.toggle("checked", set.has(sector));
  } else if (action === "sector-next") {
    if (!searchWizardAnswers.sectors || searchWizardAnswers.sectors.length === 0) {
      alert("섹터를 1개 이상 선택해주세요.");
      return;
    }
    searchWizardStep = "branchB2";
    renderSearchWizardStep();
  } else if (action === "criteria2-pick") {
    searchWizardAnswers.criterion2 = btn.dataset.criteria;
    searchWizardStep = "branchB3";
    renderSearchWizardStep();
  } else if (action === "criteria3-pick") {
    searchWizardAnswers.criterion3 = btn.dataset.criteria;
    searchWizardStep = "branchBResult";
    renderSearchWizardStep();
    runBranchBPipeline();
  } else if (action === "branchC-confirm") {
    searchWizardStep = "branchCResult";
    renderSearchWizardStep();
    runBranchCConfirm();
  } else if (action === "branchC-other") {
    searchWizardStep = "branchCStyle";
    renderSearchWizardStep();
  } else if (action === "branchC-style-short") {
    closeSearchWizard();
    switchTab(TAB_ORDER.indexOf("trend"));
    runTrendPressure();
  } else if (action === "branchC-style-long") {
    closeSearchWizard();
    switchTab(TAB_ORDER.indexOf("valuation"));
    runValueStability();
  } else if (action === "share") {
    shareWizardResult(wizardShareTitle, wizardShareText);
  } else if (action === "share-self") {
    copyWizardResultToSelf(wizardShareText);
  }
});

function renderWizardRoot() {
  const name = wizardUserName();
  return `
    <p class="wizard-question">${escapeHtml(name)}님, 투자할 기업을 찾고 계신가요?</p>
    <div class="wizard-root-options">
      <button type="button" class="wizard-root-option" data-wizard-action="root-a"><b>A. [랭킹찾기]</b> 각 부문별 랭킹으로 볼래요.</button>
      <button type="button" class="wizard-root-option" data-wizard-action="root-b"><b>B. [선택찾기]</b> 내가 좋아하는 분야가 있어요.</button>
      <button type="button" class="wizard-root-option" data-wizard-action="root-c"><b>C. [자동찾기]</b> 잘모르겠어요. 알아서 찾아주세요.</button>
    </div>
  `;
}

// [랭킹찾기]는 새 데이터 로직 없이 기존 기업가치·투자동향 탭의 14개 랭킹 화면으로 그대로 이동만 시킴
const RANKING_ENTRIES = [
  { icon: "trending-up", label: "매출액 증가", tab: "valuation", run: () => runValueRevenue() },
  { icon: "wallet", label: "현금흐름 증가", tab: "valuation", run: () => runValueCashFlow() },
  { icon: "dollar", label: "순이익 증가", tab: "valuation", run: () => runValueNetIncome() },
  { icon: "calculator", label: "EPS", tab: "valuation", run: () => runValueEps() },
  { icon: "scale", label: "PER", tab: "valuation", run: () => runValuePer() },
  { icon: "medal", label: "투자등급", tab: "valuation", run: () => runValueStability() },
  { icon: "building", label: "시가총액", tab: "valuation", run: () => runValueMarketCap() },
  { icon: "thumbsup", label: "인기종목", tab: "trend", run: () => runTrendVolume() },
  { icon: "trending-up", label: "상승률", tab: "trend", run: () => runMovers("surge") },
  { icon: "trending-down", label: "하락률", tab: "trend", run: () => runMovers("plunge") },
  { icon: "rocket", label: "상승압력", tab: "trend", run: () => runTrendPressure() },
  { icon: "basket", label: "US ETF", tab: "trend", run: () => runTrendUsEtf() },
  { icon: "basket", label: "KR ETF", tab: "trend", run: () => runTrendKrEtf() },
];
function renderWizardBranchA() {
  const items = RANKING_ENTRIES.map(
    (entry, i) =>
      `<button type="button" class="wizard-option-btn" data-wizard-action="rank-nav" data-rank-idx="${i}">${iconHtml(entry.icon)} ${entry.label}</button>`
  ).join("");
  return `
    <p class="wizard-question">[랭킹찾기]에서 찾으실 항목을 선택해주세요.</p>
    <div class="wizard-option-grid">${items}</div>
    <button type="button" class="wizard-back-btn" data-wizard-action="back" data-wizard-back-step="root">← 뒤로</button>
  `;
}

// [선택찾기]의 2·3순위 "기준" — S&P500 + 섹터 필터와 자연스럽게 어울리는 10개만 제공.
// (US Stock 거래량·US ETF·KR ETF·인기종목은 S&P500이 아닌 전체 시장/거래량 스크리너를 쓰거나 ETF라 섹터 개념이 없어 제외)
const WIZARD_CRITERIA = [
  { key: "revenue", icon: "trending-up", label: "매출액 증가", dir: "desc", get: (m) => m.revenueGrowthAnnual, fmt: (m) => fmtGrowthCell(m.revenueGrowthAnnual) },
  { key: "cashFlow", icon: "wallet", label: "현금흐름 증가", dir: "desc", get: (m) => m.operatingCashFlowGrowthAnnual, fmt: (m) => fmtGrowthCell(m.operatingCashFlowGrowthAnnual) },
  { key: "netIncome", icon: "dollar", label: "순이익 증가", dir: "desc", get: (m) => m.netIncomeGrowthAnnual, fmt: (m) => fmtGrowthCell(m.netIncomeGrowthAnnual) },
  { key: "eps", icon: "calculator", label: "EPS", dir: "desc", get: (m) => m.eps, fmt: (m) => (m.eps === null || m.eps === undefined ? "N/A" : `$${m.eps.toFixed(2)}`) },
  { key: "per", icon: "scale", label: "PER", dir: "asc", get: (m) => m.per, fmt: (m) => (m.per === null || m.per === undefined ? "N/A" : `${m.per.toFixed(1)}배`) },
  { key: "stability", icon: "medal", label: "투자등급", dir: "desc", get: (m) => m.riskTotal, fmt: (m) => (m.riskTotal === null || m.riskTotal === undefined ? "N/A" : `${m.riskTotal}/10`) },
  { key: "marketCap", icon: "building", label: "시가총액", dir: "desc", get: (m) => m.marketCap, fmt: (m) => (m.marketCap ? fmtCompactCurrency(m.marketCap) : "N/A") },
  { key: "pressure", icon: "rocket", label: "상승압력도", dir: "desc", get: (m) => m.pressureTotal, fmt: (m) => (m.pressureTotal === null || m.pressureTotal === undefined ? "N/A" : `${m.pressureTotal}/10`) },
  { key: "surge", icon: "trending-up", label: "상승률(등락률)", dir: "desc", get: (m) => m.changePct, fmt: (m) => (m.changePct === null || m.changePct === undefined ? "N/A" : `${m.changePct >= 0 ? "+" : ""}${m.changePct.toFixed(2)}%`), needsDaily: true },
  { key: "plunge", icon: "trending-down", label: "하락률(등락률)", dir: "asc", get: (m) => m.changePct, fmt: (m) => (m.changePct === null || m.changePct === undefined ? "N/A" : `${m.changePct >= 0 ? "+" : ""}${m.changePct.toFixed(2)}%`), needsDaily: true },
];

function renderWizardBranchB1() {
  const items = Object.entries(SECTOR_KO)
    .map(([en, ko]) => {
      const checked = (searchWizardAnswers.sectors || []).includes(en);
      return `<button type="button" class="wizard-sector-item${checked ? " checked" : ""}" data-wizard-action="sector-toggle" data-sector="${escapeHtml(en)}">${ko}</button>`;
    })
    .join("");
  return `
    <p class="wizard-question">1순위 · 분야(섹터)를 선택해주세요. (여러 개 선택 가능)</p>
    <div class="wizard-sector-checklist">${items}</div>
    <button type="button" class="wizard-confirm-btn" data-wizard-action="sector-next">다음</button>
    <button type="button" class="wizard-back-btn" data-wizard-action="back" data-wizard-back-step="root">← 뒤로</button>
  `;
}
function renderWizardBranchB2() {
  const items = WIZARD_CRITERIA.map(
    (c) => `<button type="button" class="wizard-criteria-item" data-wizard-action="criteria2-pick" data-criteria="${c.key}">${iconHtml(c.icon)} ${c.label}</button>`
  ).join("");
  return `
    <p class="wizard-question">2순위 · 기준을 선택해주세요. (TOP30까지 선정)</p>
    <div class="wizard-criteria-list">${items}</div>
    <button type="button" class="wizard-back-btn" data-wizard-action="back" data-wizard-back-step="branchB1">← 뒤로</button>
  `;
}
function renderWizardBranchB3() {
  const items = WIZARD_CRITERIA.filter((c) => c.key !== searchWizardAnswers.criterion2)
    .map((c) => `<button type="button" class="wizard-criteria-item" data-wizard-action="criteria3-pick" data-criteria="${c.key}">${iconHtml(c.icon)} ${c.label}</button>`)
    .join("");
  return `
    <p class="wizard-question">3순위 · 기준을 선택해주세요. (TOP15까지 선정)</p>
    <div class="wizard-criteria-list">${items}</div>
    <button type="button" class="wizard-back-btn" data-wizard-action="back" data-wizard-back-step="branchB2">← 뒤로</button>
  `;
}
function renderWizardBranchBResult() {
  return `
    <p class="wizard-question">선택하신 조건으로 종목을 찾고 있습니다...</p>
    <div id="wizardBranchBResultBody"><p class="muted">불러오는 중...</p></div>
    <button type="button" class="wizard-back-btn" data-wizard-action="back" data-wizard-back-step="root">← 처음으로</button>
  `;
}

let sectorTickerMapPromise = null;
function getSectorTickerMap() {
  if (!sectorTickerMapPromise) {
    sectorTickerMapPromise = (async () => {
      const [sp500Tickers, entries] = await Promise.all([
        getSP500Tickers(),
        Promise.all(
          Object.entries(SECTOR_SCREENER_ID).map(async ([sector, scrId]) => {
            const data = await yahooScreener(scrId, 250).catch(() => null);
            const quotes = (data && data.finance && data.finance.result && data.finance.result[0] && data.finance.result[0].quotes) || [];
            return [sector, quotes.map((q) => q && q.symbol).filter(Boolean)];
          })
        ),
      ]);
      const sp500Set = new Set(sp500Tickers);
      const map = new Map();
      for (const [sector, symbols] of entries) {
        map.set(sector, new Set(symbols.filter((s) => sp500Set.has(s))));
      }
      return map;
    })().catch((e) => {
      sectorTickerMapPromise = null;
      throw e;
    });
  }
  return sectorTickerMapPromise;
}
// 선택한 섹터(들)의 합집합을 시가총액 근사 정렬(getSP500PriorityOrder)로 필터링해 앞 50개 = TOP50 후보
// (일부 S&P500 종목은 11개 섹터 스크리너 어디에도 안 걸려 누락될 수 있음 — 저비용 근사치로 감수한 한계)
async function getBranchBCandidatePool(sectors) {
  const [map, priorityOrder] = await Promise.all([getSectorTickerMap(), getSP500PriorityOrder()]);
  const union = new Set();
  for (const sector of sectors) {
    const set = map.get(sector);
    if (set) for (const sym of set) union.add(sym);
  }
  return priorityOrder.filter((sym) => union.has(sym)).slice(0, 50);
}
async function runBranchBPipeline() {
  const bodyEl = el("wizardBranchBResultBody");
  try {
    const pool = await getBranchBCandidatePool(searchWizardAnswers.sectors);
    if (pool.length === 0) {
      bodyEl.innerHTML = `<p class="muted">선택하신 섹터에서 종목을 찾지 못했습니다.</p>`;
      return;
    }
    const { sp500Return } = await getMarketReturnsCached();
    let candidates = (await mapWithConcurrency(pool, 5, getFullMetrics)).filter(Boolean);
    candidates = candidates.map((m) => ({
      ...m,
      riskTotal: computeRiskScore(m, sp500Return).total,
      pressureTotal: computeAttractivenessScore(m).total,
    }));
    const c2 = WIZARD_CRITERIA.find((c) => c.key === searchWizardAnswers.criterion2);
    const c3 = WIZARD_CRITERIA.find((c) => c.key === searchWizardAnswers.criterion3);
    if (c2.needsDaily || c3.needsDaily) {
      const daily = await getSP500DailyChanges();
      const dailyMap = new Map(daily.map((d) => [d.symbol, d.changePct]));
      candidates = candidates.map((m) => ({ ...m, changePct: dailyMap.has(m.symbol) ? dailyMap.get(m.symbol) : null }));
    }
    const sortByCriterion = (list, c) =>
      [...list].sort((a, b) => {
        const av = c.get(a);
        const bv = c.get(b);
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        return c.dir === "asc" ? av - bv : bv - av;
      });
    const top30 = sortByCriterion(candidates, c2).slice(0, 30);
    const top15 = sortByCriterion(top30, c3).slice(0, 15);
    const table = wizardResultTableHtml(top15, `${c2.label} / ${c3.label}`, (r) => `${c2.fmt(r)} / ${c3.fmt(r)}`);
    const plain = (html) => html.replace(/<[^>]+>/g, "");
    wizardShareTitle = "기업검색 결과 (선택찾기)";
    wizardShareText =
      `[선택찾기] ${searchWizardAnswers.sectors.map((s) => SECTOR_KO[s] || s).join(", ")} 섹터 · ${c2.label} → ${c3.label} TOP15\n` +
      top15.map((r, i) => `${i + 1}. ${r.symbol} (${plain(c2.fmt(r))} / ${plain(c3.fmt(r))})`).join("\n") +
      `\n\nyeopinvest.com`;
    bodyEl.innerHTML = `
      ${table}
      <div class="wizard-share-row">
        <button type="button" class="cat-btn" data-wizard-action="share">공유하기</button>
        <button type="button" class="cat-btn" data-wizard-action="share-self">나에게 공유하기</button>
      </div>
    `;
  } catch (e) {
    bodyEl.innerHTML = `<p class="muted">❌ ${e.message || "결과를 불러오지 못했습니다."}</p>`;
  }
}

function renderWizardBranchC() {
  return `
    <p class="wizard-question">S&amp;P500 전체에서 상승압력도 + 투자안정성 합계 순서로 30위까지 찾아 보겠습니다.</p>
    <div class="wizard-root-options">
      <button type="button" class="wizard-root-option" data-wizard-action="branchC-confirm"><b>A. [확인]</b></button>
      <button type="button" class="wizard-root-option" data-wizard-action="branchC-other"><b>B. [다른방법]</b></button>
    </div>
    <button type="button" class="wizard-back-btn" data-wizard-action="back" data-wizard-back-step="root">← 뒤로</button>
  `;
}
function renderWizardBranchCStyle() {
  return `
    <p class="wizard-question">자신의 투자스타일 중 한 가지를 선택해주세요.</p>
    <div class="wizard-root-options">
      <button type="button" class="wizard-root-option" data-wizard-action="branchC-style-short">
        <b>A. 단기적인 수익을 원함(▲600%~▼60%)</b><br><span class="wizard-option-sub">(거래대금, 매출성장, 최근3개월 상승률) — S&amp;P 500중 상승압력도 높은순위 30위까지</span>
      </button>
      <button type="button" class="wizard-root-option" data-wizard-action="branchC-style-long">
        <b>B. 장기적으로 안정적인 상승을 원함(▲60%~▼30%)</b><br><span class="wizard-option-sub">(투자등급, 안정적상승, 순이익률, 시가총액 높은 주식) — S&amp;P 500중 투자안정성 높은순위 30위까지</span>
      </button>
    </div>
    <button type="button" class="wizard-back-btn" data-wizard-action="back" data-wizard-back-step="branchC">← 뒤로</button>
  `;
}
function renderWizardBranchCResult() {
  return `
    <p class="wizard-question">S&amp;P500 전체 스캔 결과입니다.</p>
    <div id="wizardBranchCResultBody"><p class="muted">불러오는 중...</p></div>
    <button type="button" class="wizard-back-btn" data-wizard-action="back" data-wizard-back-step="root">← 처음으로</button>
  `;
}
async function runBranchCConfirm() {
  const bodyEl = el("wizardBranchCResultBody");
  bodyEl.innerHTML = `<p class="muted" id="wizardBranchCProgress">S&amp;P500 전체 종목을 확인하는 중... (최대 1분 정도 소요될 수 있어요)</p>`;
  try {
    const [tickers, { sp500Return }] = await Promise.all([getSP500Tickers(), getMarketReturnsCached()]);
    const progressEl = el("wizardBranchCProgress");
    const metricsList = await mapWithConcurrency(tickers, 5, getFullMetrics, (completed) => {
      if (progressEl) progressEl.textContent = `${completed}/${tickers.length} 종목 확인 중...`;
    });
    const scored = metricsList.filter(Boolean).map((m) => ({
      ...m,
      combinedTotal: Math.round((computeAttractivenessScore(m).total + computeRiskScore(m, sp500Return).total) * 10) / 10,
    }));
    scored.sort((a, b) => b.combinedTotal - a.combinedTotal);
    const top30 = scored.slice(0, 30);
    const table = wizardResultTableHtml(top30, "상승압력+투자안정 합계", (r) => `<b>${r.combinedTotal}/20</b>`);
    wizardShareTitle = "기업검색 결과 (자동찾기)";
    wizardShareText =
      `[자동찾기] S&P500 상승압력도+투자안정성 합계 TOP30\n` +
      top30.map((r, i) => `${i + 1}. ${r.symbol} (${r.combinedTotal}/20)`).join("\n") +
      `\n\nyeopinvest.com`;
    bodyEl.innerHTML = `
      ${table}
      <div class="wizard-share-row">
        <button type="button" class="cat-btn" data-wizard-action="share">공유하기</button>
        <button type="button" class="cat-btn" data-wizard-action="share-self">나에게 공유하기</button>
      </div>
    `;
  } catch (e) {
    bodyEl.innerHTML = `<p class="muted">❌ ${e.message || "결과를 불러오지 못했습니다."}</p>`;
  }
}

// Branch B/C 결과 화면 공용 표 렌더러 — 기존 top30-table 스타일 재사용(ticker-link/price-chart-link 위임 클릭 그대로 동작)
function wizardResultTableHtml(rows, metricLabel, metricCellFn) {
  const body = rows
    .map(
      (r, i) => `
    <tr>
      <td>${i + 1}${surgeWarningEmoji(r.fiveDayExtremes)}</td>
      <td><b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(r.symbol)}</b></td>
      <td>${r.price !== undefined && r.price !== null ? priceChartLink(r.symbol, "$" + r.price.toFixed(2)) : "N/A"}</td>
      <td>${metricCellFn(r)}</td>
    </tr>`
    )
    .join("");
  return `
    <table class="top30-table">
      <thead><tr><th>순위</th><th>티커</th><th>현재가</th><th>${metricLabel}</th></tr></thead>
      <tbody>${body}</tbody>
    </table>`;
}

// ---------- 위저드 결과 공유 (텍스트 기반 — 기존 shareOrDownloadGround는 이미지 전용이라 재사용 불가) ----------
let wizardShareTitle = "";
let wizardShareText = "";
async function shareWizardResult(title, text) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url: location.origin });
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
  }
  await copyWizardResultFallback(text);
}
async function copyWizardResultFallback(text) {
  try {
    await navigator.clipboard.writeText(text);
    alert("링크가 복사되었습니다.");
  } catch {
    alert("공유에 실패했습니다.");
  }
}
async function copyWizardResultToSelf(text) {
  try {
    await navigator.clipboard.writeText(text);
    alert("결과가 복사되었습니다. 메모 등에 붙여넣어 보관하세요.");
  } catch {
    alert("복사에 실패했습니다. 다시 시도해주세요.");
  }
}

// ---------- 티커 검색/클릭 → 기업 패널을 열고 그 종목을 로딩 ----------
// push=false는 popstate(뒤로/앞으로가기)나 최초 URL 진입 처리 시, 이미 있는 히스토리 상태를 다시 쌓지 않기 위함
function navigateToTicker(ticker, { push = true } = {}) {
  ticker = ticker.toUpperCase();
  if (push) {
    history.pushState({ ticker }, "", "?ticker=" + encodeURIComponent(ticker));
  }
  tickerInput.value = ticker;
  document.title = `${ticker} 분석 - 미국 기업 분석기 (yeopinvest.com)`;
  addRecentSearch(ticker);
  logSearchEvent(ticker);
  if (searchOverlay.style.display !== "none") closeSearchOverlay();
  openCompanyPanel();
  updateCompanyPanelWatchlistBtn(ticker);
  runAnalysis(ticker);
}

// 좌측 상단 로고를 누르면 기업 패널을 닫고 메인 탭바(US Markets 등)로 돌아감
siteLogo.addEventListener("click", () => closeCompanyPanel());
siteLogo.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    siteLogo.click();
  }
});

window.addEventListener("popstate", () => {
  const ticker = new URLSearchParams(location.search).get("ticker");
  if (ticker) navigateToTicker(ticker, { push: false });
  else closeCompanyPanel({ push: false });
});

// 종목 심볼 클릭 시 기업 패널을 열며 해당 종목 분석으로 이동(TOP10·인기종목 표에 이벤트 위임으로 공통 적용)
document.addEventListener("click", (e) => {
  const link = e.target.closest(".ticker-link");
  if (link && link.dataset.ticker) {
    navigateToTicker(link.dataset.ticker);
  }
});

// ---------- 초기 부팅: 기본 화면은 관심종목 — ?ticker=가 있을 때만 기업 패널을 함께 염 ----------
(function initApp() {
  switchTab(TAB_ORDER.indexOf("watchlist"));

  const initialTicker = new URLSearchParams(location.search).get("ticker");
  if (initialTicker) navigateToTicker(initialTicker, { push: false });
  loadingSplash.style.display = "none";

  // 무료 프록시 과부하를 피하려고 순서대로 백그라운드 로딩(사용자가 먼저 스와이프해서 들어가면 ensureTabLoaded가 그 자리에서 바로 시작함)
  (async () => {
    await ensureTabLoaded("trend"); // 급등주 미리 로딩(진입 시 바로 표시)
    await ensureTabLoaded("valuation");
    await ensureTabLoaded("insight");
  })();
})();

// 한국어 회사명으로도 검색할 수 있도록 자주 찾는 미국 기업 위주로 별도 매핑(야후 검색 API는 한국어 매칭을 지원하지 않음)
const KOREAN_COMPANY_NAMES = {
  애플: "AAPL",
  마이크로소프트: "MSFT",
  마소: "MSFT",
  구글: "GOOGL",
  알파벳: "GOOGL",
  아마존: "AMZN",
  엔비디아: "NVDA",
  테슬라: "TSLA",
  메타: "META",
  페이스북: "META",
  넷플릭스: "NFLX",
  에이엠디: "AMD",
  인텔: "INTC",
  마이크론: "MU",
  브로드컴: "AVGO",
  오라클: "ORCL",
  세일즈포스: "CRM",
  어도비: "ADBE",
  퀄컴: "QCOM",
  텍사스인스트루먼트: "TXN",
  아이비엠: "IBM",
  시스코: "CSCO",
  페이팔: "PYPL",
  우버: "UBER",
  에어비앤비: "ABNB",
  쇼피파이: "SHOP",
  팔란티어: "PLTR",
  코인베이스: "COIN",
  스노우플레이크: "SNOW",
  팔로알토네트웍스: "PANW",
  크라우드스트라이크: "CRWD",
  서비스나우: "NOW",
  스포티파이: "SPOT",
  디즈니: "DIS",
  나이키: "NKE",
  스타벅스: "SBUX",
  맥도날드: "MCD",
  코카콜라: "KO",
  펩시: "PEP",
  월마트: "WMT",
  코스트코: "COST",
  홈디포: "HD",
  타겟: "TGT",
  제이피모건: "JPM",
  제이피모간: "JPM",
  뱅크오브아메리카: "BAC",
  골드만삭스: "GS",
  비자: "V",
  마스터카드: "MA",
  존슨앤존슨: "JNJ",
  화이자: "PFE",
  모더나: "MRNA",
  일라이릴리: "LLY",
  유나이티드헬스: "UNH",
  엑슨모빌: "XOM",
  쉐브론: "CVX",
  보잉: "BA",
  포드: "F",
  제너럴모터스: "GM",
  에이티앤티: "T",
  버라이즌: "VZ",
  티에스엠씨: "TSM",
  알리바바: "BABA",
  니오: "NIO",
  리비안: "RIVN",
  루시드: "LCID",
  핀둬둬: "PDD",
  슈퍼마이크로: "SMCI",
  소파이: "SOFI",
  누홀딩스: "NU",
  로블록스: "RBLX",
  스냅: "SNAP",
  룰루레몬: "LULU",
  델: "DELL",
  마라톤디지털: "MARA",
  마벨: "MRVL",
  어플라이드머티리얼즈: "AMAT",
  웨스턴디지털: "WDC",
  아이온큐: "IONQ",
  인튜이티브서지컬: "ISRG",
  버크셔: "BRK-B",
  버크셔해서웨이: "BRK-B",

  // 추가 확장분(자주 찾는 미국 기업·별칭 위주)
  애브비: "ABBV",
  써모피셔: "TMO",
  액센츄어: "ACN",
  컴캐스트: "CMCSA",
  캐터필러: "CAT",
  허니웰: "HON",
  아메리칸익스프레스: "AXP",
  아멕스: "AXP",
  웰스파고: "WFC",
  씨티그룹: "C",
  씨티: "C",
  모건스탠리: "MS",
  블랙록: "BLK",
  프록터앤갬블: "PG",
  피앤지: "PG",
  필립모리스: "PM",
  알트리아: "MO",
  로우스: "LOW",
  티제이맥스: "TJX",
  부킹홀딩스: "BKNG",
  부킹: "BKNG",
  메리어트: "MAR",
  매리어트: "MAR",
  도어대시: "DASH",
  블록: "XYZ",
  스퀘어: "XYZ",
  로빈후드: "HOOD",
  드래프트킹스: "DKNG",
  카바나: "CVNA",
  카르바나: "CVNA",
  데이터독: "DDOG",
  클라우드플레어: "NET",
  몽고디비: "MDB",
  지스케일러: "ZS",
  옥타: "OKTA",
  유니티: "U",
  메르카도리브레: "MELI",
  징둥: "JD",
  바이두: "BIDU",
  리오토: "LI",
  리샹: "LI",
  샤오펑: "XPEV",
  치폴레: "CMG",
  제너럴일렉트릭: "GE",
  지이: "GE",
  레이시온: "RTX",
  록히드마틴: "LMT",
  노스럽그루먼: "NOC",
  존디어: "DE",
  디어: "DE",
  쓰리엠: "MMM",
  유피에스: "UPS",
  페덱스: "FDX",
  델타항공: "DAL",
  아메리칸항공: "AAL",
  유나이티드항공: "UAL",
  사우스웨스트: "LUV",
  카니발: "CCL",
  로열캐리비안: "RCL",
  힐튼: "HLT",
  코노코필립스: "COP",
  옥시덴탈: "OXY",
  슐럼버거: "SLB",
  넥스트에라: "NEE",
  듀크에너지: "DUK",
  서던컴퍼니: "SO",
  다우: "DOW",
  뉴몬트: "NEM",
  프리포트맥모란: "FCX",
  뉴코: "NUE",
  아리스타: "ANET",
  포티넷: "FTNT",
  인튜이트: "INTU",
  워크데이: "WDAY",
  아틀라시안: "TEAM",
  온세미: "ON",
  램리서치: "LRCX",
  케이엘에이: "KLAC",
  에이에스엠엘: "ASML",
  애널로그디바이스: "ADI",
  애보트: "ABT",
  다나허: "DHR",
  메드트로닉: "MDT",
  브리스톨마이어스: "BMY",
  암젠: "AMGN",
  길리어드: "GILD",
  리제네론: "REGN",
  버텍스: "VRTX",
  스트라이커: "SYK",
  보스턴사이언티픽: "BSX",
  처브: "CB",
  프로그레시브: "PGR",
  콜게이트: "CL",
  킴벌리클라크: "KMB",
  허쉬: "HSY",
  몬스터: "MNST",
  제너럴밀스: "GIS",
  크래프트하인즈: "KHC",
  몬델리즈: "MDLZ",
  이베이: "EBAY",
  핀터레스트: "PINS",
  트레이드데스크: "TTD",
  어펌: "AFRM",
  엔페이즈: "ENPH",
  퍼스트솔라: "FSLR",
  플러그파워: "PLUG",
  씨브이에스: "CVS",

  // 한국인 인기(서학개미) 개별주 한글명 추가분
  서클: "CRCL",
  스트래티지: "MSTR",
  마이크로스트래티지: "MSTR",
  쿠팡: "CPNG",
  암홀딩스: "ARM",
  로켓랩: "RKLB",
  셀시우스: "CELH",
  게임스탑: "GME",
  레딧: "RDDT",
  대만반도체: "TSM",
  타이완반도체: "TSM",
  하이닉스: "SKHY",
  에스케이하이닉스: "SKHY",
  에스케이하이닉스adr: "SKHY",
};

// 티커 → 한글명 역매핑(KOREAN_COMPANY_NAMES 재사용) — 같은 티커에 별칭이 여러 개면 먼저 나오는 것을 사용
const TICKER_TO_KOREAN_NAME = {};
for (const [ko, tk] of Object.entries(KOREAN_COMPANY_NAMES)) {
  if (!TICKER_TO_KOREAN_NAME[tk]) TICKER_TO_KOREAN_NAME[tk] = ko;
}

let mainTickerSuggestTimer = null;
function hideMainTickerSuggest() {
  tickerSuggest.style.display = "none";
  tickerSuggest.innerHTML = "";
}
// 야후 검색 결과의 거래소 코드/표기를 사람이 읽기 쉬운 상장 위치로 정규화(NYSE / NASDAQ / NYSE American 등)
function normalizeExchange(q) {
  const raw = ((q && (q.exchDisp || q.exchange)) || "").toString();
  const s = raw.toUpperCase();
  if (s.includes("NASDAQ") || s === "NMS" || s === "NGM" || s === "NCM") return "NASDAQ";
  if (s.includes("AMERICAN") || s === "ASE" || s === "AMEX") return "NYSE American";
  if (s.includes("ARCA") || s === "PCX") return "NYSE Arca";
  if (s.includes("NYSE") || s === "NYQ") return "NYSE";
  return raw; // 그 외는 야후 표기 그대로 노출
}
function renderMainTickerSuggest(items) {
  if (items.length === 0) {
    hideMainTickerSuggest();
    return;
  }
  tickerSuggest.innerHTML = items
    .map(
      (it) =>
        `<div class="chat-ticker-option" data-symbol="${escapeHtml(it.symbol)}">
          <b>${escapeHtml(it.symbol)}</b> <span class="muted">${escapeHtml(it.name || "")}</span>${it.exchange ? ` <span class="muted">(${escapeHtml(it.exchange)})</span>` : ""}
        </div>`
    )
    .join("");
  tickerSuggest.style.display = "block";
}
async function handleMainTickerInput() {
  const q = tickerInput.value.trim();
  if (mainTickerSuggestTimer) clearTimeout(mainTickerSuggestTimer);
  if (q.length < 1) {
    hideMainTickerSuggest();
    return;
  }

  // 한국어 회사명 매칭은 목록이 작아 네트워크 응답을 기다리지 않고 바로 화면에 표시(거래소는 영문 결과에서 보강)
  const koreanMatches = Object.entries(KOREAN_COMPANY_NAMES)
    .filter(([name]) => name.includes(q))
    .map(([name, symbol]) => ({ symbol, name, exchange: null }));
  renderMainTickerSuggest(koreanMatches.slice(0, 8));

  mainTickerSuggestTimer = setTimeout(async () => {
    let englishMatches = [];
    try {
      const data = await yahooSearch(q);
      englishMatches = ((data && data.quotes) || [])
        .filter((qt) => qt.symbol)
        .map((qt) => ({ symbol: qt.symbol, name: qt.shortname || qt.longname || "", exchange: normalizeExchange(qt) }));
    } catch {
      // 검색 실패 시 한국어 매칭 결과만이라도 유지
    }
    if (tickerInput.value.trim() !== q) return; // 응답이 오는 사이 검색어가 바뀌었으면 무시(경쟁 상태 방지)
    // 한글 매칭에 상장 거래소가 없으면 같은 심볼의 영문 결과에서 보강
    const exBySymbol = new Map(englishMatches.map((e) => [e.symbol, e.exchange]));
    koreanMatches.forEach((k) => {
      if (!k.exchange && exBySymbol.has(k.symbol)) k.exchange = exBySymbol.get(k.symbol);
    });
    const seen = new Set();
    const merged = [...koreanMatches, ...englishMatches].filter((it) => {
      if (seen.has(it.symbol)) return false;
      seen.add(it.symbol);
      return true;
    });
    renderMainTickerSuggest(merged.slice(0, 8));
  }, 250);
}

tickerSuggest.addEventListener("click", (e) => {
  const option = e.target.closest(".chat-ticker-option");
  if (!option) return;
  tickerInput.value = option.dataset.symbol;
  hideMainTickerSuggest();
  triggerSearch();
});
tickerInput.addEventListener("input", handleMainTickerInput);
document.addEventListener("click", (e) => {
  if (!tickerInput.contains(e.target) && !tickerSuggest.contains(e.target)) {
    hideMainTickerSuggest();
  }
});

// ---------- 메인 분석 흐름 ----------
// 입력값을 티커로 해석 — 한글 회사명(예: "애플" → AAPL), "애플(AAPL)"처럼 괄호 안 티커 표기, 영문 티커를 모두 지원
function resolveKoreanTicker(input) {
  const raw = (input || "").trim();
  const paren = raw.match(/\(([A-Za-z][A-Za-z.\-]{0,6})\)/); // "이름(TICKER)" 형태면 괄호 안 티커 우선
  if (paren) return paren[1].toUpperCase();
  const key = raw.replace(/\s+/g, ""); // 공백 제거 후 한글명 매핑 조회("존슨 앤 존슨" 등 대응)
  if (KOREAN_COMPANY_NAMES[key]) return KOREAN_COMPANY_NAMES[key];
  return raw.toUpperCase();
}

function triggerSearch() {
  if (!tickerInput.value.trim()) {
    setStatus("error", "❌ 분석할 기업의 티커나 한글 회사명을 입력해주세요. (예: AAPL, 애플)");
    return;
  }
  const ticker = resolveKoreanTicker(tickerInput.value);
  hideMainTickerSuggest();
  navigateToTicker(ticker);
}
analyzeBtn.addEventListener("click", triggerSearch);
tickerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") triggerSearch();
});
let currentGroundData = null; // 투자 그라운드(52주 신고가~신저가 5등분)에 쓸 현재 종목의 데이터

async function runAnalysis(ticker) {
  analyzeBtn.disabled = true;
  results.style.display = "none";
  setStatus("loading", `${ticker} 데이터를 불러오는 중입니다...`);

  try {
    const searchData = await yahooSearch(ticker);
    const quote = searchData && searchData.quotes && searchData.quotes[0];

    if (!quote) {
      throw new Error(`'${ticker}' 티커를 찾을 수 없습니다. 정확한 미국 상장 티커인지 확인해주세요.`);
    }

    const chartData = await yahooChart(ticker);
    if (!chartData || !chartData.chart || !chartData.chart.result) {
      throw new Error(`'${ticker}'의 시세 데이터를 가져오지 못했습니다.`);
    }
    const meta = chartData.chart.result[0].meta;

    // 투자 그라운드(52주 신고가~신저가 5등분)용 데이터 — meta에 없으면 방금 받은 1년 캔들에서 직접 계산
    let groundHigh = meta.fiftyTwoWeekHigh;
    let groundLow = meta.fiftyTwoWeekLow;
    if (groundHigh === undefined || groundLow === undefined) {
      const q = chartData.chart.result[0].indicators && chartData.chart.result[0].indicators.quote && chartData.chart.result[0].indicators.quote[0];
      const highs = (q && q.high) || [];
      const lows = (q && q.low) || [];
      const validHighs = highs.filter((v) => v !== null && v !== undefined);
      const validLows = lows.filter((v) => v !== null && v !== undefined);
      if (validHighs.length) groundHigh = Math.max(...validHighs);
      if (validLows.length) groundLow = Math.min(...validLows);
    }
    currentGroundData =
      groundHigh !== undefined && groundLow !== undefined
        ? { symbol: meta.symbol || ticker, name: quote.longname || quote.shortname || meta.symbol || ticker, high: groundHigh, low: groundLow, currency: meta.currency || "USD" }
        : null;

    results.style.display = "block";
    setStatus("loading", "섹션별 데이터를 정리하는 중입니다...");

    renderCompanyIdentity(ticker, quote, meta, getDailyChangePercent(chartData));
    el("summaryChartExpandBtn").dataset.chartSymbol = ticker;

    renderSummary(quote, meta, getDailyChangePercent(chartData)).catch((e) => {
      el("summarySection").innerHTML = `<p class="error-inline">사업 요약을 가져오지 못했습니다: ${escapeHtml(e.message)}</p>`;
    });

    renderFinancials(ticker, meta.currency).catch((e) => {
      el("financialsSection").innerHTML = `<p class="error-inline">실적 데이터를 가져오지 못했습니다: ${escapeHtml(e.message)}</p>`;
    });

    renderQuarterlyEarnings(ticker, meta.currency).catch((e) => {
      el("quarterlyEarningsSection").innerHTML = `<p class="error-inline">분기 실적 데이터를 가져오지 못했습니다: ${escapeHtml(e.message)}</p>`;
    });

    // 나스닥·다우존스·S&P500 1년 수익률과, 분석 대상 자신의 지표(차트+재무제표)는
    // 경쟁사 비교(3)·상승압력도(5)·투자 안정성(6) 섹션이 각자 다시 조회하지 않고 공유해서
    // 프록시 요청 수를 줄이고(속도·안정성 향상) 값도 서로 어긋나지 않도록 함
    const marketReturnsPromise = getMarketReturns();
    const selfMetricsPromise = getFullMetrics(ticker);

    renderSummaryScoreRow(selfMetricsPromise, marketReturnsPromise);

    renderPeers(ticker, selfMetricsPromise, quote.sector || quote.sectorDisp, quote.industryDisp || quote.industry).catch((e) => {
      el("peersSection").innerHTML = `<p class="error-inline">경쟁사 비교 데이터를 가져오지 못했습니다: ${escapeHtml(e.message)}</p>`;
    });

    renderNews(searchData).catch((e) => {
      el("newsSection").innerHTML = `<p class="error-inline">뉴스를 가져오지 못했습니다: ${escapeHtml(e.message)}</p>`;
    });

    renderScore(selfMetricsPromise).catch((e) => {
      el("scoreSection").innerHTML = `<p class="error-inline">상승압력도 점수를 계산하지 못했습니다: ${escapeHtml(e.message)}</p>`;
    });

    renderRisk(marketReturnsPromise, selfMetricsPromise).catch((e) => {
      el("riskSection").innerHTML = `<p class="error-inline">투자 안정성 점수를 계산하지 못했습니다: ${escapeHtml(e.message)}</p>`;
    });

    renderMacro().catch((e) => {
      el("macroSection").innerHTML = `<p class="error-inline">거시경제 점수를 계산하지 못했습니다: ${escapeHtml(e.message)}</p>`;
    });

    setStatus(null, null);
  } catch (err) {
    setStatus("error", `❌ ${escapeHtml(err.message || "알 수 없는 오류가 발생했습니다.")}`);
  } finally {
    analyzeBtn.disabled = false;
  }
}

// ---------- 투자 그라운드: 52주 신고가~신저가를 머리~발끝 5등분해 졸라맨으로 표시(회사 로고를 머리에 얹음) ----------
const GROUND_LANDMARKS = ["머리", "어깨", "배꼽", "무릎", "발"];
function fmtGroundPrice(v, currency) {
  return (currency === "KRW" ? "₩" : "$") + v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function buildGroundSvg({ symbol, high, low, currency }) {
  const W = 320,
    headY = 90,
    footY = 430;
  const stepY = (footY - headY) / 4;
  const cx = W / 2;
  const headR = 36;
  const ys = [0, 1, 2, 3, 4].map((k) => headY + k * stepY);
  const prices = [0, 1, 2, 3, 4].map((k) => high - (k / 4) * (high - low));
  const { primary, fmp, useFallback } = logoSources(symbol, 160);

  const guides = ys
    .map(
      (y, i) => `
      <line x1="10" y1="${y}" x2="${W - 10}" y2="${y}" stroke="#2b2f3a" stroke-width="1" stroke-dasharray="3,3" />
      <text x="10" y="${(y - 8).toFixed(1)}" font-size="13" fill="#9aa2b1">${GROUND_LANDMARKS[i]}</text>
      <text x="${W - 10}" y="${(y - 8).toFixed(1)}" text-anchor="end" font-size="13" font-weight="700" fill="#eceef2">${fmtGroundPrice(prices[i], currency)}</text>`
    )
    .join("");

  const shoulderY = ys[1];
  const hipY = ys[2] + stepY * 0.3;

  return `<svg viewBox="0 0 ${W} 470" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="투자 그라운드">
    <defs>
      <clipPath id="groundHeadClip"><circle cx="${cx}" cy="${headY}" r="${headR}" /></clipPath>
    </defs>
    <rect x="0" y="0" width="${W}" height="470" fill="#0b0d12" />
    ${guides}
    <line x1="${cx}" y1="${headY + headR}" x2="${cx}" y2="${hipY.toFixed(1)}" stroke="#eceef2" stroke-width="4" stroke-linecap="round" />
    <line x1="${cx}" y1="${shoulderY.toFixed(1)}" x2="${cx - 44}" y2="${(shoulderY + 46).toFixed(1)}" stroke="#eceef2" stroke-width="4" stroke-linecap="round" />
    <line x1="${cx}" y1="${shoulderY.toFixed(1)}" x2="${cx + 44}" y2="${(shoulderY + 46).toFixed(1)}" stroke="#eceef2" stroke-width="4" stroke-linecap="round" />
    <line x1="${cx}" y1="${hipY.toFixed(1)}" x2="${cx - 36}" y2="${footY}" stroke="#eceef2" stroke-width="4" stroke-linecap="round" />
    <line x1="${cx}" y1="${hipY.toFixed(1)}" x2="${cx + 36}" y2="${footY}" stroke="#eceef2" stroke-width="4" stroke-linecap="round" />
    <circle cx="${cx}" cy="${headY}" r="${headR}" fill="#1c1f27" stroke="#eceef2" stroke-width="3" />
    <image x="${cx - headR}" y="${headY - headR}" width="${headR * 2}" height="${headR * 2}" href="${primary}" clip-path="url(#groundHeadClip)" preserveAspectRatio="xMidYMid slice" ${useFallback ? `data-fallback="${fmp}"` : ""} onerror="var f=this.dataset.fallback; if(f){this.removeAttribute('data-fallback');this.setAttribute('href',f);}" />
  </svg>`;
}
function openGroundModal() {
  groundBody.innerHTML = currentGroundData
    ? buildGroundSvg(currentGroundData)
    : `<p class="muted">52주 데이터를 아직 불러오지 못했습니다.</p>`;
  groundModal.style.display = "flex";
}
function closeGroundModal() {
  groundModal.style.display = "none";
}
groundOpenBtn.addEventListener("click", openGroundModal);
groundModalCloseBtn.addEventListener("click", closeGroundModal);

// ---------- 공유하기 바텀시트: 그라운드 SVG를 캔버스로 그려 PNG로 변환 후 저장/공유 ----------
// SVG 문자열을 PNG Blob으로 변환
function groundSvgToPngBlob() {
  return new Promise((resolve, reject) => {
    const svgEl = groundBody.querySelector("svg");
    if (!svgEl) return reject(new Error("그라운드 이미지가 없습니다."));
    const svgText = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("이미지 변환 실패"))), "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 만들지 못했습니다."));
    };
    img.src = url;
  });
}
function downloadGroundBlob(blob, symbol) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `투자그라운드_${symbol}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// 시트가 열리자마자 PNG 변환을 미리 시작해둠 — navigator.share()는 사용자 클릭 직후(제스처 유효 시간 내)에
// 바로 호출해야 브라우저가 허용하므로, 버튼 클릭 시점에는 이미 준비된 결과를 기다리기만 하면 되게 함
let groundPngBlobPromise = null;
function openShareSheet() {
  groundPngBlobPromise = groundSvgToPngBlob();
  shareSheet.style.display = "block";
}
function closeShareSheet() {
  shareSheet.style.display = "none";
}
groundShareOpenBtn.addEventListener("click", openShareSheet);
shareSheetCloseBtn.addEventListener("click", closeShareSheet);
shareSheetBackdrop.addEventListener("click", closeShareSheet);

async function shareOrDownloadGround(shareText) {
  const symbol = (currentGroundData && currentGroundData.symbol) || "ground";
  try {
    const blob = await groundPngBlobPromise;
    const file = new File([blob], `투자그라운드_${symbol}.png`, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "투자 그라운드", text: shareText });
      return;
    }
    downloadGroundBlob(blob, symbol);
    alert("이미지를 저장했습니다. 저장된 이미지를 앱에서 직접 업로드해주세요.");
  } catch (err) {
    if (err && err.name === "AbortError") return; // 사용자가 공유 시트를 취소한 경우
    alert("공유에 실패했습니다: " + (err.message || "알 수 없는 오류"));
  }
}
shareSaveBtn.addEventListener("click", async () => {
  closeShareSheet();
  try {
    const blob = await groundPngBlobPromise;
    downloadGroundBlob(blob, (currentGroundData && currentGroundData.symbol) || "ground");
  } catch (err) {
    alert("저장에 실패했습니다: " + (err.message || "알 수 없는 오류"));
  }
});
shareKakaoBtn.addEventListener("click", () => {
  closeShareSheet();
  shareOrDownloadGround("투자 그라운드 - 카카오톡으로 공유해보세요");
});
shareInstaBtn.addEventListener("click", () => {
  closeShareSheet();
  shareOrDownloadGround("투자 그라운드 - 인스타그램에 공유해보세요");
});

// ---------- 기업검색 요약 페이지 4분할 서브탭(요약/매출액/invest점수/주요뉴스) ----------
const summarySubtabButtons = {
  summary: el("summarySubtabSummaryBtn"),
  revenue: el("summarySubtabRevenueBtn"),
  investscore: el("summarySubtabScoreBtn"),
  news: el("summarySubtabNewsBtn"),
};
const summarySubtabPanels = {
  summary: document.querySelector('[data-summary-subtabpanel="summary"]'),
  revenue: document.querySelector('[data-summary-subtabpanel="revenue"]'),
  investscore: document.querySelector('[data-summary-subtabpanel="investscore"]'),
  news: document.querySelector('[data-summary-subtabpanel="news"]'),
};
// 개요 아래로 매출액/invest점수/주요뉴스가 한 화면에 이어져 있어(단일 스크롤), 탭 클릭은 숨기고 보여주는 대신
// 해당 섹션으로 부드럽게 스크롤만 시켜줌
function switchSummarySubtab(key) {
  const panel = summarySubtabPanels[key];
  if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
}
Object.entries(summarySubtabButtons).forEach(([key, btn]) => {
  btn.addEventListener("click", () => switchSummarySubtab(key));
});

// 스크롤 위치에 따라 현재 보고 있는 섹션의 탭이 자동으로 활성화되도록(스크롤 스파이) — 탭 클릭 없이 내려도
// 다음 탭으로 자연스럽게 넘어가 보이게 함
(function setupSummarySubtabScrollSpy() {
  const scrollRoot = companyPanel.querySelector(".company-panel-body");
  if (!scrollRoot) return;
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((en) => en.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (!visible.length) return;
      const key = visible[0].target.dataset.summarySubtabpanel;
      Object.entries(summarySubtabButtons).forEach(([k, btn]) => btn.classList.toggle("active", k === key));
    },
    { root: scrollRoot, rootMargin: "-40% 0px -55% 0px", threshold: 0 }
  );
  Object.values(summarySubtabPanels).forEach((panel) => panel && observer.observe(panel));
})();

// 경쟁사 매출 비교는 별도 서브탭 대신 매출액 서브탭 안(첫 그래프 바로 아래)에 토글로 표시 —
// renderPeers()는 티커 로드 시 이미 항상 백그라운드로 #peersSection을 채워두므로 여기서는 표시 여부만 토글
const peersToggleBtn = el("peersToggleBtn");
const peersSectionEl = el("peersSection");
peersToggleBtn.addEventListener("click", () => {
  const isOpen = peersSectionEl.style.display !== "none";
  peersSectionEl.style.display = isOpen ? "none" : "block";
  peersToggleBtn.classList.toggle("active", !isOpen);
});

// ---------- 1. 사업 요약 ----------
async function renderSummary(quote, meta, changePct) {
  el("summarySection").innerHTML = `<p class="muted">불러오는 중...</p>`;
  // 새 종목 검색 시 이전 종목의 과거분석/미래예측/s리포트 펼침 상태를 초기화(과거분석 3버튼 결과는 종목 무관이라 내용은 유지, 열림 상태만 접음)
  historicalInlineWrap.style.display = "none";
  futureInlineWrap.style.display = "none";
  sReportInlineWrap.style.display = "none";

  const companyName = quote.longname || quote.shortname || meta.longName || meta.symbol;
  let oneLiner = "사업 개요 정보를 찾을 수 없습니다.";
  try {
    oneLiner = await getBusinessSummaryKo(companyName);
    if (oneLiner.length > 220) oneLiner = oneLiner.slice(0, 217) + "...";
  } catch {
    // 위키백과 매칭 실패 시 안내 문구 유지
  }

  const industryEn = quote.industryDisp || quote.industry || "";
  const sectorEn = quote.sectorDisp || quote.sector || "";
  const industryKo = industryEn ? await translateToKorean(industryEn).catch(() => industryEn) : "";
  const sectorKo = sectorEn ? SECTOR_KO[sectorEn] || (await translateToKorean(sectorEn).catch(() => sectorEn)) : "";

  const symbol = meta.symbol || quote.symbol || "";

  // 지정 로고(override)가 있으면 그걸 쓰고, 없으면 기존 자동 소스(logo.dev/FMP) 사용
  const _logoOv = LOGO_OVERRIDE[symbol];
  const _logoSrc = logoSources(symbol, 128);
  const _logoBg = logoBg(symbol);
  const summaryLogoWrapStyle = _logoBg ? ` style="background:${_logoBg}"` : "";
  const summaryLogoImg = _logoOv
    ? `<img class="summary-ticker-logo" src="${_logoOv.src}" alt="${escapeHtml(symbol)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />`
    : `<img class="summary-ticker-logo" src="${_logoSrc.primary}" alt="${escapeHtml(symbol)}" ${_logoSrc.useFallback ? `data-fallback="${_logoSrc.fmp}"` : ""} onerror="${LOGO_ONERROR}" />`;

  el("summarySection").innerHTML = `
    <div class="summary-main">
      <p class="summary-text">
        <span class="summary-ticker-logo-wrap"${summaryLogoWrapStyle}>
          ${summaryLogoImg}
          <span class="summary-ticker-badge" style="display:none;">${escapeHtml(symbol)}</span>
        </span>
        <b>${escapeHtml(companyName)}</b> — ${escapeHtml(oneLiner)}
      </p>
      <div class="company-meta">
        <span>업종: <b>${escapeHtml(industryKo || "N/A")}</b></span>
        <span>섹터: <b>${escapeHtml(sectorKo || "N/A")}</b></span>
        <span>거래소: <b>${escapeHtml(quote.exchDisp || meta.fullExchangeName || "N/A")}</b></span>
        <span>현재가: <b>$${(meta.regularMarketPrice ?? 0).toFixed(2)}</b> ${changePct !== null && changePct !== undefined ? `<span class="${changePct >= 0 ? "delta-up" : "delta-down"}">(${fmtPct(changePct)})</span>` : ""}<a class="chart-link-btn" href="#" data-chart-symbol="${escapeHtml(symbol)}">📈 차트보기</a></span>
      </div>
      <div class="summary-action-row">
        <button type="button" class="summary-action-btn" id="tickerHistoricalToggleBtn" data-ticker="${escapeHtml(symbol)}">🕰️ 과거분석</button>
        <button type="button" class="summary-action-btn" id="tickerFutureToggleBtn" data-ticker="${escapeHtml(symbol)}">🔮 미래예측</button>
        <button type="button" class="summary-action-btn" id="tickerSReportToggleBtn">📄 s리포트</button>
      </div>
    </div>
    <div id="tickerHistoricalRow" style="display:none;"></div>
  `;

  const toggleBtn = el("tickerHistoricalToggleBtn");
  const futureToggleBtn = el("tickerFutureToggleBtn");
  const sReportToggleBtn = el("tickerSReportToggleBtn");
  const row = el("tickerHistoricalRow");

  const sections = [
    { btn: toggleBtn, els: [row, historicalInlineWrap] },
    { btn: futureToggleBtn, els: [futureInlineWrap] },
    { btn: sReportToggleBtn, els: [sReportInlineWrap] },
  ];
  function closeAllSections(exceptBtn) {
    sections.forEach(({ btn, els }) => {
      if (btn === exceptBtn) return;
      btn.classList.remove("active");
      els.forEach((e) => (e.style.display = "none"));
    });
  }

  let tickerHistoricalLoaded = false;
  toggleBtn.addEventListener("click", async () => {
    const isOpen = row.style.display !== "none";
    if (isOpen) {
      row.style.display = "none";
      historicalInlineWrap.style.display = "none";
      toggleBtn.classList.remove("active");
      return;
    }
    closeAllSections(toggleBtn);
    row.style.display = "block";
    historicalInlineWrap.style.display = "block";
    toggleBtn.classList.add("active");
    if (!tickerHistoricalLoaded) {
      tickerHistoricalLoaded = true;
      await runTickerHistorical(symbol, row);
    }
  });

  let futureLoaded = false;
  futureToggleBtn.addEventListener("click", async () => {
    const isOpen = futureInlineWrap.style.display !== "none";
    if (isOpen) {
      futureInlineWrap.style.display = "none";
      futureToggleBtn.classList.remove("active");
      return;
    }
    closeAllSections(futureToggleBtn);
    futureInlineWrap.style.display = "block";
    futureToggleBtn.classList.add("active");
    if (!futureLoaded) {
      futureLoaded = true;
      await runFuturePrediction(symbol);
    }
  });

  sReportToggleBtn.addEventListener("click", () => {
    const isOpen = sReportInlineWrap.style.display !== "none";
    if (isOpen) {
      sReportInlineWrap.style.display = "none";
      sReportToggleBtn.classList.remove("active");
      return;
    }
    closeAllSections(sReportToggleBtn);
    sReportInlineWrap.style.display = "block";
    sReportToggleBtn.classList.add("active");
  });

  // 요약 탭 상단 가격 차트: 새 종목 조회 시 기간 버튼을 기본값(1년)으로 되돌리고 다시 그림
  Array.from(summaryChartPeriodNav.children).forEach((b) => b.classList.toggle("active", b.dataset.chartPeriod === "1y"));
  runSummaryChart(symbol, "1y");
}

// 차트보기 옆 "과거분석" 버튼용 — 해당 종목 1개만 기존 과거분석과 동일한 방식(현재 vs 1년 전 스냅샷)으로 비교
async function runTickerHistorical(ticker, container) {
  container.innerHTML = `<p class="muted">불러오는 중...</p>`;
  try {
    const sp500PairsPromise = yahooChart("^GSPC", "2y").then(chartClosePairs);
    const [m, h] = await Promise.all([
      getFullMetrics(ticker),
      getHistoricalCompareMetrics(ticker, sp500PairsPromise),
    ]);
    const rows = buildHistoricalCompareRows([m], [h]);
    if (rows.length === 0) {
      container.innerHTML = `<p class="muted">이 종목은 과거 비교 데이터를 계산할 수 없습니다(최근 상장 등으로 1년 전 데이터가 없을 수 있습니다).</p>`;
      return;
    }
    container.innerHTML = historicalTableHtml(rows, "순위");
  } catch (err) {
    container.innerHTML = `<p class="error-inline">과거분석 데이터를 가져오지 못했습니다: ${escapeHtml(err.message || "")}</p>`;
  }
}

// 요약 카드 아래에 상승압력도·투자 안정성·거시경제 점수를 한눈에 보는 작은 원형 배지로 가로 배치(상세 근거는 5·6·7번 섹션 참고)
async function renderSummaryScoreRow(selfMetricsPromise, marketReturnsPromise) {
  const rowEl = el("summaryScoreRow");
  try {
    const [metrics, { sp500Return }, macroMetrics] = await Promise.all([
      selfMetricsPromise,
      marketReturnsPromise,
      getMacroMetrics().catch(() => ({ vix: null })),
    ]);
    const attractiveness = computeAttractivenessScore(metrics);
    const risk = computeRiskScore(metrics, sp500Return);
    const macro = computeMacroScore(macroMetrics);
    const isIPO = isRecentIPO(metrics.firstTradeDate);

    rowEl.innerHTML = `
      <div class="mini-score">
        <div class="mini-score-circle">${isIPO ? "IPO" : attractiveness.total}</div>
        <span class="mini-score-label">상승압력도</span>
      </div>
      <div class="mini-score">
        <div class="mini-score-circle risk">${isIPO ? "IPO" : risk.total}</div>
        <span class="mini-score-label">투자안정성</span>
      </div>
      <div class="mini-score">
        <div class="mini-score-circle macro"${macroGoldStyle(macro.total)}>${macro.total}</div>
        <span class="mini-score-label">S&amp;P500 VIX${vixLineHtml(macroMetrics)}</span>
      </div>
    `;
  } catch {
    rowEl.innerHTML = "";
  }
}

// fundamentals-timeseries 응답에서 통화 코드가 붙은 첫 항목을 찾아 재무제표의 보고 통화를 판별(연도별 공통값으로 가정)
function findReportCurrency(resultArr, keys) {
  for (const block of resultArr) {
    for (const key of keys) {
      const found = (block[key] || []).find((it) => it && it.currencyCode);
      if (found) return found.currencyCode;
    }
  }
  return null;
}

// ---------- 2. 매출/EPS 3년 추이 ----------
async function renderFinancials(ticker, quoteCurrency) {
  el("financialsSection").innerHTML = `<p class="muted">불러오는 중...</p>`;

  const data = await yahooFundamentals(ticker, "annualTotalRevenue,annualBasicEPS,annualNetIncome");
  const resultArr = data && data.timeseries && data.timeseries.result;
  if (!resultArr || resultArr.length === 0) {
    el("financialsSection").innerHTML = `<p class="muted">실적 데이터를 찾을 수 없습니다.</p>`;
    return null;
  }

  // 재무제표가 시세와 다른 현지 통화로 내려오는 해외 상장 종목(예: TSM은 매출이 TWD로 내려옴)은
  // 환율을 적용해 시세와 같은 통화로 환산 — 연도별로 동일한 보고 통화를 쓴다고 가정하고 환율은 한 번만 조회
  const reportCurrency = findReportCurrency(resultArr, ["annualTotalRevenue", "annualBasicEPS", "annualNetIncome"]);
  const fxRate =
    reportCurrency && quoteCurrency && reportCurrency !== quoteCurrency ? await getFxRate(reportCurrency, quoteCurrency) : 1;
  const convert = (raw) => (raw === null || raw === undefined ? null : fxRate !== null ? raw * fxRate : null);

  const byYear = {};
  for (const block of resultArr) {
    const revItems = block.annualTotalRevenue || [];
    const epsItems = block.annualBasicEPS || [];
    const netIncomeItems = block.annualNetIncome || [];
    for (const item of revItems) {
      if (!item || !item.asOfDate) continue;
      const year = item.asOfDate.slice(0, 4);
      byYear[year] = byYear[year] || {};
      byYear[year].revenue = convert(item.reportedValue?.raw);
    }
    for (const item of epsItems) {
      if (!item || !item.asOfDate) continue;
      const year = item.asOfDate.slice(0, 4);
      byYear[year] = byYear[year] || {};
      byYear[year].eps = convert(item.reportedValue?.raw);
    }
    for (const item of netIncomeItems) {
      if (!item || !item.asOfDate) continue;
      const year = item.asOfDate.slice(0, 4);
      byYear[year] = byYear[year] || {};
      byYear[year].netIncome = convert(item.reportedValue?.raw);
    }
  }

  const years = Object.keys(byYear).sort();
  const recentYears = years.slice(-4);

  if (recentYears.length === 0) {
    el("financialsSection").innerHTML = `<p class="muted">실적 데이터를 찾을 수 없습니다.</p>`;
    return null;
  }

  let rows = "";
  for (let i = 0; i < recentYears.length; i++) {
    const year = recentYears[i];
    const cur = byYear[year];
    const prevYear = recentYears[i - 1];
    const prev = prevYear ? byYear[prevYear] : null;

    let revDelta = "-";
    let epsDelta = "-";
    if (prev) {
      if (prev.revenue && cur.revenue !== null && cur.revenue !== undefined) {
        const revChange = ((cur.revenue - prev.revenue) / Math.abs(prev.revenue)) * 100;
        revDelta = `<span class="${revChange >= 0 ? "delta-up" : "delta-down"}">${fmtPct(revChange)}</span>`;
      }
      if (prev.eps && cur.eps !== null && cur.eps !== undefined) {
        const epsChange = ((cur.eps - prev.eps) / Math.abs(prev.eps)) * 100;
        epsDelta = `<span class="${epsChange >= 0 ? "delta-up" : "delta-down"}">${fmtPct(epsChange)}</span>`;
      }
    }

    const netIncomeCell =
      cur.netIncome === null || cur.netIncome === undefined
        ? "N/A"
        : `<span class="net-income-cell ${cur.netIncome >= 0 ? "positive" : "negative"}">${fmtCompactCurrency(cur.netIncome)}</span>`;

    rows += `
      <tr>
        <td>${escapeHtml(year)}</td>
        <td>${fmtCompactCurrency(cur.revenue)}</td>
        <td>${revDelta}</td>
        <td>${cur.eps !== null && cur.eps !== undefined ? "$" + cur.eps.toFixed(2) : "N/A"}</td>
        <td>${epsDelta}</td>
        <td>${netIncomeCell}</td>
      </tr>
    `;
  }

  const maxRevenue = Math.max(...recentYears.map((y) => byYear[y].revenue || 0), 1);
  const revBars = recentYears
    .map((y) => {
      const rev = byYear[y].revenue;
      const netIncome = byYear[y].netIncome;
      const pct = clamp(((rev || 0) / maxRevenue) * 100, 2, 100);

      let lossZoneContent = "";
      let profitOverlay = "";
      if (netIncome !== null && netIncome !== undefined && rev) {
        const marginPct = (netIncome / rev) * 100;
        if (netIncome > 0) {
          const profitPct = clamp((netIncome / maxRevenue) * 100, 0, pct);
          profitOverlay = `<div class="bar-fill-profit" style="width:${profitPct}%"><span class="profit-label">+${marginPct.toFixed(0)}%</span></div>`;
        } else if (netIncome < 0) {
          // 순손실 비율(매출 대비, 절대값)이 100% 이상이면 그래프 최대, 0%에 가까울수록 작아짐
          const lossPct = clamp(Math.abs(marginPct), 2, 100);
          lossZoneContent = `<div class="bar-loss" style="width:${lossPct}%"></div><span class="loss-label">-${Math.abs(marginPct).toFixed(0)}%</span>`;
        }
      }

      return `
      <div class="bar-row">
        <span class="bar-label">${escapeHtml(y)}</span>
        <div class="bar-loss-zone">${lossZoneContent}</div>
        <div class="bar-track">
          <div class="bar-fill self" style="width:${pct}%"></div>
          ${profitOverlay}
          <span class="bar-revenue-label">${fmtCompactCurrency(rev)}</span>
        </div>
      </div>`;
    })
    .join("");

  el("financialsSection").innerHTML = `
    <table class="fin-table">
      <thead>
        <tr><th>연도</th><th>매출액</th><th>YoY</th><th>EPS</th><th>YoY</th><th>순이익</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="bar-chart">${revBars}</div>
  `;

  const lastYear = recentYears[recentYears.length - 1];
  return byYear[lastYear]?.eps ?? null;
}

// ---------- 2+. 최근 분기 실적(최근 3개) + 다음 분기 가이던스(1개) ----------
// ⚠️ Yahoo의 quoteSummary(earningsHistory/earningsTrend/calendarEvents)와 v7/finance/quote는 최근 "Invalid Crumb"
// 인증 요구로 이 앱의 무인증 프록시로는 접근이 막혀 있어(실제 발표일·애널리스트 컨센서스를 제공하는 유일한 소스),
// 실제 기업 가이던스·컨센서스 추정치를 가져올 방법이 없음. 대신 fundamentals-timeseries(무인증, 정상 동작)의
// 분기별 매출/순이익 실적만으로 4번째(다음 분기) 막대를 "최근 분기 대비 성장률 기반 추정치"로 계산해 표시하고,
// 발표일도 정확한 발표일이 아닌 회계분기 마감일(asOfDate)로 표시 — 라벨과 캡션에 명확히 "추정" 표기해 오해를 방지함.
function projectNextQuarter(quarters, key) {
  const vals = quarters.map((q) => q[key]).filter((v) => v !== null && v !== undefined);
  if (vals.length === 0) return null;
  if (vals.length === 1) return vals[0];
  const growthRates = [];
  for (let i = 1; i < vals.length; i++) {
    if (vals[i - 1]) growthRates.push((vals[i] - vals[i - 1]) / Math.abs(vals[i - 1]));
  }
  const avgGrowth = growthRates.length ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length : 0;
  return vals[vals.length - 1] * (1 + avgGrowth);
}

// 분기별 매출/주당순이익 듀얼축 막대그래프(참조 이미지 스타일) — 왼쪽 축은 매출, 오른쪽 축은 EPS.
// 각 분기마다 "그 분기 이전 데이터만으로 계산했다면 나왔을 예측치"(predRevenue/predEps)를 노란 선으로 실제 막대 위에 겹쳐 비교하고,
// 아직 발표되지 않은 마지막 분기는 revenue/eps가 null이라 실제 막대 없이 노란 예측선만 표시됨
function buildRevenueEpsChartSvg(quarters) {
  const W = 780,
    H = 380;
  const ML = 66,
    MR = 66,
    MT = 40,
    MB = 46;
  const PW = W - ML - MR;
  const PH = H - MT - MB;
  const N = quarters.length;

  const maxRev = Math.max(...quarters.map((q) => Math.max(q.revenue || 0, q.predRevenue || 0)), 1);
  const maxEps = Math.max(...quarters.map((q) => Math.max(q.eps || 0, q.predEps || 0)), 1);
  const revStep = niceStepGeneric(maxRev / 5);
  const epsStep = niceStepGeneric(maxEps / 5);
  const revTop = Math.ceil(maxRev / revStep) * revStep || 1;
  const epsTop = Math.ceil(maxEps / epsStep) * epsStep || 1;

  const groupW = PW / N;
  const barW = groupW * 0.3;
  const gap = groupW * 0.06;

  let gridSvg = "";
  for (let i = 0; i <= 5; i++) {
    const v = (revTop / 5) * i;
    const epsV = (epsTop / 5) * i;
    const y = MT + PH - (v / revTop) * PH;
    gridSvg += `<line x1="${ML}" y1="${y.toFixed(1)}" x2="${(ML + PW).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#23262f" stroke-width="1" />`;
    gridSvg += `<text x="${(ML - 8).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="#8a90a3">${fmtCompactCurrency(v)}</text>`;
    gridSvg += `<text x="${(ML + PW + 8).toFixed(1)}" y="${(y + 4).toFixed(1)}" font-size="10" fill="#8a90a3">${epsV.toFixed(2)}</text>`;
  }

  let barsSvg = "";
  let labelsSvg = "";
  quarters.forEach((q, i) => {
    const cx = ML + groupW * i + groupW / 2;
    const revX = cx - barW - gap / 2;
    const epsX = cx + gap / 2;

    const hasRevenue = q.revenue !== null && q.revenue !== undefined;
    const hasEps = q.eps !== null && q.eps !== undefined;
    if (hasRevenue) {
      const revH = Math.max((q.revenue / revTop) * PH, 2);
      const revY = MT + PH - revH;
      barsSvg += `<rect x="${revX.toFixed(1)}" y="${revY.toFixed(1)}" width="${barW.toFixed(1)}" height="${revH.toFixed(1)}" fill="#1c2a4a" rx="2" />`;
    }
    if (hasEps) {
      const epsH = Math.max((q.eps / epsTop) * PH, 2);
      const epsY = MT + PH - epsH;
      barsSvg += `<rect x="${epsX.toFixed(1)}" y="${epsY.toFixed(1)}" width="${barW.toFixed(1)}" height="${epsH.toFixed(1)}" fill="#5b6472" rx="2" />`;
    }
    // 노란 예측선: 그 분기 이전 데이터 기준 예측치(마지막 미발표 분기는 이 선만 보임)
    if (q.predRevenue !== null && q.predRevenue !== undefined) {
      const predY = MT + PH - Math.max((q.predRevenue / revTop) * PH, 2);
      barsSvg += `<line x1="${revX.toFixed(1)}" y1="${predY.toFixed(1)}" x2="${(revX + barW).toFixed(1)}" y2="${predY.toFixed(1)}" stroke="#f5c623" stroke-width="3" stroke-linecap="round" />`;
    }
    if (q.predEps !== null && q.predEps !== undefined) {
      const predEpsY = MT + PH - Math.max((q.predEps / epsTop) * PH, 2);
      barsSvg += `<line x1="${epsX.toFixed(1)}" y1="${predEpsY.toFixed(1)}" x2="${(epsX + barW).toFixed(1)}" y2="${predEpsY.toFixed(1)}" stroke="#f5c623" stroke-width="3" stroke-linecap="round" />`;
    }
    labelsSvg += `<text x="${cx.toFixed(1)}" y="${(MT + PH + 20).toFixed(1)}" text-anchor="middle" font-size="11" fill="#8a90a3">${escapeHtml(q.label)}</text>`;
  });

  const legendY = 20;
  const legend = `
    <circle cx="${ML}" cy="${legendY}" r="4" fill="#1c2a4a" /><text x="${ML + 10}" y="${legendY + 4}" font-size="11" fill="#c7cbd6">매출</text>
    <circle cx="${ML + 70}" cy="${legendY}" r="4" fill="#5b6472" /><text x="${ML + 80}" y="${legendY + 4}" font-size="11" fill="#c7cbd6">주당순이익</text>
    <line x1="${ML + 184}" y1="${legendY}" x2="${ML + 196}" y2="${legendY}" stroke="#f5c623" stroke-width="3" stroke-linecap="round" /><text x="${ML + 200}" y="${legendY + 4}" font-size="11" fill="#c7cbd6">예측선</text>
  `;

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="분기별 매출/주당순이익 차트">
    <rect x="0" y="0" width="${W}" height="${H}" fill="#0b0d12" />
    ${legend}
    ${gridSvg}
    ${barsSvg}
    ${labelsSvg}
  </svg>`;
}

async function renderQuarterlyEarnings(ticker, quoteCurrency) {
  el("quarterlyEarningsSection").innerHTML = `<p class="muted">불러오는 중...</p>`;

  const data = await yahooFundamentals(ticker, "quarterlyTotalRevenue,quarterlyBasicEPS");
  const resultArr = data && data.timeseries && data.timeseries.result;
  if (!resultArr || resultArr.length === 0) {
    el("quarterlyEarningsSection").innerHTML = `<p class="muted">분기 실적 데이터를 찾을 수 없습니다.</p>`;
    return;
  }

  const reportCurrency = findReportCurrency(resultArr, ["quarterlyTotalRevenue", "quarterlyBasicEPS"]);
  const fxRate =
    reportCurrency && quoteCurrency && reportCurrency !== quoteCurrency ? await getFxRate(reportCurrency, quoteCurrency) : 1;
  const convert = (raw) => (raw === null || raw === undefined ? null : fxRate !== null ? raw * fxRate : null);

  const byDate = {};
  for (const block of resultArr) {
    for (const item of block.quarterlyTotalRevenue || []) {
      if (!item || !item.asOfDate) continue;
      byDate[item.asOfDate] = byDate[item.asOfDate] || {};
      byDate[item.asOfDate].revenue = convert(item.reportedValue?.raw);
    }
    for (const item of block.quarterlyBasicEPS || []) {
      if (!item || !item.asOfDate) continue;
      byDate[item.asOfDate] = byDate[item.asOfDate] || {};
      byDate[item.asOfDate].eps = convert(item.reportedValue?.raw);
    }
  }

  const dates = Object.keys(byDate).sort();
  const recent = dates.slice(-4).map((d) => ({ date: d, revenue: byDate[d].revenue, eps: byDate[d].eps }));

  if (recent.length === 0) {
    el("quarterlyEarningsSection").innerHTML = `<p class="muted">분기 실적 데이터를 찾을 수 없습니다.</p>`;
    return;
  }

  // 각 분기마다 "그 분기 이전 데이터만으로 계산했다면 나왔을 예측치"를 역산(노란 예측선용) — 앞선 데이터가 없는 초기 분기는 null
  const recentWithPred = recent.map((q) => {
    const idx = dates.indexOf(q.date);
    const priorQuarters = dates.slice(Math.max(0, idx - 4), idx).map((d) => byDate[d]);
    return {
      ...q,
      predRevenue: priorQuarters.length ? projectNextQuarter(priorQuarters, "revenue") : null,
      predEps: priorQuarters.length ? projectNextQuarter(priorQuarters, "eps") : null,
    };
  });

  const lastDate = new Date(recent[recent.length - 1].date + "T00:00:00");
  const nextDate = addMonths(lastDate, 3);
  const nextDateLabel = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
  const guidance = {
    revenue: projectNextQuarter(recent, "revenue"),
    eps: projectNextQuarter(recent, "eps"),
  };

  // 실제 발표일 데이터는 이 앱의 무인증 프록시로는 가져올 수 없어(estimateNextEarningsDate 참고),
  // 분기 마감 + 1개월이라는 동일한 근사식을 적용하고 주말이면 가장 가까운 평일로 보정
  function nearestWeekday(date) {
    const d = new Date(date);
    const day = d.getDay();
    if (day === 6) d.setDate(d.getDate() - 1);
    else if (day === 0) d.setDate(d.getDate() + 1);
    return d;
  }
  const estReportDate = nearestWeekday(addMonths(nextDate, 1));
  const estReportDateLabel = `${estReportDate.getFullYear()}-${String(estReportDate.getMonth() + 1).padStart(2, "0")}-${String(estReportDate.getDate()).padStart(2, "0")}`;

  const quarterLabel = (d) => {
    const dt = new Date(d + "T00:00:00");
    return `${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
  };
  const chartQuarters = [
    ...recentWithPred.map((q) => ({ label: quarterLabel(q.date), revenue: q.revenue, eps: q.eps, predRevenue: q.predRevenue, predEps: q.predEps })),
    { label: `${nextDateLabel}(예측)`, revenue: null, eps: null, predRevenue: guidance.revenue, predEps: guidance.eps },
  ];

  const epsCell = (v) => (v !== null && v !== undefined ? "$" + v.toFixed(2) : "N/A");
  const quarterTableRows =
    recentWithPred
      .map(
        (q) => `
      <tr>
        <td>${quarterLabel(q.date)}</td>
        <td>${fmtCompactCurrency(q.revenue)}</td>
        <td>${epsCell(q.eps)}</td>
        <td class="muted">실적</td>
      </tr>`
      )
      .join("") +
    `
      <tr>
        <td>${escapeHtml(nextDateLabel)}</td>
        <td>${fmtCompactCurrency(guidance.revenue)}</td>
        <td>${epsCell(guidance.eps)}</td>
        <td><span class="net-income-cell" style="background:rgba(245,198,35,0.18);color:#f5c623;">예측</span></td>
      </tr>`;

  el("quarterlyEarningsSection").innerHTML = `
    <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 노란 선은 해당 분기 이전 데이터만으로 계산했다면 나왔을 추세 기반 예측치이며, 가장 오른쪽 분기는 아직 발표 전이라 예측선만 표시됩니다. 실제 기업 발표 가이던스나 애널리스트 컨센서스가 아닙니다.</p>
    <div class="future-chart-container">${buildRevenueEpsChartSvg(chartQuarters)}</div>
    <table class="fin-table">
      <thead><tr><th>분기</th><th>매출액</th><th>EPS</th><th>구분</th></tr></thead>
      <tbody>${quarterTableRows}</tbody>
    </table>
    <p class="qbar-dates"><b>다음 발표일(추정):</b> ${escapeHtml(estReportDateLabel)} <span class="muted">(실제 발표일이 아닌 근사 추정치)</span></p>
  `;
}

// ---------- 3. 경쟁사 매출/주가/상승압력도 비교 ----------
// 경쟁사 4개 = 동일 업종(industry) 시가총액 TOP3(부족하면 동일 섹터로 보충) + 시가총액이 자신과 가장 가까운 종목 1개
// (섹터를 알 수 없는 경우엔 Yahoo의 연관 종목 추천으로 대체)
async function renderPeers(ticker, selfMetricsPromise, sector, industry) {
  el("peersSection").innerHTML = `<p class="muted">불러오는 중...</p>`;

  const [sectorResult, selfMetrics] = await Promise.all([
    sector ? getSectorPeerCandidates(sector, ticker, industry).catch(() => null) : Promise.resolve(null),
    selfMetricsPromise.then((m) => ({ ...m, self: true })).catch(() => null),
  ]);

  let peerTickers = [];
  let bySector = false;
  let byIndustry = false;

  if (sectorResult && sectorResult.candidates.length > 0) {
    const { candidates, industryCandidates } = sectorResult;
    // 업종 일치 후보가 3개 이상이면 그걸로 TOP3, 부족하면 섹터 전체 시총순으로 보충
    const top3 =
      industryCandidates.length >= 3
        ? industryCandidates.slice(0, 3)
        : [...industryCandidates, ...candidates.filter((c) => !industryCandidates.includes(c))].slice(0, 3);
    byIndustry = industryCandidates.length >= 3;
    const top3Symbols = new Set(top3.map((c) => c.symbol));
    const rest = candidates.filter((c) => !top3Symbols.has(c.symbol));
    const selfCap = selfMetrics && selfMetrics.marketCap;
    let similar = null;
    if (rest.length > 0) {
      similar =
        selfCap !== undefined && selfCap !== null
          ? rest.reduce((best, c) => (Math.abs(c.marketCap - selfCap) < Math.abs(best.marketCap - selfCap) ? c : best), rest[0])
          : rest[0];
    }
    peerTickers = [...top3.map((c) => c.symbol), similar ? similar.symbol : null].filter(Boolean);
    bySector = true;
  }

  if (peerTickers.length === 0) {
    const peersData = await yahooPeers(ticker).catch(() => null);
    const list =
      (peersData &&
        peersData.finance &&
        peersData.finance.result &&
        peersData.finance.result[0] &&
        peersData.finance.result[0].recommendedSymbols) ||
      [];
    peerTickers = list.map((p) => p.symbol).filter(Boolean).slice(0, 4);
  }

  if (peerTickers.length === 0) {
    el("peersSection").innerHTML = `<p class="muted">자동으로 경쟁사를 찾지 못했습니다.</p>`;
    return;
  }

  const peerMetricsList = await Promise.all(peerTickers.map((s) => getCompanyMetrics(s).catch(() => null)));
  const metricsList = [selfMetrics, ...peerMetricsList];

  const all = metricsList.filter((d) => d && d.revenue !== null && d.revenue !== undefined);

  if (all.length === 0) {
    el("peersSection").innerHTML = `<p class="muted">경쟁사 데이터를 가져오지 못했습니다.</p>`;
    return;
  }

  const maxRev = Math.max(...all.map((d) => d.revenue || 0), 1);
  const rows = all
    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
    .map((d) => {
      const pct = clamp(((d.revenue || 0) / maxRev) * 100, 2, 100);
      const score = computeAttractivenessScore(d);
      const isIPO = isRecentIPO(d.firstTradeDate);
      const scoreClass = isIPO ? "" : score.total >= 5 ? "delta-up" : "delta-down";
      return `
      <div class="peer-row">
        <span class="bar-label${d.self ? " self" : ""}">${escapeHtml(d.symbol)}</span>
        <div class="bar-track"><div class="bar-fill ${d.self ? "self" : ""}" style="width:${pct}%"></div></div>
        <span class="bar-value">${fmtCompactCurrency(d.revenue)}</span>
        <span class="peer-price">${fmtCompactCurrency(d.marketCap)}</span>
        <span class="peer-score ${scoreClass}">${isIPO ? "IPO" : score.total}</span>
      </div>`;
    })
    .join("");

  el("peersSection").innerHTML = `
    <p class="muted">최근 회계연도 매출액 기준 비교 (${bySector ? `동일 ${byIndustry ? "업종" : "섹터"} 시가총액 TOP3 + 시총 유사 종목 1개` : "자동 감지된 관련 종목"})</p>
    <div class="peer-table-header">
      <span></span><span></span><span>매출액</span><span>시가총액</span><span>상승력</span>
    </div>
    <div class="bar-chart">${rows}</div>
  `;
}

// ---------- 4. 주요 뉴스: 최근 1개월 이내, 최대 10건 ----------
async function renderNews(searchData) {
  el("newsSection").innerHTML = `<p class="muted">불러오는 중...</p>`;

  const allNews = (searchData && searchData.news) || [];
  const oneMonthAgoSec = Date.now() / 1000 - 30 * 86400;
  const news = allNews
    .filter((n) => !n.providerPublishTime || n.providerPublishTime >= oneMonthAgoSec)
    .slice(0, 10);

  if (news.length === 0) {
    el("newsSection").innerHTML = `<p class="muted">최근 1개월 이내 뉴스를 찾을 수 없습니다.</p>`;
    return;
  }

  const translatedTitles = await Promise.all(
    news.map((n) => translateToKorean(n.title || "").catch(() => n.title || ""))
  );

  const items = news
    .map((n, i) => {
      const date = n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toLocaleDateString("ko-KR") : "";
      const koTitle = translatedTitles[i] || n.title || "제목 없음";
      return `
      <div class="news-item">
        <div class="news-title"><a href="${escapeHtml(n.link || "#")}" target="_blank" rel="noopener">${escapeHtml(koTitle)}</a></div>
        <div class="news-meta">${escapeHtml(date)}</div>
        <div class="news-original">원문: ${escapeHtml(n.title || "")}</div>
        <div class="news-source">출처: ${escapeHtml(n.publisher || "알 수 없음")}</div>
      </div>`;
    })
    .join("");

  el("newsSection").innerHTML = `
    ${items}
    <p class="muted" style="font-size:12px;margin-top:8px;">※ 제목은 자동 번역되었으며, 본문 요약은 제공되지 않습니다. 최근 1개월 이내 기사 최대 10건입니다.</p>
  `;
}

// ---------- 5. 상승압력도 점수 (총 거래대금 + 매출 성장성 + 상승 모멘텀) ----------
async function renderScore(selfMetricsPromise) {
  el("scoreSection").innerHTML = `<p class="muted">불러오는 중...</p>`;

  const metrics = await selfMetricsPromise;

  const score = computeAttractivenessScore(metrics);
  const { total, volumeScore, volumeRatio, growthScore, revenueGrowthYoY, momentumScore, momentum3m } = score;
  const isIPO = isRecentIPO(metrics.firstTradeDate);

  el("scoreSection").innerHTML = `
    <div class="score-wrap">
      <div class="score-badge">
        <div class="score-num${isIPO ? " ipo-label" : ""}">${isIPO ? "IPO" : total}</div>
        <div class="score-den">/ 10</div>
      </div>
      <div class="score-details">
        <ul>
          <li>📊 총 거래대금(최근 5거래일 평균, 1년 평균 대비): <b>${volumeRatio !== null ? volumeRatio.toFixed(2) + "배" : "N/A"}</b> (2배 이상 만점, 1.5배 2점, 1배 1점, 0.5배 이하 0점)</li>
          <li>📈 매출 성장성(최근 분기 YoY): <b>${revenueGrowthYoY !== null && revenueGrowthYoY !== undefined ? fmtPct(revenueGrowthYoY) : "N/A"}</b> (가장 최근 분기 매출의 전년 동기 대비 성장률, 높을수록 가점, 30% 이상 만점·0% 이하 0점)</li>
          <li>🚀 상승 모멘텀(최근 3개월 수익률): <b>${momentum3m !== null && momentum3m !== undefined ? fmtPct(momentum3m) : "N/A"}</b> (높을수록 가점, 25% 이상 만점·0% 이하 0점)</li>
          <li>세부 점수 — 총 거래대금 ${volumeScore.toFixed(1)}/3, 매출 성장성 ${growthScore.toFixed(1)}/3, 상승 모멘텀 ${momentumScore.toFixed(1)}/4</li>
        </ul>
        <p class="disclaimer">
          ⚠️ 이 점수는 거래대금, 매출 성장성, 상승 모멘텀을 조합한 <b>단순 참고용 정량 지표</b>이며,
          투자 자문이나 매수/매도 추천이 아닙니다. 실제 투자 판단은 재무제표 전체와 다른 정보를 종합해 본인 책임 하에 내려야 합니다.
        </p>
      </div>
    </div>
  `;
}

// ---------- 6. 투자 안정성 점수 (vs S&P500, 점수가 높을수록 위험이 낮음) ----------
async function renderRisk(marketReturnsPromise, selfMetricsPromise) {
  el("riskSection").innerHTML = `<p class="muted">불러오는 중...</p>`;

  const [metrics, { sp500Return }] = await Promise.all([selfMetricsPromise, marketReturnsPromise]);

  const {
    total,
    creditScore,
    rating,
    marketScore,
    marginScore,
    relDiff,
    netMargin,
    vtsaxScore,
    vtsaxWeightPct,
  } = computeRiskScore(metrics, sp500Return);
  const isIPO = isRecentIPO(metrics.firstTradeDate);

  el("riskSection").innerHTML = `
    <div class="score-wrap">
      <div class="score-badge risk">
        <div class="score-num${isIPO ? " ipo-label" : ""}">${isIPO ? "IPO" : total}</div>
        <div class="score-den">/ 10</div>
      </div>
      <div class="score-details">
        <ul>
          <li>🏅 투자등급(신용등급): <b>${rating ? rating : "S&P 등급 없음"}</b> (AAA 4점 만점, BBB+ 0.5점, BBB 이하 0점, 회사채 없음 2점, 미평가·목록없음 1점)</li>
          <li>📊 S&P500과의 1년 수익률 차이: ${relDiff !== null ? `<b>${relDiff.toFixed(1)}%p</b> (S&P500 <b>${fmtPct(sp500Return)}</b>)` : "N/A"} (차이가 작을수록 가점)</li>
          <li>💵 순이익률(순이익/매출): <b>${netMargin !== null ? (netMargin * 100).toFixed(1) + "%" : "N/A"}</b> (높을수록 가점, 적자면 0점)</li>
          <li>🏦 시가총액 가점(미국 전체 시장 내 시총 비중): <b>${vtsaxWeightPct !== null ? vtsaxWeightPct.toFixed(2) + "%" : "N/A"}</b> (VTSAX 등 인덱스펀드 예상 비중 근사, 6% 이상 만점·0% 0점)</li>
          <li>세부 점수 — 투자등급 ${rating === NO_DEBT_RATING || rating === UNRATED_REASON ? rating : creditScore.toFixed(1) + "/4"}, S&P500 대비 모멘텀 ${marketScore.toFixed(1)}/2, 순이익률 ${marginScore.toFixed(1)}/2, 시가총액 가점 ${vtsaxScore.toFixed(1)}/2</li>
        </ul>
        <p class="disclaimer">
          ⚠️ 점수가 높을수록(10점에 가까울수록) 재무적으로 더 안정적/저위험임을 의미합니다.
          투자등급, S&P500 대비 수익률, 순이익률, 시가총액 가점을 조합한 <b>단순 참고용 정량 지표</b>이며, 투자 자문이나 매수/매도 추천이 아닙니다.
          투자등급은 S&P 신용등급을 기준으로 자체 조사해 수동으로 입력한 참고용 데이터로, 실시간 갱신되지 않으며 목록에 없는 종목은 중립 처리됩니다.
          시가총액 가점은 실제 펀드 편입 비중이 아니라 시가총액 기준 추정치입니다.
        </p>
      </div>
    </div>
  `;
}

// ---------- 7. 투자황금기 점수(공포지수연동) — VIX(CBOE 변동성지수)가 높을수록(시장 패닉) 역발상 매수 기회로 보고 점수를 올림, 종목과 무관 ----------
async function renderMacro() {
  el("macroSection").innerHTML = `<p class="muted">불러오는 중...</p>`;

  const { vix, vixChangePct } = await getMacroMetrics();
  const { total } = computeMacroScore({ vix });

  const vixPctStr =
    vixChangePct !== null && vixChangePct !== undefined && Number.isFinite(vixChangePct)
      ? `(${vixChangePct >= 0 ? "+" : ""}${vixChangePct.toFixed(2)}%)`
      : "";
  const vixLiveLine =
    vix !== null && vix !== undefined
      ? `<p class="score-macro-vix-line">😱 S&P500 VIX<br>^VIX : ${vix.toFixed(1)}${vixPctStr}</p>`
      : "";

  el("macroSection").innerHTML = `
    ${vixLiveLine}
    <div class="score-wrap">
      <div class="score-badge macro"${macroGoldStyle(total)}>
        <div class="score-num">${total}</div>
        <div class="score-den">/ 10</div>
      </div>
      <div class="score-details">
        <ul>
          <li>VIX 25 이하는 평시로 보고 5점 고정, 25~35 구간은 5~10점 선형(2당 1점), 35 초과는 상한 없이 계속 상승(5당 1점, 완만해짐)</li>
          <li>10점을 넘으면(VIX 35+, 극단적 공포) 배지 색이 점점 더 진한 골드로 바뀝니다</li>
        </ul>
        <p class="disclaimer">
          ⚠️ 이 점수는 특정 종목과 무관한 시장 전체 공포지수(VIX) 기반 <b>단순 참고용 정량 지표</b>이며, "공포가 클수록 저가 매수 기회"라는
          역발상 관점을 반영한 것입니다. 투자 자문이나 매수/매도 추천이 아니며, 실제로는 공포가 더 깊어질 수도 있습니다.
        </p>
      </div>
    </div>
  `;
}

// ---------- 가치평가 탭 공용 렌더러 ----------
// 처음엔 시가총액 상위 약 30개만 빠르게 조회·계산해서 보여주고(tickers는 호출부에서 이미 시총 상위 30개가
// 앞쪽에 오도록 정렬해서 넘김), "전체보기"를 누르면 나머지 S&P500 전 종목(약 470개)을 마저 조회해 다시 정렬함
async function renderValueRanking(
  tickers,
  label,
  {
    statusEl,
    resultsEl,
    buttons,
    mapFn = (list) => list,
    sortFn,
    metricHeaderHtml,
    metricCellFn,
    noteHtml,
    initialCount = 30,
    showGrade = true,
  }
) {
  buttons.forEach((btn) => (btn.disabled = true));
  resultsEl.innerHTML = "";
  statusEl.style.display = "block";

  let cursor = 0;
  let rawScored = [];

  async function scoreUpTo(targetCursor) {
    targetCursor = Math.min(targetCursor, tickers.length);
    const isFullScan = targetCursor - cursor > initialCount; // 초기 배치보다 큰 구간을 한 번에 요청하면 "전체보기" 클릭으로 간주
    try {
      const pending = tickers.slice(cursor, targetCursor);
      if (pending.length > 0) {
        const startCursor = cursor;
        statusEl.style.display = "block";
        const label2 = isFullScan ? `전체 검색 중(약 1분 소요될 수 있어요)` : `${label} 확인 중`;
        statusEl.textContent = `${startCursor}/${targetCursor} 종목 ${label2}...`;
        const metricsList = await mapWithConcurrency(pending, 5, getFullMetrics, (completed) => {
          statusEl.textContent = `${startCursor + completed}/${targetCursor} 종목 ${label2}...`;
        });
        rawScored = rawScored.concat(metricsList.filter(Boolean));
        cursor = targetCursor;
      }
      statusEl.style.display = "none";

      if (rawScored.length === 0) {
        resultsEl.innerHTML = `<p class="muted">순위를 계산하지 못했습니다. 잠시 후 다시 시도해주세요.</p>`;
        return;
      }

      const ranked = await mapFn(rawScored.slice());
      ranked.sort(sortFn);
      const hasMore = cursor < tickers.length;

      if (showGrade) {
        const { sp500Return } = await getMarketReturnsCached();
        ranked.forEach((r) => {
          if (r.riskTotal === undefined) r.riskTotal = computeRiskScore(r, sp500Return).total;
          if (r.isIPO === undefined) r.isIPO = isRecentIPO(r.firstTradeDate);
        });
      }
      const gradeCellHtml = (r) => (r.isIPO ? "IPO" : `<b>${r.riskTotal}/10</b>`);

      const rows = ranked
        .map(
          (r, i) => `
        <tr>
          <td>${i + 1}${surgeWarningEmoji(r.fiveDayExtremes)}</td>
          <td><b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(r.symbol)}</b></td>
          <td>${r.price !== undefined && r.price !== null ? priceChartLink(r.symbol, "$" + r.price.toFixed(2)) : "N/A"}</td>
          <td>${metricCellFn(r)}</td>${showGrade ? `<td>${gradeCellHtml(r)}</td>` : ""}
        </tr>`
        )
        .join("");
      resultsEl.innerHTML = `
        ${noteHtml || ""}
        <p class="muted" style="font-size:12px;">시가총액 상위 ${Math.min(cursor, initialCount)}개${cursor > initialCount ? ` + 나머지 ${cursor - initialCount}개` : ""} 확인(S&amp;P500 ${tickers.length}개 중 ${cursor}개, ${ranked.length}개 성공)</p>
        <table class="top30-table">
          <thead><tr><th>순위</th><th>티커</th><th>현재가</th><th>${metricHeaderHtml}</th>${showGrade ? `<th>투자등급</th>` : ""}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${hasMore ? `<button type="button" class="cat-btn load-more-btn" data-next-count="${tickers.length}">전체보기 (나머지 ${tickers.length - cursor}개 · 500개 전부 검색 시 약 1분 소요)</button>` : ""}
      `;
    } catch (err) {
      statusEl.textContent = `❌ ${err.message || "분석 중 오류가 발생했습니다."}`;
    }
  }

  resultsEl._loadMore = (count) => {
    const moreBtn = resultsEl.querySelector(".load-more-btn");
    if (moreBtn) {
      moreBtn.disabled = true;
      moreBtn.textContent = "전체 검색 중...";
    }
    scoreUpTo(count);
  };
  if (!resultsEl.dataset.moreBound) {
    resultsEl.addEventListener("click", (e) => {
      const moreBtn = e.target.closest(".load-more-btn");
      if (!moreBtn) return;
      resultsEl._loadMore(Number(moreBtn.dataset.nextCount));
    });
    resultsEl.dataset.moreBound = "1";
  }

  await scoreUpTo(initialCount);
  buttons.forEach((btn) => (btn.disabled = false));
}

const VALUE_DISCLAIMER = `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> S&amp;P500 편입 종목 전체를 대상으로 계산한 순위이며 투자 자문이 아닙니다.</p>`;

// 가치평가 서브내비에서 현재 선택된 버튼만 활성 표시
function setValuationActive(activeBtn) {
  Object.values(valuationButtons).forEach((b) => b && b.classList.toggle("active", b === activeBtn));
}
const bindValuation = (btn, run) =>
  btn.addEventListener("click", () => {
    setValuationActive(btn);
    run();
  });

async function runValueScreenFromSP500(btn, label, opts) {
  setValuationActive(btn);
  valuationStatus.style.display = "block";
  valuationStatus.textContent = "S&P500 종목 목록을 불러오는 중...";
  const allTickers = await getSP500PriorityOrder().catch((e) => {
    valuationStatus.textContent = `❌ ${e.message || "종목 목록을 가져오지 못했습니다."}`;
    return null;
  });
  if (!allTickers) return;
  await renderValueRanking(allTickers, label, {
    statusEl: valuationStatus,
    resultsEl: valuationResults,
    buttons: [btn],
    ...opts,
  });
}

const fmtGrowthCell = (v) => (v === null || v === undefined ? "N/A" : `<span class="${v >= 0 ? "delta-up" : "delta-down"}">${fmtPct(v, 1)}</span>`);

async function runValueRevenue() {
  await runValueScreenFromSP500(valuationButtons.revenue, "매출액 증가", {
    sortFn: (a, b) => (b.revenueGrowthAnnual ?? -Infinity) - (a.revenueGrowthAnnual ?? -Infinity),
    metricHeaderHtml: "매출액 증가율(YoY)",
    metricCellFn: (r) => fmtGrowthCell(r.revenueGrowthAnnual),
    noteHtml: VALUE_DISCLAIMER,
  });
}

async function runValueCashFlow() {
  await runValueScreenFromSP500(valuationButtons.cashFlow, "현금흐름 증가", {
    sortFn: (a, b) => (b.operatingCashFlowGrowthAnnual ?? -Infinity) - (a.operatingCashFlowGrowthAnnual ?? -Infinity),
    metricHeaderHtml: "영업현금흐름 증가율(YoY)",
    metricCellFn: (r) => fmtGrowthCell(r.operatingCashFlowGrowthAnnual),
    noteHtml: VALUE_DISCLAIMER,
  });
}

async function runValueNetIncome() {
  await runValueScreenFromSP500(valuationButtons.netIncome, "순이익 증가", {
    sortFn: (a, b) => (b.netIncomeGrowthAnnual ?? -Infinity) - (a.netIncomeGrowthAnnual ?? -Infinity),
    metricHeaderHtml: "순이익 증가율(YoY)",
    metricCellFn: (r) => fmtGrowthCell(r.netIncomeGrowthAnnual),
    noteHtml: VALUE_DISCLAIMER,
  });
}

async function runValueEps() {
  await runValueScreenFromSP500(valuationButtons.eps, "EPS", {
    sortFn: (a, b) => (b.eps ?? -Infinity) - (a.eps ?? -Infinity),
    metricHeaderHtml: "주당순이익(EPS)",
    metricCellFn: (r) => (r.eps === null || r.eps === undefined ? "N/A" : `$${r.eps.toFixed(2)}`),
    noteHtml: VALUE_DISCLAIMER,
  });
}

async function runValuePer() {
  await runValueScreenFromSP500(valuationButtons.per, "PER", {
    sortFn: (a, b) => (a.per ?? Infinity) - (b.per ?? Infinity),
    metricHeaderHtml: "PER(현재가 기준)",
    metricCellFn: (r) => (r.per === null || r.per === undefined ? "N/A" : `${r.per.toFixed(1)}배`),
    noteHtml: `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> PER = 현재가 ÷ 최근 회계연도 EPS(낮을수록 저평가), 적자 기업은 N/A 처리되어 순위에서 제외됩니다. 투자 자문이 아닙니다.</p>`,
  });
}

async function runValueStability() {
  const { sp500Return } = await getMarketReturns();
  await runValueScreenFromSP500(valuationButtons.stability, "투자안정", {
    mapFn: (list) =>
      list.map((m) => ({ ...m, riskTotal: computeRiskScore(m, sp500Return).total, isIPO: isRecentIPO(m.firstTradeDate) })),
    sortFn: (a, b) => b.riskTotal - a.riskTotal,
    metricHeaderHtml: "투자안정성 점수",
    metricCellFn: (r) => (r.isIPO ? "IPO" : `<b>${r.riskTotal}/10</b>`),
    noteHtml: `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 투자안정성 점수(10점 만점, 높을수록 재무적으로 안정적)는 신용등급·모멘텀·수익성·시가총액을 종합한 참고용 지표이며 투자 자문이 아닙니다.</p>`,
    showGrade: false,
  });
}

async function runValueMarketCap() {
  await runValueScreenFromSP500(valuationButtons.marketCap, "시가총액", {
    sortFn: (a, b) => (b.marketCap || 0) - (a.marketCap || 0),
    metricHeaderHtml: "시가총액",
    metricCellFn: (r) => (r.marketCap ? fmtCompactCurrency(r.marketCap) : "N/A"),
    noteHtml: VALUE_DISCLAIMER,
  });
}

bindValuation(valuationButtons.revenue, runValueRevenue);
bindValuation(valuationButtons.cashFlow, runValueCashFlow);
bindValuation(valuationButtons.netIncome, runValueNetIncome);
bindValuation(valuationButtons.eps, runValueEps);
bindValuation(valuationButtons.per, runValuePer);
bindValuation(valuationButtons.stability, runValueStability);
bindValuation(valuationButtons.marketCap, runValueMarketCap);

// 인사이트 대분류(1.자산&투자사 / 2.브랜드평판순 / 3.신기술 / 4.실적&공시 일정 / 5.뉴스) 전환
// "자산&투자사"를 선택했을 때만 기관 2단 서브버튼(insightFirmsNav)을 보여줌
let insightActiveCategory = "firms";
let insightActiveInstitution = "blackrock";
const insightFirmsNav = el("insightFirmsNav");
const insightBrandNav = el("insightBrandNav");
function setInsightCategoryActive(key) {
  Object.entries(insightCategoryButtons).forEach(([k, btn]) => btn && btn.classList.toggle("active", k === key));
}
function switchInsightCategory(key) {
  if (insightActiveCategory === key) return;
  insightActiveCategory = key;
  setInsightCategoryActive(key);
  insightFirmsNav.style.display = key === "firms" ? "" : "none";
  insightBrandNav.style.display = key === "brand" ? "" : "none";
  runInsightCategory(key);
}
Object.entries(insightCategoryButtons).forEach(([key, btn]) => {
  if (!btn) return;
  btn.addEventListener("click", () => switchInsightCategory(key));
});
setInsightCategoryActive(insightActiveCategory);

function runInsightCategory(key) {
  if (key === "firms") runInsight(insightActiveInstitution);
  else if (key === "brand") runInsightBrand(insightActiveBrandOrg);
  else if (key === "tech") runInsightTech();
  else if (key === "calendar") runInsightCalendar();
  else if (key === "news") runInsightNews();
  else if (key === "futureIndustry") runInsightFutureIndustry();
}

// 인사이트 서브내비(거대기업 13F 보유종목)에서 현재 선택된 버튼만 활성 표시
function setInsightActive(activeBtn) {
  Object.values(insightButtons).forEach((b) => b && b.classList.toggle("active", b === activeBtn));
}
const bindInsight = (btn, institution) =>
  btn.addEventListener("click", () => {
    insightActiveInstitution = institution;
    setInsightActive(btn);
    runInsight(institution);
  });
bindInsight(insightButtons.blackrock, "blackrock");
bindInsight(insightButtons.vanguard, "vanguard");
bindInsight(insightButtons.stateStreet, "stateStreet");
bindInsight(insightButtons.berkshire, "berkshire");
bindInsight(insightButtons.goldman, "goldman");
bindInsight(insightButtons.morganStanley, "morganStanley");
bindInsight(insightButtons.jpmorgan, "jpmorgan");
bindInsight(insightButtons.ark, "ark");
bindInsight(insightButtons.softbank, "softbank");

// 거대기업(블랙록·뱅가드·버크셔 등) 13F 공시 기반 보유종목 TOP20
// SEC EDGAR 13F-HR(분기 공시)에서 직접 집계한 데이터. 13F는 분기 1회(최대 45일 지연)만 갱신되므로
// 실시간 백엔드 대신 분기마다 이 스냅샷을 갱신하는 방식으로 운영(자세한 내용은 각 institution 데이터의 asOf/prevAsOf 참고)
// 윗줄(자산운용사) = 블랙록·뱅가드·State Street(패시브 3대 운용사), 아랫줄(투자회사) = 버크셔·골드만삭스·모건스탠리·JP모건
const INSIGHT_INSTITUTION_LABELS = {
  blackrock: "블랙록",
  vanguard: "뱅가드",
  stateStreet: "State Street",
  berkshire: "버크셔 해서웨이",
  goldman: "골드만삭스",
  morganStanley: "모건스탠리",
  jpmorgan: "JP모건 체이스",
  ark: "ARK 인베스트",
  softbank: "소프트뱅크",
};

// 실제 데이터는 data/insight-<institution>.json에서 fetch — 이 파일들은 scripts/scan-13f.js가
// SEC EDGAR 13F-HR 공시를 직접 파싱해서 만들고, GitHub Actions(.github/workflows/insight-13f-scan.yml)가
// 매일 새 공시 여부를 확인해 자동으로 갱신·커밋한다(공시 다음날 안에 반영됨).
const insightDataCache = {};
async function getInsightData(institution) {
  if (insightDataCache[institution]) return insightDataCache[institution];
  const res = await fetch(`data/insight-${institution}.json`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  insightDataCache[institution] = data;
  return data;
}

function fmtBigUSD(usd, signed = false) {
  const sign = signed ? (usd > 0 ? "+" : usd < 0 ? "-" : "") : "";
  const abs = Math.abs(usd);
  let str;
  if (abs >= 1e12) str = `$${(abs / 1e12).toFixed(2)}T`;
  else if (abs >= 1e9) str = `$${(abs / 1e9).toFixed(2)}B`;
  else if (abs >= 1e6) str = `$${(abs / 1e6).toFixed(1)}M`;
  else str = `$${abs.toLocaleString()}`;
  return sign + str;
}

// "2026-05-15" -> "5/15"(제출일 기준 짧은 표기, 앞자리 0 제거)
function fmtSubmitMD(isoDate) {
  const [, m, d] = isoDate.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function insightTableHtml(data) {
  const rows = data.holdings
    .map((h, i) => {
      const weightHtml =
        h.weightChangePt === null
          ? `${h.weightPct.toFixed(2)}%<br><span class="muted" style="font-size:11px;white-space:nowrap;">(신규)</span>`
          : `${h.weightPct.toFixed(2)}%<br><span class="${h.weightChangePt >= 0 ? "delta-up" : "delta-down"}" style="font-size:11px;white-space:nowrap;">(${fmtPct(h.weightChangePt, 2)})</span>`;
      const valueDeltaHtml =
        h.valueChangePct === null
          ? `<span class="muted">신규 편입</span>`
          : `<span class="${h.valueChangeUSD >= 0 ? "delta-up" : "delta-down"}">${fmtBigUSD(h.valueChangeUSD, true)} (${fmtPct(h.valueChangePct, 1)})</span>`;
      const nameCellHtml = h.ticker
        ? `<span class="ticker-cell">${tickerLogoHtml(h.ticker)}<b class="ticker-link" data-ticker="${escapeHtml(h.ticker)}">${escapeHtml(h.ticker)}</b></span><br><span class="muted" style="font-size:11px;">${escapeHtml(h.name)}</span>`
        : `<b>${escapeHtml(h.name)}</b><br><span class="muted" style="font-size:11px;">티커 매칭 안 됨</span>`;
      return `
      <tr>
        <td>${i + 1}</td>
        <td>${nameCellHtml}</td>
        <td>${weightHtml}</td>
        <td>${fmtBigUSD(h.valueUSD)}<br><span style="font-size:11px;">${valueDeltaHtml}</span></td>
      </tr>`;
    })
    .join("");

  const noteHtml = data.dataNote
    ? `<p class="disclaimer" style="color:#f5a623;">⚠️ ${escapeHtml(data.dataNote)}</p>`
    : "";
  return `
    <p class="disclaimer tab-note">📢 <b>${escapeHtml(data.filerName)}</b> SEC 13F 공시 기준(${data.asOf} 보유 기준, ${data.filedDate} 제출) 보유종목 TOP20 · 총 신고 가치 ${fmtBigUSD(data.totalValueUSD)} · 직전 제출(${data.prevFiledDate}) 대비 비중·금액 변동 표시. 13F는 매수/매도 시점이 아닌 분기말 스냅샷이라 최대 45일 지연될 수 있으며, 투자 자문이 아닙니다.</p>
    ${noteHtml}
    <table class="top30-table insight-holdings-table">
      <colgroup>
        <col class="col-rank" /><col class="col-name" /><col class="col-weight" /><col class="col-value" />
      </colgroup>
      <thead>
        <tr><th>순위</th><th>종목</th><th>${data.filedDate.slice(5)}<br>비중 (변동)</th><th>총 신고가치<br>(금액변동)</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function runInsight(institution) {
  insightActiveInstitution = institution;
  insightActiveCategory = "firms";
  setInsightCategoryActive("firms");
  insightFirmsNav.style.display = "";
  setInsightActive(insightButtons[institution]);
  const status = el("insightStatus");
  const results = el("insightResults");
  status.style.display = "";
  status.textContent = `⏳ ${INSIGHT_INSTITUTION_LABELS[institution]} 데이터를 불러오는 중...`;
  results.innerHTML = "";
  const data = await getInsightData(institution);
  if (!data || !Array.isArray(data.holdings)) {
    status.textContent = `🚧 ${INSIGHT_INSTITUTION_LABELS[institution]} 보유종목 데이터는 준비 중입니다. SEC 13F 공시(분기 공개, 최대 45일 지연)를 기반으로 곧 제공될 예정입니다.`;
    return;
  }
  status.style.display = "none";
  results.innerHTML = insightTableHtml(data);
}

// ---------- 2. 브랜드평판순 ----------
// Axios Harris Poll 100(2026년 전체 100개, RQ 점수) · RepTrak(2026년 전체표는 이메일 등록 리포트에만 있어
// 공개된 가장 최신 완전판인 2025년 Global RepTrak 100 + 뉴스에 공개된 2026년 확인 순위 일부) ·
// YouGov(연간 유료 리포트 대신 같은 회사가 실시간 공개 운영하는 Ratings 사이트의 인기도 지표, 40위까지)
// — 세 곳 모두 실제 웹에 공개된 데이터만 정적으로 data/brand-reputation-*.json에 정리해두고,
// 현재가·1년 변동은 이 함수가 매번 실시간으로 조회해서 붙임
const BRAND_ORG_DATA_FILE = {
  harris: "data/brand-reputation-harris.json",
  reptrak: "data/brand-reputation-reptrak.json",
  yougov: "data/brand-reputation-yougov.json",
};
const BRAND_ORG_LABEL = { harris: "Axios Harris Poll 100", reptrak: "RepTrak", yougov: "YouGov" };
const insightBrandButtons = {
  harris: el("insightBrandHarrisBtn"),
  reptrak: el("insightBrandReptrakBtn"),
  yougov: el("insightBrandYougovBtn"),
};
let insightActiveBrandOrg = "harris";
function setInsightBrandActive(org) {
  Object.entries(insightBrandButtons).forEach(([k, btn]) => btn && btn.classList.toggle("active", k === org));
}
Object.entries(insightBrandButtons).forEach(([org, btn]) => {
  btn.addEventListener("click", () => {
    if (insightActiveCategory === "brand" && insightActiveBrandOrg === org) return;
    insightActiveCategory = "brand";
    setInsightCategoryActive("brand");
    insightFirmsNav.style.display = "none";
    insightBrandNav.style.display = "";
    runInsightBrand(org);
  });
});
setInsightBrandActive(insightActiveBrandOrg);

const brandDataCache = {};
async function getBrandData(org) {
  if (brandDataCache[org]) return brandDataCache[org];
  const res = await fetch(BRAND_ORG_DATA_FILE[org], { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  brandDataCache[org] = data;
  return data;
}

// 가벼운 조회(차트 1개만)로 현재가 + 1년 변동(금액·%)만 계산 — getFullMetrics는 재무제표까지 같이 가져와
// 브랜드 100개를 한꺼번에 조회하기엔 과함
async function getPriceAnd1yReturn(symbol) {
  try {
    const chartData = await yahooChart(symbol, "1y");
    const result = chartData && chartData.chart && chartData.chart.result && chartData.chart.result[0];
    if (!result) return null;
    const pairs = chartClosePairs(chartData);
    const latest = pairs[pairs.length - 1];
    const base = pairs.length >= 2 ? closestPair(pairs, latest.t - YEAR_SECONDS) : null;
    return {
      price: result.meta.regularMarketPrice,
      currency: result.meta.currency,
      oneYearReturn: get1yReturnFromChart(chartData),
      oneYearChangeAmt: base && base.c && latest ? latest.c - base.c : null,
    };
  } catch {
    return null;
  }
}

function brandRepTableHtml(rows, scoreLabel) {
  const trs = rows
    .map((r) => {
      const nameCell = r.ticker
        ? `<span class="ticker-cell">${tickerLogoHtml(r.ticker)}<b class="ticker-link" data-ticker="${escapeHtml(r.ticker)}">${escapeHtml(r.name)}</b></span>`
        : `<span class="ticker-cell"><span class="ticker-logo-wrap"><span class="ticker-logo-badge" style="display:flex;">${escapeHtml(r.name.slice(0, 2))}</span></span>${escapeHtml(r.name)}</span>`;
      let priceCell = `<span class="muted">비상장·매칭없음</span>`;
      if (r.ticker) {
        priceCell = r.metrics
          ? `${priceChartLink(r.ticker, "$" + r.metrics.price.toFixed(2))}<br><span class="${r.metrics.oneYearReturn >= 0 ? "delta-up" : "delta-down"}" style="font-size:11px;">${r.metrics.oneYearChangeAmt !== null ? `${r.metrics.oneYearChangeAmt >= 0 ? "+" : ""}$${r.metrics.oneYearChangeAmt.toFixed(2)} ` : ""}${r.metrics.oneYearReturn !== null ? `(${fmtPct(r.metrics.oneYearReturn)})` : "N/A"}</span>`
          : `<span class="muted">조회 실패</span>`;
      }
      const scoreCell = r.score !== null && r.score !== undefined ? r.score : r.prevRank ? `전년 ${r.prevRank}위` : "—";
      return `<tr><td>${r.rank}</td><td>${nameCell}</td><td>${priceCell}</td><td>${scoreCell}</td></tr>`;
    })
    .join("");
  return `
    <table class="top30-table brand-rep-table">
      <thead><tr><th>순위</th><th>기업</th><th>현재가(1년 변동)</th><th>${escapeHtml(scoreLabel)}</th></tr></thead>
      <tbody>${trs}</tbody>
    </table>`;
}

const BRAND_PAGE_SIZE = 30;
const BRAND_PAGE_STEP = 20;
async function runInsightBrand(org) {
  insightActiveBrandOrg = org;
  setInsightBrandActive(org);
  const status = el("insightStatus");
  const results = el("insightResults");
  status.style.display = "";
  status.textContent = `⏳ ${BRAND_ORG_LABEL[org]} 데이터를 불러오는 중...`;
  results.innerHTML = "";

  const data = await getBrandData(org);
  if (!data || !Array.isArray(data.companies)) {
    status.textContent = `🚧 ${BRAND_ORG_LABEL[org]} 데이터를 가져오지 못했습니다.`;
    return;
  }
  status.style.display = "none";

  const rows = data.companies;
  let shownCount = 0;

  async function showUpTo(count) {
    const pending = rows.slice(shownCount, count).filter((r) => r.ticker && !r.metrics);
    if (pending.length) {
      const metricsList = await mapWithConcurrency(pending, 4, (r) => getPriceAnd1yReturn(r.ticker));
      pending.forEach((r, i) => {
        r.metrics = metricsList[i];
      });
    }
    shownCount = count;
    const shown = rows.slice(0, shownCount);
    const hasMore = shownCount < rows.length;
    const nextCount = Math.min(shownCount + BRAND_PAGE_STEP, rows.length);
    const confirmedNote =
      data.confirmed2026 && data.confirmed2026.length
        ? `<p class="disclaimer" style="margin-top:8px;">✅ 2026년 확인된 순위: ${data.confirmed2026.map((c) => `${escapeHtml(c.name)} ${c.rank}위`).join(" · ")}</p>`
        : "";
    results.innerHTML = `
      <p class="disclaimer tab-note">📢 ${escapeHtml(data.sourceNote)} <a href="${escapeHtml(data.sourceUrl)}" target="_blank" rel="noopener">출처 보기</a></p>
      ${brandRepTableHtml(shown, data.scoreLabel)}
      ${hasMore ? `<button type="button" class="cat-btn load-more-btn" data-next-count="${nextCount}">더보기 (${shownCount}/${rows.length})</button>` : ""}
      ${confirmedNote}
    `;
  }

  results._loadMore = (count) => showUpTo(count);
  if (!results.dataset.brandMoreBound) {
    results.addEventListener("click", (e) => {
      const moreBtn = e.target.closest(".load-more-btn");
      if (!moreBtn) return;
      moreBtn.disabled = true;
      moreBtn.textContent = "불러오는 중...";
      results._loadMore(Number(moreBtn.dataset.nextCount));
    });
    results.dataset.brandMoreBound = "1";
  }

  await showUpTo(Math.min(BRAND_PAGE_SIZE, rows.length));
}

// ---------- 3. 신기술 ----------
// MIT Technology Review·McKinsey·IEEE Spectrum·OECD 4곳의 최신 글을 매일 자동으로 요약·삽화 생성해
// data/techinsight.json + data/techinsight-images/ 로 저장하는 파이프라인(scripts/scan-techinsight.js,
// GitHub Actions techinsight-daily.yml)의 결과를 카드 형태로 표시. 첫 자동 실행 전에는 데이터가 없을 수 있음
const TECH_SOURCE_LABEL = {
  mit: "MIT Technology Review",
  mckinsey: "McKinsey",
  ieee: "IEEE Spectrum",
  oecd: "OECD",
};
let techInsightDataPromise = null;
function getTechInsightData() {
  if (!techInsightDataPromise) {
    techInsightDataPromise = fetch("data/techinsight.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);
  }
  return techInsightDataPromise;
}

function techInsightCardHtml(item) {
  const sourceLabel = TECH_SOURCE_LABEL[item.sourceKey] || item.source;
  return `
    <div class="tech-insight-card">
      <img class="tech-insight-img" src="${escapeHtml(item.image)}" alt="" loading="lazy" />
      <div class="tech-insight-body">
        <span class="tech-insight-source">${escapeHtml(sourceLabel)}</span>
        <h3 class="tech-insight-title">${escapeHtml(item.title)}</h3>
        <p class="tech-insight-summary">${escapeHtml(item.summary).replace(/\n/g, "<br>")}</p>
        <a class="tech-insight-link" href="${escapeHtml(item.link)}" target="_blank" rel="noopener">원문 보기(${escapeHtml(sourceLabel)}) →</a>
      </div>
    </div>`;
}

async function runInsightTech() {
  const status = el("insightStatus");
  const results = el("insightResults");
  status.style.display = "";
  status.textContent = "⏳ 신기술 인사이트를 불러오는 중...";
  results.innerHTML = "";

  const items = await getTechInsightData();
  if (!Array.isArray(items) || items.length === 0) {
    status.textContent = "🚧 신기술 인사이트는 준비 중입니다. 매일 자동 수집이 시작되면 곧 표시됩니다.";
    return;
  }
  status.style.display = "none";
  results.innerHTML = `
    <p class="disclaimer tab-note">📢 MIT Technology Review·McKinsey·IEEE Spectrum·OECD의 최신 글 핵심을 자체적으로 요약·재구성한 것이며, 정확한 내용은 원문 링크에서 확인하세요. 삽화는 AI로 생성되어 실제 사진과 다를 수 있습니다.</p>
    <div class="tech-insight-list">${items.map(techInsightCardHtml).join("")}</div>
  `;
}

// ---------- 4. 실적&공시 일정 ----------
// 일반기업 실적발표(주요 대형주, Yahoo fundamentals-timeseries로 실시간 추정) + 13F 기관 공시 마감 +
// 미국/한국/일본 금리 발표 + 미국 CPI·고용지표(정적 조사 데이터, data/econ-calendar-2026.json) +
// 미국 옵션만기일(매월 세번째 금요일, 계산) + 관심종목의 실적발표·배당락(추정)을 합쳐
// 이번달·다음달 달력(월간 그리드) + 날짜순 목록으로 표시
const CALENDAR_WATCHLIST = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK-B", "JPM", "WMT"];
const ECON_CALENDAR_CATEGORY_LABEL = {
  earnings: "🏢 기업실적",
  "13f": "📑 13F 공시",
  rate: "🏦 금리",
  cpi: "📈 CPI",
  jobs: "👷 고용지표",
  opex: "📅 옵션만기",
};
const ECON_CALENDAR_COUNTRY_FLAG = { us: "🇺🇸", kr: "🇰🇷", jp: "🇯🇵" };
const CAL_DOT_CLASS = {
  rate: "cal-dot-rate",
  cpi: "cal-dot-cpi",
  jobs: "cal-dot-jobs",
  "13f": "cal-dot-13f",
  opex: "cal-dot-opex",
};

// 매달 세 번째 금요일(미국 개별주식·지수옵션 월간 만기일) — 3/6/9/12월은 분기 마감(쿼드러플 위칭)으로 별도 표기
function usOptionsExpirationDates(year) {
  const dates = [];
  for (let month = 0; month < 12; month++) {
    const d = new Date(year, month, 1);
    const firstFriday = 1 + ((5 - d.getDay() + 7) % 7);
    const thirdFriday = firstFriday + 14;
    const quad = [2, 5, 8, 11].includes(month);
    dates.push({ date: new Date(year, month, thirdFriday), quad });
  }
  return dates;
}

let econCalendarDataPromise = null;
function getEconCalendarData() {
  if (!econCalendarDataPromise) {
    econCalendarDataPromise = fetch("data/econ-calendar-2026.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .catch(() => ({ events: [] }));
  }
  return econCalendarDataPromise;
}

function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
// 달력상 분기 라벨(1~4분기)는 회사별 회계연도가 아니라 해당 날짜가 속한 일반 달력 분기를 표시하는 근사치
function fiscalQuarterLabel(date) {
  return `${Math.floor(date.getMonth() / 3) + 1}분기`;
}

// 관심종목(대형주)의 다음 분기 마감일 기준 발표 예정일을 근사 추정(회계분기 마감 + 약 1개월 뒤) — 정확한 발표일은
// quoteSummary(calendarEvents)가 이 앱의 무인증 프록시에서 "Invalid Crumb" 오류로 막혀 있어 가져올 수 없음
async function estimateNextEarningsDate(symbol) {
  try {
    const data = await yahooFundamentals(symbol, "quarterlyTotalRevenue");
    const resultArr = data && data.timeseries && data.timeseries.result;
    const items = (resultArr && resultArr[0] && resultArr[0].quarterlyTotalRevenue) || [];
    const dates = items.map((it) => it && it.asOfDate).filter(Boolean).sort();
    if (dates.length === 0) return null;
    const lastQuarterEnd = new Date(dates[dates.length - 1] + "T00:00:00");
    const nextQuarterEnd = addMonths(lastQuarterEnd, 3);
    const estReportDate = addMonths(nextQuarterEnd, 1);
    return { symbol, date: estReportDate, quarterLabel: fiscalQuarterLabel(nextQuarterEnd) };
  } catch {
    return null;
  }
}

// 과거 배당 지급일 간격(최근 4회 평균 주기)으로 다음 배당락일을 근사 추정 — 배당을 지급하지 않는 종목은 null 반환
async function estimateNextDividendDate(symbol) {
  try {
    const data = await yahooDividends(symbol);
    const result = data && data.chart && data.chart.result && data.chart.result[0];
    const divEvents = result && result.events && result.events.dividends;
    if (!divEvents) return null;
    const dates = Object.values(divEvents)
      .map((d) => new Date(d.date * 1000))
      .sort((a, b) => a - b);
    if (dates.length < 2) return null;
    const recent = dates.slice(-4);
    let totalGapDays = 0;
    for (let i = 1; i < recent.length; i++) totalGapDays += (recent[i] - recent[i - 1]) / 86400000;
    const avgGapDays = totalGapDays / (recent.length - 1);
    if (!avgGapDays || avgGapDays < 20) return null; // 비정상적으로 짧은 간격(데이터 이상)은 제외
    let nextDate = new Date(dates[dates.length - 1].getTime() + avgGapDays * 86400000);
    const now = new Date();
    let guard = 0;
    while (nextDate < now && guard++ < 12) nextDate = new Date(nextDate.getTime() + avgGapDays * 86400000);
    return { symbol, date: nextDate, quarterLabel: fiscalQuarterLabel(nextDate) };
  } catch {
    return null;
  }
}

// 캘린더에 표시할 전체 이벤트 목록(거시일정 + 옵션만기 + 관심종목 실적·배당) 구성
// 관심종목이 없으면(로그아웃/미설정) 기본 대형주 목록(CALENDAR_WATCHLIST)으로 대체해 빈 화면을 방지
async function buildCalendarEvents() {
  const watchlistSymbols = getWatchlist().map((w) => w.symbol);
  const symbolsForEstimate = watchlistSymbols.length ? watchlistSymbols : CALENDAR_WATCHLIST;

  const [econData, earningsEstimates, dividendEstimates] = await Promise.all([
    getEconCalendarData(),
    mapWithConcurrency(symbolsForEstimate, 5, estimateNextEarningsDate),
    mapWithConcurrency(symbolsForEstimate, 5, estimateNextDividendDate),
  ]);

  const events = (econData.events || []).map((e) => ({ ...e, type: "macro" }));
  const now = new Date();

  [usOptionsExpirationDates(now.getFullYear()), usOptionsExpirationDates(now.getFullYear() + 1)].flat().forEach((o) => {
    events.push({
      date: toISODate(o.date),
      type: "macro",
      category: "opex",
      country: "us",
      title: o.quad ? "미국 옵션만기(쿼드러플 위칭)" : "미국 옵션만기(월간)",
    });
  });

  earningsEstimates.filter(Boolean).forEach((e) => {
    events.push({
      date: toISODate(e.date),
      type: "stock",
      category: "earnings",
      symbol: e.symbol,
      title: `${e.quarterLabel} 실적발표(추정)`,
    });
  });
  dividendEstimates.filter(Boolean).forEach((e) => {
    events.push({
      date: toISODate(e.date),
      type: "stock",
      category: "dividend",
      symbol: e.symbol,
      title: `${e.quarterLabel} 배당락(추정)`,
    });
  });

  return { events, usingWatchlist: watchlistSymbols.length > 0 };
}

// 월간 그리드(일~토, 6행 고정칸) HTML — 이벤트가 있는 날짜는 상단에 최대 3개까지 점/미니로고, 초과분은 +N
function calendarMonthGridHtml(year, month, eventsByDate, todayISO) {
  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const dowHtml = ["일", "월", "화", "수", "목", "금", "토"]
    .map((s, i) => `<div class="cal-dow${i === 0 ? " cal-dow-sun" : ""}${i === 6 ? " cal-dow-sat" : ""}">${s}</div>`)
    .join("");

  const dayHtml = cells
    .map((d) => {
      if (d === null) return `<div class="cal-day cal-day-empty"></div>`;
      const iso = toISODate(new Date(year, month, d));
      const dayEvents = eventsByDate[iso] || [];
      const isToday = iso === todayISO;
      const dow = new Date(year, month, d).getDay();
      // 로고 아이콘이 커진 만큼(18px) 한 칸에 최대 2개까지만 보여주고 나머지는 +N 배지로(좁은 화면에서 겹침 방지)
      // 금리 발표는 국가별로 달라 색점 대신 국기 이모지로 표시(미국/한국/일본을 한눈에 구분)
      const iconsHtml = dayEvents
        .slice(0, 2)
        .map((e) => {
          if (e.type === "stock") return `<span class="cal-day-icon cal-day-icon-logo">${tickerLogoHtml(e.symbol)}</span>`;
          if (e.category === "rate") return `<span class="cal-day-icon cal-day-icon-flag">${ECON_CALENDAR_COUNTRY_FLAG[e.country] || "🏦"}</span>`;
          return `<span class="cal-day-icon cal-dot ${CAL_DOT_CLASS[e.category] || "cal-dot-etc"}"></span>`;
        })
        .join("");
      const overflow = dayEvents.length > 2 ? `<span class="cal-day-more">+${dayEvents.length - 2}</span>` : "";
      // 날짜를 누르면 지난 날짜여도(이번 달에 있었던 일정 확인용) 그날의 일정을 큰 팝업으로 보여줌
      const isClickable = dayEvents.length > 0;
      const cls = ["cal-day", isClickable ? "has-event" : "", isToday ? "cal-day-today" : "", dow === 0 ? "cal-day-sun" : "", dow === 6 ? "cal-day-sat" : ""]
        .filter(Boolean)
        .join(" ");
      return `<div class="${cls}" data-date="${iso}"><span class="cal-day-num">${d}</span><span class="cal-day-icons">${iconsHtml}${overflow}</span></div>`;
    })
    .join("");

  return `
    <div class="cal-month">
      <h3 class="cal-month-title">${year}년 ${monthNames[month]}</h3>
      <div class="cal-grid">${dowHtml}${dayHtml}</div>
    </div>`;
}

// 날짜별 목록(아젠다) — 종목 이벤트는 같은 날짜·같은 종목끼리 로고 하나에 내용을 쉼표로 묶어 표시(예: "로고 AAPL: 3분기 실적발표, 3분기 배당락")
function calendarAgendaHtml(events, rangeStartISO, rangeEndISO) {
  const filtered = events.filter((e) => e.date >= rangeStartISO && e.date <= rangeEndISO).sort((a, b) => a.date.localeCompare(b.date));
  if (filtered.length === 0) return `<p class="muted" style="text-align:center;padding:16px 0;">표시할 예정 일정이 없습니다.</p>`;

  const byDate = {};
  filtered.forEach((e) => {
    (byDate[e.date] = byDate[e.date] || []).push(e);
  });

  return Object.keys(byDate)
    .sort()
    .map((date) => {
      const dayEvents = byDate[date];
      const macroRows = dayEvents
        .filter((e) => e.type === "macro")
        .map((e) => {
          const flag = ECON_CALENDAR_COUNTRY_FLAG[e.country] || "";
          const catLabel = ECON_CALENDAR_CATEGORY_LABEL[e.category] || e.category;
          return `<div class="cal-agenda-row"><span class="cal-agenda-cat">${catLabel}</span><span class="cal-agenda-text">${flag} ${escapeHtml(e.title)}</span></div>`;
        })
        .join("");

      const stockGroups = {};
      dayEvents
        .filter((e) => e.type === "stock")
        .forEach((e) => {
          (stockGroups[e.symbol] = stockGroups[e.symbol] || []).push(e.title);
        });
      const stockRows = Object.entries(stockGroups)
        .map(
          ([sym, titles]) =>
            `<div class="cal-agenda-row"><span class="cal-agenda-logo">${tickerLogoHtml(sym)}</span><span class="cal-agenda-text"><b class="ticker-link" data-ticker="${escapeHtml(sym)}">${escapeHtml(sym)}</b> ${titles.map((t) => escapeHtml(t)).join(", ")}</span></div>`
        )
        .join("");

      const d = new Date(date + "T00:00:00");
      const dow = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
      return `<div class="cal-agenda-group" id="cal-agenda-${date}"><div class="cal-agenda-date">${d.getMonth() + 1}월 ${d.getDate()}일 (${dow})</div>${macroRows}${stockRows}</div>`;
    })
    .join("");
}

// 인사이트 탭 "실적&공시 일정" 서브버튼 — 예전처럼 날짜순 텍스트 목록만 표시(그리드 없음).
// 데이터 자체는 buildCalendarEvents()를 그대로 재사용해 관심종목 실적·배당(추정)도 함께 나옴
async function runInsightCalendar() {
  const status = el("insightStatus");
  const results = el("insightResults");
  status.style.display = "";
  status.textContent = "⏳ 실적&공시 일정을 불러오는 중...";
  results.innerHTML = "";

  const { events, usingWatchlist } = await buildCalendarEvents();
  const todayISO = toISODate(new Date());
  const upcoming = events.filter((e) => e.date >= todayISO).sort((a, b) => a.date.localeCompare(b.date));

  status.style.display = "none";
  const rows = upcoming
    .map((e) => {
      if (e.type === "stock") {
        const catLabel = e.category === "earnings" ? "🏢 기업실적" : "💰 배당락";
        return `<div class="econ-cal-row"><span class="econ-cal-date">${escapeHtml(e.date)}</span><span class="econ-cal-cat">${catLabel}</span><span class="econ-cal-title">${escapeHtml(e.symbol)} ${escapeHtml(e.title)}</span></div>`;
      }
      const flag = ECON_CALENDAR_COUNTRY_FLAG[e.country] || "";
      const catLabel = ECON_CALENDAR_CATEGORY_LABEL[e.category] || e.category;
      return `<div class="econ-cal-row"><span class="econ-cal-date">${escapeHtml(e.date)}</span><span class="econ-cal-cat">${catLabel}</span><span class="econ-cal-title">${flag} ${escapeHtml(e.title)}</span></div>`;
    })
    .join("");

  const watchlistNote = usingWatchlist
    ? "🏢·💰 항목은 회원님의 관심종목 기준입니다."
    : "🏢·💰 항목은 관심종목이 없어 주요 대형주 기준으로 표시 중입니다.";

  results.innerHTML = `
    <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 실적발표·배당락은 과거 발표 주기를 바탕으로 한 추정치, 13F 공시 마감·금리 발표·CPI·고용지표는 2026년 공식 일정 조사 기준(변경될 수 있음), 옵션만기일은 매월 세 번째 금요일로 계산한 값입니다. ${escapeHtml(watchlistNote)} 투자 자문이 아닙니다.</p>
    <div class="econ-cal-list">${rows || `<p class="muted" style="text-align:center;padding:16px 0;">표시할 예정 일정이 없습니다.</p>`}</div>
  `;
}

// ---------- 캘린더 패널(하단 네비 캘린더 아이콘) — 이번달·다음달 그리드 + 로고가 붙은 날짜별 목록 ----------
async function runCalendarPanel() {
  const status = el("calendarPanelStatus");
  const results = el("calendarPanelResults");
  status.style.display = "";
  status.textContent = "⏳ 캘린더를 불러오는 중...";
  results.innerHTML = "";

  const { events, usingWatchlist } = await buildCalendarEvents();

  const now = new Date();
  const todayISO = toISODate(now);
  const eventsByDate = {};
  events.forEach((e) => {
    (eventsByDate[e.date] = eventsByDate[e.date] || []).push(e);
  });

  const thisMonthGrid = calendarMonthGridHtml(now.getFullYear(), now.getMonth(), eventsByDate, todayISO);
  const nextMonthDate = addMonths(new Date(now.getFullYear(), now.getMonth(), 1), 1);
  const nextMonthGrid = calendarMonthGridHtml(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), eventsByDate, todayISO);

  const rangeEnd = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 1, 0);
  const agendaHtml = calendarAgendaHtml(events, todayISO, toISODate(rangeEnd));

  const watchlistNote = usingWatchlist
    ? "💰 배당락·🏢 실적발표 로고 항목은 회원님의 관심종목 기준입니다."
    : "💰 배당락·🏢 실적발표 로고 항목은 관심종목이 없어 주요 대형주 기준으로 표시 중입니다. 관심종목을 추가하면 내 종목 일정으로 바뀝니다.";

  status.style.display = "none";
  results.innerHTML = `
    <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 실적발표·배당락은 과거 발표 주기를 바탕으로 한 추정치, 13F 공시 마감·금리 발표·CPI·고용지표는 2026년 공식 일정 조사 기준(변경될 수 있음), 옵션만기일은 매월 세 번째 금요일로 계산한 값입니다. ${escapeHtml(watchlistNote)} 투자 자문이 아닙니다.</p>
    <div class="cal-wrap">
      ${thisMonthGrid}
      ${nextMonthGrid}
    </div>
    <h3 class="cal-agenda-heading">📋 다가오는 일정</h3>
    <div class="cal-agenda">${agendaHtml}</div>
  `;

  results.querySelectorAll(".cal-day.has-event").forEach((dayEl) => {
    dayEl.addEventListener("click", () => {
      openCalendarDayModal(dayEl.dataset.date, eventsByDate[dayEl.dataset.date] || []);
    });
  });
}

// 날짜 칸을 눌렀을 때 그날의 일정을 큰 글씨·큰 로고로 보여주는 팝업(과거·미래 날짜 모두 동작)
function calendarDayModalRowHtml(e) {
  if (e.type === "stock") {
    return `
      <div class="cal-day-modal-row">
        <span class="cal-day-modal-logo">${tickerLogoHtml(e.symbol)}</span>
        <div class="cal-day-modal-text"><b class="ticker-link" data-ticker="${escapeHtml(e.symbol)}">${escapeHtml(e.symbol)}</b><span>${escapeHtml(e.title)}</span></div>
      </div>`;
  }
  const flag = ECON_CALENDAR_COUNTRY_FLAG[e.country] || "";
  const catLabel = ECON_CALENDAR_CATEGORY_LABEL[e.category] || e.category;
  return `
    <div class="cal-day-modal-row">
      <span class="cal-day-modal-flag">${e.category === "rate" ? flag || "🏦" : catLabel.slice(0, 2)}</span>
      <div class="cal-day-modal-text"><b>${catLabel}</b><span>${flag && e.category !== "rate" ? flag + " " : ""}${escapeHtml(e.title)}</span></div>
    </div>`;
}
function openCalendarDayModal(iso, dayEvents) {
  const d = new Date(iso + "T00:00:00");
  const dow = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  el("calendarDayModalTitle").textContent = `${d.getMonth() + 1}월 ${d.getDate()}일 (${dow})`;
  el("calendarDayModalBody").innerHTML = dayEvents.map(calendarDayModalRowHtml).join("");
  el("calendarDayModal").style.display = "flex";
}
function closeCalendarDayModal() {
  el("calendarDayModal").style.display = "none";
}
el("calendarDayModalCloseBtn").addEventListener("click", closeCalendarDayModal);

// ---------- 5. 뉴스 ----------
// 관심종목(있으면)·없으면 주요 대형주 20개의 Yahoo Finance 뉴스를 모아 발행시각 기준 최신순으로 정렬해 TOP20 표시
const NEWS_DEFAULT_WATCHLIST = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK-B", "JPM", "WMT",
  "V", "JNJ", "UNH", "XOM", "AVGO", "LLY", "MA", "HD", "PG", "COST",
];
async function getMultiTickerNews(symbols) {
  const perSymbol = await mapWithConcurrency(symbols, 5, async (sym) => {
    try {
      const data = await yahooSearch(sym);
      return ((data && data.news) || []).map((n) => ({ ...n, symbol: sym }));
    } catch {
      return [];
    }
  });
  return perSymbol.flat();
}

async function runInsightNews() {
  const status = el("insightStatus");
  const results = el("insightResults");
  status.style.display = "";
  status.textContent = "⏳ 주요기업 최신 뉴스를 불러오는 중...";
  results.innerHTML = "";

  const watchlistSymbols = getWatchlist().map((w) => w.symbol);
  const symbols = watchlistSymbols.length ? watchlistSymbols : NEWS_DEFAULT_WATCHLIST;

  const allNews = await getMultiTickerNews(symbols);
  allNews.sort((a, b) => (b.providerPublishTime || 0) - (a.providerPublishTime || 0));
  const seenLinks = new Set();
  const top20 = [];
  for (const n of allNews) {
    if (!n.link || seenLinks.has(n.link)) continue;
    seenLinks.add(n.link);
    top20.push(n);
    if (top20.length >= 20) break;
  }

  if (top20.length === 0) {
    status.textContent = "🚧 최근 뉴스를 찾을 수 없습니다.";
    return;
  }
  status.style.display = "none";

  const translatedTitles = await Promise.all(top20.map((n) => translateToKorean(n.title || "").catch(() => n.title || "")));

  const rows = top20
    .map((n, i) => {
      const koTitle = translatedTitles[i] || n.title || "제목 없음";
      const dateStr = n.providerPublishTime
        ? new Date(n.providerPublishTime * 1000).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
        : "";
      return `
      <div class="major-news-row">
        <span class="major-news-logo">${tickerLogoHtml(n.symbol)}</span>
        <div class="major-news-body">
          <a class="major-news-title" href="${escapeHtml(n.link || "#")}" target="_blank" rel="noopener">${escapeHtml(koTitle)}</a>
          <div class="major-news-meta"><b class="ticker-link" data-ticker="${escapeHtml(n.symbol)}">${escapeHtml(n.symbol)}</b> · ${escapeHtml(n.publisher || "알 수 없음")}${dateStr ? " · " + escapeHtml(dateStr) : ""}</div>
        </div>
      </div>`;
    })
    .join("");

  results.innerHTML = `
    <p class="disclaimer tab-note">📢 주요기업 최신 뉴스 — ${watchlistSymbols.length ? "관심종목" : "주요 대형주 20개"} 기준으로 모은 뉴스를 발행 시각 최신순으로 정렬한 TOP20입니다(맨 위가 최신). 제목은 자동 번역되었습니다.</p>
    <div class="major-news-list">${rows}</div>
  `;
}

// ---------- 6. 미래산업 성장성 ----------
// 블랙록·JP모건·골드만삭스(대형 자산운용사·투자은행 중 규모가 큰 3곳) 테마 리서치가 공통적으로 짚는
// 유망 산업 20개와 연평균 성장률(CAGR)을 정적으로 정리한 data/insight-future-industries.json을 표시
let futureIndustryDataPromise = null;
function getFutureIndustryData() {
  if (!futureIndustryDataPromise) {
    futureIndustryDataPromise = fetch("data/insight-future-industries.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return futureIndustryDataPromise;
}

async function runInsightFutureIndustry() {
  const status = el("insightStatus");
  const results = el("insightResults");
  status.style.display = "";
  status.textContent = "⏳ 미래산업 성장성 데이터를 불러오는 중...";
  results.innerHTML = "";

  const data = await getFutureIndustryData();
  if (!data || !data.groups) {
    status.textContent = "🚧 미래산업 성장성 데이터를 가져오지 못했습니다.";
    return;
  }

  status.style.display = "none";
  const groupsHtml = data.groups
    .map((g) => {
      const rows = [...g.industries]
        .sort((a, b) => b.cagrPct - a.cagrPct)
        .map(
          (ind) =>
            `<div class="future-ind-row"><span class="future-ind-name">${escapeHtml(ind.name)}</span><span class="future-ind-cagr delta-up">연평균 +${ind.cagrPct.toFixed(1)}%</span></div>`
        )
        .join("");
      return `
        <div class="future-ind-group">
          <h3 class="future-ind-group-title">${escapeHtml(g.institution)} <span class="muted" style="font-weight:400;font-size:12px;">· ${escapeHtml(g.focus)}</span></h3>
          <div class="future-ind-list">${rows}</div>
        </div>`;
    })
    .join("");

  results.innerHTML = `
    <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ${escapeHtml(data.sourceNote)}</p>
    ${groupsHtml}
  `;
}

// 과거분석 대상 종목 1개의 "기준 시점 스냅샷" 지표를 계산 — 2년치 차트로 기준 시점의 52주 범위·모멘텀·매출성장성까지 근사
// (오늘 기준 데이터는 이미 phase1의 getFullMetrics 결과를 재사용하므로 여기서는 기준 시점 데이터만 새로 조회)
async function getHistoricalCompareMetrics(symbol, sp500PairsPromise) {
  const referenceTimestamp = Math.floor(getHistoricalReferenceDate().getTime() / 1000);

  const [chartData, fundData] = await Promise.all([
    yahooChart(symbol, "2y"),
    yahooFundamentals(symbol, "annualTotalRevenue,annualNetIncome,annualShareIssued,quarterlyTotalRevenue").catch(() => null),
  ]);

  const result = chartData && chartData.chart && chartData.chart.result && chartData.chart.result[0];
  if (!result) return null;
  const meta = result.meta;
  const pairs = chartClosePairs(chartData);
  const asOfPair = firstTradingDayOnOrAfter(pairs, referenceTimestamp);
  if (!asOfPair) return null;

  const momentum3mAsOf = returnOverWindowEndingAt(pairs, asOfPair.t, THREE_MONTH_SECONDS, MOMENTUM_TOLERANCE_SECONDS);
  const dollarVolumePairs = chartDollarVolumePairs(chartData);
  const { recent5dAvg: recentDollarVolumeAsOf, avg1y: avgDollarVolume1yAsOf } = dollarVolumeStatsEndingAt(dollarVolumePairs, asOfPair.t);

  let sharesOutstanding = null;
  const resultArr = (fundData && fundData.timeseries && fundData.timeseries.result) || [];
  for (const block of resultArr) {
    if (block.annualShareIssued)
      sharesOutstanding = await latestFundamentalValue(block, "annualShareIssued", meta.currency, { convert: false });
  }
  const revenueSeries = await fundamentalSeries(resultArr, "annualTotalRevenue", meta.currency);
  const revenueQuarterlySeries = await fundamentalSeries(resultArr, "quarterlyTotalRevenue", meta.currency);
  const netIncomeSeries = await fundamentalSeries(resultArr, "annualNetIncome", meta.currency);

  const asOfDate = new Date(asOfPair.t * 1000);
  const revenueSeriesAsOf = revenueSeries.filter((it) => new Date(it.date) <= asOfDate);
  const revenueQuarterlySeriesAsOf = revenueQuarterlySeries.filter((it) => new Date(it.date) <= asOfDate);
  const netIncomeSeriesAsOf = netIncomeSeries.filter((it) => new Date(it.date) <= asOfDate);
  const revenueGrowthYoYAsOf = latestQuarterRevenueYoY(revenueQuarterlySeriesAsOf) ?? latestAnnualRevenueYoY(revenueSeriesAsOf);
  const revenueAsOf = revenueSeriesAsOf.length ? revenueSeriesAsOf[revenueSeriesAsOf.length - 1].value : null;
  const netIncomeAsOf = netIncomeSeriesAsOf.length ? netIncomeSeriesAsOf[netIncomeSeriesAsOf.length - 1].value : null;

  const historicalPrice = asOfPair.c;
  const historicalMarketCap = sharesOutstanding ? historicalPrice * sharesOutstanding : null;

  const sp500Pairs = await sp500PairsPromise;
  const sp500ReturnAsOf = returnOverYearEndingAt(sp500Pairs, asOfPair.t);
  const oneYearReturnAsOf = returnOverYearEndingAt(pairs, asOfPair.t);

  const metricsAsOf = {
    symbol,
    price: historicalPrice,
    momentum3m: momentum3mAsOf,
    recentDollarVolume: recentDollarVolumeAsOf,
    avgDollarVolume1y: avgDollarVolume1yAsOf,
    revenueGrowthYoY: revenueGrowthYoYAsOf,
    oneYearReturn: oneYearReturnAsOf,
    netIncome: netIncomeAsOf,
    revenue: revenueAsOf,
    marketCap: historicalMarketCap,
    currency: meta.currency,
  };

  const attractiveness = computeAttractivenessScore(metricsAsOf);
  const risk = computeRiskScore(metricsAsOf, sp500ReturnAsOf);

  return {
    asOfDate,
    historicalPrice,
    historicalMarketCap,
    historicalAttractiveness: attractiveness.total,
    historicalRisk: risk.total,
  };
}

// getFullMetrics(현재) + getHistoricalCompareMetrics(과거 스냅샷) 결과 쌍을 표에 쓸 행 데이터로 합침
// — 과거분석 전체(runHistoricalAnalysis)와 탭3 기본 퀵뷰(runHistoricalQuick)가 공유
function buildHistoricalCompareRows(tickerMetricsList, historicalList) {
  return tickerMetricsList
    .map((m, i) => {
      const h = historicalList[i];
      if (!h) return null;
      const priceChangePct = h.historicalPrice ? ((m.price - h.historicalPrice) / h.historicalPrice) * 100 : null;
      const priceChangeAmt = h.historicalPrice ? m.price - h.historicalPrice : null;
      return {
        symbol: m.symbol,
        name: m.name,
        sector: m.sector,
        currentPrice: m.price,
        priceChangePct,
        priceChangeAmt,
        historicalAttractiveness: h.historicalAttractiveness,
        historicalRisk: h.historicalRisk,
        asOfDate: h.asOfDate,
      };
    })
    .filter(Boolean);
}

// 티커 앞에 표시할 작은 원형 기업 로고 — financialmodelingprep 로고 이미지를 쓰고, 로드 실패 시 티커 앞 2글자 배지로 폴백(추가 네트워크 호출 없음)
// 회사 로고 소스 — logo.dev(티커 기반 고화질·동일 크기·레티나)를 우선 사용하고, 토큰이 없거나 로드 실패 시
// financialmodelingprep 이미지로 폴백, 둘 다 실패하면 티커 배지 표시. LOGODEV_TOKEN에 publishable 토큰(pk_...)을 넣으면 자동 활성화.
const LOGODEV_TOKEN = ""; // TODO: logo.dev publishable 토큰(pk_...)을 넣으면 고화질 로고로 전환됨
function logoSources(symbol, size) {
  const enc = encodeURIComponent(symbol);
  const fmp = `https://financialmodelingprep.com/image-stock/${enc}.png`;
  const primary = LOGODEV_TOKEN
    ? `https://img.logo.dev/ticker/${enc}?token=${encodeURIComponent(LOGODEV_TOKEN)}&size=${size || 80}&retina=true&format=png`
    : fmp;
  return { primary, fmp, useFallback: !!LOGODEV_TOKEN };
}
// 로고 <img>의 onerror 체인 — data-fallback(FMP)이 있으면 한 번 그걸로 교체하고, 없으면 형제 배지로 대체
const LOGO_ONERROR = "var f=this.dataset.fallback; if(f){this.removeAttribute('data-fallback');this.src=f;}else{this.style.display='none';this.nextElementSibling.style.display='flex';}";

// 특정 종목은 자체 호스팅한 지정 로고로 대체(자동 소스 화질/누락 문제 대응). bg로 원 배경색을 채워 로고가 잘리지 않게 함.
const SKHYNIX_LOGO = { src: "logos/skhynix.png", bg: "#ffffff" };
const LOGO_OVERRIDE = {
  // 스페이스X(SPCX)는 기존 자동 로고 유지 — 전역 인셋(72%)으로 축소되어 잘리지 않음
  SKHY: SKHYNIX_LOGO, // SK하이닉스 나스닥 ADR(2026-07 상장)
  SKHYV: SKHYNIX_LOGO, // 상장 초기 임시 심볼
  "000660.KS": SKHYNIX_LOGO, // 한국거래소 원주
};

// FMP 로고가 순백색이라 흰 원 배경에서 안 보이는 종목들(506개 전수 픽셀 분석 결과 61개) — 어두운 배경을 깔아 흰 로고가 보이게 함
const WHITE_LOGO_BG = "#14161c";
const WHITE_LOGO_TICKERS = new Set([
  "ABBV","ADI","ADSK","AIG","ALB","ALL","AMP","ANET","APP","AVB","AWK","AXON","BA","BAX","BLK","CDNS","CEG","CRL","CSX","CTAS",
  "DD","DGX","DHI","DIS","DXCM","EQIX","ETN","FAST","HSY","IBM","JBL","KMI","KR","LCID","LEN","LI","LITE","LMT","LRCX","MAS",
  "MRVL","NIO","NKE","NTAP","NXPI","ON","RBLX","RCL","REGN","STT","SYY","TPR","UBER","ULTA","UNH","V","VRTX","WAT","WSM","WYNN","XPEV",
]);
// 로고 원 배경색 결정: 지정 override.bg > 흰색 로고면 어두운 배경 > 기본(CSS 흰색)
function logoBg(symbol) {
  const ov = LOGO_OVERRIDE[symbol];
  if (ov && ov.bg) return ov.bg;
  if (WHITE_LOGO_TICKERS.has(symbol)) return WHITE_LOGO_BG;
  return null;
}

function tickerLogoHtml(symbol) {
  const s = escapeHtml(symbol);
  const ov = LOGO_OVERRIDE[symbol];
  const bg = logoBg(symbol);
  const wrapStyle = bg ? ` style="background:${bg}"` : "";
  if (ov && ov.src) {
    return `<span class="ticker-logo-wrap"${wrapStyle}><img class="ticker-logo" src="${ov.src}" alt="${s}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><span class="ticker-logo-badge" style="display:none;">${s.slice(0, 2)}</span></span>`;
  }
  const { primary, fmp, useFallback } = logoSources(symbol, 80);
  const fb = useFallback ? ` data-fallback="${fmp}"` : "";
  return `<span class="ticker-logo-wrap"${wrapStyle}><img class="ticker-logo" src="${primary}" alt="${s}" loading="lazy"${fb} onerror="${LOGO_ONERROR}" /><span class="ticker-logo-badge" style="display:none;">${s.slice(0, 2)}</span></span>`;
}

// buildHistoricalCompareRows 결과로 과거분석 표 HTML(범례 제외)을 생성 — moversTableHtml과 동일한 5컬럼 구성(순위/티커+원형로고/현재가(등락률)/상승압력/투자안정)
// rankColumnLabel만 호출부마다 다름
function historicalTableHtml(rows, rankColumnLabel) {
  const scoreClass = (score) => (score === null ? "" : score > 5 ? "delta-up" : score < 5 ? "delta-down" : "");
  const tableRows = rows
    .map((r, i) => {
      return `
      <tr>
        <td>${i + 1}</td>
        <td><span class="ticker-cell">${tickerLogoHtml(r.symbol)}<b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(r.symbol)}</b></span>${r.name ? `<br><span class="muted" style="font-size:11px;">${escapeHtml(r.name)}</span>` : ""}</td>
        <td>${priceChartLink(r.symbol, "$" + r.currentPrice.toFixed(2))}<br><span class="${r.priceChangePct !== null && r.priceChangePct >= 0 ? "delta-up" : "delta-down"}" style="font-size:11px;">${r.priceChangeAmt !== null ? `${r.priceChangeAmt >= 0 ? "+" : ""}$${r.priceChangeAmt.toFixed(2)} ` : ""}${r.priceChangePct !== null ? `(${fmtPct(r.priceChangePct)})` : "N/A"}</span></td>
        <td class="${scoreClass(r.historicalAttractiveness)}"><b>${r.historicalAttractiveness}</b></td>
        <td class="${scoreClass(r.historicalRisk)}"><b>${r.historicalRisk}</b></td>
      </tr>`;
    })
    .join("");

  return `
    <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 1년전 상승압력·투자안정은 <b>1년 전 시점</b> 기준으로 근사 계산한 참고용 점수입니다(각 10점 만점, 높을수록 상승 여력 크고·재무 안정적 / 5점보다 높으면 빨강·낮으면 파랑). 투자 자문이 아닙니다.</p>
    <table class="top30-table">
      <thead>
        <tr><th>${rankColumnLabel}</th><th>티커</th><th>현재가<br>(등락률)</th><th>1년전<br>상승압력</th><th>1년전<br>투자안정</th></tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;
}

// S&P500 전체 종목 중 1년 등락률 TOP50을, 과거분석 기준 시점(1년 전 + 이번 달 1일 이후 첫 거래일) 스냅샷과 비교
// direction: "up" — S&P500 중 1년 상승률 상위 50개 / "down" — S&P500 중 1년 하락률 상위(가장 많이 내린) 50개
async function runHistoricalAnalysis(direction) {
  const isUp = direction === "up";
  const btn = isUp ? historicalFullUpBtn : historicalFullDownBtn;
  const rankLabel = isUp ? "상승률" : "하락률";

  historicalStatus.style.display = "block";
  historicalResults.innerHTML = "";
  btn.disabled = true;

  const refDate = getHistoricalReferenceDate();
  const introYearMonthStr = `${String(refDate.getFullYear()).slice(-2)}.${refDate.getMonth() + 1}월`;
  const introMsg = `📢 과거 1년전(${introYearMonthStr}) 데이터를 분석하여 ${isUp ? "상승량" : "하락량"} TOP50을 비교합니다. 또한 당시 점수를 반영합니다.`;
  const setStatus = (msg) => {
    historicalStatus.innerHTML = `${introMsg}<br><span style="font-size:12px;">${msg}</span>`;
  };

  try {
    setStatus("S&P500 종목 목록을 불러오는 중...");
    const allTickers = await getSP500Tickers();

    setStatus(`0/${allTickers.length} 종목 분석 중(S&P500 전체 중 1년 ${rankLabel} 상위 50 선정)...`);
    const allMetricsList = await mapWithConcurrency(allTickers, 5, getFullMetrics, (completed, total) => {
      setStatus(`${completed}/${total} 종목 분석 중(S&P500 전체 중 1년 ${rankLabel} 상위 50 선정)...`);
    });

    const top30 = allMetricsList
      .filter((m) => m && m.oneYearReturn !== null && m.oneYearReturn !== undefined)
      .sort((a, b) => (isUp ? b.oneYearReturn - a.oneYearReturn : a.oneYearReturn - b.oneYearReturn))
      .slice(0, 50);

    const sp500PairsPromise = yahooChart("^GSPC", "2y").then(chartClosePairs);

    let done = 0;
    setStatus(`0/${top30.length} 종목의 기준 시점 데이터 조회 중...`);
    const historicalList = await mapWithConcurrency(top30, 3, async (m) => {
      const h = await getHistoricalCompareMetrics(m.symbol, sp500PairsPromise);
      done++;
      setStatus(`${done}/${top30.length} 종목의 기준 시점 데이터 조회 중...`);
      return h;
    });

    const rows = buildHistoricalCompareRows(top30, historicalList).sort((a, b) =>
      isUp
        ? (b.priceChangePct ?? -Infinity) - (a.priceChangePct ?? -Infinity)
        : (a.priceChangePct ?? Infinity) - (b.priceChangePct ?? Infinity)
    );

    const successCount = rows.length;
    const failCount = top30.length - successCount;
    const refDateStr = rows[0] ? rows[0].asOfDate.toLocaleDateString("ko-KR") : "";
    setStatus(`완료 (기준일 ${refDateStr}) — S&P500 중 ${rankLabel} 상위 50개 중 ${successCount}개 비교 성공${failCount ? `, ${failCount}개는 조회 실패로 제외` : ""}`);

    if (rows.length === 0) {
      historicalResults.innerHTML = `<p class="muted">데이터를 계산하지 못했습니다. 잠시 후 다시 시도해주세요.</p>`;
      return;
    }

    historicalResults.innerHTML = historicalTableHtml(rows, `${rankLabel}<br>순위`);
  } catch (err) {
    setStatus(`❌ ${err.message || "과거분석 데이터를 가져오지 못했습니다."}`);
  } finally {
    btn.disabled = false;
  }
}

historicalFullUpBtn.addEventListener("click", () => runHistoricalAnalysis("up"));
historicalFullDownBtn.addEventListener("click", () => runHistoricalAnalysis("down"));

// 주요종목 버튼: 고정 20종목만 현재가+과거 스냅샷을 비교(전체 500종목 스크리닝 없이 빠르게)
const HISTORICAL_QUICK_TICKERS = [
  "NVDA", "AAPL", "GOOGL", "MSFT", "AMZN", "AVGO", "META", "JPM", "ORCL", "TSLA",
  "V", "WMT", "XOM", "UNH", "JNJ", "PG", "HD", "COST", "NFLX", "BAC",
];
async function runHistoricalQuick() {
  historicalMajorBtn.disabled = true;
  historicalStatus.style.display = "block";
  historicalStatus.textContent = `주요 20종목 분석 중...`;

  try {
    const sp500PairsPromise = yahooChart("^GSPC", "2y").then(chartClosePairs);
    const [tickerMetricsList, historicalList] = await Promise.all([
      mapWithConcurrency(HISTORICAL_QUICK_TICKERS, 5, getFullMetrics),
      mapWithConcurrency(HISTORICAL_QUICK_TICKERS, 3, (symbol) => getHistoricalCompareMetrics(symbol, sp500PairsPromise)),
    ]);

    const validIndices = tickerMetricsList.map((m, i) => (m ? i : null)).filter((i) => i !== null);
    const validMetrics = validIndices.map((i) => tickerMetricsList[i]);
    const validHistorical = validIndices.map((i) => historicalList[i]);
    const rows = buildHistoricalCompareRows(validMetrics, validHistorical).sort(
      (a, b) => (b.priceChangePct ?? -Infinity) - (a.priceChangePct ?? -Infinity)
    );

    if (rows.length === 0) {
      historicalStatus.textContent = "❌ 데이터를 계산하지 못했습니다. 잠시 후 다시 시도해주세요.";
      return;
    }

    const refDateStr = rows[0].asOfDate.toLocaleDateString("ko-KR");
    historicalStatus.textContent = `주요 20종목 비교 (기준일 ${refDateStr}) — 더 많은 종목은 상승/하락 과거분석(전체) 버튼으로 확인하세요`;
    historicalResults.innerHTML = historicalTableHtml(rows, "순위");
  } catch (err) {
    historicalStatus.textContent = `❌ ${err.message || "과거분석 데이터를 가져오지 못했습니다."}`;
  } finally {
    historicalMajorBtn.disabled = false;
  }
}
historicalMajorBtn.addEventListener("click", runHistoricalQuick);

// 티커/현재가(+등락률)/상승압력/투자안정 5열 표 — 인기종목·급등주·급락주가 공유하는 렌더러
function moversTableHtml(scored, rankNote) {
  const scoreClass = (score) => (score === null ? "" : score > 5 ? "delta-up" : score < 5 ? "delta-down" : "");

  const rows = scored
    .map((r, i) => {
      const changeClass = r.changePct >= 0 ? "delta-up" : "delta-down";
      return `
      <tr>
        <td>${i + 1}${surgeWarningEmoji(r.fiveDayExtremes)}</td>
        <td><span class="ticker-cell">${tickerLogoHtml(r.symbol)}<b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(r.symbol)}</b></span><br><span class="muted" style="font-size:11px;">${escapeHtml(r.name)}</span></td>
        <td>${priceChartLink(r.symbol, "$" + r.price.toFixed(2))}<br><span class="${changeClass}" style="font-size:11px;">(${fmtPct(r.changePct)})</span></td>
        <td class="${r.isIPO ? "" : scoreClass(r.attractiveness)}"><b>${scoreCellText(r.attractiveness, r.isIPO)}</b></td>
        <td class="${r.isIPO ? "" : scoreClass(r.risk)}"><b>${scoreCellText(r.risk, r.isIPO)}</b></td>
      </tr>`;
    })
    .join("");

  return `
      <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ${rankNote} 상승압력·투자안정은 각 10점 만점(5점보다 높으면 빨강·낮으면 파랑)이며 투자 자문이 아닙니다.</p>
      ${SURGE_WARNING_LEGEND}
      <div class="popular-table-wrap">
        <table class="top30-table popular-table">
          <thead>
            <tr><th>순위</th><th>티커</th><th>현재가</th><th>상승<br>압력</th><th>투자<br>안정</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
}

// 후보 목록(가벼운 조회로 얻은 심볼/현재가/등락률)에 대해 상승압력도·투자 안정성 점수를 매겨 표 HTML까지 완성
// marketReturnsPromise는 후보 목록을 모으는 동안 미리 병렬로 시작해둔 getMarketReturns() 호출을 전달받음
// initialCount만큼만 먼저 스코어링해 빠르게 보여주고, "더보기" 클릭 시 fullCount까지 나머지를 추가로 스코어링(이미 계산한 항목은 재요청하지 않음)
async function scoreAndRenderMovers(candidates, marketReturnsPromise, { statusEl, resultsEl, rankNote, initialCount, fullCount }) {
  initialCount = initialCount || candidates.length;
  fullCount = Math.min(fullCount || candidates.length, candidates.length);

  const { sp500Return } = await marketReturnsPromise;
  let scored = [];

  async function scoreUpTo(count) {
    const pending = candidates.slice(scored.length, count);
    if (pending.length > 0) {
      statusEl.style.display = "block";
      statusEl.textContent = "상승압력도 · 투자 안정성 점수를 계산하는 중...";
      // 한꺼번에 요청하면 프록시가 과부하로 실패하는 경우가 많아 동시 요청 수를 제한
      const fullMetricsList = await mapWithConcurrency(pending, 3, (r) => getFullMetrics(r.symbol));
      const newlyScored = pending.map((r, i) => {
        const m = fullMetricsList[i];
        if (!m) return { ...r, attractiveness: null, risk: null, fiveDayExtremes: null, isIPO: false };
        const isIPO = isRecentIPO(m.firstTradeDate);
        const attractiveness = computeAttractivenessScore(m);
        const risk = computeRiskScore(m, sp500Return);
        return { ...r, attractiveness: attractiveness.total, risk: risk.total, fiveDayExtremes: m.fiveDayExtremes, isIPO };
      });
      scored = scored.concat(newlyScored);
    }
    statusEl.style.display = "none";

    const hasMore = scored.length < fullCount;
    const nextCount = Math.min(scored.length + initialCount, fullCount);
    resultsEl.innerHTML =
      moversTableHtml(scored, rankNote) +
      (hasMore
        ? `<button type="button" class="cat-btn load-more-btn" data-next-count="${nextCount}">더보기 (${scored.length}/${fullCount})</button>`
        : "");
  }

  // 같은 결과영역(TOP30)을 급등주·급락주 등 여러 목록이 공유하므로, 더보기 클릭은 항상 "가장 최근" 렌더의 핸들러를 호출해야 함
  // → 리스너는 한 번만 부착하되 실제 동작은 resultsEl._loadMore(최신 scoreUpTo)로 위임(오래된 클로저 호출 방지)
  resultsEl._loadMore = (count) => scoreUpTo(count);
  if (!resultsEl.dataset.moreBound) {
    resultsEl.addEventListener("click", (e) => {
      const moreBtn = e.target.closest(".load-more-btn");
      if (!moreBtn) return;
      moreBtn.disabled = true;
      moreBtn.textContent = "불러오는 중...";
      resultsEl._loadMore(Number(moreBtn.dataset.nextCount));
    });
    resultsEl.dataset.moreBound = "1";
  }

  await scoreUpTo(initialCount);
}

// ---------- 지수: 환율·주요 지수·원자재·가상자산·국채를 이미지 스타일 카드로 표시 ----------
// 레이아웃: 왼쪽 = 종목명 + (날짜 | 티커), 오른쪽 = 가격 + 변동량(퍼센트). 색상은 한국식(상승=빨강, 하락=파랑)
// src="yahoo"는 야후 차트(전일 종가 대비), src="fred"는 FRED 최신 발표치(전 영업일 대비)
// vSuffix: 가격 뒤 단위 / cSuffix: 변동량 뒤 단위(미지정 시 vSuffix 사용)
// chartSymbol: 클릭 시 TradingView 차트 모달에 넘길 심볼(야후 티커와 표기가 달라 별도 매핑 필요) — 없으면(null) 클릭 비활성
// 카테고리별로 최대 10개까지 먼저 보여주고, 그보다 많으면 "더보기"로 나머지를 펼침(카테고리는 처음 볼 때만 그때그때 조회해서 캐시)
// ⚠️ 아연·니켈·납(LME 선물), 코스피100, 일본국채30년·한국채5년물은 야후·FRED 어디서도 정상적인 데이터를 못 찾아 제외함
const INDEX_CATEGORY_PAGE_SIZE = 10;
const INDEX_CATEGORIES = {
  usMarkets: {
    label: "주요",
    items: [
      { src: "yahoo", symbol: "^GSPC", name: "🇺🇸 S&P 500", ticker: "SPX", chartSymbol: "SP:SPX" },
      { src: "yahoo", symbol: "^DJI", name: "🇺🇸 다우 종합", ticker: "DJI", chartSymbol: "DJ:DJI" },
      { src: "yahoo", symbol: "^IXIC", name: "🇺🇸 나스닥 종합", ticker: "IXIC", chartSymbol: "NASDAQ:IXIC" },
      { src: "yahoo", symbol: "^RUT", name: "🇺🇸 러셀 2000", ticker: "RUT", chartSymbol: "TVC:RUT" },
      { src: "yahoo", symbol: "^VIX", name: "🇺🇸 S&P500 VIX", ticker: "VIX", chartSymbol: "TVC:VIX" },
      { src: "yahoo", symbol: "GC=F", name: "🟨 금(Gold)", ticker: "GOLD", chartSymbol: "TVC:GOLD" },
      { src: "yahoo", symbol: "BTC-USD", name: "₿ 비트코인", ticker: "BTC", chartSymbol: "COINBASE:BTCUSD", crypto: true },
      { src: "yahoo", symbol: "CL=F", name: "🛢️ WTI 원유", ticker: "WTI", chartSymbol: "TVC:USOIL" },
    ],
  },
  indices: {
    label: "지수",
    items: [
      { src: "yahoo", symbol: "^KS11", name: "🇰🇷 코스피", ticker: "KOSPI", chartSymbol: "KRX:KOSPI" },
      { src: "yahoo", symbol: "^KQ11", name: "🇰🇷 코스닥", ticker: "KOSDAQ", chartSymbol: "KRX:KOSDAQ" },
      { src: "yahoo", symbol: "^N225", name: "🇯🇵 닛케이 225", ticker: "JP225", chartSymbol: "TVC:NI225" },
      { src: "yahoo", symbol: "^NDX", name: "🇺🇸 US Tech 100", ticker: "NDX", chartSymbol: "NASDAQ:NDX" },
      { src: "yahoo", symbol: "^HSI", name: "🇭🇰 항셍(홍콩)", ticker: "HSI", chartSymbol: "TVC:HSI" },
      { src: "yahoo", symbol: "000001.SS", name: "🇨🇳 상해종합", ticker: "SSEC", chartSymbol: "TVC:SHCOMP" },
      { src: "yahoo", symbol: "^GDAXI", name: "🇩🇪 독일 DAX", ticker: "DAX", chartSymbol: "XETR:DAX" },
      { src: "yahoo", symbol: "^FTSE", name: "🇬🇧 FTSE 100", ticker: "UKX", chartSymbol: "TVC:UKX" },
      { src: "yahoo", symbol: "^FCHI", name: "🇫🇷 프랑스 CAC 40", ticker: "CAC40", chartSymbol: "TVC:CAC40" },
      { src: "yahoo", symbol: "^AEX", name: "🇳🇱 네덜란드 AEX", ticker: "AEX", chartSymbol: "TVC:AEX" },
      { src: "yahoo", symbol: "^STOXX50E", name: "🇪🇺 Euro Stoxx 50", ticker: "SX5E", chartSymbol: "TVC:SX5E" },
      { src: "yahoo", symbol: "FTSEMIB.MI", name: "🇮🇹 이탈리아 FTSE MIB", ticker: "FTSEMIB", chartSymbol: "TVC:FTSEMIB" },
      { src: "yahoo", symbol: "^IBEX", name: "🇪🇸 IBEX 35", ticker: "IBEX35", chartSymbol: "TVC:IBEX35" },
      { src: "yahoo", symbol: "^AXJO", name: "🇦🇺 호주 S&P/ASX 200", ticker: "ASX200", chartSymbol: "ASX:XJO" },
      { src: "yahoo", symbol: "^STI", name: "🇸🇬 싱가폴 STI", ticker: "STI", chartSymbol: "TVC:STI" },
      { src: "yahoo", symbol: "^NSEI", name: "🇮🇳 인도 니프티50", ticker: "NIFTY50", chartSymbol: "NSE:NIFTY" },
    ],
  },
  crypto: {
    label: "암호화폐",
    items: [
      { src: "yahoo", symbol: "BTC-USD", name: "비트코인", ticker: "BTC", chartSymbol: "COINBASE:BTCUSD", crypto: true },
      { src: "yahoo", symbol: "ETH-USD", name: "이더리움", ticker: "ETH", chartSymbol: "COINBASE:ETHUSD", crypto: true },
      { src: "yahoo", symbol: "USDT-USD", name: "테더", ticker: "USDT", chartSymbol: null, crypto: true },
      { src: "yahoo", symbol: "BNB-USD", name: "BNB", ticker: "BNB", chartSymbol: "BINANCE:BNBUSDT", crypto: true },
      { src: "yahoo", symbol: "USDC-USD", name: "USDC", ticker: "USDC", chartSymbol: null, crypto: true },
      { src: "yahoo", symbol: "XRP-USD", name: "XRP(리플)", ticker: "XRP", chartSymbol: "COINBASE:XRPUSD", crypto: true },
      { src: "yahoo", symbol: "SOL-USD", name: "솔라나", ticker: "SOL", chartSymbol: "COINBASE:SOLUSD", crypto: true },
      { src: "yahoo", symbol: "TRX-USD", name: "트론", ticker: "TRX", chartSymbol: "BINANCE:TRXUSDT", crypto: true },
      { src: "yahoo", symbol: "DOGE-USD", name: "도지코인", ticker: "DOGE", chartSymbol: "COINBASE:DOGEUSD", crypto: true },
    ],
  },
  commodities: {
    label: "원자재",
    items: [
      { src: "yahoo", symbol: "GC=F", name: "🟨 금(Gold)", ticker: "GOLD", chartSymbol: "TVC:GOLD" },
      { src: "yahoo", symbol: "SI=F", name: "⬜ 은(Silver)", ticker: "SILVER", chartSymbol: "TVC:SILVER" },
      { src: "yahoo", symbol: "HG=F", name: "🟧 구리", ticker: "COPPER", chartSymbol: "COMEX:HG1!" },
      { src: "yahoo", symbol: "CL=F", name: "🛢️ WTI유", ticker: "WTI", chartSymbol: "TVC:USOIL" },
      { src: "yahoo", symbol: "BZ=F", name: "🛢️ 브렌트유", ticker: "BRENT", chartSymbol: "TVC:UKOIL" },
      { src: "yahoo", symbol: "NG=F", name: "🔥 천연가스", ticker: "NATGAS", chartSymbol: "NYMEX:NG1!" },
      { src: "yahoo", symbol: "RB=F", name: "⛽ 가솔린(RBOB)", ticker: "RBOB", chartSymbol: "NYMEX:RB1!" },
      { src: "yahoo", symbol: "PL=F", name: "⚪ 백금", ticker: "PLATINUM", chartSymbol: "TVC:PLATINUM" },
      { src: "yahoo", symbol: "ALI=F", name: "🔩 알루미늄", ticker: "ALUMINUM", chartSymbol: "COMEX:ALI1!" },
      { src: "yahoo", symbol: "ZR=F", name: "🌾 현미", ticker: "RICE", chartSymbol: "CBOT:ZR1!" },
      { src: "yahoo", symbol: "LE=F", name: "🐄 생우", ticker: "CATTLE", chartSymbol: "CME:LE1!" },
      { src: "yahoo", symbol: "HE=F", name: "🐖 돈육", ticker: "HOGS", chartSymbol: "CME:HE1!" },
      { src: "yahoo", symbol: "ZW=F", name: "🌾 미국 소맥", ticker: "WHEAT", chartSymbol: "CBOT:ZW1!" },
      { src: "yahoo", symbol: "ZC=F", name: "🌽 미국 옥수수", ticker: "CORN", chartSymbol: "CBOT:ZC1!" },
      { src: "yahoo", symbol: "ZS=F", name: "🌱 미국 대두", ticker: "SOYBEAN", chartSymbol: "CBOT:ZS1!" },
      { src: "yahoo", symbol: "KC=F", name: "☕ 미국 커피", ticker: "COFFEE", chartSymbol: "ICEUS:KC1!" },
      { src: "yahoo", symbol: "SB=F", name: "🍬 미국 설탕", ticker: "SUGAR", chartSymbol: "ICEUS:SB1!" },
      { src: "yahoo", symbol: "CT=F", name: "🧵 미국 원면", ticker: "COTTON", chartSymbol: "ICEUS:CT1!" },
      { src: "yahoo", symbol: "CC=F", name: "🍫 미국 코코아", ticker: "COCOA", chartSymbol: "ICEUS:CC1!" },
    ],
  },
  bonds: {
    label: "채권",
    items: [
      { src: "fred", symbol: "T10Y2Y", name: "🇺🇸 장단기 금리차(10Y-2Y)", ticker: "T10Y2Y", vSuffix: "%p", cSuffix: "%p", chartSymbol: null },
      { src: "fred", symbol: "DGS30", name: "🇺🇸 미국 30년물", ticker: "US30Y", vSuffix: "%", cSuffix: "%p", chartSymbol: "TVC:US30Y" },
      { src: "fred", symbol: "DGS10", name: "🇺🇸 미국 10년물", ticker: "US10Y", vSuffix: "%", cSuffix: "%p", chartSymbol: "TVC:US10Y" },
      { src: "fred", symbol: "DGS2", name: "🇺🇸 미국 2년물", ticker: "US2Y", vSuffix: "%", cSuffix: "%p", chartSymbol: "TVC:US02Y" },
      // 일본·한국 10년물은 FRED에 월간 데이터만 있어(OECD 장기금리 시리즈) 전월 대비로 표시됨(다른 항목은 전일 대비)
      { src: "fred", symbol: "IRLTLT01JPM156N", name: "🇯🇵 일본국채 10년(월간)", ticker: "JP10Y", vSuffix: "%", cSuffix: "%p", chartSymbol: "TVC:JP10Y" },
      { src: "fred", symbol: "IRLTLT01KRM156N", name: "🇰🇷 한국채 10년(월간)", ticker: "KR10Y", vSuffix: "%", cSuffix: "%p", chartSymbol: "TVC:KR10Y" },
    ],
  },
  fx: {
    label: "환율",
    items: [
      { src: "yahoo", symbol: "KRW=X", name: "🇰🇷 달러/원 환율", ticker: "USD/KRW", chartSymbol: "FX:USDKRW" },
      { src: "yahoo", symbol: "JPY=X", name: "🇯🇵 달러/엔 환율", ticker: "USD/JPY", chartSymbol: "FX:USDJPY" },
      { src: "yahoo", symbol: "EURUSD=X", name: "🇪🇺 유로/달러 환율", ticker: "EUR/USD", chartSymbol: "FX:EURUSD" },
      { src: "yahoo", symbol: "CNY=X", name: "🇨🇳 달러/위안 환율", ticker: "USD/CNY", chartSymbol: "FX:USDCNY" },
      { src: "yahoo", symbol: "GBPUSD=X", name: "🇬🇧 파운드/달러 환율", ticker: "GBP/USD", chartSymbol: "FX:GBPUSD" },
    ],
  },
};

// 야후 차트 → { price, change(전일종가 대비 변동량), changePct, date }
function yahooSnapshot(chart) {
  const result = chart && chart.chart && chart.chart.result && chart.chart.result[0];
  if (!result) return null;
  const meta = result.meta || {};
  const timestamps = result.timestamp || [];
  const closes = (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
  const pairs = timestamps.map((t, i) => ({ t, c: closes[i] })).filter((p) => p.c !== null && p.c !== undefined);
  pairs.sort((a, b) => a.t - b.t);
  if (pairs.length < 1) return null;
  const latest = pairs[pairs.length - 1];
  const prevClose = pairs.length >= 2 ? pairs[pairs.length - 2].c : (meta.chartPreviousClose ?? null);
  const price = meta.regularMarketPrice ?? latest.c;
  const change = prevClose !== null && prevClose !== undefined && price !== null && price !== undefined ? price - prevClose : null;
  const changePct = change !== null && prevClose ? (change / prevClose) * 100 : null;
  const date = meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000) : new Date(latest.t * 1000);
  return { price, change, changePct, date };
}

// FRED 시계열([date, value] 배열) → { price, change(전 영업일 대비), changePct, date }
function fredSnapshot(points) {
  const clean = (points || []).map((p) => [p[0], Number(p[1])]).filter((p) => Number.isFinite(p[1]));
  if (clean.length < 1) return null;
  const latest = clean[clean.length - 1];
  const prev = clean.length >= 2 ? clean[clean.length - 2] : null;
  const price = latest[1];
  const change = prev ? price - prev[1] : null;
  const changePct = prev && prev[1] ? (change / prev[1]) * 100 : null;
  return { price, change, changePct, date: new Date(latest[0]) };
}

// 암호화폐 로고 — jsDelivr에 호스팅된 spothq/cryptocurrency-icons 세트를 티커(소문자)로 조회, 실패 시 🪙 배지로 폴백(추가 네트워크 호출 없음)
function cryptoLogoHtml(ticker) {
  const sym = ticker.toLowerCase();
  const src = `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${encodeURIComponent(sym)}.png`;
  return `<span class="crypto-logo-wrap"><img class="crypto-logo" src="${src}" alt="" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';" /><span class="crypto-logo-badge" style="display:none;">🪙</span></span>`;
}

// 지수 카드 1행 HTML — 이미지 스타일(왼쪽 종목/날짜/티커, 오른쪽 가격/변동량(퍼센트))
// chartSymbol이 있는 종목은 클릭 시 기존 TradingView 차트 모달이 열리도록 price-chart-link 델리게이션에 태움
function indexRowHtml(item, snap) {
  const num = (n, d = 2) => n.toLocaleString("ko-KR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const now = new Date();
  const isToday = !!(snap && snap.date) && snap.date.getFullYear() === now.getFullYear() && snap.date.getMonth() === now.getMonth() && snap.date.getDate() === now.getDate();
  const clockLabel = snap && snap.date
    ? (isToday
        ? `${String(snap.date.getHours()).padStart(2, "0")}:${String(snap.date.getMinutes()).padStart(2, "0")}:${String(snap.date.getSeconds()).padStart(2, "0")}`
        : `${String(snap.date.getMonth() + 1).padStart(2, "0")}/${String(snap.date.getDate()).padStart(2, "0")}`)
    : "";
  const clockClass = isToday ? "idx-clock idx-clock-live" : "idx-clock";
  const sub = `${clockLabel ? `<span class="${clockClass}">🕐 ${clockLabel}</span> | ` : ""}<span class="idx-ticker">${escapeHtml(item.ticker)}</span>`;
  const nameHtml = `${item.crypto ? cryptoLogoHtml(item.ticker) : ""}${escapeHtml(item.name)}`;
  const clickable = !!item.chartSymbol;
  const rowClass = `idx-row${clickable ? " price-chart-link idx-row-clickable" : ""}`;
  const rowAttrs = clickable ? ` data-chart-symbol="${escapeHtml(item.chartSymbol)}" role="button" tabindex="0"` : "";

  if (!snap || snap.price === null || snap.price === undefined) {
    return `<div class="${rowClass}"${rowAttrs}><div class="idx-left"><div class="idx-name">${nameHtml}</div><div class="idx-sub">${sub}</div></div><div class="idx-right"><div class="idx-price">N/A</div></div></div>`;
  }

  const vSuffix = item.vSuffix || "";
  const cSuffix = item.cSuffix || vSuffix;
  const priceStr = num(snap.price) + vSuffix;
  const sign = (n) => (n >= 0 ? "+" : "");
  let deltaStr = "";
  let cls = "";
  if (snap.change !== null && snap.change !== undefined) {
    cls = snap.change >= 0 ? "delta-up" : "delta-down"; // 빨강=상승, 파랑=하락(앱 공통 색상)
    deltaStr = `${sign(snap.change)}${num(snap.change)}${cSuffix}`;
    // 스프레드(0 부근) 등에서 퍼센트가 비정상적으로 커지면 생략
    if (snap.changePct !== null && snap.changePct !== undefined && Number.isFinite(snap.changePct) && Math.abs(snap.changePct) < 1000) {
      deltaStr += ` (${sign(snap.changePct)}${snap.changePct.toFixed(2)}%)`;
    }
  }

  return `
    <div class="${rowClass}"${rowAttrs}>
      <div class="idx-left">
        <div class="idx-name">${nameHtml}</div>
        <div class="idx-sub">${sub}</div>
      </div>
      <div class="idx-right">
        <div class="idx-price">${priceStr}</div>
        <div class="idx-delta ${cls}">${deltaStr}</div>
      </div>
    </div>`;
}

// 개별 종목 하나의 스냅샷 조회(야후/FRED 공용) — 실패해도 조용히 null 반환(그 행만 N/A로 표시됨)
async function fetchOneIndexSnap(item) {
  try {
    if (item.src === "fred") {
      return fredSnapshot(await fetchFredSeries(item.symbol));
    }
    return yahooSnapshot(await yahooChart(item.symbol, "5d", "1d"));
  } catch {
    return null;
  }
}

// ---------- 시장 상단 4x2 위젯: 기본 8개 지수를 카드 2장(각 2x2)으로 보여주고, ✎ 수정으로 종목을 바꿀 수 있음 ----------
const MARKET_WIDGET_KEY = "market_widget_symbols_v1";
const MARKET_WIDGET_DEFAULT_TICKERS = ["GOLD", "USD/KRW", "KOSPI", "KOSDAQ", "IXIC", "SPX", "DJI", "RUT"];

// INDEX_CATEGORIES 전체를 티커 기준으로 평탄화(같은 티커가 여러 카테고리에 중복 등장하면 처음 것을 사용)
const INDEX_ITEM_BY_TICKER = (() => {
  const map = new Map();
  Object.values(INDEX_CATEGORIES).forEach((cat) => {
    cat.items.forEach((item) => {
      if (!map.has(item.ticker)) map.set(item.ticker, item);
    });
  });
  return map;
})();

function getMarketWidgetTickers() {
  try {
    const saved = JSON.parse(localStorage.getItem(MARKET_WIDGET_KEY));
    if (Array.isArray(saved) && saved.length === 8 && saved.every((t) => INDEX_ITEM_BY_TICKER.has(t))) return saved;
  } catch {
    // 저장된 값이 없거나 손상된 경우 기본값 사용
  }
  return MARKET_WIDGET_DEFAULT_TICKERS;
}
function setMarketWidgetTickers(tickers) {
  localStorage.setItem(MARKET_WIDGET_KEY, JSON.stringify(tickers));
}

// 오늘 하루(5분봉) 종가만 뽑아 아주 작은 스파크라인용 좌표 배열로 변환
async function fetchTodaySparkPoints(item) {
  try {
    const chart = await yahooChart(item.symbol, "1d", "5m");
    const result = chart && chart.chart && chart.chart.result && chart.chart.result[0];
    const closes = (result && result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
    return closes.filter((c) => c !== null && c !== undefined);
  } catch {
    return [];
  }
}
function sparklineSvg(points, isUp) {
  if (!points || points.length < 2) return `<svg class="mkt-spark" viewBox="0 0 100 28"></svg>`;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const stepX = 100 / (points.length - 1);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i * stepX).toFixed(1)},${(26 - ((p - min) / span) * 24).toFixed(1)}`).join(" ");
  const color = isUp ? "var(--pos)" : "var(--neg)";
  return `<svg class="mkt-spark" viewBox="0 0 100 28" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function mktWidgetCellHtml(ticker, snap, points) {
  const item = INDEX_ITEM_BY_TICKER.get(ticker);
  if (!item) return `<div class="mkt-widget-cell"></div>`;
  const num = (n, d = 2) => n.toLocaleString("ko-KR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const clickable = !!item.chartSymbol;
  const cellAttrs = clickable ? ` data-chart-symbol="${escapeHtml(item.chartSymbol)}" role="button" tabindex="0"` : "";
  if (!snap || snap.price === null || snap.price === undefined) {
    return `<div class="mkt-widget-cell${clickable ? " price-chart-link" : ""}"${cellAttrs}>
      <div class="mkt-widget-cell-name">${escapeHtml(item.name)}</div>
      <div class="mkt-widget-cell-price">N/A</div>
    </div>`;
  }
  const isUp = (snap.change ?? 0) >= 0;
  const cls = isUp ? "delta-up" : "delta-down";
  const sign = isUp ? "+" : "";
  const vSuffix = item.vSuffix || "";
  const cSuffix = item.cSuffix || vSuffix;
  const deltaStr = snap.change !== null && snap.change !== undefined
    ? `${sign}${num(snap.change)}${cSuffix}${snap.changePct !== null && snap.changePct !== undefined && Number.isFinite(snap.changePct) && Math.abs(snap.changePct) < 1000 ? ` (${sign}${snap.changePct.toFixed(2)}%)` : ""}`
    : "";
  return `
    <div class="mkt-widget-cell${clickable ? " price-chart-link" : ""}"${cellAttrs}>
      <div class="mkt-widget-cell-name">${escapeHtml(item.name)}</div>
      <div class="mkt-widget-cell-price">${num(snap.price)}${vSuffix}</div>
      <div class="mkt-widget-cell-delta ${cls}">${deltaStr}</div>
      ${sparklineSvg(points, isUp)}
    </div>`;
}

function mktWidgetCardHtml(tickers, snaps, sparks) {
  const cells = tickers.map((t, i) => mktWidgetCellHtml(t, snaps[i], sparks[i])).join("");
  return `<div class="mkt-widget-card">${cells}</div>`;
}

async function renderMarketWidget() {
  const track = el("mktWidgetTrack");
  const tickers = getMarketWidgetTickers();
  const items = tickers.map((t) => INDEX_ITEM_BY_TICKER.get(t)).filter(Boolean);
  const [snaps, sparks] = await Promise.all([
    mapWithConcurrency(items, 8, fetchOneIndexSnap),
    mapWithConcurrency(items, 8, fetchTodaySparkPoints),
  ]);
  const cardA = mktWidgetCardHtml(tickers.slice(0, 4), snaps.slice(0, 4), sparks.slice(0, 4));
  const cardB = mktWidgetCardHtml(tickers.slice(4, 8), snaps.slice(4, 8), sparks.slice(4, 8));
  track.innerHTML = cardA + cardB;
  el("mktWidgetDots").innerHTML = `<span class="mkt-widget-dot active"></span><span class="mkt-widget-dot"></span>`;
}

// 카드 스크롤 위치에 맞춰 하단 점 표시 동기화
el("mktWidgetTrack").addEventListener("scroll", () => {
  const track = el("mktWidgetTrack");
  const idx = Math.round(track.scrollLeft / track.clientWidth);
  el("mktWidgetDots").querySelectorAll(".mkt-widget-dot").forEach((dot, i) => dot.classList.toggle("active", i === idx));
});

// ---------- 시장 위젯 종목 수정(체크박스로 정확히 8개 선택) ----------
function mktWidgetEditBodyHtml(selected) {
  const seenTickers = new Set(); // 금·비트코인처럼 같은 종목이 여러 카테고리에 중복 등장하므로 처음 나온 카테고리에서만 체크박스 생성
  const groups = Object.entries(INDEX_CATEGORIES)
    .filter(([key]) => key !== "bonds") // 채권은 FRED 소스라 인트라데이 스파크라인을 그릴 수 없어 선택지에서 제외
    .map(([, cat]) => {
      const opts = cat.items
        .filter((item) => {
          if (seenTickers.has(item.ticker)) return false;
          seenTickers.add(item.ticker);
          return true;
        })
        .map(
          (item) => `
        <label class="mkt-widget-edit-opt">
          <input type="checkbox" value="${escapeHtml(item.ticker)}" ${selected.has(item.ticker) ? "checked" : ""} />
          <span>${escapeHtml(item.name)}</span>
        </label>`
        )
        .join("");
      return opts ? `<div class="mkt-widget-edit-group"><p class="mkt-widget-edit-group-label">${escapeHtml(cat.label)}</p>${opts}</div>` : "";
    })
    .join("");
  return `
    <p class="mkt-widget-edit-count" id="mktWidgetEditCount">선택 ${selected.size}/8</p>
    ${groups}
    <button type="button" class="cat-btn mkt-widget-edit-save" id="mktWidgetEditSaveBtn">저장</button>
  `;
}
function openMktWidgetEditModal() {
  const selected = new Set(getMarketWidgetTickers());
  el("mktWidgetEditBody").innerHTML = mktWidgetEditBodyHtml(selected);
  el("mktWidgetEditModal").style.display = "flex";
}
function closeMktWidgetEditModal() {
  el("mktWidgetEditModal").style.display = "none";
}
el("mktWidgetEditBtn").addEventListener("click", openMktWidgetEditModal);
el("mktWidgetEditCloseBtn").addEventListener("click", closeMktWidgetEditModal);
el("mktWidgetEditBody").addEventListener("change", (e) => {
  const checkbox = e.target.closest('input[type="checkbox"]');
  if (!checkbox) return;
  const boxes = [...el("mktWidgetEditBody").querySelectorAll('input[type="checkbox"]')];
  const checkedCount = boxes.filter((b) => b.checked).length;
  if (checkedCount > 8) {
    checkbox.checked = false;
    alert("최대 8개까지만 선택할 수 있습니다.");
    return;
  }
  el("mktWidgetEditCount").textContent = `선택 ${checkedCount}/8`;
});
el("mktWidgetEditBody").addEventListener("click", (e) => {
  if (!e.target.closest("#mktWidgetEditSaveBtn")) return;
  const boxes = [...el("mktWidgetEditBody").querySelectorAll('input[type="checkbox"]:checked')];
  if (boxes.length !== 8) {
    alert(`정확히 8개를 선택해주세요 (현재 ${boxes.length}개).`);
    return;
  }
  setMarketWidgetTickers(boxes.map((b) => b.value));
  closeMktWidgetEditModal();
  renderMarketWidget();
});

// 현재 선택된 카테고리·"더보기"로 펼친 카테고리 목록은 새로고침·자동갱신(20초)에도 유지되도록 모듈 스코프에 둠
let indexActiveCategory = "usMarkets"; // "usMarkets" | "indices" | "crypto" | "commodities" | "bonds"
const indexExpandedCategories = new Set(); // "더보기"를 눌러 전체를 펼친 카테고리 key 모음

const indexCategoryButtons = {
  usMarkets: el("indexCatUsMarketsBtn"),
  indices: el("indexCatIndicesBtn"),
  stocks: el("indexCatStocksBtn"),
  crypto: el("indexCatCryptoBtn"),
  commodities: el("indexCatCommoditiesBtn"),
  bonds: el("indexCatBondsBtn"),
  fx: el("indexCatFxBtn"),
};
function setIndexCategoryActive(key) {
  Object.entries(indexCategoryButtons).forEach(([k, btn]) => btn && btn.classList.toggle("active", k === key));
}
Object.entries(indexCategoryButtons).forEach(([key, btn]) => {
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (indexActiveCategory === key) return;
    indexActiveCategory = key;
    setIndexCategoryActive(key);
    runIndexTab();
  });
});
setIndexCategoryActive(indexActiveCategory);

async function runIndexTab() {
  // "주식"은 지수 카드와 동일한 스타일(로고+이름/티커, 가격/등락)로 표시 — 순위는 거래량 기준으로 정렬만 하고 화면엔 노출하지 않음
  if (indexActiveCategory === "stocks") {
    return renderVolumeRanking(getUsStockVolumeCandidates(), {
      statusEl: indexStatus,
      resultsEl: indexResults,
      initialCount: 10,
      fullCount: 50,
      rankNote: "순위는 당일 거래량(주식 수) 기준이며, 미국 전 종목 대상입니다. 투자 자문이 아닙니다.",
      cardStyle: true,
    });
  }

  indexStatus.style.display = "block";
  indexStatus.textContent = "지수 데이터를 불러오는 중...";

  try {
    const cat = INDEX_CATEGORIES[indexActiveCategory];
    const items = cat.items;
    const snaps = await mapWithConcurrency(items, 6, fetchOneIndexSnap);

    const expanded = indexExpandedCategories.has(indexActiveCategory);
    const visibleCount = expanded ? items.length : Math.min(INDEX_CATEGORY_PAGE_SIZE, items.length);
    const rows = items.slice(0, visibleCount).map((item, i) => indexRowHtml(item, snaps[i])).join("");
    const moreBtnHtml =
      items.length > INDEX_CATEGORY_PAGE_SIZE
        ? `<button type="button" class="cat-btn index-toggle-btn" id="indexToggleBtn">${expanded ? "간략히 보기" : "더보기"}</button>`
        : "";

    indexStatus.style.display = "none";
    indexResults.innerHTML = `
      <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 환율·지수·원자재·가상자산은 전일 종가 대비, 국채·금리차는 FRED 최신치(전 영업일 대비, 일본·한국 10년물은 월간 데이터라 전월 대비) 기준이며 상승은 빨강·하락은 파랑입니다.</p>
      <div class="idx-list">${rows}</div>
      ${moreBtnHtml}
    `;
    if (moreBtnHtml) {
      el("indexToggleBtn").addEventListener("click", () => {
        if (expanded) indexExpandedCategories.delete(indexActiveCategory);
        else indexExpandedCategories.add(indexActiveCategory);
        runIndexTab();
      });
    }
  } catch (err) {
    indexStatus.textContent = `❌ ${err.message || "지수 데이터를 가져오지 못했습니다."}`;
  }
}

// ---------- 지수 탭: 새로고침 버튼 대신 아래로 당겨서 새로고침(pull-to-refresh) ----------
// 문서/윈도우가 맨 위로 스크롤된 상태에서 지수 탭이 활성화되어 있을 때만 동작(다른 탭·스크롤 중엔 무시).
// 캐로셀 좌우 스와이프(#carouselViewport의 pointer 핸들러)는 수평 드래그만 가로채므로 수직 당김과 충돌하지 않음.
(function setupIndexPullToRefresh() {
  const panel = el("marketPanel");
  const scrollBody = panel ? panel.querySelector(".company-panel-body") : null;
  const indicator = el("indexPullToRefresh");
  if (!panel || !scrollBody || !indicator) return;
  const indicatorText = indicator.querySelector(".pull-refresh-text");
  const THRESHOLD = 60;
  let startY = null;
  let pulling = false;
  let refreshing = false;

  // 시장 패널은 window가 아니라 .company-panel-body 내부에서 자체 스크롤되므로 window.scrollY 대신
  // scrollBody.scrollTop으로 "맨 위에 있는지"를 판단해야 함
  panel.addEventListener(
    "touchstart",
    (e) => {
      if (!marketPanelOpen || scrollBody.scrollTop > 0 || refreshing) {
        startY = null;
        return;
      }
      startY = e.touches[0].clientY;
      pulling = false;
    },
    { passive: true }
  );

  panel.addEventListener(
    "touchmove",
    (e) => {
      if (startY === null || refreshing) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0 || scrollBody.scrollTop > 0) {
        pulling = false;
        indicator.classList.remove("pull-refresh-visible", "pull-refresh-ready");
        return;
      }
      pulling = true;
      const dist = Math.min(dy, THRESHOLD * 1.6);
      indicator.classList.add("pull-refresh-visible");
      indicator.classList.toggle("pull-refresh-ready", dist >= THRESHOLD);
      indicator.style.transform = `translateY(${dist}px)`;
      indicatorText.textContent = dist >= THRESHOLD ? "↑ 놓으면 새로고침" : "↓ 당겨서 새로고침";
    },
    { passive: true }
  );

  panel.addEventListener("touchend", () => {
    if (!pulling) {
      startY = null;
      return;
    }
    const ready = indicator.classList.contains("pull-refresh-ready");
    indicator.classList.remove("pull-refresh-visible", "pull-refresh-ready");
    indicator.style.transform = "";
    startY = null;
    pulling = false;
    if (ready && !refreshing) {
      refreshing = true;
      indicatorText.textContent = "🔄 새로고침 중...";
      indicator.classList.add("pull-refresh-visible");
      Promise.resolve(runIndexTab()).finally(() => {
        refreshing = false;
        indicator.classList.remove("pull-refresh-visible");
      });
    }
  });
})();

// ---------- 지수 자동 갱신: 지수 탭이 활성화되어 있는 동안만 주기적으로 새로고침 ----------
// 0.5초 간격은 무료 CORS 프록시·FRED에 초당 수십 건의 요청을 보내는 셈이라 곧바로 차단(429/520)당해
// 오히려 "채권이 업데이트 안 됨" 증상을 더 악화시킴 — 대신 20초마다 갱신해 체감상 실시간에 가깝게 유지하면서도
// 화면이 백그라운드에 있을 땐(document.hidden) 요청을 건너뛰어 불필요한 트래픽을 줄임.
// 이 주기 동안 어쩌다 한 번 FRED 요청이 실패해도(520 등) 다음 주기에 자동으로 다시 시도되므로
// "채권 값이 그대로 멈춰 있는" 문제도 자연스럽게 해소됨.
// (INDEX_AUTO_REFRESH_MS는 이 파일 맨 앞쪽으로 옮김 — US Markets가 기본 탭이 되면서 initApp()의 switchTab(0)이
// 페이지 로딩 초반에 곧바로 startIndexAutoRefresh()를 호출하므로, const를 여기 그대로 두면 TDZ 에러가 남)
var indexAutoRefreshTimer = null;
function startIndexAutoRefresh() {
  stopIndexAutoRefresh();
  indexAutoRefreshTimer = setInterval(() => {
    if (document.hidden) return;
    runIndexTab();
  }, INDEX_AUTO_REFRESH_MS);
}
function stopIndexAutoRefresh() {
  if (indexAutoRefreshTimer) clearInterval(indexAutoRefreshTimer);
  indexAutoRefreshTimer = null;
}

// S&P500 전 종목의 전일 등락률을 가볍게 조회(차트 1회, 5일치 일봉)해 급등주/급락주 정렬 후보로 사용
// 급등주·급락주 탭이 같은 스크리닝 결과를 공유하도록 메모이즈(500종목 조회를 두 번 하지 않음)
let sp500DailyChangesPromise = null;
async function getSP500DailyChanges() {
  if (!sp500DailyChangesPromise) {
    sp500DailyChangesPromise = (async () => {
      const tickers = await getSP500Tickers();
      const results = await mapWithConcurrency(tickers, 15, async (symbol) => {
        const chart = await yahooChart(symbol, "5d", "1d").catch(() => null);
        const changePct = getDailyChangePercent(chart);
        const meta = chart && chart.chart && chart.chart.result && chart.chart.result[0] && chart.chart.result[0].meta;
        if (changePct === null || !meta || meta.regularMarketPrice === undefined) return null;
        return { symbol, name: meta.shortName || meta.longName || symbol, price: meta.regularMarketPrice, changePct };
      });
      return results.filter(Boolean);
    })().catch((e) => {
      sp500DailyChangesPromise = null; // 실패 시 재시도 가능하도록 캐시 초기화
      throw e;
    });
  }
  return sp500DailyChangesPromise;
}

// 추세평가 서브내비에서 현재 선택된 버튼만 활성 표시
function setTrendActive(activeBtn) {
  Object.values(trendButtons).forEach((b) => b && b.classList.toggle("active", b === activeBtn));
}
const bindTrend = (btn, run) =>
  btn.addEventListener("click", () => {
    setTrendActive(btn);
    run();
  });

// ---------- 급등주/급락주: S&P500 종목 중 전일 등락률 상위·하위 50개, 접속 시 10개만 먼저 표시 ----------
async function runMovers(direction) {
  const label = direction === "surge" ? "상승률" : "하락률";
  setTrendActive(direction === "surge" ? trendButtons.surge : trendButtons.plunge);
  trendResults.innerHTML = "";
  trendStatus.style.display = "block";
  trendStatus.textContent = `S&P500 ${label}을 불러오는 중...`;

  try {
    const marketReturnsPromise = getMarketReturns();
    const candidates = await getSP500DailyChanges();
    if (candidates.length === 0) throw new Error(`${label} 데이터를 가져오지 못했습니다.`);

    // candidates는 급등주·급락주가 공유하는 캐시 배열이므로 정렬 전 복사(원본을 직접 sort하면 서로 순서가 꼬임)
    const sorted = [...candidates]
      .sort((a, b) => (direction === "surge" ? b.changePct - a.changePct : a.changePct - b.changePct))
      .slice(0, 50);

    await scoreAndRenderMovers(sorted, marketReturnsPromise, {
      statusEl: trendStatus,
      resultsEl: trendResults,
      rankNote: `순위는 전일 대비 등락률(${direction === "surge" ? "상승률 높은" : "하락률 큰"} 순) 기준이며, S&P500 편입 종목 중 상위 50개입니다.`,
      initialCount: 10,
      fullCount: 50,
    });
  } catch (err) {
    trendStatus.textContent = `❌ ${err.message || `${label}을 가져오지 못했습니다.`}`;
  }
}

// ---------- 인기종목: 당일 거래대금(가격 × 거래량) 상위 20개, 접속 시 10개만 먼저 표시(옛 틀고정 "인기종목" 탭이 여기로 통합됨) ----------
async function runTrendVolume() {
  setTrendActive(trendButtons.volume);
  trendResults.innerHTML = "";
  trendStatus.style.display = "block";
  trendStatus.textContent = "인기종목을 불러오는 중...";

  try {
    const marketReturnsPromise = getMarketReturns();
    const data = await yahooMostActive(50);
    const quotes = (data && data.finance && data.finance.result && data.finance.result[0] && data.finance.result[0].quotes) || [];
    if (quotes.length === 0) throw new Error("인기종목 데이터를 가져오지 못했습니다.");

    const ranked = quotes
      .filter((q) => q && q.symbol && q.regularMarketPrice !== undefined && q.regularMarketVolume !== undefined)
      .map((q) => ({
        symbol: q.symbol,
        name: q.shortName || q.longName || q.symbol,
        price: q.regularMarketPrice,
        changePct: q.regularMarketChangePercent,
        volume: q.regularMarketVolume,
        dollarVolume: (q.regularMarketPrice || 0) * (q.regularMarketVolume || 0),
      }))
      .sort((a, b) => b.dollarVolume - a.dollarVolume)
      .slice(0, 20);

    await scoreAndRenderMovers(ranked, marketReturnsPromise, {
      statusEl: trendStatus,
      resultsEl: trendResults,
      rankNote: "순위는 당일 거래대금(거래량 × 현재가 추정) 기준입니다.",
      initialCount: 10,
      fullCount: 20,
    });
  } catch (err) {
    trendStatus.textContent = `❌ ${err.message || "인기종목을 가져오지 못했습니다."}`;
  }
}

// ---------- 상승압력: S&P500 전 종목 중 상승압력도 점수가 높은 순(가치평가 탭과 같은 방식의 정렬+더보기 렌더러 재사용) ----------
async function runTrendPressure() {
  setTrendActive(trendButtons.pressure);
  trendStatus.style.display = "block";
  trendStatus.textContent = "S&P500 종목 목록을 불러오는 중...";
  const allTickers = await getSP500PriorityOrder().catch((e) => {
    trendStatus.textContent = `❌ ${e.message || "종목 목록을 가져오지 못했습니다."}`;
    return null;
  });
  if (!allTickers) return;

  await renderValueRanking(allTickers, "상승압력", {
    statusEl: trendStatus,
    resultsEl: trendResults,
    buttons: [trendButtons.pressure],
    mapFn: (list) => list.map((m) => ({ ...m, attractivenessTotal: computeAttractivenessScore(m).total, isIPO: isRecentIPO(m.firstTradeDate) })),
    sortFn: (a, b) => b.attractivenessTotal - a.attractivenessTotal,
    metricHeaderHtml: "상승압력도 점수",
    metricCellFn: (r) => (r.isIPO ? "IPO" : `<b>${r.attractivenessTotal}/10</b>`),
    noteHtml: `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 상승압력도 점수(10점 만점, 높을수록 단기 상승 여력 참고치가 큼)는 거래대금·모멘텀·매출 성장성을 종합한 참고용 지표이며 투자 자문이 아닙니다.</p>`,
  });
}

bindTrend(trendButtons.volume, runTrendVolume);
bindTrend(trendButtons.plunge, () => runMovers("plunge"));
bindTrend(trendButtons.surge, () => runMovers("surge"));
bindTrend(trendButtons.pressure, runTrendPressure);

// US Markets 탭의 "주식" 카테고리 전용 카드 행 — 지수 카드(idx-row)와 동일한 스타일(로고+이름/티커, 가격/등락)
function stockCardRowHtml(r) {
  const displayName = TICKER_TO_KOREAN_NAME[r.symbol] || r.name;
  const currencySign = r.currency === "KRW" ? "₩" : "$";
  const priceStr = currencySign + r.price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const sign = (n) => (n >= 0 ? "+" : "");
  let cls = "";
  let changeAmtStr = "";
  let pctStr = "";
  if (r.changePct !== null && r.changePct !== undefined) {
    cls = r.changePct >= 0 ? "delta-up" : "delta-down";
    const arrow = r.changePct >= 0 ? "▲" : "▼";
    changeAmtStr = r.change !== null && r.change !== undefined ? `${sign(r.change)}${r.change.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "";
    pctStr = `${arrow} ${Math.abs(r.changePct).toFixed(2)}%`;
  }
  const volumeStr = r.volume !== null && r.volume !== undefined ? r.volume.toLocaleString() : "N/A";

  const now = new Date();
  const isToday = !!r.time && r.time.getFullYear() === now.getFullYear() && r.time.getMonth() === now.getMonth() && r.time.getDate() === now.getDate();
  const clockLabel = r.time
    ? (isToday
        ? `${String(r.time.getHours()).padStart(2, "0")}:${String(r.time.getMinutes()).padStart(2, "0")}:${String(r.time.getSeconds()).padStart(2, "0")}`
        : `${String(r.time.getMonth() + 1).padStart(2, "0")}/${String(r.time.getDate()).padStart(2, "0")}`)
    : "";
  const clockClass = isToday ? "idx-clock idx-clock-live" : "idx-clock";

  return `
    <div class="idx-row stock-card-row ticker-link idx-row-clickable" data-ticker="${escapeHtml(r.symbol)}">
      <div class="idx-left">
        <div class="idx-name">${tickerLogoHtml(r.symbol)}${escapeHtml(displayName)}</div>
        <div class="idx-sub">${clockLabel ? `<span class="${clockClass}">🕐 ${clockLabel}</span> | ` : ""}<span class="idx-ticker">${escapeHtml(r.symbol)}</span></div>
      </div>
      <div class="stock-card-right">
        <div class="stock-card-r1">
          <span class="stock-card-price ${cls}">${priceStr}</span>
          <span class="stock-card-change ${cls}">${changeAmtStr}</span>
        </div>
        <div class="stock-card-r2">
          <span class="stock-card-volume">${volumeStr}</span>
          <span class="stock-card-pct ${cls}">${pctStr}</span>
        </div>
      </div>
    </div>`;
}

// ---------- US Stock/US ETF/KR ETF 거래량 랭킹: ETF는 상승압력·투자안정 점수가 의미 없어 순위·티커·현재가·거래량만 표시하는 전용 렌더러 사용 ----------
function volumeRankingTableHtml(rows, { logoAfterName = false } = {}) {
  const trs = rows
    .map(
      (r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><span class="ticker-cell">${
          logoAfterName
            ? `<b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(r.symbol)}</b>${tickerLogoHtml(r.symbol)}`
            : `${tickerLogoHtml(r.symbol)}<b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(r.symbol)}</b>`
        }</span><br><span class="muted" style="font-size:11px;">${escapeHtml(r.name)}</span></td>
        <td>${priceChartLink(r.symbol, (r.currency === "KRW" ? "₩" : "$") + r.price.toLocaleString(undefined, { maximumFractionDigits: 2 }))}${r.changePct !== null && r.changePct !== undefined ? `<br><span class="${r.changePct >= 0 ? "delta-up" : "delta-down"}" style="font-size:11px;">(${fmtPct(r.changePct)})</span>` : ""}</td>
        <td>${r.volume !== null && r.volume !== undefined ? r.volume.toLocaleString() : "N/A"}</td>
      </tr>`
    )
    .join("");
  return `
    <div class="popular-table-wrap">
      <table class="top30-table popular-table">
        <thead><tr><th>순위</th><th>티커</th><th>현재가<br>(등락률)</th><th>거래량</th></tr></thead>
        <tbody>${trs}</tbody>
      </table>
    </div>`;
}

// candidatesPromise는 이미 거래량 내림차순 정렬된 전체 후보 배열(추가 API 호출 없이 already-fetched 데이터에서 더보기로 노출 범위만 넓힘)
async function renderVolumeRanking(candidatesPromise, { statusEl, resultsEl, initialCount = 10, fullCount = 30, rankNote, logoAfterName = false, cardStyle = false }) {
  statusEl.style.display = "block";
  statusEl.textContent = "거래량 데이터를 불러오는 중...";
  resultsEl.innerHTML = "";
  try {
    const all = await candidatesPromise;
    statusEl.style.display = "none";
    if (!all || all.length === 0) {
      resultsEl.innerHTML = `<p class="muted">데이터를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.</p>`;
      return;
    }
    const capped = Math.min(fullCount, all.length);
    let shown = Math.min(initialCount, capped);
    const render = () => {
      const hasMore = shown < capped;
      const listHtml = cardStyle
        ? `<div class="idx-list">${all.slice(0, shown).map(stockCardRowHtml).join("")}</div>`
        : volumeRankingTableHtml(all.slice(0, shown), { logoAfterName });
      resultsEl.innerHTML =
        (rankNote ? `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ${rankNote}</p>` : "") +
        listHtml +
        (hasMore ? `<button type="button" class="cat-btn load-more-btn" data-next-count="${Math.min(shown + initialCount, capped)}">더보기 (${shown}/${capped})</button>` : "");
    };
    render();
    resultsEl._loadMore = (count) => {
      shown = count;
      render();
    };
    if (!resultsEl.dataset.moreBound) {
      resultsEl.addEventListener("click", (e) => {
        const moreBtn = e.target.closest(".load-more-btn");
        if (!moreBtn) return;
        resultsEl._loadMore(Number(moreBtn.dataset.nextCount));
      });
      resultsEl.dataset.moreBound = "1";
    }
  } catch (err) {
    statusEl.style.display = "block";
    statusEl.textContent = `❌ ${err.message || "거래량 데이터를 가져오지 못했습니다."}`;
  }
}

async function getUsStockVolumeCandidates() {
  const data = await yahooMostActive(50);
  const quotes = (data && data.finance && data.finance.result && data.finance.result[0] && data.finance.result[0].quotes) || [];
  return quotes
    .filter((q) => q && q.symbol && q.regularMarketPrice !== undefined && q.regularMarketVolume !== undefined)
    .map((q) => ({
      symbol: q.symbol,
      name: q.shortName || q.longName || q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChange ?? null,
      changePct: q.regularMarketChangePercent ?? null,
      volume: q.regularMarketVolume,
      time: q.regularMarketTime ? new Date(q.regularMarketTime * 1000) : null,
      currency: "USD",
    }))
    .sort((a, b) => b.volume - a.volume);
}

// ETF는 1년치 차트를 한 번만 받아 거래대금(1년 평균)·상승률(1년) 두 기준을 모두 계산 — 기준 전환 시 재조회 없이 재정렬만 함
async function fetchEtfMetrics(tickers, nameMap) {
  const results = await mapWithConcurrency(tickers, 8, async (symbol) => {
    const chart = await yahooChart(symbol).catch(() => null);
    const meta = chart && chart.chart && chart.chart.result && chart.chart.result[0] && chart.chart.result[0].meta;
    if (!meta || meta.regularMarketPrice === undefined) return null;
    return {
      symbol,
      name: (nameMap && nameMap[symbol]) || meta.shortName || meta.longName || symbol,
      price: meta.regularMarketPrice,
      changePct: getDailyChangePercent(chart),
      avgDollarVolume1y: currentDollarVolumeStats(chart).avg1y,
      oneYearReturn: get1yReturnFromChart(chart),
      currency: meta.currency || "USD",
    };
  });
  return results.filter(Boolean);
}

const US_ETF_TICKERS = [
  "SPY", "QQQ", "IWM", "VTI", "VOO", "DIA", "ARKK", "XLF", "XLK", "XLE",
  "XLV", "XLY", "XLP", "XLI", "GLD", "SLV", "TLT", "HYG", "LQD", "EEM",
  "EFA", "SOXL", "TQQQ", "SQQQ", "UVXY", "VXX", "SMH", "XBI", "KRE", "VNQ",
];

const KR_ETF_LIST = [
  { t: "069500.KS", name: "KODEX 200" },
  { t: "102110.KS", name: "TIGER 200" },
  { t: "233740.KS", name: "KODEX 코스닥150레버리지" },
  { t: "122630.KS", name: "KODEX 레버리지" },
  { t: "252670.KS", name: "KODEX 200선물인버스2X" },
  { t: "251340.KS", name: "KODEX 코스닥150선물인버스" },
  { t: "114800.KS", name: "KODEX 인버스" },
  { t: "091160.KS", name: "KODEX 반도체" },
  { t: "091170.KS", name: "KODEX 은행" },
  { t: "139660.KS", name: "TIGER 200선물레버리지" },
  { t: "305720.KS", name: "KODEX 2차전지산업" },
  { t: "091220.KS", name: "TIGER 반도체" },
  { t: "133690.KS", name: "TIGER 미국나스닥100" },
  { t: "360750.KS", name: "TIGER 미국S&P500" },
  { t: "381170.KS", name: "TIGER 미국테크TOP10 INDXX" },
  { t: "379800.KS", name: "KODEX 미국S&P500TR" },
  { t: "371460.KS", name: "TIGER 차이나전기차SOLACTIVE" },
  { t: "396500.KS", name: "TIGER 부동산인프라고배당" },
  { t: "192090.KS", name: "TIGER 차이나CSI300" },
  { t: "232080.KS", name: "TIGER 코스피" },
  { t: "277630.KS", name: "TIGER KRX2000" },
  { t: "148020.KS", name: "KBSTAR 200" },
  { t: "294400.KS", name: "KBSTAR 200선물레버리지" },
  { t: "069660.KS", name: "KOSEF 200" },
  { t: "104530.KS", name: "KODEX WTI원유선물(H)" },
  { t: "130680.KS", name: "TIGER 원유선물Enhanced(H)" },
  { t: "132030.KS", name: "KODEX 골드선물(H)" },
  { t: "261240.KS", name: "KODEX WTI원유선물인버스(H)" },
  { t: "273130.KS", name: "KODEX 종합채권(AA-이상)액티브" },
  { t: "114260.KS", name: "KODEX 국고채3년" },
];

// ---------- US ETF / KR ETF: 거래대금(1년 평균) · 상승률(1년) 두 기준을 하위 버튼으로 전환하며 보는 랭킹 ----------
let etfMetricsCache = {}; // region("us"|"kr") -> 이미 조회한 candidates 배열(기준 전환 시 재사용)
let trendEtfActiveRegion = "us";
let trendEtfActiveMetric = "volume"; // "volume" | "return"

function etfRankingHtml(all, region, metric) {
  const sorted = [...all].sort((a, b) =>
    metric === "volume" ? (b.avgDollarVolume1y || 0) - (a.avgDollarVolume1y || 0) : (b.oneYearReturn ?? -Infinity) - (a.oneYearReturn ?? -Infinity)
  );
  const rows = sorted.slice(0, 30);
  const metricCell = (r) =>
    metric === "volume"
      ? r.avgDollarVolume1y
        ? fmtCompactCurrency(r.avgDollarVolume1y)
        : "N/A"
      : r.oneYearReturn !== null && r.oneYearReturn !== undefined
      ? `<span class="${r.oneYearReturn >= 0 ? "delta-up" : "delta-down"}">${fmtPct(r.oneYearReturn)}</span>`
      : "N/A";
  const subnav = `
    <div class="top30-sub-nav" style="margin-bottom:10px;">
      <button type="button" class="cat-btn${metric === "volume" ? " active" : ""}" data-etf-metric="volume">거래대금(1년)</button>
      <button type="button" class="cat-btn${metric === "return" ? " active" : ""}" data-etf-metric="return">상승률(1년)</button>
    </div>`;
  const rowsHtml = rows
    .map(
      (r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><span class="ticker-cell">${tickerLogoHtml(r.symbol)}<b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(r.symbol)}</b></span><br><span class="muted" style="font-size:11px;">${escapeHtml(r.name)}</span></td>
        <td>${priceChartLink(r.symbol, (r.currency === "KRW" ? "₩" : "$") + r.price.toLocaleString(undefined, { maximumFractionDigits: 2 }))}${
        r.changePct !== null && r.changePct !== undefined
          ? `<br><span class="${r.changePct >= 0 ? "delta-up" : "delta-down"}" style="font-size:11px;">(${fmtPct(r.changePct)})</span>`
          : ""
      }</td>
        <td>${metricCell(r)}</td>
      </tr>`
    )
    .join("");
  return `
    ${subnav}
    <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ${region === "us" ? "미국" : "한국"} 주요 상장 ETF 목록 중 ${
    metric === "volume" ? "거래대금(1년 평균)" : "상승률(1년)"
  } 상위 30개입니다. 투자 자문이 아닙니다.</p>
    <div class="popular-table-wrap">
      <table class="top30-table popular-table">
        <thead><tr><th>순위</th><th>티커</th><th>현재가<br>(등락률)</th><th>${metric === "volume" ? "거래대금(1년)" : "상승률(1년)"}</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
}

async function runTrendEtf(region) {
  trendEtfActiveRegion = region;
  setTrendActive(region === "us" ? trendButtons.usEtf : trendButtons.krEtf);
  trendResults.innerHTML = "";
  trendStatus.style.display = "block";
  trendStatus.textContent = "ETF 데이터를 불러오는 중...";
  try {
    if (!etfMetricsCache[region]) {
      const nameMap = region === "kr" ? Object.fromEntries(KR_ETF_LIST.map((x) => [x.t, x.name])) : null;
      const tickers = region === "us" ? US_ETF_TICKERS : KR_ETF_LIST.map((x) => x.t);
      etfMetricsCache[region] = await fetchEtfMetrics(tickers, nameMap);
    }
    trendStatus.style.display = "none";
    trendResults.innerHTML = etfRankingHtml(etfMetricsCache[region], region, trendEtfActiveMetric);
  } catch (e) {
    trendStatus.textContent = `❌ ${e.message || "ETF 데이터를 가져오지 못했습니다."}`;
  }
}
async function runTrendUsEtf() {
  await runTrendEtf("us");
}
async function runTrendKrEtf() {
  await runTrendEtf("kr");
}
trendResults.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-etf-metric]");
  if (!btn || !etfMetricsCache[trendEtfActiveRegion]) return;
  trendEtfActiveMetric = btn.dataset.etfMetric;
  trendResults.innerHTML = etfRankingHtml(etfMetricsCache[trendEtfActiveRegion], trendEtfActiveRegion, trendEtfActiveMetric);
});

bindTrend(trendButtons.usEtf, runTrendUsEtf);
bindTrend(trendButtons.krEtf, runTrendKrEtf);

// ---------- 미래예측(베타): 과거 4개년 계절성(흰색) + 최근 6개월 실제 흐름·향후 6개월 예측(빨간색)을 한 차트에 표시 ----------
// 설계: 오늘을 기준으로 anchor = 오늘로부터 k년 전(k=4,3,2,1은 과거 4개년, k=0은 현재)을 잡고, 각 anchor의 앞뒤 6개월(총 12개월) 구간을
// 창(window)으로 삼는다. 창 시작 시점의 종가를 0%로 놓고 이후 각 거래일의 %변화를 구하면 서로 다른 해라도 같은 기준으로 겹쳐 비교할 수 있다.
// x좌표는 항상 "실제 경과일 / 창 전체 길이(12개월)"로 계산하므로(인덱스 기반이 아님) 그래프가 좌우로 늘어나거나 틀어지지 않는다.
// 현재(k=0) 구간은 창의 뒤쪽 절반(6개월치)이 아직 미래라 실데이터가 없으므로, 앞쪽 절반만 실선으로 그리고
// 과거 4개년의 "창 중간→끝" 구간 변화폭 평균(=4년 평균 기울기)을 오늘 시점 값에 더해 점선으로 이어 그린다.
const FUTURE_YEARS_BACK = 4;
const FUTURE_MONTH_NAMES_KO = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
const FUTURE_LINE_COLORS = ["#eceef2", "#c7cbd6", "#a7acbc", "#888fa3"];

function addMonths(date, months) {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

// pairs(chartClosePairs 결과)에서 windowStartSec~dataEndSec 구간만 뽑아 baseClose 대비 %로 환산하고,
// x좌표(frac)는 실제 창 전체 길이(fullEndSec) 기준으로 계산 — 현재 구간처럼 데이터가 창의 절반까지만 있어도 폭 비율은 정확히 유지됨
function buildBucketSeries(pairs, windowStartSec, dataEndSec, fullEndSec, baseClose) {
  return pairs
    .filter((p) => p.t >= windowStartSec && p.t <= dataEndSec)
    .map((p) => ({ frac: (p.t - windowStartSec) / (fullEndSec - windowStartSec), pct: ((p.c - baseClose) / baseClose) * 100 }));
}

async function computeFuturePrediction(ticker) {
  const now = new Date();
  const nowSec = Math.floor(now.getTime() / 1000);

  const buckets = [];
  for (let k = FUTURE_YEARS_BACK; k >= 0; k--) {
    const anchor = addMonths(now, -12 * k);
    const windowStartSec = Math.floor(addMonths(anchor, -6).getTime() / 1000);
    const fullEndSec = Math.floor(addMonths(anchor, 6).getTime() / 1000);
    const dataEndSec = k === 0 ? nowSec : fullEndSec;
    buckets.push({ k, year: anchor.getFullYear(), windowStartSec, dataEndSec, fullEndSec });
  }

  const earliestStartSec = buckets[0].windowStartSec; // k=FUTURE_YEARS_BACK(가장 과거)이 배열의 첫 원소
  const chartData = await yahooChartRange(ticker, earliestStartSec - 5 * 24 * 3600, nowSec + 24 * 3600, "1d");
  if (!chartData || !chartData.chart || !chartData.chart.result || !chartData.chart.result[0]) {
    throw new Error(`'${ticker}'의 시세 데이터를 가져오지 못했습니다.`);
  }
  const pairs = chartClosePairs(chartData);
  if (pairs.length < 2) {
    throw new Error(`'${ticker}'의 시세 데이터가 충분하지 않습니다.`);
  }

  const series = [];
  let currentBasePrice = null; // 현재(k=0) 구간의 창 시작가 — 예상 도달가를 달러로 환산할 때 기준
  for (const b of buckets) {
    const base = closestPair(pairs, b.windowStartSec);
    // 상장한 지 얼마 안 된 종목은 그만큼 과거 데이터가 없어 closestPair가 엉뚱하게 먼 시점을 반환할 수 있으므로,
    // 창 시작 시점과 30일 이상 어긋나면 그 해는 신뢰할 수 없다고 보고 건너뜀(억지로 왜곡된 선을 그리지 않음)
    if (!base || !base.c || Math.abs(base.t - b.windowStartSec) > 30 * 24 * 3600) continue;
    if (b.k === 0) currentBasePrice = base.c;
    const points = buildBucketSeries(pairs, b.windowStartSec, b.dataEndSec, b.fullEndSec, base.c);
    if (points.length < 2) continue;
    series.push({ k: b.k, year: b.year, points });
  }

  const currentBucket = series.find((s) => s.k === 0);
  if (!currentBucket) throw new Error(`'${ticker}'의 최근 6개월 데이터를 가져오지 못했습니다.`);
  const historicalBuckets = series.filter((s) => s.k !== 0).sort((a, b) => b.year - a.year);

  const currentPct = currentBucket.points[currentBucket.points.length - 1].pct;

  // "4년 평균 기울기" = 과거 각 해의 후반부(창의 6개월 지점→12개월 지점) 변화폭의 평균
  const forwardDeltas = historicalBuckets
    .map((s) => {
      let mid = s.points[0];
      for (const p of s.points) {
        if (Math.abs(p.frac - 0.5) < Math.abs(mid.frac - 0.5)) mid = p;
      }
      const end = s.points[s.points.length - 1];
      if (end.frac < 0.9) return null; // 후반부가 거의 없는 해는 기울기 계산에서 제외
      return end.pct - mid.pct;
    })
    .filter((v) => v !== null);

  const avgForwardDelta = forwardDeltas.length ? forwardDeltas.reduce((a, b) => a + b, 0) / forwardDeltas.length : 0;
  const projectedEndPct = currentPct + avgForwardDelta;

  const currentPrice = currentBasePrice !== null ? currentBasePrice * (1 + currentPct / 100) : null;
  const forecastPrice = currentBasePrice !== null ? currentBasePrice * (1 + projectedEndPct / 100) : null;

  return {
    ticker,
    historicalBuckets,
    currentBucket,
    currentPrice,
    forecast: { endPct: projectedEndPct, price: forecastPrice },
    axisMonthStart: addMonths(now, -6),
    hasForwardData: forwardDeltas.length > 0,
  };
}

function niceStep(range) {
  const rough = range / 6;
  const candidates = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
  for (const c of candidates) if (rough <= c) return c;
  return Math.ceil(rough / 500) * 500;
}

function niceAxisBounds(minVal, maxVal) {
  const span = Math.max(maxVal - minVal, 10);
  const pad = span * 0.15;
  const step = niceStep(span + pad * 2);
  const lo = Math.floor((minVal - pad) / step) * step;
  const hi = Math.ceil((maxVal + pad) / step) * step;
  return { lo, hi, step };
}

function pathFromPoints(points, xFn, yFn) {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${xFn(p.frac).toFixed(1)},${yFn(p.pct).toFixed(1)}`).join(" ");
}

// ---------- 요약 탭 상단 가격 차트(1일/1주/1달/1년/5년/최대) ----------
// niceStep/niceAxisBounds는 미래예측(퍼센트, 최소폭 10 고정)용이라 저가주에는 그리드가 너무 성겨져서
// 가격 스케일에 맞는 1-2-5 규칙의 범용 step 계산기를 별도로 둠
function niceStepGeneric(rawStep) {
  if (!(rawStep > 0)) return 1;
  const exp = Math.floor(Math.log10(rawStep));
  const base = Math.pow(10, exp);
  const frac = rawStep / base;
  let niceFrac;
  if (frac < 1.5) niceFrac = 1;
  else if (frac < 3) niceFrac = 2;
  else if (frac < 7) niceFrac = 5;
  else niceFrac = 10;
  return niceFrac * base;
}
// 최댓값이 그래프 맨 위에 거의 붙도록 위쪽 여백은 아주 작게, 아래쪽은 라벨이 안 잘릴 정도만 남김(둥근 step으로 반올림하지 않음)
function priceAxisBounds(minVal, maxVal) {
  const span = Math.max(maxVal - minVal, Math.abs(maxVal || 1) * 0.001);
  const lo = minVal - span * 0.05;
  const hi = maxVal + span * 0.03;
  return { lo, hi };
}
function fmtChartPrice(v) {
  if (Math.abs(v) >= 1000) return "$" + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return "$" + v.toFixed(2);
}
const CHART_PERIOD_CONFIG = {
  "1d": { range: "1d", interval: "5m" },
  "5d": { range: "5d", interval: "15m" },
  "1mo": { range: "1mo", interval: "1d" },
  "1y": { range: "1y", interval: "1d" },
  "5y": { range: "5y", interval: "1wk" },
  max: { range: "max", interval: "1mo" },
};
const CHART_PERIOD_LABEL_FMT = {
  "1d": (d) => d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
  "5d": (d) => d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }),
  "1mo": (d) => d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }),
  "1y": (d) => d.toLocaleDateString("ko-KR", { year: "2-digit", month: "numeric" }),
  "5y": (d) => d.toLocaleDateString("ko-KR", { year: "numeric", month: "numeric" }),
  max: (d) => d.toLocaleDateString("ko-KR", { year: "numeric" }),
};

// 차트 지오메트리는 build/interaction 두 함수가 동일한 좌표계를 써야 크로스헤어가 정확히 맞아떨어짐
const PRICE_CHART_GEOM = { W: 780, H: 440, ML: 8, MR: 148, MT: 24, MB: 52 };
const PRICE_TAG_W = 132,
  PRICE_TAG_NOTCH = 8,
  PRICE_TAG_H = 36;

// 현재가/터치 위치를 가리키는 "책갈피" 모양(왼쪽 삼각 포인터 + 사각 라벨) path
function bookmarkTagPath(xStart, yCenter) {
  const halfH = PRICE_TAG_H / 2;
  const x1 = xStart + PRICE_TAG_NOTCH;
  const x2 = x1 + PRICE_TAG_W;
  const yT = (yCenter - halfH).toFixed(1);
  const yB = (yCenter + halfH).toFixed(1);
  return `M${xStart.toFixed(1)},${yCenter.toFixed(1)} L${x1.toFixed(1)},${yT} L${x2.toFixed(1)},${yT} L${x2.toFixed(1)},${yB} L${x1.toFixed(1)},${yB} Z`;
}

function priceChartScales(pairs) {
  const { W, H, ML, MR, MT, MB } = PRICE_CHART_GEOM;
  const PW = W - ML - MR;
  const PH = H - MT - MB;
  const N = pairs.length;
  const prices = pairs.map((p) => p.c);
  const { lo, hi } = priceAxisBounds(Math.min(...prices), Math.max(...prices));
  const xFn = (i) => ML + (N <= 1 ? 0 : (i / (N - 1)) * PW);
  const yFn = (v) => MT + (1 - (v - lo) / (hi - lo)) * PH;
  return { W, H, ML, MR, MT, MB, PW, PH, N, lo, hi, xFn, yFn };
}

// 캔들 차트용 스케일 — 종가만이 아니라 고가/저가까지 포함해 축 범위를 잡아야 심지(wick)가 잘리지 않음
function priceChartScalesOhlc(pairs) {
  const { W, H, ML, MR, MT, MB } = PRICE_CHART_GEOM;
  const PW = W - ML - MR;
  const PH = H - MT - MB;
  const N = pairs.length;
  const highs = pairs.map((p) => p.h);
  const lows = pairs.map((p) => p.l);
  const { lo, hi } = priceAxisBounds(Math.min(...lows), Math.max(...highs));
  const xFn = (i) => ML + (N <= 1 ? 0 : (i / (N - 1)) * PW);
  const yFn = (v) => MT + (1 - (v - lo) / (hi - lo)) * PH;
  return { W, H, ML, MR, MT, MB, PW, PH, N, lo, hi, xFn, yFn };
}

function buildPriceChartSvg(pairs, period, symbol) {
  const { W, H, ML, MT, PW, PH, N, lo, hi, xFn, yFn } = priceChartScales(pairs);

  // Y축 라벨은 항상 정확히 5개(lo~hi를 4등분한 점)만 표시
  let gridSvg = "";
  for (let k = 0; k <= 4; k++) {
    const v = lo + (k / 4) * (hi - lo);
    const y = yFn(v);
    gridSvg += `<line x1="${ML}" y1="${y.toFixed(1)}" x2="${(ML + PW).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#23262f" stroke-width="1" />`;
    gridSvg += `<text x="${(ML + PW + 8).toFixed(1)}" y="${(y + 7).toFixed(1)}" font-size="20" fill="#8a90a3">${fmtChartPrice(v)}</text>`;
  }

  let axisSvg = "";
  const fmt = CHART_PERIOD_LABEL_FMT[period] || CHART_PERIOD_LABEL_FMT["1y"];
  for (let k = 0; k <= 4; k++) {
    const idx = Math.round((k / 4) * (N - 1));
    const x = xFn(idx);
    const d = new Date(pairs[idx].t * 1000);
    const anchor = k === 0 ? "start" : k === 4 ? "end" : "middle";
    axisSvg += `<text x="${x.toFixed(1)}" y="${(MT + PH + 36).toFixed(1)}" text-anchor="${anchor}" font-size="20" fill="#8a90a3">${escapeHtml(fmt(d))}</text>`;
  }

  const linePath = pairs.map((p, i) => `${i === 0 ? "M" : "L"}${xFn(i).toFixed(1)},${yFn(p.c).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${xFn(N - 1).toFixed(1)},${(MT + PH).toFixed(1)} L${xFn(0).toFixed(1)},${(MT + PH).toFixed(1)} Z`;

  const last = pairs[N - 1];
  const lastY = yFn(last.c);
  const lastX = xFn(N - 1);
  const gradId = `priceChartGrad${Math.random().toString(36).slice(2, 8)}`;

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(symbol)} 가격 차트">
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2f6fed" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#2f6fed" stop-opacity="0" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${W}" height="${H}" fill="#0b0d12" />
    ${gridSvg}
    <path d="${areaPath}" fill="url(#${gradId})" stroke="none" />
    <path d="${linePath}" fill="none" stroke="#2f6fed" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />
    <g id="pcCurrentMarker">
      <line x1="${ML}" y1="${lastY.toFixed(1)}" x2="${(ML + PW).toFixed(1)}" y2="${lastY.toFixed(1)}" stroke="#8a90a3" stroke-width="1" stroke-dasharray="3,3" />
      <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3.5" fill="#2f6fed" />
      <path d="${bookmarkTagPath(ML + PW, lastY)}" fill="#eceef2" />
      <text x="${(ML + PW + PRICE_TAG_NOTCH + 8).toFixed(1)}" y="${(lastY + 7).toFixed(1)}" text-anchor="start" font-size="20" font-weight="700" fill="#0b0d12">${fmtChartPrice(last.c)}</text>
    </g>
    ${axisSvg}
    <rect id="pcHitArea" x="${ML}" y="0" width="${PW}" height="${H}" fill="transparent" style="touch-action:none;" />
    <g id="pcCrosshair" style="display:none;">
      <line x1="0" y1="${MT}" x2="0" y2="${(MT + PH).toFixed(1)}" stroke="#8a90a3" stroke-width="1" stroke-dasharray="2,2" />
      <line id="pcCrosshairHLine" x1="${ML}" y1="0" x2="${(ML + PW).toFixed(1)}" y2="0" stroke="#8a90a3" stroke-width="1" stroke-dasharray="2,2" />
      <circle id="pcCrosshairDot" r="4" fill="#0b0d12" stroke="#2f6fed" stroke-width="2" />
      <path id="pcCrosshairTagPath" fill="#eceef2" />
      <text id="pcCrosshairTagText" text-anchor="start" font-size="20" font-weight="700" fill="#0b0d12"></text>
    </g>
  </svg>`;
}

// 캔들 차트 1행 렌더러 — buildPriceChartSvg와 같은 그리드·책갈피 패턴을 재사용하되 선 대신 봉을 그림
function buildCandleChartSvg(pairs, period, symbol) {
  const { W, H, ML, MT, PW, PH, N, lo, hi, xFn, yFn } = priceChartScalesOhlc(pairs);

  let gridSvg = "";
  for (let k = 0; k <= 4; k++) {
    const v = lo + (k / 4) * (hi - lo);
    const y = yFn(v);
    gridSvg += `<line x1="${ML}" y1="${y.toFixed(1)}" x2="${(ML + PW).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#23262f" stroke-width="1" />`;
    gridSvg += `<text x="${(ML + PW + 8).toFixed(1)}" y="${(y + 7).toFixed(1)}" font-size="20" fill="#8a90a3">${fmtChartPrice(v)}</text>`;
  }

  let axisSvg = "";
  const fmt = CHART_PERIOD_LABEL_FMT[period] || CHART_PERIOD_LABEL_FMT["1y"];
  for (let k = 0; k <= 4; k++) {
    const idx = Math.round((k / 4) * (N - 1));
    const x = xFn(idx);
    const d = new Date(pairs[idx].t * 1000);
    const anchor = k === 0 ? "start" : k === 4 ? "end" : "middle";
    axisSvg += `<text x="${x.toFixed(1)}" y="${(MT + PH + 36).toFixed(1)}" text-anchor="${anchor}" font-size="20" fill="#8a90a3">${escapeHtml(fmt(d))}</text>`;
  }

  const slotW = N > 1 ? PW / N : PW; // 봉 사이 간격의 60%를 몸통 너비로 사용(너무 촘촘하면 최소 1.5px 보장)
  const bodyW = Math.max(1.5, slotW * 0.6);
  let candlesSvg = "";
  pairs.forEach((p, i) => {
    const x = xFn(i);
    const isUp = p.c >= p.o;
    const color = isUp ? "var(--pos)" : "var(--neg)"; // 빨강=상승, 파랑=하락(앱 공통 색상)
    const yHigh = yFn(p.h);
    const yLow = yFn(p.l);
    const yOpen = yFn(p.o);
    const yClose = yFn(p.c);
    const bodyTop = Math.min(yOpen, yClose);
    const bodyH = Math.max(1, Math.abs(yClose - yOpen));
    candlesSvg += `<line x1="${x.toFixed(1)}" y1="${yHigh.toFixed(1)}" x2="${x.toFixed(1)}" y2="${yLow.toFixed(1)}" stroke="${color}" stroke-width="1.2" />`;
    candlesSvg += `<rect x="${(x - bodyW / 2).toFixed(1)}" y="${bodyTop.toFixed(1)}" width="${bodyW.toFixed(1)}" height="${bodyH.toFixed(1)}" fill="${color}" />`;
  });

  const last = pairs[N - 1];
  const lastY = yFn(last.c);

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(symbol)} 캔들 차트">
    <rect x="0" y="0" width="${W}" height="${H}" fill="#0b0d12" />
    ${gridSvg}
    ${candlesSvg}
    <g id="pcCurrentMarker">
      <line x1="${ML}" y1="${lastY.toFixed(1)}" x2="${(ML + PW).toFixed(1)}" y2="${lastY.toFixed(1)}" stroke="#8a90a3" stroke-width="1" stroke-dasharray="3,3" />
      <path d="${bookmarkTagPath(ML + PW, lastY)}" fill="#eceef2" />
      <text x="${(ML + PW + PRICE_TAG_NOTCH + 8).toFixed(1)}" y="${(lastY + 7).toFixed(1)}" text-anchor="start" font-size="20" font-weight="700" fill="#0b0d12">${fmtChartPrice(last.c)}</text>
    </g>
    ${axisSvg}
    <rect id="pcHitArea" x="${ML}" y="0" width="${PW}" height="${H}" fill="transparent" style="touch-action:none;" />
    <g id="pcCrosshair" style="display:none;">
      <line x1="0" y1="${MT}" x2="0" y2="${(MT + PH).toFixed(1)}" stroke="#8a90a3" stroke-width="1" stroke-dasharray="2,2" />
      <line id="pcCrosshairHLine" x1="${ML}" y1="0" x2="${(ML + PW).toFixed(1)}" y2="0" stroke="#8a90a3" stroke-width="1" stroke-dasharray="2,2" />
      <circle id="pcCrosshairDot" r="4" fill="#0b0d12" stroke="#2f6fed" stroke-width="2" />
      <path id="pcCrosshairTagPath" fill="#eceef2" />
      <text id="pcCrosshairTagText" text-anchor="start" font-size="20" font-weight="700" fill="#0b0d12"></text>
    </g>
  </svg>`;
}

// 차트를 누르고 있는 동안 가장 가까운 지점의 가격을 오른쪽 책갈피에 실시간으로 보여줌(증권앱 스타일)
// scalesFn: 라인 차트는 종가 기준(priceChartScales), 캔들 차트는 고가/저가까지 포함한 기준(priceChartScalesOhlc)을 써야 렌더링과 좌표가 일치함
function setupPriceChartCrosshair(containerEl, pairs, scalesFn = priceChartScales) {
  const svg = containerEl.querySelector("svg");
  const hitArea = svg && svg.querySelector("#pcHitArea");
  if (!svg || !hitArea) return;
  const { ML, MT, PW, PH, N, xFn, yFn } = scalesFn(pairs);
  const crosshair = svg.querySelector("#pcCrosshair");
  const vLine = crosshair.querySelector("line");
  const hLine = svg.querySelector("#pcCrosshairHLine");
  const dot = svg.querySelector("#pcCrosshairDot");
  const tagPath = svg.querySelector("#pcCrosshairTagPath");
  const tagText = svg.querySelector("#pcCrosshairTagText");
  const currentMarker = svg.querySelector("#pcCurrentMarker");

  function indexFromClientX(clientX) {
    const rect = svg.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * PRICE_CHART_GEOM.W;
    const idx = Math.round(((relX - ML) / PW) * (N - 1));
    return Math.max(0, Math.min(N - 1, idx));
  }

  function showAt(idx) {
    const x = xFn(idx);
    const y = yFn(pairs[idx].c);
    vLine.setAttribute("x1", x.toFixed(1));
    vLine.setAttribute("x2", x.toFixed(1));
    hLine.setAttribute("y1", y.toFixed(1));
    hLine.setAttribute("y2", y.toFixed(1));
    dot.setAttribute("cx", x.toFixed(1));
    dot.setAttribute("cy", y.toFixed(1));
    tagPath.setAttribute("d", bookmarkTagPath(ML + PW, y));
    tagText.setAttribute("x", (ML + PW + PRICE_TAG_NOTCH + 8).toFixed(1));
    tagText.setAttribute("y", (y + 7).toFixed(1));
    tagText.textContent = fmtChartPrice(pairs[idx].c);
    crosshair.style.display = "";
    currentMarker.style.display = "none";
  }
  function hide() {
    crosshair.style.display = "none";
    currentMarker.style.display = "";
  }

  hitArea.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    showAt(indexFromClientX(e.clientX));
    hitArea.setPointerCapture(e.pointerId);
  });
  hitArea.addEventListener("pointermove", (e) => {
    if (e.buttons !== 1) return;
    showAt(indexFromClientX(e.clientX));
  });
  hitArea.addEventListener("pointerup", hide);
  hitArea.addEventListener("pointercancel", hide);
  hitArea.addEventListener("pointerleave", (e) => {
    if (e.buttons !== 1) hide();
  });
}

let summaryChartCurrentSymbol = null;
let summaryChartCurrentPeriod = "1y";
let summaryChartCurrentPairs = null; // OHLC 캐시 — 라인↔캔들 전환 시 재조회 없이 즉시 다시 그리기 위함
let summaryChartMode = "line"; // "line" | "candle"

function renderSummaryChartPairs(pairs, period, symbol) {
  const containerEl = el("summaryChartContainer");
  if (summaryChartMode === "candle") {
    containerEl.innerHTML = buildCandleChartSvg(pairs, period, symbol);
    setupPriceChartCrosshair(containerEl, pairs, priceChartScalesOhlc);
  } else {
    containerEl.innerHTML = buildPriceChartSvg(pairs, period, symbol);
    setupPriceChartCrosshair(containerEl, pairs, priceChartScales);
  }
}

async function runSummaryChart(symbol, period) {
  summaryChartCurrentSymbol = symbol;
  summaryChartCurrentPeriod = period;
  const statusEl = el("summaryChartStatus");
  statusEl.style.display = "block";
  statusEl.textContent = "차트를 불러오는 중...";
  try {
    const cfg = CHART_PERIOD_CONFIG[period] || CHART_PERIOD_CONFIG["1y"];
    const chart = await yahooChart(symbol, cfg.range, cfg.interval);
    if (summaryChartCurrentSymbol !== symbol) return; // 응답 도착 전 다른 종목으로 전환된 경우 무시
    const pairs = chartOhlcPairs(chart);
    if (pairs.length < 2) throw new Error("차트 데이터가 부족합니다.");
    statusEl.style.display = "none";
    summaryChartCurrentPairs = pairs;
    renderSummaryChartPairs(pairs, period, symbol);
  } catch (err) {
    statusEl.style.display = "block";
    statusEl.textContent = `❌ ${err.message || "차트를 불러오지 못했습니다."}`;
  }
}
const summaryChartPeriodNav = el("summaryChartPeriodNav");
summaryChartPeriodNav.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-chart-period]");
  if (!btn || !summaryChartCurrentSymbol) return;
  Array.from(summaryChartPeriodNav.children).forEach((b) => b.classList.toggle("active", b === btn));
  runSummaryChart(summaryChartCurrentSymbol, btn.dataset.chartPeriod);
});

// ---------- 라인/캔들 차트 전환 버튼 ----------
const summaryChartTypeToggle = el("summaryChartTypeToggle");
summaryChartTypeToggle.addEventListener("click", (e) => {
  const btn = e.target.closest(".chart-type-btn");
  if (!btn || !summaryChartCurrentPairs) return;
  const mode = btn.dataset.chartType;
  if (mode === summaryChartMode) return;
  summaryChartMode = mode;
  Array.from(summaryChartTypeToggle.children).forEach((b) => b.classList.toggle("active", b === btn));
  renderSummaryChartPairs(summaryChartCurrentPairs, summaryChartCurrentPeriod, summaryChartCurrentSymbol);
});

function buildFutureChartSvg(data) {
  const W = 780,
    H = 470;
  const ML = 44,
    MR = 132, // "예상" 아래 예상가($XX.XX(+YY%)) 줄이 길어져도(모바일에서 잘리지 않도록) 넉넉히 확보
    MT = 22,
    MB = 56; // (현재) 아래 오늘 기준 현재가를 한 줄 더 넣을 공간
  const PW = W - ML - MR;
  const PH = H - MT - MB;

  const allPct = [];
  data.historicalBuckets.forEach((s) => s.points.forEach((p) => allPct.push(p.pct)));
  data.currentBucket.points.forEach((p) => allPct.push(p.pct));
  allPct.push(data.forecast.endPct);

  const { lo, hi, step } = niceAxisBounds(Math.min(...allPct), Math.max(...allPct));
  const xFn = (frac) => ML + frac * PW;
  const yFn = (val) => MT + (1 - (val - lo) / (hi - lo)) * PH;

  let gridSvg = "";
  for (let v = Math.ceil(lo / step) * step; v <= hi + 0.001; v += step) {
    const y = yFn(v);
    const emphasize = Math.abs(v) < 0.001;
    gridSvg += `<line x1="${ML}" y1="${y.toFixed(1)}" x2="${ML + PW}" y2="${y.toFixed(1)}" stroke="${emphasize ? "#555b6b" : "#23262f"}" stroke-width="${emphasize ? 1.4 : 1}" />`;
    gridSvg += `<text x="${ML - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#8a90a3">${v > 0 ? "+" : ""}${Math.round(v)}%</text>`;
  }

  let axisSvg = "";
  for (let m = 0; m <= 12; m++) {
    const frac = m / 12;
    const x = xFn(frac);
    const labelDate = addMonths(data.axisMonthStart, m);
    const isNow = m === 6;
    axisSvg += `<line x1="${x.toFixed(1)}" y1="${MT}" x2="${x.toFixed(1)}" y2="${MT + PH}" stroke="${isNow ? "#f5a623" : "#20232b"}" stroke-width="${isNow ? 1.6 : 1}" ${isNow ? "" : 'stroke-dasharray="2,3"'} />`;
    axisSvg += `<text x="${x.toFixed(1)}" y="${(MT + PH + 16).toFixed(1)}" text-anchor="middle" font-size="11" fill="${isNow ? "#f5a623" : "#8a90a3"}" font-weight="${isNow ? "700" : "400"}">${FUTURE_MONTH_NAMES_KO[labelDate.getMonth()]}</text>`;
  }
  axisSvg += `<text x="${xFn(0.5).toFixed(1)}" y="${(MT + PH + 32).toFixed(1)}" text-anchor="middle" font-size="11" fill="#f5a623" font-weight="700">(현재)</text>`;
  if (data.currentPrice !== null && data.currentPrice !== undefined) {
    axisSvg += `<text x="${xFn(0.5).toFixed(1)}" y="${(MT + PH + 48).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="800" fill="#f5a623">$${data.currentPrice.toFixed(2)}</text>`;
  }

  let linesSvg = "";
  data.historicalBuckets.forEach((s, i) => {
    const color = FUTURE_LINE_COLORS[i % FUTURE_LINE_COLORS.length];
    linesSvg += `<path d="${pathFromPoints(s.points, xFn, yFn)}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" />`;
    const last = s.points[s.points.length - 1];
    linesSvg += `<text x="${(xFn(last.frac) + 6).toFixed(1)}" y="${(yFn(last.pct) + 4).toFixed(1)}" font-size="12" font-weight="700" fill="${color}">${String(s.year).slice(2)}</text>`;
  });

  const curPoints = data.currentBucket.points;
  linesSvg += `<path d="${pathFromPoints(curPoints, xFn, yFn)}" fill="none" stroke="#e5342f" stroke-width="2.6" stroke-linejoin="round" />`;

  const lastReal = curPoints[curPoints.length - 1];
  const fx0 = xFn(lastReal.frac),
    fy0 = yFn(lastReal.pct);
  const fx1 = xFn(1),
    fy1 = yFn(data.forecast.endPct);
  linesSvg += `<line x1="${fx0.toFixed(1)}" y1="${fy0.toFixed(1)}" x2="${fx1.toFixed(1)}" y2="${fy1.toFixed(1)}" stroke="#e5342f" stroke-width="2.6" stroke-dasharray="7,6" stroke-linecap="round" />`;
  linesSvg += `<circle cx="${fx0.toFixed(1)}" cy="${fy0.toFixed(1)}" r="3.2" fill="#e5342f" />`;
  linesSvg += `<text x="${(fx1 + 6).toFixed(1)}" y="${(fy1 + 4).toFixed(1)}" font-size="12" font-weight="700" fill="#e5342f">예상</text>`;
  if (data.forecast.price !== null && data.forecast.price !== undefined) {
    // 괄호 안 퍼센트는 y축 기준(6개월 전 대비)이 아니라 "오늘 현재가 대비 예상가"의 실제 변동률이어야
    // 달러 표기($XX.XX)와 퍼센트가 서로 어긋나 보이지 않음(예: 오늘보다 비싸졌는데 마이너스로 보이는 문제 방지)
    const pctFromToday = data.currentPrice ? (data.forecast.price / data.currentPrice - 1) * 100 : data.forecast.endPct;
    const pctSign = pctFromToday >= 0 ? "+" : "";
    linesSvg += `<text x="${(fx1 + 6).toFixed(1)}" y="${(fy1 + 18).toFixed(1)}" font-size="11" font-weight="700" fill="#e5342f">$${data.forecast.price.toFixed(2)}(${pctSign}${pctFromToday.toFixed(1)}%)</text>`;
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(data.ticker)} 미래예측 차트">
    <rect x="0" y="0" width="${W}" height="${H}" fill="#000" />
    ${gridSvg}
    ${axisSvg}
    ${linesSvg}
  </svg>`;
}

function renderFutureChart(data) {
  el("futureChartContainer").innerHTML = buildFutureChartSvg(data);
  const yearsNote = data.historicalBuckets.length
    ? `흰색: 과거 ${data.historicalBuckets.length}개년(전후 6개월) 계절성 흐름 · `
    : `과거 데이터가 부족해 계절성 비교 없이 최근 추세만 표시했습니다 · `;
  const baseNote = `${data.ticker} · ${yearsNote}빨간 실선: 최근 6개월 실제 흐름 · 빨간 점선: ${data.hasForwardData ? "과거 흐름의 평균 기울기로 추정한 " : ""}향후 6개월 예상(참고용, 실제와 다를 수 있습니다)`;
  let forecastNote = "";
  if (data.currentPrice && data.forecast.price) {
    const pctFromToday = (data.forecast.price / data.currentPrice - 1) * 100;
    forecastNote = ` · <span style="color:var(--warn);font-weight:700;">6개월 후 예상 변동량: ${pctFromToday >= 0 ? "+" : ""}${pctFromToday.toFixed(1)}%</span>`;
  }
  el("futureChartCaption").innerHTML = `${escapeHtml(baseNote)}${forecastNote}`;
  el("futureResultsSection").style.display = "block"; // 전체화면 모달 대신 탭 화면 안에 그대로 이어붙여 표시
}

function setFutureStatus(type, message) {
  if (!message) {
    futureStatus.style.display = "none";
    return;
  }
  futureStatus.style.display = "block";
  futureStatus.className = `status-box ${type}`;
  futureStatus.innerHTML = type === "loading" ? `<span class="spinner"></span>${message}` : message;
}

// ---------- 미래예측 2번째 그래프: 투자안정성 점수 구간(0~10점, 1점 단위 10구간)별 1년 수익률 최소/최대·최다분포 추이 ----------
// 데이터 출처: 백엔드 Worker가 매일 조금씩 S&P500을 스캔해 KV에 쌓고, 매달 말일에 그 달 스냅샷을 확정 발행(worker.js 참고).
// 이 기능을 막 배포한 시점에는 KV에 스냅샷이 하나도 없어 history가 빈 배열로 오는 게 정상이며, 그 경우 안내 문구만 표시한다.
const FUTURE_RISK_API = "https://us-stock.yeop2ad.workers.dev/future-risk-bands";

async function fetchFutureRiskBands(bucket) {
  const res = await fetch(`${FUTURE_RISK_API}?bucket=${bucket}`);
  if (!res.ok) throw new Error("구간별 통계를 가져오지 못했습니다.");
  return res.json();
}

// "YYYY-MM" 두 시점 사이의 개월 수 차이 — 스냅샷이 매달 한 번씩만 쌓이므로 실제 날짜 대신 월 단위 정수 인덱스로 x축을 구성
function monthIndexOf(monthKey, baseMonthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  const [by, bm] = baseMonthKey.split("-").map(Number);
  return (y - by) * 12 + (m - bm);
}

function formatMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// actualPoints: 1번 차트의 currentBucket.points(frac 0~1이 전체 12개월 창 기준, 0~0.5가 "6개월 전~현재")를 그대로 재사용해
// 두 차트의 최근 6개월 실제 궤적이 완전히 동일한 모양·간격으로 겹쳐 보이게 함
// DB에는 10%p 단위로 쌓여 있지만, 팬아웃 라인이 너무 많아 복잡해 보이지 않도록 화면에 보여줄 때만 넓은 단위로 묶음
// (투자안정성 5~10점 구간은 표본이 더 촘촘한 편이라 20%p, 그 아래(0~5점)는 50%p로 묶음)
function groupBands(rawBands, width) {
  const buckets = new Map();
  for (const b of rawBands) {
    const bucketLo = Math.floor(b.lo / width) * width;
    const existing = buckets.get(bucketLo) || { lo: bucketLo, hi: bucketLo + width, count: 0 };
    existing.count += b.count;
    buckets.set(bucketLo, existing);
  }
  return [...buckets.values()].sort((a, b) => b.lo - a.lo);
}

function buildFutureRiskChartSvg({ history, bucket, actualPoints, axisMonthStart, currentPrice }) {
  const bands0 = history[history.length - 1];
  const rawBands = bands0.bands && bands0.bands.length ? bands0.bands : [bands0.modeBand].filter(Boolean);
  const bands = groupBands(rawBands, bucket >= 5 ? 20 : 50);
  // 최다분포(예상)도 화면에 보이는 그룹 단위 기준으로 다시 계산 — 원본 10%p 기준 modeBand와 표시가 어긋나지 않도록
  const modeBucket = bands.reduce((best, b) => (b.count > best.count ? b : best), bands[0]);
  const modeMid = (modeBucket.lo + modeBucket.hi) / 2;
  // 0~1점 구간은 표본 편차가 너무 커서 "최다분포=예상" 하나로 대표하기 부적절하므로 예상(빨간 점선) 강조를 생략
  const showForecast = bucket !== 0;

  const W = 780;
  const ML = 44,
    MR = 150, // 구간별 팬아웃 라인 끝에 붙는 라벨(예: "+80~+70%: 2건") 공간
    MT = 22,
    MB = 56;
  const nowIdx = 6; // 2월(0)~8월(6, 현재) 7칸 + 예측 지점(7)
  const forecastIdx = 7;

  // 1번 차트(actualPoints)는 "6개월 전" 시점을 0%로 잡은 값이지만, 2번 차트는 팬아웃 라인(구간별 1년 기대수익률)이
  // 전부 "오늘 기준" 값이므로 기준이 서로 다르면 안 맞음 — actualPoints를 오늘(마지막 값)이 0%가 되도록 다시 기준을 잡음
  const rawCurVal = actualPoints.length ? actualPoints[actualPoints.length - 1].pct : 0;
  const rebasedActualPoints = actualPoints.map((p) => ({ frac: p.frac, pct: p.pct - rawCurVal }));
  const curVal = 0; // 오늘(현재) 위치가 항상 기준점(0%)
  const bandTargets = bands.map((b) => (b.lo + b.hi) / 2);

  const allVals = [...rebasedActualPoints.map((p) => p.pct), curVal, modeMid, ...bandTargets];
  const { lo, hi, step } = niceAxisBounds(Math.min(...allVals), Math.max(...allVals));

  // 팬아웃 라인 라벨이 세로로 촘촘히 몰리면 겹치므로, 값 기준 y좌표를 구한 뒤 최소 간격(13px)을 강제로 벌려줌(값 순서는 유지)
  // — 그 라벨들이 모두 들어갈 만큼 플롯 높이를 넉넉히 잡아둠(그래도 넘치면 아래 svgH에서 캔버스 자체를 더 늘림)
  const H = Math.max(380, MT + bands.length * 15 + MB + 40);
  const PH = H - MT - MB;

  // 직전 6개월 구간은 기존 대비 가로 폭을 1/3로 줄이고(전체의 6/7 → 2/7), 남는 폭은 전부 1년후 구간에 몰아줘서
  // 1년후 구간이 6개월 구간보다 눈에 띄게 길게 보이도록 함
  const plotWidth = W - ML - MR;
  const historicalWidth = plotWidth * (nowIdx / forecastIdx / 3);
  const forecastWidth = plotWidth - historicalWidth;
  const xFnSlot = (slot) =>
    slot <= nowIdx ? ML + (slot / nowIdx) * historicalWidth : ML + historicalWidth + ((slot - nowIdx) / (forecastIdx - nowIdx)) * forecastWidth;
  const xFnActual = (frac) => xFnSlot(Math.min(frac / 0.5, 1) * nowIdx); // 1번 차트 frac(0~0.5=6개월전~현재)를 0~6칸에 맞춤
  const yFn = (val) => MT + (1 - (val - lo) / (hi - lo)) * PH;

  let gridSvg = "";
  for (let v = Math.ceil(lo / step) * step; v <= hi + 0.001; v += step) {
    const y = yFn(v);
    const emphasize = Math.abs(v) < 0.001;
    gridSvg += `<line x1="${ML}" y1="${y.toFixed(1)}" x2="${W - MR}" y2="${y.toFixed(1)}" stroke="${emphasize ? "#555b6b" : "#23262f"}" stroke-width="${emphasize ? 1.4 : 1}" />`;
    gridSvg += `<text x="${ML - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#8a90a3">${v > 0 ? "+" : ""}${Math.round(v)}%</text>`;
  }

  const now = new Date();
  const nowX = xFnSlot(nowIdx);
  const forecastX = xFnSlot(forecastIdx);
  let axisSvg = "";
  for (let m = 0; m <= nowIdx; m++) {
    const x = xFnSlot(m);
    const labelDate = addMonths(axisMonthStart, m);
    const isNow = m === nowIdx;
    axisSvg += `<line x1="${x.toFixed(1)}" y1="${MT}" x2="${x.toFixed(1)}" y2="${MT + PH}" stroke="${isNow ? "#f5a623" : "#20232b"}" stroke-width="${isNow ? 1.6 : 1}" ${isNow ? "" : 'stroke-dasharray="2,3"'} />`;
    axisSvg += `<text x="${x.toFixed(1)}" y="${(MT + PH + 16).toFixed(1)}" text-anchor="middle" font-size="11" fill="${isNow ? "#f5a623" : "#8a90a3"}" font-weight="${isNow ? "700" : "400"}">${FUTURE_MONTH_NAMES_KO[labelDate.getMonth()]}</text>`;
  }
  const forecastDate = addMonths(now, 12);
  axisSvg += `<text x="${forecastX.toFixed(1)}" y="${(MT + PH + 16).toFixed(1)}" text-anchor="middle" font-size="11" fill="#f5a623" font-weight="700">${String(forecastDate.getFullYear()).slice(2)}년 ${forecastDate.getMonth() + 1}월</text>`;

  // (현재)/(1년후) 아래 실제 달러 가격 — 1번 차트의 "예상가" 표기와 같은 형식
  axisSvg += `<text x="${nowX.toFixed(1)}" y="${(MT + PH + 32).toFixed(1)}" text-anchor="middle" font-size="11" fill="#f5a623" font-weight="700">(현재)</text>`;
  axisSvg += `<text x="${forecastX.toFixed(1)}" y="${(MT + PH + 32).toFixed(1)}" text-anchor="middle" font-size="11" fill="#f5a623" font-weight="700">(1년후)</text>`;
  let forecastPrice = null;
  if (currentPrice !== null && currentPrice !== undefined) {
    axisSvg += `<text x="${nowX.toFixed(1)}" y="${(MT + PH + 48).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="800" fill="#f5a623">$${currentPrice.toFixed(2)}</text>`;
    if (showForecast) {
      forecastPrice = currentPrice * (1 + modeMid / 100);
      axisSvg += `<text x="${forecastX.toFixed(1)}" y="${(MT + PH + 48).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="800" fill="#e5342f">$${forecastPrice.toFixed(2)}</text>`;
    }
  }

  // 최근 6개월 실제 궤적 — 1번 차트와 동일한 데이터·간격을 그대로 재사용(빨간 실선)
  const actualPath = rebasedActualPoints.map((p, i) => `${i === 0 ? "M" : "L"}${xFnActual(p.frac).toFixed(1)},${yFn(p.pct).toFixed(1)}`).join(" ");
  let historySvg = actualPath ? `<path d="${actualPath}" fill="none" stroke="#e5342f" stroke-width="2.4" stroke-linejoin="round" />` : "";
  historySvg += `<circle cx="${nowX.toFixed(1)}" cy="${yFn(curVal).toFixed(1)}" r="3.2" fill="#e5342f" />`;

  // 현재 지점에서 이 구간(투자안정성 버킷) DB에 실제로 쌓인 수익률대 각각을 향해 팬아웃 —
  // 색이 너무 많으면(빨주노초파남보) 복잡해 보여서, 가장 높은 구간만 초록·가장 낮은 구간만 파랑으로 표시하고
  // 나머지는 흰색 계열로 통일하되, 그 구간에 몰린 종목 수(비중)가 클수록 더 진한(불투명한) 흰색으로 표현
  const nowY = yFn(curVal);
  const maxBandCount = Math.max(...bands.map((b) => b.count));
  let fanSvg = "";
  const labelYs = []; // 라벨 세로 겹침 방지용 — 값이 높은 밴드부터 순서대로 최소 13px씩 벌림
  bands.forEach((b, i) => {
    const isMode = showForecast && b.lo === modeBucket.lo; // 최다분포(예상) 구간은 그 줄 라벨에 "(예상)"을 붙여서 오른쪽 끝에서 바로 알아보게 함
    let color;
    if (isMode) color = "#e5342f"; // 최다분포(예상) 구간: 빨강
    else if (i === 0) color = "#3ecf6d"; // 가장 높은 수익률대: 초록
    else if (i === bands.length - 1) color = "#4a90e2"; // 가장 낮은 수익률대: 파랑
    else {
      const intensity = 0.35 + 0.55 * (b.count / maxBandCount); // 비중 클수록 진한 흰색
      color = `rgba(255,255,255,${intensity.toFixed(2)})`;
    }
    const targetVal = (b.lo + b.hi) / 2;
    const targetY = yFn(targetVal);
    const dash = isMode ? ' stroke-dasharray="7,6"' : "";
    fanSvg += `<line x1="${nowX.toFixed(1)}" y1="${nowY.toFixed(1)}" x2="${forecastX.toFixed(1)}" y2="${targetY.toFixed(1)}" stroke="${color}" stroke-width="${isMode ? 2.6 : 2}"${dash} stroke-linecap="round" />`;
    let labelY = targetY;
    if (labelYs.length && labelY - labelYs[labelYs.length - 1] < 13) labelY = labelYs[labelYs.length - 1] + 13;
    labelYs.push(labelY);
    const hiTxt = `${b.hi > 0 ? "+" : ""}${b.hi}`;
    const loTxt = `${b.lo > 0 ? "+" : ""}${b.lo}`;
    fanSvg += `<text x="${(forecastX + 6).toFixed(1)}" y="${(labelY + 4).toFixed(1)}" font-size="11" font-weight="700" fill="${color}">${hiTxt}~${loTxt}%: ${b.count}건${isMode ? " (예상)" : ""}</text>`;
  });

  const svgH = labelYs.length ? Math.max(H, labelYs[labelYs.length - 1] + 24) : H;
  // 이 차트는 처음부터 오늘 현재가를 기준으로 계산하므로 y축 값 자체가 곧 오늘 대비 변동률(0~1점 구간은 예상 자체를 생략)
  const forecastPctFromToday = showForecast ? modeMid : null;

  const svg = `<svg viewBox="0 0 ${W} ${svgH}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="투자안정성 ${bucket}~${bucket + 1}점 구간 1년 수익률 예측">
    <rect x="0" y="0" width="${W}" height="${svgH}" fill="#000" />
    ${gridSvg}
    ${axisSvg}
    ${historySvg}
    ${fanSvg}
  </svg>`;

  return { svg, forecastPctFromToday, forecastPrice };
}

// ---------- 미래예측 3번째 그래프: 투자황금기 점수(VIX 공포지수 기반) 별 S&P500 30년 추이 ----------
// 검색한 종목과 무관한 시장 전체 데이터라 세션 내에서 한 번만 계산해 캐시(여러 번 검색해도 재요청하지 않음)
let macroScoreChartDataPromise = null;

// computeMacroScore와 동일한 공식을, "지금"이 아니라 임의 과거 시점 기준으로 계산 — VIX 주간 종가 시계열에서 그 시점에
// 가장 가까운 값을 사용. 점수(total)뿐 아니라 원본 VIX 값도 그대로 반환(차트에는 점수 대신 VIX 값을 라벨로 표시)
function computeMacroScoreAtDate(vixPairs, date) {
  const targetSec = Math.floor(date.getTime() / 1000);
  const point = closestPair(vixPairs, targetSec);
  const vix = point ? point.c : null;
  return { ...computeMacroScore({ vix }), vix };
}

async function computeMacroScoreChartData() {
  const now = new Date();
  const nowSec = Math.floor(now.getTime() / 1000);
  const startYear = now.getFullYear() - 30;
  const startSec = Math.floor(new Date(startYear, 0, 1).getTime() / 1000);

  const [chartData, vixChartData, liveMacro] = await Promise.all([
    yahooChartRange("^GSPC", startSec, nowSec, "1wk"),
    yahooChartRange("^VIX", startSec, nowSec, "1wk"),
    getMacroMetrics(),
  ]);
  const pairs = chartClosePairs(chartData);
  if (pairs.length < 2) throw new Error("S&P500 장기 데이터를 가져오지 못했습니다.");
  const vixPairs = chartClosePairs(vixChartData);
  if (vixPairs.length < 2) throw new Error("VIX 장기 데이터를 가져오지 못했습니다.");

  // 1년 간격(매년 1월 1일)으로 30년치 — 시작 연도는 오늘 기준으로 매번 다시 계산되므로 시간이 지나도 항상 최근 30년을 가리킴
  // 라벨은 그 시점의 투자황금기(VIX 환산) 점수로 표시
  const points = [];
  for (let anchor = new Date(startYear, 0, 1); anchor < now; anchor = addMonths(anchor, 12)) {
    const anchorSec = Math.floor(anchor.getTime() / 1000);
    const pricePoint = closestPair(pairs, anchorSec);
    if (!pricePoint || Math.abs(pricePoint.t - anchorSec) > 20 * 24 * 3600) continue; // 그 시점 데이터가 없으면(상장 전 등) 건너뜀
    const m = computeMacroScoreAtDate(vixPairs, anchor);
    points.push({ t: pricePoint.t, price: pricePoint.c, score: m.total, vix: m.vix, isNow: false });
  }
  // 마지막은 "지금" 실시간 점수 — 다시 볼 때마다 최신 VIX가 반영되므로 항상 현재 시점을 정확히 대표함
  const last = pairs[pairs.length - 1];
  const liveScore = computeMacroScore(liveMacro);
  points.push({ t: last.t, price: last.c, score: liveScore.total, vix: liveMacro.vix, isNow: true });

  // 각 점 시점부터 다음 1년 구간 동안 S&P500이 20% 이상 급락했는지 표시(라벨을 노란색으로 강조)
  for (let i = 0; i < points.length - 1; i++) {
    const pct = (points[i + 1].price / points[i].price - 1) * 100;
    points[i].crashWarn = pct <= -20;
  }

  return { pairs, points };
}

function getMacroScoreChartData() {
  if (!macroScoreChartDataPromise) {
    macroScoreChartDataPromise = computeMacroScoreChartData().catch((e) => {
      macroScoreChartDataPromise = null; // 실패 시 다음 검색에서 재시도 가능하도록 캐시 초기화
      throw e;
    });
  }
  return macroScoreChartDataPromise;
}

function buildMacroScoreChartSvg({ pairs, points }) {
  // 1년 간격 점(약 30개)을 가로 스크롤로 넉넉하게 볼 수 있도록 점 개수에 비례해 캔버스 폭을 넓힘(고정 min-width는 CSS에서 강제)
  const W = Math.max(780, points.length * 45),
    H = 420;
  const ML = 56,
    MR = 20,
    MT = 26,
    MB = 40;
  const PW = W - ML - MR;
  const PH = H - MT - MB;

  const minT = pairs[0].t;
  const maxT = pairs[pairs.length - 1].t;
  const prices = pairs.map((p) => p.c);
  const { lo: rawLo, hi, step } = niceAxisBounds(Math.min(...prices), Math.max(...prices));
  const lo = Math.max(0, rawLo); // 지수 값은 음수가 없으므로 하한을 0 밑으로 내려가지 않게 고정

  const xFn = (t) => ML + ((t - minT) / (maxT - minT)) * PW;
  const yFn = (v) => MT + (1 - (v - lo) / (hi - lo)) * PH;

  let gridSvg = "";
  for (let v = Math.ceil(lo / step) * step; v <= hi + 0.001; v += step) {
    const y = yFn(v);
    gridSvg += `<line x1="${ML}" y1="${y.toFixed(1)}" x2="${ML + PW}" y2="${y.toFixed(1)}" stroke="#23262f" stroke-width="1" />`;
    gridSvg += `<text x="${(ML - 8).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="#8a90a3">${Math.round(v).toLocaleString()}</text>`;
  }

  // x축: 매년 연도 라벨(가로 스크롤 가능한 넓은 캔버스라 1년 단위로 넣어도 겹치지 않음)
  let axisSvg = "";
  const firstYear = new Date(minT * 1000).getFullYear();
  const lastYear = new Date(maxT * 1000).getFullYear();
  for (let y = firstYear; y <= lastYear; y += 1) {
    const t = Math.floor(new Date(y, 0, 1).getTime() / 1000);
    if (t < minT || t > maxT) continue;
    const x = xFn(t);
    axisSvg += `<line x1="${x.toFixed(1)}" y1="${MT}" x2="${x.toFixed(1)}" y2="${MT + PH}" stroke="#1a1d24" stroke-width="1" />`;
    axisSvg += `<text x="${x.toFixed(1)}" y="${(MT + PH + 16).toFixed(1)}" text-anchor="middle" font-size="10" fill="#8a90a3">${y}</text>`;
  }

  const linePath = pairs.map((p, i) => `${i === 0 ? "M" : "L"}${xFn(p.t).toFixed(1)},${yFn(p.c).toFixed(1)}`).join(" ");
  let linesSvg = `<path d="${linePath}" fill="none" stroke="#e5342f" stroke-width="1.8" stroke-linejoin="round" />`;

  // 점(그 시점의 투자황금기 점수)은 빨간 선 위(그 날짜의 S&P 실제 값 높이)에 정확히 얹어서 찍음 — 8점 이상(지금 점도 포함)은 주황,
  // 10점을 넘으면(VIX 35+ 극단적 공포) 점점 더 쨍한 골드로, 그 외 과거 점은 흰색. 라벨은 VIX를 환산한 투자황금기 점수(0~10점)로 표시하고,
  // 위/아래를 번갈아 배치해 1년 간격(약 30개)이 서로 덜 겹치게 함
  points.forEach((p, i) => {
    const x = xFn(p.t);
    const y = yFn(p.price);
    const isHigh = p.isNow || p.score >= 8;
    const gold = macroGoldColor(p.score);
    const dotColor = gold ? gold.color : isHigh ? "#f5a623" : "#eceef2";
    const textColor = p.crashWarn ? "#f5d90a" : dotColor;
    const r = p.isNow ? 4.2 : 2.6;
    linesSvg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${dotColor}" stroke="#000" stroke-width="1" />`;
    const scoreTxt = p.score !== null && p.score !== undefined ? `${p.score}점` : "N/A";
    const fontSize = p.isNow ? 10 : 8.5;
    const rowH = p.isNow ? 12 : 9;
    const above = p.isNow || i % 2 === 0;
    const labelY = above ? y - 6 : y + rowH;
    linesSvg += `<text x="${x.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" font-size="${fontSize}" font-weight="700" fill="${textColor}">${scoreTxt}</text>`;
  });

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="VIX지수를 활용한 투자시점 점검표">
    <rect x="0" y="0" width="${W}" height="${H}" fill="#000" />
    ${gridSvg}
    ${axisSvg}
    ${linesSvg}
  </svg>`;
}

let macroScoreChartRendered = false;
async function renderMacroScoreChart() {
  if (macroScoreChartRendered) return; // 검색할 때마다 다시 그릴 필요 없는 시장 전체 데이터라 최초 1회만 렌더링
  const container = el("futureMacroChartContainer");
  const caption = el("futureMacroChartCaption");
  container.innerHTML = `<p class="muted" style="text-align:center;padding:20px 0;">S&amp;P500 30년 데이터를 불러오는 중...</p>`;
  try {
    const data = await getMacroScoreChartData();
    container.innerHTML = buildMacroScoreChartSvg(data);
    macroScoreChartRendered = true;
    caption.textContent =
      "빨간 선: S&P500 지수(1996~현재, 주간 종가) · 점 라벨: 1년 간격(매년 1월 1일 기준) VIX(공포지수)를 환산한 투자황금기 점수(0~10점) · " +
      "주황~골드 점: 점수 8점 이상(10점을 넘을수록 더 진한 골드, 현재 포함), 흰 점: 그 외 · 노란 글씨: 그 시점 이후 1년간 20% 이상 급락(참고용, 투자 자문이 아닙니다)";
  } catch (err) {
    container.innerHTML = `<p class="error-inline" style="text-align:center;padding:20px 0;">❌ S&amp;P500 장기 데이터를 불러오지 못했습니다: ${escapeHtml(err.message || "")}</p>`;
  }
}

// 미래예측 모달 상단(틀고정 헤더): 로고-한글이름-영어티커-상승압력/투자안정성/거시경제(원형 점수)를 한 줄로 표시
async function renderFutureModalHeader(ticker, quote, metricsPromise, marketReturnsPromise) {
  const titleEl = el("futureChartModalTitle");
  const koName = TICKER_TO_KOREAN_NAME[ticker] || (quote && (quote.longname || quote.shortname)) || ticker;
  titleEl.innerHTML = `
    <span class="future-modal-identity">
      ${tickerLogoHtml(ticker)}
      <span class="future-modal-name">${escapeHtml(koName)}</span>
      <span class="future-modal-ticker">${escapeHtml(ticker)}</span>
    </span>
    <span class="future-modal-scores" id="futureModalScores">
      <span class="mini-score-circle small">·</span>
      <span class="mini-score-circle small risk">·</span>
      <span class="mini-score-circle small macro">·</span>
    </span>
  `;
  try {
    const [metrics, marketReturns, macroMetrics] = await Promise.all([
      metricsPromise,
      marketReturnsPromise,
      getMacroMetrics().catch(() => ({ vix: null })),
    ]);
    const attractiveness = computeAttractivenessScore(metrics);
    const risk = computeRiskScore(metrics, marketReturns.sp500Return);
    const macro = computeMacroScore(macroMetrics);
    const isIPO = isRecentIPO(metrics.firstTradeDate);
    const scoresEl = el("futureModalScores");
    if (scoresEl) {
      scoresEl.innerHTML = `
        <span class="mini-score-circle small" title="상승압력도">${isIPO ? "IPO" : attractiveness.total}</span>
        <span class="mini-score-circle small risk" title="투자안정성">${isIPO ? "IPO" : risk.total}</span>
        <span class="mini-score-circle small macro" title="S&P500 VIX"${macroGoldStyle(macro.total)}>${macro.total}</span>
      `;
    }
  } catch {
    // 점수 계산이 실패해도 로고·이름·티커는 그대로 유지
  }
}

async function renderFutureRiskSection(ticker, metricsPromise, marketReturnsPromise, futureData) {
  const riskContainer = el("futureRiskContainer");
  const riskCaption = el("futureRiskCaption");
  riskContainer.innerHTML = `<p class="muted" style="text-align:center;padding:20px 0;">투자안정성 구간별 통계를 불러오는 중...</p>`;
  riskCaption.textContent = "";

  try {
    const [metrics, marketReturns] = await Promise.all([metricsPromise, marketReturnsPromise]);
    const riskScore = computeRiskScore(metrics, marketReturns.sp500Return);
    const bucket = clamp(Math.floor(riskScore.total), 0, 9);
    const { history } = await fetchFutureRiskBands(bucket);

    if (!history || history.length === 0) {
      riskContainer.innerHTML = `<p class="muted" style="text-align:center;padding:20px 0;">🚧 이 구간(투자안정성 ${bucket}~${bucket + 1}점)의 월별 통계가 아직 쌓이지 않았습니다. 서버가 매달 말일에 자동으로 갱신하며, 데이터가 쌓이는 대로 이 자리에 표시됩니다.</p>`;
      return;
    }

    const { svg, forecastPctFromToday } = buildFutureRiskChartSvg({
      history,
      bucket,
      actualPoints: futureData.currentBucket.points,
      axisMonthStart: futureData.axisMonthStart,
      currentPrice: metrics.price ?? null,
    });
    riskContainer.innerHTML = svg;
    const last = history[history.length - 1];
    const baseNote =
      `${ticker}는 투자안정성 ${bucket}~${bucket + 1}점 구간(최근 집계 ${last.sampleSize}종목 표본) · 빨간 실선: ${ticker}의 최근 6개월 실제 흐름(위 차트와 동일) · ` +
      `초록: 가장 높은 수익률대, 파랑: 가장 낮은 수익률대, 흰색(진할수록 비중 큼): 그 사이 구간별 종목 수`;
    if (forecastPctFromToday === null) {
      riskCaption.innerHTML = `${escapeHtml(baseNote)} · <span style="color:var(--warn);font-weight:700;">0~1점 구간은 표본 편차가 너무 커서 1년 후 예상을 생략합니다.</span>`;
    } else {
      const pctSign = forecastPctFromToday >= 0 ? "+" : "";
      riskCaption.innerHTML =
        `${escapeHtml(baseNote)} · 빨간 점선 "예상": 이 구간에서 가장 많이 몰린 수익률대로 향하는 1년 후 예상(참고용, 투자 자문이 아닙니다) · ` +
        `<span style="color:var(--warn);font-weight:700;">1년 후 예상 변동량: ${pctSign}${forecastPctFromToday.toFixed(1)}%</span>`;
    }
  } catch (err) {
    riskContainer.innerHTML = `<p class="error-inline" style="text-align:center;padding:20px 0;">❌ 구간별 통계를 불러오지 못했습니다: ${escapeHtml(err.message || "")}</p>`;
  }
}

// 기업검색 요약 페이지의 "🔮 미래예측" 토글에서 현재 보고 있는 종목으로 바로 실행(별도 티커 입력 불필요)
async function runFuturePrediction(ticker) {
  setFutureStatus("loading", `${ticker} 데이터를 불러오는 중입니다...`);

  try {
    const searchData = await yahooSearch(ticker);
    const quote = searchData && searchData.quotes && searchData.quotes[0];
    if (!quote) {
      throw new Error(`'${ticker}' 티커를 찾을 수 없습니다. 정확한 미국 상장 티커인지 확인해주세요.`);
    }
    const data = await computeFuturePrediction(ticker);
    renderFutureChart(data);

    // 상단 헤더(로고·이름·점수)와 2번째 그래프가 같은 지표(상승압력도/투자안정성)를 쓰므로 fetch를 한 번만 공유
    const metricsPromise = getFullMetrics(ticker);
    const marketReturnsPromise = getMarketReturns();
    renderFutureModalHeader(ticker, quote, metricsPromise, marketReturnsPromise);
    renderFutureRiskSection(ticker, metricsPromise, marketReturnsPromise, data); // 실패해도 1번째 그래프는 그대로 유지
    renderMacroScoreChart(); // 종목과 무관한 시장 전체 차트라 최초 1회만 그리고 이후 검색부터는 캐시된 결과를 재사용
    setFutureStatus(null, null);
  } catch (err) {
    setFutureStatus("error", `❌ ${escapeHtml(err.message || "예측 차트를 불러오지 못했습니다.")}`);
  }
}
