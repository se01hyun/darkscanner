// src/background.js
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
    return true;
  }

  if (message.type === 'UPDATE_BADGE') {
    const count = message.count;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });
    sendResponse({});
  }
});

console.log('[Dark-Scanner] Background service worker 시작');
