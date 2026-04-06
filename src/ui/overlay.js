// src/ui/overlay.js — Dark-Scanner 하이라이트 오버레이 + 배지
// tooltip.js가 먼저 로드되어 window.DSTooltip이 존재해야 한다.

'use strict';

(function () {
  let count = 0;
  let badge = null;

  /** 배지 요소를 반환한다. 최초 호출 시 생성한다. */
  function getBadge() {
    if (badge) return badge;
    badge = document.createElement('div');
    badge.className = 'ds-badge';
    badge.title = 'Dark-Scanner — 탐지된 다크패턴';
    document.documentElement.appendChild(badge);
    return badge;
  }

  function updateBadge() {
    getBadge().textContent = `다크패턴 ${count}건 탐지`;
  }

  /**
   * 하이라이트된 요소에 툴팁 이벤트를 연결한다.
   * @param {Element} el
   * @param {object}  detail
   */
  function attachTooltip(el, detail) {
    el.addEventListener('mouseenter', () => {
      if (window.DSTooltip) window.DSTooltip.show(el, detail);
    });
    el.addEventListener('mouseleave', () => {
      if (window.DSTooltip) window.DSTooltip.hide();
    });
  }

  // 모든 탐지기의 darkscanner:detected 이벤트를 단일 리스너로 처리한다.
  document.addEventListener('darkscanner:detected', (e) => {
    const { detail } = e;
    const target = detail.el;
    if (!target) return;

    target.classList.add('ds-highlight');
    count++;
    updateBadge();
    attachTooltip(target, detail);
  });
})();
