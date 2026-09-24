# 리디자인 계획 상태

```yaml
plan_state: "in_progress"
plan_owner: "Codex"
prepared_at: "2026-09-22"
updated_at: "2026-09-25"
planned_sequence: "1.1.7b -> 1.2.0 -> 1.2.1 through 1.2.8"
planning_root: "0.Plans/3.Redesign-phase"
baseline_version: "1.1.7a"
baseline_sha: "fc2463cdb47d9fd7d0042779f602c6ddb7d734cf"
next_planned_version: "1.2.0"
next_planned_phase: "1.2.0/5phase.md"
selected_design: "Chroma Dock / Cobalt Blue (color study 04)"
deferred_patch_versions: "1.1.8 through 1.1.14"
implementation_state: "1.2.0 P1-P4 complete; P5 in_progress"
execution_authorized_by_this_file: false
runtime_status_source: "0.Plans/1. Dev-phase/STATUS.md"
```

1.1.7b 통합 5 Phase는 [실행 STATUS](<../1. Dev-phase/STATUS.md>)의 기능 SHA `acd2bd9`로 개발 인수 완료다. 1.2.0 P1 계약·버전 전환은 `84761ae`, P2 코발트 셸/홈/목록은 `f4c9588`, P3 편집·자료·공유/복구 화면은 `a315c07`, P4 교차 회귀·접근성·성능은 `c380a59`의 CI·네 signed image·동일 SHA 개발 공개 인수로 완료됐다. P5 최종 인수는 미착수다. 사용자 선택인 코발트 디자인과 native 보류는 유지한다. 다음 표의 진행 표시는 제품 완료 증거가 아니다.

| Phase | 계획 | 구현 상태 | 완료 증거 |
|---|---|---|---|
| P1 | [기준·기능 보존·전환 계약](1.2.0/1phase.md) | complete | SHA `84761ae`·Actions `36004281225`/`36004313192`·동일 SHA 공개 개발 인수 |
| P2 | [색상 토큰·공통 셸·탐색과 목록](1.2.0/2phase.md) | complete | SHA `f4c9588`·Actions `36025310880`/`36025367395`·같은 SHA 공개 PC/mobile Chroma 인수 |
| P3 | [편집·자료·설정·공유와 복구](1.2.0/3phase.md) | complete | SHA `a315c07`·Actions `36047345436`/`36047351494`·같은 SHA 공개 UTC/서울 52화면 인수 |
| P4 | [교차 회귀·접근성·성능](1.2.0/4phase.md) | complete | SHA `c380a59`·Actions `36063583481`/`36063586810`·같은 SHA 공개 20회 빠른 전환 인수; 실기기 미실행 |
| P5 | [문서·최종 통합·개발 인수](1.2.0/5phase.md) | in_progress | 필수 CI·동일 SHA 개발 인수 대기 |

목업 자체의 실행 검증은 [목업 안내](1.2.0/mockup/README.md)에 기록한다. 위 제품 Phase의 완료 증거와 구분한다. 보류 재개와 이전 작업 보존 기준은 [전환 결정](PLAN-CHANGE.md)을 따른다.

## 2026-09-22 후속 계획 추가

사용자는 0922 리뷰 기반 1.2.1 이후 버전 계획과 새 1.1.8 P4 웹 안정화 브랜치 비교를 요청했다. 아래는 **계획 배정 완료 / 구현 미착수**이며 당시 next_planned_version은 1.2.0이었다. 2026-09-23부터는 b 선행 통합 뒤 이 순서로 이어진다. 계획 상세·순서는 [로드맵](ROADMAP.md), 차이와 재사용 후보는 [브랜치 비교](BRANCH-COMPARISON-118-P4.md), 검증은 [후속 계획 검증](POST120-VERIFICATION.md)에 있다.

| 버전 | 결과 | Phase / 작업 | 구현 상태 |
|---|---|---:|---|
| [1.2.1](1.2.1/README.md) | 입력 보관·저장 상태·공통 이탈 | 5 / 25 | planned / 미착수 |
| [1.2.2](1.2.2/README.md) | prompt 동시 편집·IME·태그 무결성 | 6 / 30 | planned / 미착수 |
| [1.2.3](1.2.3/README.md) | 인증·세션·API 재시도 | 5 / 25 | planned / 미착수 |
| [1.2.4](1.2.4/README.md) | 백업·프록시·운영 복구/관측 | 5 / 25 | planned / 미착수 |
| [1.2.5](1.2.5/README.md) | 목록·검색·템플릿 비동기 안정성 | 5 / 25 | planned / 미착수 |
| [1.2.6](1.2.6/README.md) | 작성·탐색·모바일 UX | 5 / 25 | planned / 미착수 |
| [1.2.7](1.2.7/README.md) | 공유·복구·계정 UX | 5 / 25 | planned / 미착수 |
| [1.2.8](1.2.8/README.md) | 구조·품질 자동화·검증 공백 | 5 / 25 | planned / 미착수 |

계획 정의는 총 8버전·41 Phase·205작업이다. 문서 검증과 원격 후보의 CI를 제품 구현 완료로 세지 않는다. b/1.2.0 선해결은 새 후보 SHA의 수용 근거로만 인수하며, 보류 native를 자동 재개하지 않는다.
