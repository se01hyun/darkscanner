// tests/detectors/social-proof.test.js
'use strict';

const { detectSocialProof } = require('../../src/detectors/social-proof');

// CustomEvent는 jsdom에서 지원하지만 dispatchEvent 감지를 위해 spy 설정
beforeEach(() => {
  document.body.innerHTML = '';
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

function addSpan(text) {
  const el = document.createElement('span');
  el.textContent = text;
  document.body.appendChild(el);
  return el;
}

describe('P1-A: 소셜 프루프 탐지', () => {
  describe('탐지 O — 실제 다크패턴 문구', () => {
    const positives = [
      '153명이 보는 중',
      '지금까지 3,200개 구매',
      '최근 24명이 구매했습니다',
      '47명이 장바구니에 담았습니다',
      '재고 3개 남음',
      '오늘 82건 주문',
      '한정 10석',
      '품절 임박',
      '지금 막 구매',
    ];

    positives.forEach((text) => {
      it(`"${text}"`, () => {
        const events = [];
        document.body.addEventListener('darkscanner:detected', (e) => events.push(e));
        addSpan(text);
        detectSocialProof();
        expect(events.length).toBeGreaterThanOrEqual(1);
        expect(events[0].detail.type).toBe('social-proof');
      });
    });
  });

  describe('탐지 X — 일반 문구 (오탐 검증)', () => {
    const negatives = [
      '상품 설명을 확인하세요',
      '배송비 무료',
      '카드 할인 적용 가능',
      '로그인 후 이용해주세요',
      '내일(화) 4/7 도착 보장 (7시간 39분 내 주문 시 / 서울·경기 기준)', // '분' 오탐 회귀 방지
      '11 개 상품평',
    ];

    negatives.forEach((text) => {
      it(`"${text}"`, () => {
        const events = [];
        document.body.addEventListener('darkscanner:detected', (e) => events.push(e));
        addSpan(text);
        detectSocialProof();
        expect(events.length).toBe(0);
      });
    });
  });

  it('동일 요소 중복 탐지 방지', () => {
    const events = [];
    document.body.addEventListener('darkscanner:detected', (e) => events.push(e));
    addSpan('153명이 보는 중');
    detectSocialProof();
    detectSocialProof(); // 두 번 호출해도 emit은 1번
    expect(events.length).toBe(1);
  });
});
