// src/background.js
'use strict';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_BADGE') {
    const count = message.count;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });
    sendResponse({});
  }
});

console.log('[Dark-Scanner] Background service worker 시작');
