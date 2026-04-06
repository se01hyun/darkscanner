// src/ui/tooltip.js — Dark-Scanner 경고 툴팁
// overlay.js보다 먼저 로드되어야 한다 (manifest 순서 의존).

'use strict';

(function () {
  const el = document.createElement('div');
  el.className = 'ds-tooltip';
  el.setAttribute('aria-hidden', 'true');
  document.documentElement.appendChild(el);

  const VERDICT_LABEL = {
    REAL:    '서버 데이터 확인됨 (진짜)',
    FAKE:    '브라우저 생성 의심 (가짜/속임수)',
    UNKNOWN: '출처 불명',
  };

  /**
   * 탐지 유형별 툴팁 HTML을 생성한다.
   * @param {object} detail  darkscanner:detected 이벤트의 detail 객체
   * @returns {string}
   */
  function buildHTML(detail) {
    const { type, label, text, verdict, reason } = detail;

    let html = `<div class="ds-tooltip-title">[주의] ${label}</div>`;

    if (text) {
      const excerpt = text.length > 60 ? text.slice(0, 60) + '…' : text;
      html += `<div class="ds-tooltip-text">"${excerpt}"</div>`;
    }

    if (type === 'countdown' && verdict) {
      const vLabel = VERDICT_LABEL[verdict] || verdict;
      html += `<div class="ds-tooltip-verdict ds-verdict-${verdict}">판정: ${vLabel}</div>`;
    }

    if (type === 'emotional-language' && reason) {
      html += `<div class="ds-tooltip-reason">${reason}</div>`;
    }

    return html;
  }

  /**
   * 기준 요소(anchor) 근처에 툴팁을 배치한다.
   * 화면 경계를 벗어나지 않도록 보정한다.
   * @param {Element} anchor
   */
  function reposition(anchor) {
    const rect = anchor.getBoundingClientRect();
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tw = el.offsetWidth;
    const th = el.offsetHeight;

    let top  = rect.bottom + margin;
    let left = rect.left;

    if (top + th > vh) top  = rect.top - th - margin;
    if (left + tw > vw) left = vw - tw - margin;
    if (left < margin)  left = margin;
    if (top  < margin)  top  = margin;

    el.style.top  = `${top}px`;
    el.style.left = `${left}px`;
  }

  /**
   * 툴팁을 표시한다.
   * @param {Element} anchor  하이라이트된 요소
   * @param {object}  detail  darkscanner:detected detail
   */
  function show(anchor, detail) {
    el.innerHTML = buildHTML(detail);
    el.style.display = 'block';
    reposition(anchor);
  }

  /** 툴팁을 숨긴다. */
  function hide() {
    el.style.display = 'none';
  }

  // overlay.js에서 접근하기 위해 전역 노출
  window.DSTooltip = { show, hide };
})();
