// tests/detectors/emotional-language.test.js
'use strict';

const { collectCandidates } = require('../../src/detectors/emotional-language');

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('collectCandidates', () => {
  it('버튼 텍스트를 수집한다', () => {
    document.body.innerHTML = `
      <button>혜택 포기하기</button>
      <button>확인</button>
      <a href="#">그냥 비싸게 살게요</a>
    `;
    const result = collectCandidates();
    const texts = result.map((c) => c.text);
    expect(texts).toContain('혜택 포기하기');
    expect(texts).toContain('확인');
    expect(texts).toContain('그냥 비싸게 살게요');
  });

  it('텍스트가 없는 버튼은 제외한다', () => {
    document.body.innerHTML = `<button></button><button>  </button>`;
    expect(collectCandidates().length).toBe(0);
  });

  it('80자 초과 텍스트는 제외한다', () => {
    document.body.innerHTML = `<button>${'가'.repeat(81)}</button>`;
    expect(collectCandidates().length).toBe(0);
  });

  it('aria-label을 텍스트로 사용한다', () => {
    document.body.innerHTML = `<button aria-label="닫기"></button>`;
    const result = collectCandidates();
    expect(result[0].text).toBe('닫기');
  });
});
