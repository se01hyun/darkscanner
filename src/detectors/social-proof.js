// src/detectors/social-proof.js
// P1-A: 다른 소비자의 활동 알림 탐지 (실태조사 빈도 93.4%)
// 탐지 방식: 정규식 텍스트 매칭 + MutationObserver (동적 삽입 요소 포함)

(function () {
'use strict';

// '분'은 제외: 시간 단위(39분 내 주문)와 구별 불가능하여 오탐 발생
const SOCIAL_PROOF_PATTERN = /\d+[\s,]*(명|개|건)[\s가-힣]*(보[는고]|구매|주문|담[았]?|관심|확인|신청|조회|리뷰|후기|평가|선택|클릭|방문|입력|결제|완료)|(최근\s*\d+\s*(명|개|시간|일)[\s가-힣]*)|(지금\s*(막|이\s*순간|보고|구매|담고|주문))|(한정\s*\d+\s*(개|명|석|자리))|(품절\s*임박|재고\s*\d+\s*개?\s*(남음|뿐|밖에))|(오늘\s*\d+\s*(명|개|건)\s*(구매|주문|조회))/i;

/**
 * 노드의 텍스트가 소셜 프루프 패턴과 일치하는지 검사한다.
 * @param {Element} el
 * @returns {boolean}
 */
function isSocialProof(el) {
  // 자식 요소가 있는 div는 컨테이너로 간주하고 건너뜀.
  // innerText가 자식 텍스트까지 합산되어 "11 개 상품평 ... 구매" 같은 조합이 오탐되는 것을 방지.
  if (el.tagName === 'DIV' && el.children.length > 0) return false;

  const text = (el.innerText || el.textContent || '').trim();
  // 120자 초과는 컨테이너 요소로 간주
  if (text.length > 120 || text.length < 3) return false;

  return SOCIAL_PROOF_PATTERN.test(text);
}

/**
 * 탐지 결과를 저장하는 Set — 같은 요소를 중복 보고하지 않는다.
 * @type {WeakSet<Element>}
 */
const reportedSocialProof = new WeakSet();

/**
 * 요소를 탐지 결과로 emit 한다.
 * @param {Element} el
 */
function emit(el) {
  if (reportedSocialProof.has(el)) return;
  reportedSocialProof.add(el);

  const text = (el.innerText || el.textContent || '').trim().slice(0, 120);
  console.warn('[Dark-Scanner] 소셜 프루프 탐지:', text, el);

  // content.js → overlay.js 로 연결될 커스텀 이벤트
  el.dispatchEvent(
    new CustomEvent('darkscanner:detected', {
      bubbles: true,
      detail: {
        type: 'social-proof',
        label: '다른 소비자의 활동 알림',
        el,
        text,
        confidence: '의심',
        severity: '보통',
        criterion: 19,
        module: '규칙 기반',
      },
    })
  );
}

/**
 * DOM 전체를 스캔한다. (페이지 최초 로드 시 1회 실행)
 */
function scanAll() {
  // 텍스트를 직접 가진 말단 요소만 대상으로 삼아 중복 탐지를 줄인다.
  const candidates = document.querySelectorAll(
    'span, p, div, li, strong, em, b, small, label, td, th'
  );
  candidates.forEach((el) => {
    if (isSocialProof(el)) emit(el);
  });
}

/**
 * MutationObserver — AJAX로 동적 삽입되는 요소도 감지한다.
 */
function observeDynamic() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        // 삽입된 노드 자체 검사
        if (isSocialProof(node)) emit(node);

        // 삽입된 노드의 하위 요소 검사
        node
          .querySelectorAll('span, p, div, li, strong, em, b, small, label, td, th')
          .forEach((el) => {
            if (isSocialProof(el)) emit(el);
          });
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  return observer;
}

/**
 * P1-A 탐지기 진입점. content.js에서 호출한다.
 */
function detectSocialProof() {
  scanAll();
  observeDynamic();
}

// 전역 스코프에 노출 — content.js에서 호출하기 위함
/* global globalThis */
globalThis.detectSocialProof = detectSocialProof;

// Jest 테스트 환경에서는 require()로 직접 임포트
/* global module */
if (typeof module !== 'undefined') {
  module.exports = { detectSocialProof };
}

})();
