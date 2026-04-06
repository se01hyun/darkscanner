// tests/detectors/countdown.test.js
'use strict';

const { detectCountdown, analyzeSource, findServerTimestamp, findStorageTimer } =
  require('../../src/detectors/countdown');

beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  sessionStorage.clear();
  jest.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'groupEnd').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

function addSpan(text, attrs = {}) {
  const el = document.createElement('span');
  el.textContent = text;
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  document.body.appendChild(el);
  return el;
}

// ── 텍스트 패턴 탐지 ──────────────────────────────────────────────────────────

describe('P1-C: 시간제한 텍스트 탐지', () => {
  describe('탐지 O — 실제 시간 압박 문구', () => {
    const positives = [
      '오늘만 할인',
      '오늘 한정',
      '마감 임박',
      '이 가격 마지막',
      '3시간 남음',
      '20분 이내',
      'D-2',
      '3일 후 종료',
      '오늘 오후 6시 마감',
      '자정까지',
      '타임세일',
      'flash sale',
      'ends in 3',
    ];

    positives.forEach((text) => {
      it(`"${text}"`, () => {
        const events = [];
        document.body.addEventListener('darkscanner:detected', (e) => events.push(e));
        addSpan(text);
        detectCountdown();
        expect(events.length).toBeGreaterThanOrEqual(1);
        expect(events[0].detail.type).toBe('countdown');
      });
    });
  });

  describe('탐지 X — 일반 문구 (오탐 검증)', () => {
    const negatives = [
      '내일 도착 보장',
      '평일 오후 2시 이전 주문 당일 출고',
      '무료배송',
      '배송비 3,000원',
      '리뷰 작성 시 적립금 지급',
    ];

    negatives.forEach((text) => {
      it(`"${text}"`, () => {
        const events = [];
        document.body.addEventListener('darkscanner:detected', (e) => events.push(e));
        addSpan(text);
        detectCountdown();
        expect(events.length).toBe(0);
      });
    });
  });
});

// ── 진위 판별: REAL ───────────────────────────────────────────────────────────

describe('analyzeSource — REAL (DOM timestamp 속성 있음)', () => {
  it('data-end-time ISO 8601 → REAL', () => {
    const el = addSpan('02:59', { 'data-end-time': '2026-12-31T23:59:00Z' });
    const result = analyzeSource(el);
    expect(result.verdict).toBe('REAL');
    expect(result.evidence.attrName).toBe('data-end-time');
  });

  it('data-deadline Unix timestamp(13자리) → REAL', () => {
    const el = addSpan('01:30', { 'data-deadline': '1735689600000' });
    const result = analyzeSource(el);
    expect(result.verdict).toBe('REAL');
  });

  it('data-end-time 없어도 값 자체가 ISO 8601이면 REAL', () => {
    const el = addSpan('00:30', { 'data-ts': '2026-06-01T10:00:00' });
    const result = analyzeSource(el);
    expect(result.verdict).toBe('REAL');
  });
});

// ── 진위 판별: FAKE ───────────────────────────────────────────────────────────

describe('analyzeSource — FAKE (DOM 없음 + Storage에 타이머 키 있음)', () => {
  it('localStorage에 "countdown" 키 → FAKE', () => {
    localStorage.setItem('countdown', '179');
    const el = addSpan('02:59');
    const result = analyzeSource(el);
    expect(result.verdict).toBe('FAKE');
    expect(result.evidence.source).toBe('localStorage');
  });

  it('sessionStorage에 "timer" 키 → FAKE', () => {
    sessionStorage.setItem('timer_end', '1735689600000');
    const el = addSpan('01:00');
    const result = analyzeSource(el);
    expect(result.verdict).toBe('FAKE');
    expect(result.evidence.source).toBe('sessionStorage');
  });
});

// ── 진위 판별: UNKNOWN ────────────────────────────────────────────────────────

describe('analyzeSource — UNKNOWN (근거 없음)', () => {
  it('DOM 속성도 Storage도 없음 → UNKNOWN', () => {
    const el = addSpan('00:45');
    const result = analyzeSource(el);
    expect(result.verdict).toBe('UNKNOWN');
  });
});

// ── 중복 탐지 방지 ────────────────────────────────────────────────────────────

describe('중복 탐지 방지', () => {
  it('동일 요소를 두 번 호출해도 emit 1회', () => {
    const events = [];
    document.body.addEventListener('darkscanner:detected', (e) => events.push(e));
    addSpan('오늘만 할인');
    detectCountdown();
    detectCountdown();
    expect(events.length).toBe(1);
  });
});
