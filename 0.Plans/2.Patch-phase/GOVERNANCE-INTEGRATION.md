# 프로젝트 규정과 후속 계획 연결

사용자의 최신 명시 지침은 Agent/AGENTS에 현재 반영한다. 2.Patch-phase·major1 고정·기본 5 Phase와 필요 시 추가·1.0.1 10 Phase·main release-only·저장소 전역 Future 검수는 정책이다. 새 ADR/PROD/OPS의 구체 기술 선택은 Proposed이며 필수 사용자 범위와 기술 승인을 구분한다.

## 인수 순서

1. 현재 실행 STATUS·P6 담당자·실제 SHA/CI·미커밋 변경을 보존한다. 계획 작성만으로 1.0.0 P6 review를 바꾸지 않는다.
2. [로드맵](ROADMAP.md), [요구 추적](Requirements-Traceability.md), [개정 이력](../../docs/planning/plan-revision-2026-09-09.md)을 읽고 현재 Phase/파일 소유권을 확인한다.
3. [Future 검수](FUTURE-INTAKE.md)를 모든 push 전과 Phase 완료 때 사용한다. 출처·경로·commit/blob·FF-ID·배정/보류·이전 처리 참조를 한 곳에 누적한다.
4. 1.0.1 P1 실제 착수는 선행 P6 인수와 사용자 범위에 따른다. 단 하나의 실행 STATUS를 유지하며 후속 계획 STATUS는 실행 원본이 아니다.
5. 1.0.1 P3/P4의 해시/가입 및 P8의 release-phase-state·다자리/가변 Phase·발행 tag 정책은 실제 구현/검증 후 현재 안내에 반영한다. 현재 평문 동작·1.0.0 P5/P6 전제를 감추지 않는다.
6. 과거 승인/발행/배포/마이그레이션 이력과 보호된 원본 기획은 소급 수정하지 않는다. 현재 운영 문서는 실제 지원과 미완료 gate를 구분한다.

[Agent.md](../../Agent.md)가 협업 역할·원격 완료·서버 권한 규칙의 단일 진입점이다. 현재 문서 작성자는 하나이며 P1 실제 구현 이후만 독립 작업의 지정 astra_worker/luna_runner 위임을 판단한다. 원본/백업 삭제 거부는 [부모 인계](CODEX-HANDOFF.md)에 기록하며 우회하지 않는다.
