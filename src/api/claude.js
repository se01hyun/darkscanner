// src/api/claude.js
// Claude API 클라이언트 — background service worker에서만 실행됨

'use strict';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-3-5-20241022';

/**
 * 버튼/링크 텍스트 배열을 Claude API에 일괄 전송해 감정적 언어 여부를 분류한다.
 *
 * @param {string[]} texts - 분석할 텍스트 목록 (최대 50개)
 * @param {string} apiKey
 * @returns {Promise<{index: number, isEmotional: boolean, reason: string}[]>}
 */
async function classifyEmotionalLanguage(texts, apiKey) {
  const numbered = texts.map((t, i) => `${i + 1}. "${t}"`).join('\n');

  const prompt = `당신은 온라인 쇼핑몰의 다크패턴을 분류하는 전문가입니다.
아래 버튼/링크 텍스트 목록에서 "감정적 언어사용" 다크패턴에 해당하는 항목을 찾아주세요.

감정적 언어사용 다크패턴: 사용자가 거절·취소·이탈을 선택하면 불이익을 암시하거나 죄책감·후회를 유발하는 표현.
예) "혜택 포기하기", "그냥 비싸게 살게요", "무시하고 나가기", "손해 보고 닫기"

텍스트 목록:
${numbered}

아래 JSON 배열만 출력하세요. 다른 텍스트는 절대 포함하지 마세요.
[{"index": 1, "isEmotional": true/false, "reason": "한 줄 이유"}, ...]`;

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Claude API 오류 ${response.status}: ${err.error?.message || '알 수 없는 오류'}`);
  }

  const data = await response.json();
  const raw = data.content[0].text.trim();

  // JSON 블록 추출 (마크다운 코드펜스 대응)
  const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(jsonStr);
}

/* global module */
if (typeof module !== 'undefined') {
  module.exports = { classifyEmotionalLanguage };
}
