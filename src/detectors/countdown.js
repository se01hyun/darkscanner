// src/detectors/countdown.js
// P1-C: 시간제한 알림 탐지 (실태조사 빈도 75.0%)
// 탐지 방식: 텍스트 패턴 매칭 + 타이머 포맷 감지 + 데이터 소스 진위 판별

(function () {
'use strict';

// ─── 패턴 상수 ────────────────────────────────────────────────────────────────

/** 시간제한 관련 텍스트 패턴 */
const COUNTDOWN_TEXT_PATTERN =
  /(오늘\s*(만|한정|까지|중)|마감\s*(임박|까지|[0-9])|한\s*정\s*판매|한\s*정\s*수량|지금\s*만|이\s*가격\s*마지막|[0-9]+\s*(시간|분|초)\s*(후|뒤|남음|남았|이내|안에|限|한정)|D\s*[-–]\s*[0-9]+|[0-9]+일\s*(남음|후\s*종료|후\s*마감|째)|오늘\s*(오전|오후)?\s*[0-9]+시\s*(까지|마감|종료)|자정\s*(까지|마감)|세일\s*(마감|종료)\s*(임박|[0-9]+)|타임\s*(세일|딜|특가)|flash\s*sale|ends?\s*in\s*[0-9])/i;

/** 디지털 타이머 포맷: 00:00 또는 00:00:00 */
const TIMER_FORMAT_PATTERN = /^\s*\d{1,2}\s*[:：]\s*\d{2}(\s*[:：]\s*\d{2})?\s*$/;

/**
 * DOM 속성에서 서버 제공 timestamp를 찾기 위한 조건들
 * - 속성 이름 키워드
 * - 속성 값 형식 (ISO 8601 | Unix ms 10자리 | Unix ms 13자리)
 */
const SERVER_ATTR_KEYWORDS = [
  'end-time', 'endtime', 'end_time',
  'deadline', 'expire', 'expires',
  'expires-at', 'expiresat',
  'sale-end', 'saleend',
  'countdown', 'timer-end',
  'close-time', 'closetime',
];

const ISO_8601_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const UNIX_TIMESTAMP_PATTERN = /^\d{10}$|^\d{13}$/;

/**
 * Storage 키에서 타이머 관련 여부를 판단하는 키워드
 */
const STORAGE_TIMER_KEYWORDS = [
  'timer', 'countdown', 'expire', 'deadline',
  'end_time', 'endtime', 'endTime',
  'sale_end', 'saleEnd', 'flash',
  'timeout', 'timeLimit', 'timelimit',
];

// ─── 진위 판별 로직 ──────────────────────────────────────────────────────────

/**
 * 속성 값이 timestamp 형식인지 검사한다.
 * @param {string} value
 * @returns {boolean}
 */
function looksLikeTimestamp(value) {
  const v = (value || '').trim();
  return ISO_8601_PATTERN.test(v) || UNIX_TIMESTAMP_PATTERN.test(v);
}

/**
 * 요소와 조상 요소를 최대 depth 단계까지 올라가며
 * 서버 제공 timestamp 속성을 탐색한다.
 *
 * @param {Element} el
 * @param {number} [depth=5]
 * @returns {{ found: boolean, attrName: string|null, attrValue: string|null }}
 */
function findServerTimestamp(el, depth = 5) {
  let node = el;
  let steps = 0;

  while (node && node !== document.body && steps < depth) {
    for (const attr of node.attributes || []) {
      const name = attr.name.toLowerCase();
      const value = attr.value;

      // data-* 속성 중 서버 타임스탬프 키워드 포함 + 값이 timestamp 형식
      if (
        name.startsWith('data-') &&
        SERVER_ATTR_KEYWORDS.some((kw) => name.includes(kw)) &&
        looksLikeTimestamp(value)
      ) {
        return { found: true, attrName: attr.name, attrValue: value };
      }

      // 키워드 없어도 값 자체가 ISO 8601이면 서버 데이터로 간주
      if (name.startsWith('data-') && ISO_8601_PATTERN.test(value.trim())) {
        return { found: true, attrName: attr.name, attrValue: value };
      }
    }
    node = node.parentElement;
    steps++;
  }

  return { found: false, attrName: null, attrValue: null };
}

/**
 * localStorage / sessionStorage 를 스캔해
 * 타이머 관련 키가 존재하는지 검사한다.
 *
 * @returns {{ found: boolean, storageType: 'localStorage'|'sessionStorage'|null, key: string|null, value: string|null }}
 */
function findStorageTimer() {
  const storages = [
    { type: 'localStorage', store: window.localStorage },
    { type: 'sessionStorage', store: window.sessionStorage },
  ];

  for (const { type, store } of storages) {
    try {
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        if (!key) continue;

        const keyLower = key.toLowerCase();
        const isTimerKey = STORAGE_TIMER_KEYWORDS.some((kw) =>
          keyLower.includes(kw.toLowerCase())
        );

        if (isTimerKey) {
          const value = store.getItem(key);
          return { found: true, storageType: type, key, value };
        }

        // 키 이름 무관, 값이 timestamp 형식이면 후보로 포함
        const value = store.getItem(key);
        if (value && looksLikeTimestamp(value.trim())) {
          return { found: true, storageType: type, key, value };
        }
      }
    } catch (_) {
      // 서드파티 프레임 등 storage 접근 불가 환경에서 무시
    }
  }

  return { found: false, storageType: null, key: null, value: null };
}

/**
 * 탐지된 카운트다운 요소의 데이터 소스를 분석해 진위를 판별한다.
 *
 * 판별 기준:
 *   REAL    — DOM에 서버 제공 timestamp 속성이 있음
 *   FAKE    — DOM에 없고 Storage에만 타이머 값이 있음 (세션 추적 의심)
 *   UNKNOWN — 어느 쪽 근거도 없음 (JS로만 구동)
 *
 * @param {Element} el
 * @returns {{ verdict: 'REAL'|'FAKE'|'UNKNOWN', evidence: object }}
 */
function analyzeSource(el) {
  const domResult = findServerTimestamp(el);
  if (domResult.found) {
    return {
      verdict: 'REAL',
      evidence: {
        source: 'DOM 속성',
        attrName: domResult.attrName,
        attrValue: domResult.attrValue,
      },
    };
  }

  const storageResult = findStorageTimer();
  if (storageResult.found) {
    return {
      verdict: 'FAKE',
      evidence: {
        source: storageResult.storageType,
        key: storageResult.key,
        value: storageResult.value,
      },
    };
  }

  return {
    verdict: 'UNKNOWN',
    evidence: { source: '없음 — JS 런타임 전용으로 추정' },
  };
}

// ─── emit / 중복 방지 ────────────────────────────────────────────────────────

/** @type {WeakSet<Element>} */
const reported = new WeakSet();

const VERDICT_LABEL = {
  REAL:    '서버 데이터 확인됨 (진짜)',
  FAKE:    '브라우저 생성 의심 (가짜/속임수)',
  UNKNOWN: '출처 불명 (JS 런타임 전용)',
};

const VERDICT_STYLE = {
  REAL:    'color:#2ecc71; font-weight:bold',
  FAKE:    'color:#e74c3c; font-weight:bold',
  UNKNOWN: 'color:#f39c12; font-weight:bold',
};

/**
 * 탐지 결과를 콘솔에 출력하고 커스텀 이벤트를 발행한다.
 * @param {Element} el
 * @param {'text'|'timer'} trigger  — 탐지 트리거 유형
 */
function emit(el, trigger) {
  if (reported.has(el)) return;
  let ancestor = el.parentElement;
  while (ancestor) {
    if (reported.has(ancestor)) return;
    ancestor = ancestor.parentElement;
  }
  reported.add(el);

  const text = (el.innerText || el.textContent || '').trim().slice(0, 120);
  const { verdict, evidence } = analyzeSource(el);

  console.groupCollapsed(
    `%c[Dark-Scanner] 시간제한 알림 — ${VERDICT_LABEL[verdict]}`,
    VERDICT_STYLE[verdict]
  );
  console.log('요소:', el);
  console.log('텍스트:', text);
  console.log('트리거:', trigger === 'text' ? '텍스트 패턴' : '타이머 포맷 변화');
  console.log('근거:', evidence);
  console.groupEnd();

  el.dispatchEvent(
    new CustomEvent('darkscanner:detected', {
      bubbles: true,
      detail: {
        type: 'countdown',
        label: '시간제한 알림',
        el,
        text,
        trigger,
        verdict,
        verdictLabel: VERDICT_LABEL[verdict],
        evidence,
        confidence: verdict === 'FAKE' ? '확정' : '의심',
        severity: '보통',
        criterion: trigger === 'timer' ? 17 : 18,
        module: 'DOM 모듈',
      },
    })
  );
}

// ─── 탐지 로직 ───────────────────────────────────────────────────────────────

/** @param {Element} el @returns {boolean} */
function isCountdownText(el) {
  return COUNTDOWN_TEXT_PATTERN.test((el.innerText || el.textContent || '').trim());
}

/** @param {Element} el @returns {boolean} */
function isTimerFormat(el) {
  return TIMER_FORMAT_PATTERN.test((el.innerText || el.textContent || '').trim());
}

/**
 * 타이머 포맷 후보: Element → 마지막 텍스트
 * 실제로 값이 변하면 카운트다운으로 확정한다.
 * @type {Map<Element, string>}
 */
const timerCandidates = new Map();

function registerTimerCandidate(el) {
  if (timerCandidates.has(el)) return;
  timerCandidates.set(el, (el.innerText || el.textContent || '').trim());
}

const SCAN_SELECTORS = 'span, p, div, li, strong, em, b, small, label, td, th, h1, h2, h3, h4';

function scanElement(el) {
  if (isCountdownText(el)) {
    emit(el, 'text');
  } else if (isTimerFormat(el)) {
    registerTimerCandidate(el);
  }
}

/** 페이지 최초 로드 시 DOM 전체 스캔 */
function scanAll() {
  document.querySelectorAll(SCAN_SELECTORS).forEach(scanElement);
}

/** MutationObserver — 동적 삽입 + 숫자 변화 감지 */
function observeDynamic() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // 새로 삽입된 노드
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        scanElement(node);
        node.querySelectorAll(SCAN_SELECTORS).forEach(scanElement);
      }

      // characterData 변화: 텍스트 노드가 직접 바뀐 경우
      if (mutation.type === 'characterData') {
        const el = mutation.target.parentElement;
        if (!el) continue;
        if (timerCandidates.has(el)) {
          const curr = (el.innerText || el.textContent || '').trim();
          if (timerCandidates.get(el) !== curr) {
            timerCandidates.set(el, curr);
            emit(el, 'timer');
          }
        } else if (isTimerFormat(el)) {
          registerTimerCandidate(el);
        }
      }

      // childList 변화: 자식 요소 교체로 숫자가 바뀌는 경우
      if (mutation.type === 'childList') {
        const el = mutation.target;
        if (timerCandidates.has(el)) {
          const curr = (el.innerText || el.textContent || '').trim();
          if (timerCandidates.get(el) !== curr) {
            timerCandidates.set(el, curr);
            emit(el, 'timer');
          }
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  return observer;
}

// ─── 진입점 ──────────────────────────────────────────────────────────────────

/**
 * P1-C 탐지기 진입점. content.js에서 호출한다.
 */
function detectCountdown() {
  scanAll();
  observeDynamic();
}

// 전역 스코프에 노출 — content.js에서 호출하기 위함
/* global globalThis */
globalThis.detectCountdown = detectCountdown;

// Jest 테스트 환경에서는 require()로 직접 임포트
/* global module */
if (typeof module !== 'undefined') {
  module.exports = {
    detectCountdown,
    analyzeSource,       // 단위 테스트용
    findServerTimestamp, // 단위 테스트용
    findStorageTimer,    // 단위 테스트용
  };
}

})();
