// src/background.js
// Chrome Extension Service Worker (Manifest V3)
// content.js에서 Claude API 호출 요청을 받아 처리합니다. (CORS 우회)

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ANALYZE_TEXT") {
    // TODO: src/api/claude.js 완성 후 실제 API 호출로 교체
    console.log("[Dark-Scanner] 분석 요청 수신:", message.payload);
    sendResponse({ status: "ok", result: null });
  }

  // 비동기 응답을 위해 true 반환
  return true;
});

console.log("[Dark-Scanner] Background service worker 시작");
