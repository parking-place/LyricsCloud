# PROD-NF-002 — prompt 모드·송폼 부태그·copy advisory

- 상태: **Proposed**
- 작성일: 2026-09-09
- 결정 Phase: 1.0.3 P1, 1.0.4~1.0.6 확장
- 승인자/시각: **미승인 — 해당 Phase에서 사용자/지정 결정권자의 승인을 기록한다.**
- 범위 원본: 사용자의 1.0.1 필수 및 후속 1.x 계획 요청.

## 해결할 질문

화면 표현과 Suno용 출력 변화가 원문 저장/복구를 훼손하지 않게 하는 규칙은 무엇인가?

## 검토한 대안

### 1. 보기 전환 시 raw punctuation 변환

원치 않는 문장/태그 손실 가능성이 있어 기본 방식으로 사용하지 않는다.

### 2. 원문/표현/copy를 분리

lossless mode adapter와 명시 변환 command, 실제 clipboard 기준 경고를 제공한다.

### 3. 길이 hard limit/Extend 원문 삭제

사용자의 advisory·메타데이터 보관 의도에 반하므로 제외한다.

## 권장 선택과 이유

두 번째 안을 권장한다. ASCII . 분할의 lossless span, 첫 colon subtag, Extend의 Suno용 전체 copy 제외, 1000/3000 초과 비차단 경고를 적용한다.

## 영향받는 작업·화면·schema·운영

기존 PROD-0003/0008·NF-REQ-022~027·CRDT/serializer/template/revision/export·웹/native golden fixture.

## 자동·수동 검증 기준

mode roundtrip·구두점/emoji/분해한글·1000/3000 경계·Extend 원문/clipboard 차이·IME/undo/다중탭 검증.

## 되돌림 또는 대체 비용

원문은 그대로 남아 이전 UI로 돌아갈 수 있어야 한다. 새 mode를 구버전이 손실 저장할 위험은 capability로 차단한다.

## 범위 밖과 관련 결정

이 문서 생성은 구현/배포 또는 과거 결정의 자동 폐기 승인이 아니다. 원문/기존 사용자·이력·major1 정책을 보존한다. 기존 ADR/PROD/OPS의 해당 범위만 새 Accepted 기록으로 대체한다.

- [세부 계약](../../0.Plans/2.Patch-phase/contracts/EDITOR-COPY.md)
- [결정 권한과 소비 시점](../../0.Plans/2.Patch-phase/Decision-Ownership.md)
- [요구 추적](../../0.Plans/2.Patch-phase/Requirements-Traceability.md)
- [버전 정책](../../0.Plans/2.Patch-phase/VERSIONING.md)

## 승인 기록 규칙

승인 시 선택 대안·승인자·시각·정확한 적용 범위·미해결 위험·추가 테스트를 기록한다. 계획 승인과 코드/운영 배포 승인은 별개다. 대체 시 새 ID와 사유를 연결하고 기존 Accepted 원문을 덮어쓰지 않는다.
