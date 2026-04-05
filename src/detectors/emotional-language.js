// src/detectors/emotional-language.js
// P1-B: 감정적 언어사용 탐지 (실태조사 빈도 86.8%)
// 탐지 방식: 버튼·링크 텍스트 추출 → Claude API 배치 전송 → 결과 emit

'use strict';

const BATCH_SIZE = 50; // API 호출 1회당 최대 텍스트 수

/**
 * 페이지 내 버튼·링크 텍스트를 수집한다.
 * @returns {{ el: Element, text: string }[]}
 */
function collectCandidates() {
  const candidates = [];
  const els = document.querySelectorAll('button, a, [role="button"], input[type="submit"], input[type="button"]');
  els.forEach((el) => {
    const text = (el.textContent || el.value || el.getAttribute('aria-label') || '').trim();
    if (text.length >= 2 && text.length <= 80) {
      candidates.push({ el, text });
    }
  });
  return candidates;
}

/**
 * 배열을 size 단위로 분할한다.
 * @param {any[]} arr
 * @param {number} size
 * @returns {any[][]}
 */
function chunk(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/**
 * background.js에 분석 요청을 보낸다.
 * @param {string[]} texts
 * @returns {Promise<{index: number, isEmotional: boolean, reason: string}[]>}
 */
function requestAnalysis(texts) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'ANALYZE_EMOTIONAL', payload: { texts } },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        resolve(response.results);
      }
    );
  });
}

/**
 * P1-B 탐지기 진입점. content.js에서 호출한다.
 * API 키 미설정 시 조용히 종료 (콘솔 경고만).
 */
async function detectEmotionalLanguage() {
  const candidates = collectCandidates();
  if (candidates.length === 0) return;

  const batches = chunk(candidates, BATCH_SIZE);

  for (const batch of batches) {
    const texts = batch.map((c) => c.text);
    let results;
    try {
      results = await requestAnalysis(texts);
    } catch (e) {
      console.warn('[Dark-Scanner] 감정적 언어 분석 실패:', e.message);
      return;
    }

    results.forEach(({ index, isEmotional, reason }) => {
      if (!isEmotional) return;
      const item = batch[index - 1];
      if (!item) return;

      console.warn('[Dark-Scanner] 감정적 언어 탐지:', item.text, item.el);
      item.el.dispatchEvent(
        new CustomEvent('darkscanner:detected', {
          bubbles: true,
          detail: {
            type: 'emotional-language',
            label: '감정적 언어사용',
            el: item.el,
            text: item.text,
            reason,
          },
        })
      );
    });
  }
}

/* global module */
if (typeof module !== 'undefined') {
  module.exports = { detectEmotionalLanguage, collectCandidates };
}
