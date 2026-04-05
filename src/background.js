// src/background.js
// Chrome Extension Service Worker (Manifest V3)
// content.js에서 Claude API 호출 요청을 받아 처리합니다. (CORS 우회)

'use strict';

importScripts('api/claude.js');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_EMOTIONAL') {
    chrome.storage.local.get('claudeApiKey', async ({ claudeApiKey }) => {
      if (!claudeApiKey) {
        sendResponse({ error: 'API 키가 설정되지 않았습니다. 확장 프로그램 팝업에서 키를 입력해주세요.' });
        return;
      }
      try {
        const results = await classifyEmotionalLanguage(message.payload.texts, claudeApiKey);
        sendResponse({ results });
      } catch (e) {
        sendResponse({ error: e.message });
      }
    });
    return true; // 비동기 응답
  }
});

console.log('[Dark-Scanner] Background service worker 시작');
