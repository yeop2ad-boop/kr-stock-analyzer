// ===== 로그인 공개 설정값 =====
// 이 파일의 값들은 브라우저에 그대로 노출되어도 안전한 "공개" 설정입니다(비밀키 아님).
// 실제 비밀키(Firebase 서비스 계정 키, 카카오/네이버 Client Secret)는 절대 이 파일에 넣지 말고
// Cloudflare Worker의 환경변수(대시보드 Settings > Variables, "암호화" 체크)에만 저장하세요.

// 1) Firebase 콘솔(console.firebase.google.com) > 프로젝트 설정 > 일반 > 내 앱(웹 앱 추가) 에서 복사
const firebaseConfig = {
  apiKey: "AIzaSyCNIcEq0puaUGBOrj007toB5MdLw1UH338",
  authDomain: "yeopinvest.firebaseapp.com",
  projectId: "yeopinvest",
  storageBucket: "yeopinvest.firebasestorage.app",
  messagingSenderId: "949194657159",
  appId: "1:949194657159:web:9a9a74b334f470bb0ed722",
};
// firebase-app-compat.js가 어떤 이유로든(광고 차단기, 네트워크 문제 등) 로드되지 못해도
// 이 사이트의 핵심 기능(주가 분석 등)까지 함께 멈추지 않도록 방어적으로 감쌈
if (typeof firebase !== "undefined") {
  firebase.initializeApp(firebaseConfig);
} else {
  console.error("Firebase SDK를 불러오지 못해 로그인 기능을 사용할 수 없습니다.");
}

// 2) 카카오 개발자 콘솔(developers.kakao.com) > 내 애플리케이션 > 앱 키 > REST API 키
const KAKAO_REST_API_KEY = "0903cfbdd09f05b23b57a07f0f7822b0";

// 3) 네이버 개발자 콘솔(developers.naver.com) > 내 애플리케이션 > Client ID
const NAVER_CLIENT_ID = "WQjgDann3npAsDk4_G_8";
