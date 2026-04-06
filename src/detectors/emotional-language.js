// src/detectors/emotional-language.js
// P1-B: 감정적 언어사용 탐지 (실태조사 빈도 86.8%)
// 탐지 방식: 버튼·링크 텍스트 추출 → 규칙 기반 패턴 매칭

'use strict';

/**
 * 감정적 언어사용 다크패턴 규칙 목록.
 * 사용자가 거절·취소·이탈을 선택하면 불이익을 암시하거나 죄책감·후회를 유발하는 표현.
 *
 * [카테고리 1] 혜택/기회 포기 프레이밍
 *   — "포기하기", "혜택 포기" 등 거절을 스스로 포기하는 행위로 표현
 * [카테고리 2] 자기비하적 거절
 *   — "비싸게 살게요", "손해 봐도 괜찮아요" 등 나쁜 선택임을 스스로 인정하게 유도
 * [카테고리 3] 무시·경시 프레이밍
 *   — "무시하고 나가기", "그냥 닫기" 등 거절 행위 자체를 부정적으로 묘사
 * [카테고리 4] 직접적 손실 인정
 *   — "혜택 없이 계속", "안 받겠습니다" 등 사용자가 손실을 명시적으로 인정하게 유도
 */
const RULES = [
  // ── 카테고리 1: 혜택·기회 포기 프레이밍 ─────────────────────────────────
  { pattern: /포기하(고|기|겠|기로)/, reason: '거절을 "포기"로 표현하여 손실감 유발' },
  { pattern: /혜택\s*(포기|없이|안\s*받|을?\s*포기)/, reason: '혜택 포기 프레이밍으로 죄책감 유발' },
  { pattern: /할인\s*(포기|안\s*받|없이)/, reason: '할인 포기 프레이밍으로 죄책감 유발' },
  { pattern: /쿠폰\s*(포기|안\s*받|없이|을?\s*포기)/, reason: '쿠폰 포기 프레이밍으로 죄책감 유발' },
  { pattern: /적립금?\s*(포기|없이|안\s*받)/, reason: '적립금 포기 프레이밍으로 죄책감 유발' },
  { pattern: /기회\s*(포기|를?\s*놓치|를?\s*버리|를?\s*무시)/, reason: '기회 포기 프레이밍으로 후회 유발' },
  { pattern: /혜택을?\s*(버리|날리|날려|포기)/, reason: '혜택 포기 프레이밍' },
  { pattern: /이\s*혜택\s*(필요\s*없|포기|안\s*받)/, reason: '혜택 거부를 직접 인정하게 유도' },

  // ── 카테고리 2: 자기비하적 거절 ─────────────────────────────────────────
  { pattern: /(더\s*)?비싸게\s*(살|구매|사겠|살게|사도)/, reason: '"비싸게 산다"고 스스로 인정하게 유도' },
  { pattern: /정가로\s*(살|구매|사겠|살게)/, reason: '"정가로 산다"며 합리적 거절을 손해로 프레이밍' },
  { pattern: /손해\s*(봐도|보고|를?\s*감수|봐도\s*괜찮)/, reason: '거절 시 손해를 감수한다고 명시적으로 인정하게 유도' },
  { pattern: /낭비해도\s*(괜찮|됩니다)/, reason: '거절을 낭비로 표현' },
  { pattern: /혜택\s*없이\s*계속/, reason: '혜택 없이 진행함을 명시적으로 인정하게 유도' },
  { pattern: /혜택을?\s*(받지|안)\s*않겠/, reason: '혜택 포기를 직접 선언하게 유도' },
  { pattern: /절약\s*(안\s*할게|하지\s*않겠|포기)/, reason: '절약 기회 포기를 스스로 선언하게 유도' },
  { pattern: /할인\s*없이\s*(계속|구매|살게|진행)/, reason: '할인 없이 진행함을 명시적으로 인정' },

  // ── 카테고리 3: 무시·경시 프레이밍 ─────────────────────────────────────
  { pattern: /무시하(고|기|겠|기로)/, reason: '거절 행위를 "무시"로 표현하여 부정적 감정 유발' },
  { pattern: /그냥\s*(나가|닫|넘어가|포기|무시)/, reason: '"그냥"을 앞에 붙여 거절을 무책임한 행동으로 묘사' },
  { pattern: /그냥\s*(비싸게|손해|포기)/, reason: '"그냥 손해를 본다"는 자기비하 유도' },
  { pattern: /그냥\s*(살게요|사겠습니다)/, reason: '"그냥 (비싸게) 산다"는 자기비하 유도' },
  { pattern: /신경\s*안\s*쓸게요/, reason: '혜택을 신경 쓰지 않는다는 자조적 표현' },
  { pattern: /됐어요|됐습니다|됩니다[.!]?$/, reason: '"됐습니다" — 거절을 체념·포기로 표현' },

  // ── 카테고리 4: 직접적 거절의 부정적 재프레이밍 ─────────────────────────
  { pattern: /안\s*받(겠습니다|을게요|아도\s*돼|을래요|겠어요)/, reason: '혜택을 받지 않겠다고 직접 선언하게 유도' },
  { pattern: /필요\s*없(어요|습니다|다고요|어요)\s*$/, reason: '혜택 필요 없음을 명시적으로 선언하게 유도' },
  { pattern: /(전|저는|저)\s*괜찮(아요|습니다)\s*$/, reason: '거절을 "괜찮다"로 표현해 혜택 포기를 정당화' },
  { pattern: /이번엔?\s*됩니다/, reason: '"이번엔 됩니다" — 혜택 거절을 체념으로 표현' },
  { pattern: /나중에\s*(할게요|하겠습니다|받을게요)/, reason: '지금 혜택을 놓침을 암묵적으로 인정하게 유도' },
  { pattern: /다음에\s*(할게요|기회에|받을게요)/, reason: '현재 혜택 포기를 "다음으로" 미루는 표현' },
  { pattern: /혜택\s*(을|를)?\s*포기하겠습니다/, reason: '혜택 포기 직접 선언' },
  { pattern: /구독\s*(안\s*할게요|포기|하지\s*않겠)/, reason: '구독 거절을 포기로 표현' },
  { pattern: /멤버십\s*(포기|안\s*할게요|하지\s*않겠)/, reason: '멤버십 거절을 포기로 표현' },
];

/**
 * 텍스트가 감정적 언어사용 패턴에 해당하는지 검사한다.
 * @param {string} text
 * @returns {{ matched: boolean, reason: string }}
 */
function checkEmotionalLanguage(text) {
  for (const { pattern, reason } of RULES) {
    if (pattern.test(text)) {
      return { matched: true, reason };
    }
  }
  return { matched: false, reason: '' };
}

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
 * P1-B 탐지기 진입점. content.js에서 호출한다.
 */
function detectEmotionalLanguage() {
  const candidates = collectCandidates();

  candidates.forEach(({ el, text }) => {
    const { matched, reason } = checkEmotionalLanguage(text);
    if (!matched) return;

    console.warn('[Dark-Scanner] 감정적 언어 탐지:', text, el);
    el.dispatchEvent(
      new CustomEvent('darkscanner:detected', {
        bubbles: true,
        detail: {
          type: 'emotional-language',
          label: '감정적 언어사용',
          el,
          text,
          reason,
          confidence: '확정',
          severity: '높음',
          criterion: 16,
          module: '규칙 기반',
        },
      })
    );
  });
}

/* global module */
if (typeof module !== 'undefined') {
  module.exports = { detectEmotionalLanguage, collectCandidates, checkEmotionalLanguage };
}
