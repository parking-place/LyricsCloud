# PROD-NF-007 — 세 언어 단어 Tooltip

- 상태: **Deferred / provider no-go**
- 작성일: 2026-09-09
- 최초 결정/소비: 1.0.13 P1
- 판정자/시각: Codex, 2026-09-12 05:30 KST. 제품 요구는 유지하되 공식 제공자 계약 전 구현하지 않는다.

## 질문·대안·결정 gate

승인 provider 확보 뒤 라임 단어 hover에 작은 뜻풀이를 제공하고 같은 결과를 keyboard focus의 명시 조회 버튼과 터치 선택 메뉴로 연다. 표시 항목은 선택 단어·사용자가 바꿀 수 있는 한국어/영어/일어 언어·사전명·짧은 뜻·원문 링크다. 로딩·없음·timeout·429·제공자 오류를 구별하며 Esc/외부 클릭 뒤 원래 focus로 돌아간다.

IME 조합 중에는 조회하지 않고 빠른 hover 이동·문서 전환 뒤 늦게 도착한 응답은 폐기한다. 조회 실패는 editor selection·undo·copy·저장을 바꾸지 않는다. 자동 언어 판정은 힌트일 뿐 사용자가 즉시 교정할 수 있어야 한다. 페이지 링크만 제공하거나 백과사전 검색 결과를 표시하는 것은 필수 tooltip 완료가 아니다.

## 영향과 수용

[ADR-NF-006](../adr/ADR-NF-006-dictionary-provider.md)의 no-go로 구현과 실제 조회 수용은 보류한다. 재개 시 [세부 계약](../../0.Plans/2.Patch-phase/contracts/DICTIONARY-FONTS.md)의 성공·timeout·429·빈 결과 fixture와 마냥/bright/光 입력을 사용하고, mock과 허용된 실제 제공자 결과를 분리 기록한다. 기존 저장 형식·계정 소유자·원문·copy는 보존한다.

## 되돌림·미실행

신규 표시/제공 기능을 중단해도 기존 창작물을 보존한다. 기술 전환은 호환/rollback을 검증한 뒤 적용한다. SDK/외부 서비스·권리·실제 OS/기기·배포 승인이 없으면 해당 결과를 미완료로 남긴다. 새 문서가 기존 Accepted 결정을 자동 대체하지 않으며 원문 이력은 보존한다.

[결정 색인](../../0.Plans/2.Patch-phase/Decision-Ownership.md)에서 승인자·시각·선택·대안·근거·영향받는 Phase·보류 이유를 연결한다.
