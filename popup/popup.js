// popup/popup.js
'use strict';

const apiKeyInput = document.getElementById('apiKey');
const saveBtn = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');
const countEl = document.getElementById('count');

// 저장된 키 로드
chrome.storage.local.get('claudeApiKey', ({ claudeApiKey }) => {
  if (claudeApiKey) {
    apiKeyInput.value = claudeApiKey;
    showStatus('저장된 키가 있습니다.', 'ok');
  }
});

// 탐지 카운트 로드
chrome.storage.local.get('detectedCount', ({ detectedCount }) => {
  countEl.textContent = detectedCount || 0;
});

saveBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key.startsWith('sk-ant-')) {
    showStatus('올바른 Claude API 키를 입력하세요.', 'err');
    return;
  }
  chrome.storage.local.set({ claudeApiKey: key }, () => {
    showStatus('저장 완료!', 'ok');
  });
});

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = type;
}
