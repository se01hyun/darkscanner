// src/content.js

const banner = `
%c
 d8888b.  .d8b.  d8888b. db   dD      .d8888b.  .d88b.   .d8b.  d8b   db d8b   db d88888b d8888b.
 88  \`8D d8' \`8b 88  \`8D 88 ,8P'      88'  YP .d8P  Y8 d8' \`8b 888o  88 888o  88 88'     88  \`8D
 88   88 88ooo88 88oobY' 88ooP'       \`8bo.   88      88ooo88 88V8o 88 88V8o 88 88ooooo 88oobY'
 88   88 88~~~88 88\`8b   88\`8b          \`Y8b. 88      88~~~88 88 V8o88 88 V8o88 88~~~~~ 88\`8b
 88  .8D 88   88 88 \`88. 88 \`88.      db   8D \`8b  d8 88   88 88  V888 88  V888 88.     88 \`88.
 Y8888D' YP   YP 88   YD YP   YD      \`8888P'  \`Y88P'  YP   YP VP   V8P VP   V8P Y88888P 88   YD


 [ System ] Dark-Scanner v1.0.0 가동 중...
 [ Status ] 탐지 대상: 압박형(93.4%), 오도형(48.7%) 등 다크패턴 스캔 시작 [cite: 7, 15]
`;

console.log(banner, "color: #ff4d4d; font-weight: bold; font-family: monospace;");

// ─── 탐지기 실행 진입점 ───────────────────────────────────────────────────────
// Phase 1, 2 탐지기가 완성되면 아래에서 순서대로 호출합니다.

function runDetectors() {
  detectSocialProof();        // P1-A: 다른 소비자의 활동 알림 (93.4%)
  detectEmotionalLanguage();  // P1-B: 감정적 언어사용 (86.8%) — 비동기
  // TODO P1-C: countdown.js       — 시간제한 알림 (75.0%)
  // TODO P2-A: preselection.js    — 특정옵션 사전선택 (48.7%)
  // TODO P2-B: false-discount.js  — 거짓 할인 (19.7%)
  // TODO P2-C: false-hierarchy.js — 잘못된 계층구조 (15.8%)
}

runDetectors();
