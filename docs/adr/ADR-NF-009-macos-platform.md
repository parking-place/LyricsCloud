# ADR-NF-009 — macOS 기술·패키징·수명주기

- 상태: **Proposed**
- 작성일: 2026-09-09
- 최초 결정/소비: 1.1.13 P1~P3
- 승인자/시각: 미승인. 기술·표시 대안과 실제 검증 근거를 해당 Phase에서 기록한다.

## 질문·대안·결정 gate

macOS SDK/toolkit·편집기 재사용·OAuth·보호 저장소·Yjs protocol·배포/업데이트 후보를 비교한다. 실제 OS IME/협업/사전/폰트 검증과 PC/iOS/Android 목업 및 사용자 선택을 거친 후에만 조건부 구현한다. 플랫폼 추가만으로 minor/major를 올리지 않는다.

## 영향과 수용

[세부 계약](../../0.Plans/2.Patch-phase/contracts/DESIGN-NATIVE.md)의 언어/OS/권한·실패 사례와 [요구 추적](../../0.Plans/2.Patch-phase/Requirements-Traceability.md)을 소비한다. 기존 저장 형식·계정 소유자·원문·copy를 보존하고 실제 지원 여부와 합성 검증을 구분한다. 필요한 파일과 정확한 도구 버전은 착수 소스로 확인한다.

## 되돌림·미실행

신규 표시/제공 기능을 중단해도 기존 창작물을 보존한다. 기술 전환은 호환/rollback을 검증한 뒤 적용한다. SDK/외부 서비스·권리·실제 OS/기기·배포 승인이 없으면 해당 결과를 미완료로 남긴다. 새 문서가 기존 Accepted 결정을 자동 대체하지 않으며 원문 이력은 보존한다.

[결정 색인](../../0.Plans/2.Patch-phase/Decision-Ownership.md)에서 승인자·시각·선택·대안·근거·영향받는 Phase·보류 이유를 연결한다.
