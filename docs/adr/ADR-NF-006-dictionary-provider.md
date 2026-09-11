# ADR-NF-006 — 사전 제공 경로·권리·조회 경계

- 상태: **Deferred / no-go**
- 작성일: 2026-09-09
- 최초 결정/소비: 1.0.13 P1
- 판정자/시각: Codex, 2026-09-12 05:30 KST. 사용자가 승인한 1.0.13 실행 범위 안에서 공식 제공 경로 부재를 확인해 구현을 보류했다.

## 질문·대안·결정 gate

2026-09-12 확인한 [NAVER 오픈 API 목록](https://developers.naver.com/products/intro/plan/plan.md)은 검색·로그인·데이터랩 등을 열거하고 검색 범위에 블로그·이미지·웹·뉴스·백과사전·책·카페·지식iN 등을 명시하지만 한국어·영어·일어 사전 뜻풀이 API는 열거하지 않는다. [NAVER API 서비스 이용약관](https://developers.naver.com/products/intro/terms/terms.md)은 Search API 등 이관 대상의 개발자센터 신규 신청을 2026-07-30 24:00에 중단한다고 고지한다.

| 언어 | 공식 공개 뜻풀이 경로 | 신청·인증·비용 | 출처 표시·캐시/재배포 권리 | 판정 |
|---|---|---|---|---|
| 한국어 | 확인되지 않음 | 확인 불가 | 확인 불가 | no-go |
| 영어 | 확인되지 않음 | 확인 불가 | 확인 불가 | no-go |
| 일본어 | 확인되지 않음 | 확인 불가 | 확인 불가 | no-go |

백과사전 검색은 짧은 사전 뜻풀이 계약·세 언어 범위·캐시 권리를 충족하지 않으므로 대체하지 않는다. 화면 scraping, 비공식 endpoint, 사용 조건을 확인할 수 없는 provider도 사용하지 않는다. 재개 조건은 NAVER 정식 제휴 계약 또는 세 언어 각각에 대해 서버 호출·표시·원문 링크·캐시 TTL·재배포·비용·rate limit이 서면으로 확인되는 다른 제공자 승인이다. 단순 사전 페이지 새 탭 링크는 안전한 보조 대안이지만 필수 tooltip 완료로 세지 않는다.

## 영향과 수용

[세부 계약](../../0.Plans/2.Patch-phase/contracts/DICTIONARY-FONTS.md)의 언어/OS/권한·실패 사례와 [요구 추적](../../0.Plans/2.Patch-phase/Requirements-Traceability.md)을 소비한다. P2~P4는 승인 provider가 생길 때까지 blocked다. 제품 runtime·DB·API·UI·환경·운영 서버는 변경하지 않으며 기존 저장 형식·계정 소유자·원문·copy를 그대로 보존한다.

## 되돌림·미실행

신규 표시/제공 기능을 중단해도 기존 창작물을 보존한다. 기술 전환은 호환/rollback을 검증한 뒤 적용한다. SDK/외부 서비스·권리·실제 OS/기기·배포 승인이 없으면 해당 결과를 미완료로 남긴다. 새 문서가 기존 Accepted 결정을 자동 대체하지 않으며 원문 이력은 보존한다.

[결정 색인](../../0.Plans/2.Patch-phase/Decision-Ownership.md)에서 승인자·시각·선택·대안·근거·영향받는 Phase·보류 이유를 연결한다.
