// src/ui/overlay.js
'use strict';

(function () {
  // 로컬 배열로 관리 — read-modify-write race condition 방지
  const detections = [];

  function getStyleKey(confidence, severity) {
    if (confidence === '확정' && severity === '높음') return 'confirmed-high';
    if (confidence === '확정') return 'confirmed-medium';
    return 'suspected';
  }

  function attachTooltip(el, detail) {
    el.addEventListener('mouseenter', () => {
      if (window.DSTooltip) window.DSTooltip.show(el, detail);
    });
    el.addEventListener('mouseleave', () => {
      if (window.DSTooltip) window.DSTooltip.hide();
    });
  }

  document.addEventListener('darkscanner:detected', (e) => {
    const { detail } = e;
    const target = detail.el;
    if (!target) return;

    // 같은 type + text 조합은 중복 탐지로 간주해 skip
    const text = (detail.text || '').trim();
    if (detections.some(d => d.type === detail.type && d.text === text)) return;

    const styleKey = getStyleKey(detail.confidence, detail.severity);
    target.classList.add('ds-highlight', `ds-highlight--${styleKey}`);
    attachTooltip(target, detail);

    detections.push({
      type:       detail.type,
      label:      detail.label,
      text:       text,
      confidence: detail.confidence,
      severity:   detail.severity,
      module:     detail.module,
      reason:     detail.reason || null,
      scannedAt:  new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    });

    // 전체 배열을 통째로 덮어써서 race condition 없음
    chrome.storage.local.set({ dsDetections: detections });

    // 아이콘 배지
    chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', count: detections.length });
  });
})();
