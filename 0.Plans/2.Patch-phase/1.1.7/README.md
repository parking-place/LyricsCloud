# 1.1.7 — 디자인 적용 후 UI/UX 동선 검토·개선

상태: **P1~P3 완료 / P4 로컬 후보 검증 완료**. P3 후보 `740b1e3`에서 exact 목록→대시보드→가사→공유→Suno 새 탭→복귀와 접힌 desktop rail의 접근성 이름·40px target·focus tooltip을 구현했고 두 Actions·네 signed dev image와 동일 SHA 공개 인수를 마쳤다. P4는 merge `3c4d89d` 기준 reduced transparency·contrast/forced-colors fallback을 최소 추가했고 실제 PostgreSQL 380 PASS, Chromium desktop/mobile 전체 E2E 379 PASS·43 조건부 skip·0 FAIL, 5-browser 집중 8 PASS를 통과했다. 후보 CI·동일 SHA 개발 공개 인수는 아직 남아 있다. 요구 `NF-REQ-039`를 [전체 추적표](../Requirements-Traceability.md)로 연결한다.

선행: [1.1.6](../1.1.6/README.md)의 인수와 해당 결정 gate. 코드 변경 없는 개발안/외부 gate 보류는 제품 출시로 세지 않는다.

## Phase 배분

- [P1 — 실제 과제·동선 관찰](1phase.md)
- [P2 — 탐색·복귀 기반 개선](2phase.md)
- [P3 — PC·iOS·Android 상호작용](3phase.md)
- [P4 — 사용성·접근성 재검토](4phase.md)
- [P5 — 웹 인수·플랫폼 개발안 인계](5phase.md)

## 대표 수용과 범위

- `AC-1.1.7-01`: 관찰 근거와 수정할 동선·기준 화면·성공 기준이 연결된다.
- `AC-1.1.7-02`: 관찰한 실패 과제가 최소 경로에서 재현되지 않고 데이터/이동 상태가 맞는다.
- `AC-1.1.7-03`: 플랫폼별 같은 과제가 완료되고 초안/선택/권한이 보존된다.
- `AC-1.1.7-04`: 관찰 문제의 해결과 남은 한계를 비교 근거로 설명할 수 있다.
- `AC-1.1.7-05`: 승인 UI 동선이 네이티브 개발안의 입력으로 명확히 연결된다.

[세부 계약](../contracts/DESIGN-NATIVE.md) · [품질 게이트](../QUALITY-GATES.md) · [릴리스 정책](../RELEASE-POLICY.md). 다른 버전·미선택 추가 아이디어·승인 없는 운영 변경은 제외한다.
