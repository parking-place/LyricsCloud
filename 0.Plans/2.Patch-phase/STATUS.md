# 후속 기능 계획 상태

```yaml
plan_state: "active"
plan_owner: "Codex"
prepared_at: "2026-09-09"
reference_sha: "7448f47b0dbbc51ab3bcda13876b63ef72c102d2"
planning_root: "0.Plans/2.Patch-phase"
execution_authorized_by_this_file: false
runtime_status_source: "0.Plans/1. Dev-phase/STATUS.md"
next_planned_version: "1.0.1"
next_planned_phase: "1.0.1/2phase.md"
prerequisite: "P1 사용자 재현·최초 손실 경계·베타/가입/릴리스 계약 인수 완료"
execution_authorized_by_user_request: true
release_server_authorized_after_all_phases: true
```

## 단일 상태 원본

현재 실행 상태는 `0.Plans/1. Dev-phase/STATUS.md`의 1.0.1 P2다. P1에서 P6 실제 후보와 잔여 결함, 사용자 Windows 입력 손실·공개 UI 테마 화면을 인수하고 승인된 계약을 확정했다. 이 문서는 계획 상태만 관리하며 실행 상태 원본은 계속 기존 STATUS 한 곳이다.

## 담당 경계

| 담당 | 범위 | 인계 |
|---|---|---|
| 부모 | 원본/백업·기술 출처·Git/PR·현재 코드 인수 | 원본 193파일 ZIP 해시 일치, 삭제는 재승인에도 자동 정책 거부되어 보존/commit 제외. P6 동일 tree·병합 CI 단일 성능 실패·실제 OS/공개 인수 잔여 유지 |
| astra_worker | 문서 단일 작성자, 사용자 지정 Astra xhigh | 2.Patch-phase 이동·1.0.1 10 Phase·후속 필수 보강·전역 Future 검수. commit/push/앱 구현 없음 |

[로드맵](ROADMAP.md) · [최신 요구 대응](../../docs/planning/latest-requirements-mapping.md) · [인계 증거](CODEX-HANDOFF.md) · [릴리스 정책](RELEASE-POLICY.md)
