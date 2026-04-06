// popup/popup.js
'use strict';

const clearBtn        = document.getElementById('clearBtn');
const riskScoreEl     = document.getElementById('riskScore');
const riskTagEl       = document.getElementById('riskTag');
const riskBarEl       = document.getElementById('riskBar');
const riskSummaryEl   = document.getElementById('riskSummary');
const detectionListEl = document.getElementById('detectionList');
const listTitleEl     = document.getElementById('listTitle');

const SEVERITY_WEIGHT = { '높음': 40, '보통': 20, '낮음': 10 };

function calcRisk(list) {
  return Math.min(list.reduce((s, d) => s + (SEVERITY_WEIGHT[d.severity] || 10), 0), 100);
}

function riskMeta(score) {
  if (score >= 80) return { label: '위험', cls: 'risk-tag--danger',  bar: '#e74c3c' };
  if (score >= 50) return { label: '경고', cls: 'risk-tag--warning', bar: '#e67e22' };
  if (score >= 20) return { label: '주의', cls: 'risk-tag--caution', bar: '#f39c12' };
  return             { label: '안전', cls: 'risk-tag--safe',    bar: '#2ecc71' };
}

function renderRisk(list) {
  const score = calcRisk(list);
  const meta  = riskMeta(score);
  riskScoreEl.textContent    = score;
  riskTagEl.textContent      = meta.label;
  riskTagEl.className        = `risk-tag ${meta.cls}`;
  riskBarEl.style.width      = `${score}%`;
  riskBarEl.style.background = meta.bar;

  if (!list.length) { riskSummaryEl.textContent = '탐지된 패턴 없음'; return; }

  const high      = list.filter(d => d.severity === '높음').length;
  const medium    = list.filter(d => d.severity === '보통').length;
  const low       = list.filter(d => d.severity === '낮음').length;
  const confirmed = list.filter(d => d.confidence === '확정').length;
  const lastTime  = list[list.length - 1].scannedAt;

  const parts = [`탐지 ${list.length}건`];
  if (high)      parts.push(`높음 ${high}건`);
  if (medium)    parts.push(`보통 ${medium}건`);
  if (low)       parts.push(`낮음 ${low}건`);
  if (confirmed) parts.push(`(확정 ${confirmed}건)`);
  if (lastTime)  parts.push(`스캔 ${lastTime}`);
  riskSummaryEl.innerHTML = parts.map((p, i) => i === 0 ? `<span>${p}</span>` : p).join(' · ');
}

function renderList(list) {
  if (!list.length) {
    listTitleEl.style.display = 'none';
    detectionListEl.innerHTML = '<div class="empty-state">현재 페이지에서 탐지된 항목이 없습니다.</div>';
    return;
  }
  listTitleEl.style.display = 'block';
  listTitleEl.textContent = `탐지 항목 ${list.length}건`;

  const sevCls = { '높음': 'high', '보통': 'medium', '낮음': 'low' };
  detectionListEl.innerHTML = list.map(d => {
    const excerpt = d.text ? (d.text.length > 50 ? d.text.slice(0, 50) + '…' : d.text) : '';
    return `
      <div class="detection-item">
        <div class="detection-top">
          <span class="detection-label">${d.label}</span>
          <span class="tag tag--${d.confidence === '확정' ? 'confirmed' : 'suspected'}">${d.confidence}</span>
          <span class="tag tag--${sevCls[d.severity] || 'medium'}">심각도 ${d.severity}</span>
        </div>
        ${excerpt ? `<div class="detection-text">"${excerpt}"</div>` : ''}
        ${d.reason ? `<div class="detection-reason">${d.reason}</div>` : ''}
        <div class="detection-module">${d.module}</div>
      </div>`;
  }).join('');
}

function load() {
  chrome.storage.local.get('dsDetections', ({ dsDetections }) => {
    const list = dsDetections || [];
    renderRisk(list);
    renderList(list);
  });
}

clearBtn.addEventListener('click', () => {
  chrome.storage.local.remove('dsDetections', () => { renderRisk([]); renderList([]); });
});

load();
