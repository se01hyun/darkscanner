# Dark-Scanner 개발 로드맵

## 근거 자료
- 공정거래위원회 「온라인 다크패턴 자율관리 가이드라인」 (2023.7.31)
- 한국소비자원 「온라인 쇼핑몰 다크패턴 실태조사」 (2023.11.6)

---

## 탐지 대상 최종 확정

PRD 스코프 기준 **오도형 + 압박형** 한정. `숨겨진 정보`는 가이드라인상 방해형으로 제외.

| 순위 | 패턴 유형 | 범주 | 실태조사 빈도 | 탐지 방식 |
|---|---|---|---|---|
| 1 | 다른 소비자의 활동 알림 | 압박형 | **93.4%** | Rule-based |
| 2 | 감정적 언어사용 | 압박형 | **86.8%** | Claude API (NLP) |
| 3 | 시간제한 알림 | 압박형 | 75.0% | Rule-based + DOM + 데이터 소스 진위 판별 |
| 4 | 특정옵션 사전선택 | 오도형 | 48.7% | DOM 상태 분석 |
| 5 | 거짓 할인 | 오도형 | 19.7% | 가격 역산 로직 |
| 6 | 잘못된 계층구조 | 오도형 | 15.8% | 색상 대비 분석 |

---

## 파일 구조 (목표)

```
dark-scanner/
├── manifest.json
├── src/
│   ├── content.js                  # 탐지기 실행 진입점
│   ├── background.js               # Claude API 호출 (CORS 우회)
│   ├── detectors/
│   │   ├── social-proof.js         # 다른 소비자의 활동 알림
│   │   ├── emotional-language.js   # 감정적 언어사용
│   │   ├── countdown.js            # 시간제한 알림
│   │   ├── preselection.js         # 특정옵션 사전선택
│   │   ├── false-discount.js       # 거짓 할인
│   │   └── false-hierarchy.js      # 잘못된 계층구조
│   ├── api/
│   │   └── claude.js               # Claude API 클라이언트
│   └── ui/
│       ├── overlay.js              # 하이라이트 오버레이 주입
│       ├── tooltip.js              # 경고 툴팁
│       └── overlay.css
├── popup/
│   ├── popup.html
│   └── popup.js
├── icons/
└── Docs/
```

---

## Phase 0 — 프로젝트 뼈대

**목표**: 크롬에 확장 프로그램으로 로드되는 최소 구조 완성

- [x] `manifest.json` 작성 (MV3)
- [x] 폴더 구조 생성
- [x] `src/content.js` 진입점 — DOM Ready 후 탐지기 실행
- [x] `src/background.js` 기본 틀 — 메시지 리스너 등록

---

## Phase 1 — 압박형 탐지 (최우선)

실태조사 1~3위. Rule-based 위주라 Claude API 없이도 바로 동작 확인 가능.

### P1-A. 다른 소비자의 활동 알림 (93.4%)

- [x] `src/detectors/social-proof.js` 구현
- 탐지 방식: 정규식 텍스트 매칭
- 타겟 패턴 예시
  - `"N명이 보는 중"`, `"지금까지 OOO개 구매"`
  - `"최근 N명이 구매했습니다"`, `"N명이 장바구니에 담았습니다"`
- MutationObserver로 AJAX 동적 삽입 요소도 감지
- **구현 난이도: 낮음** → 첫 완성 목표

### P1-B. 감정적 언어사용 (86.8%)

- [x] `src/detectors/emotional-language.js` 구현
- [x] `src/api/claude.js` Claude API 클라이언트 구현
- 탐지 방식: 버튼·링크 텍스트 추출 → Claude API 전송 → 분류 결과 수신
- 타겟 패턴 예시
  - `"혜택 포기하기"`, `"그냥 비싸게 살게요"`, `"무시하고 나가기"`
- API 호출 최적화: 페이지 로드 시 배치 전송 (요소별 개별 호출 금지)
- **구현 난이도: 중간** → Claude API 연동 첫 사례

### P1-C. 시간제한 알림 (75.0%)

- [x] `src/detectors/countdown.js` 구현
- 탐지 방식: 텍스트 패턴 매칭 + 타이머 포맷(`00:00`) 변화 감지 + **데이터 소스 진위 판별**
- 타겟 패턴 예시
  - `"오늘만"`, `"N시간 남음"`, `"마감 임박"`, `"타임세일"`, `"flash sale"`
  - `setInterval` 기반으로 숫자가 변화하는 DOM 요소
