# 후속 기능 계획 상태

> 2026-09-22 후속 추가: **1.2.0 → [1.2.1~1.2.8](../3.Redesign-phase/ROADMAP.md)**. [0922 추적](../3.Redesign-phase/REVIEW-TRACEABILITY.md)과 [1.1.8 P4 웹 안정화 비교](../3.Redesign-phase/BRANCH-COMPARISON-118-P4.md)를 반영한 계획이며 제품 미착수·native 보류는 유지한다.

```yaml
plan_state: "on_hold_from_1.1.8"
plan_owner: "Codex"
prepared_at: "2026-09-09"
updated_at: "2026-09-22"
planning_root: "0.Plans/2.Patch-phase"
execution_authorized_by_this_file: false
runtime_status_source: "0.Plans/1. Dev-phase/STATUS.md"
next_planned_version: "1.2.0"
next_planned_phase: "../3.Redesign-phase/1.2.0/1phase.md"
next_planning_root: "0.Plans/3.Redesign-phase"
deferred_versions: "1.1.8 through 1.1.14"
prerequisite: "v1.1.7a 기준 및 기존 기능/데이터/작업 경계 인수; 보류 플랫폼 버전 완료를 요구하지 않음"
execution_authorized_by_user_request: false
release_server_authorized_after_all_phases: false
```

## 단일 상태 원본

현재 실행 상태 원본은 [개발 STATUS](<../1. Dev-phase/STATUS.md>)이며 1.1.7a의 기존 완료 기록을 유지한다. 다음 계획은 [1.2.0 리디자인](../3.Redesign-phase/1.2.0/README.md)이다. 이 파일은 제품 구현 착수/배포를 승인하지 않는다.

[보류 결정](../3.Redesign-phase/PLAN-CHANGE.md)에 따라 1.1.8의 남은 작업과 1.1.9~1.1.14를 진행하지 않는다. 원래 계획·작업 ID·체크 상태·별도 개발선의 선행 인수는 보존한다. 기존 승인 기록은 당시 작업 범위에 남으며, 2026-09-22의 계획 배정 요청을 새로운 실행/운영 승인으로 확대하지 않는다.

## 이전 문서 패키지 담당 이력 (2026-09-09)

| 담당 | 범위 | 인계 |
|---|---|---|
| 부모 | 원본/백업·기술 출처·Git/PR·현재 코드 인수 | 원본 193파일 ZIP 해시 일치, 삭제는 재승인에도 자동 정책 거부되어 보존/commit 제외. P6 동일 tree·병합 CI 단일 성능 실패·실제 OS/공개 인수 잔여 유지 |
| astra_worker | 문서 단일 작성자, 사용자 지정 Astra xhigh | 2.Patch-phase 이동·1.0.1 10 Phase·후속 필수 보강·전역 Future 검수. commit/push/앱 구현 없음 |

[로드맵](ROADMAP.md) · [최신 요구 대응](../../docs/planning/latest-requirements-mapping.md) · [인계 증거](CODEX-HANDOFF.md) · [릴리스 정책](RELEASE-POLICY.md)