- MutationObserver로 `characterData` · `childList` 변화 감지
- **진위 판별 3단계**
  - `REAL` — DOM의 `data-end-time` 등 속성에 ISO 8601 / Unix timestamp 존재
  - `FAKE` — DOM엔 없고 `localStorage` / `sessionStorage`에만 타이머 값 존재 (세션 추적 의심)
  - `UNKNOWN` — 근거 없음 (JS 런타임 전용으로 추정)
- **구현 난이도: 낮음~중간**

---

## Phase 2 — 오도형 탐지

### P2-A. 특정옵션 사전선택 (48.7%)

- [ ] `src/detectors/preselection.js` 구현
- `input[type=checkbox]:checked`, `input[type=radio]:checked` 초기 상태 스캔
- Claude API로 해당 옵션 텍스트의 "사업자 유리 여부" 분류 보조
- 타겟: 유료 구독, 보험, 추가 서비스가 기본 선택된 상태

### P2-B. 거짓 할인 (19.7%)

- [ ] `src/detectors/false-discount.js` 구현
- 정가·할인가 DOM 추출 후 할인율 역산 검증
- `1+1` 상품의 단품 가격 비교 로직
- 원가 대비 과도한 할인율 표기 감지

### P2-C. 잘못된 계층구조 (15.8%)

- [ ] `src/detectors/false-hierarchy.js` 구현
- `getComputedStyle`로 같은 화면 내 버튼들의 색상 대비(Contrast Ratio) 계산
- CTA 버튼 대비 취소·거부 버튼의 크기·색상 차이 임계값 초과 시 탐지
- WCAG 기준 대비 역방향 적용 (의도적으로 낮춘 대비를 감지)

---

## Phase 3 — 경고 UI (Phase 1과 병행)

- [x] 탐지 요소에 **심각도별 오버레이** 주입 (확정-높음: 빨간 실선 / 확정-보통: 주황 실선 / 의심: 주황 점선)
- [x] 호버 시 **툴팁** 표시
  - 패턴 유형명 (예: "압박형 — 다른 소비자의 활동 알림")
  - 탐지 텍스트 및 데이터 출처 판별 결과 (REAL / FAKE / UNKNOWN)
  - 신뢰도·심각도 표시
- [x] **확장 프로그램 아이콘 배지**: 탐지 건수 실시간 표시 (화면 내 배지 대신 아이콘 배지로 구현)

---

## Phase 4 — 결합형 패턴 감지 + 마무리

실태조사에서 한 화면에 복수 패턴이 결합되는 사례가 빈번히 확인됨.

- [ ] 동일 화면에서 복수 패턴 동시 탐지 시 경고 강도 상향
- [ ] 탐지 정확도 테스트 (쿠팡, 네이버쇼핑, G마켓 실사용 검증)
- [ ] False Positive 감소 — Claude API 프롬프트 튜닝
- [ ] 발표용 데모 시나리오 준비

---

## 주요 기술 결정 사항

| 결정 | 내용 | 이유 |
|---|---|---|
| Manifest V3 | MV3 사용 | MV2는 2024년 이후 크롬에서 비활성화 |
| API 호출 위치 | background service worker | content script에서 외부 API 직접 호출 시 CORS 차단 |
| CSS 분리 | `overlay.css` 별도 파일 | JS로 style 주입 시 CSP(Content Security Policy)에 막힐 수 있음 |
| 탐지 시점 | `document_idle` | DOM 완전 로드 후 탐지 — `document_start`보다 안정적 |
| 배치 API 호출 | 페이지 단위 일괄 전송 | 요소별 개별 호출 시 API 비용·레이턴시 급증 방지 |

---

## 배포 전 필수 체크리스트

Phase 4 완료 후 처리.

### 언패키드 로드 (졸업 작품 시연)
- [ ] `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png` 생성 (manifest에 명시됨)

### Chrome Web Store 정식 배포
- [ ] 개인정보처리방침 작성 및 URL 확보 (API 키·`chrome.storage` 사용으로 필수)
- [ ] 스토어 등록용 스크린샷 (최소 1장, 1280×800 또는 640×400)
- [ ] 스토어 설명문 (한국어) 작성
- [ ] `manifest.json`에 `homepage_url`, `author` 필드 추가
