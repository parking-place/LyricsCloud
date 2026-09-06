# LyricsCloud 결정 권한과 기록 위치

이 문서는 기술 아키텍처, 제품 동작, 출시·운영 정책을 서로 다른 결정 계열로 관리하기 위한 색인입니다. 계획표에 항목이 있다는 사실만으로 결정이 승인된 것은 아니며, 아래의 **결정 Phase**에서 대안·영향·검증 기준을 기록하고 승인 상태를 남겨야 합니다.

## 결정 계열

| 계열 | 다루는 범위 | 기록 위치 | 승인 전 처리 |
|---|---|---|---|
| `ADR-*` | 프로세스 경계, 인증, DB, 동기화, PWA, 백업처럼 여러 버전에 영향을 주고 교체 비용이 큰 기술 선택 | [`docs/adr`](../../docs/adr/README.md) | 특정 제품·서비스를 코드나 manifest에 고정하지 않는다. |
| `PROD-*` | 사용자가 보게 되는 동작, 자료 관계, 탐색·복사·삭제 의미와 UI 정책 | 이 문서와 해당 결정 Phase의 산출물 | 가장 이른 소비 Phase 전에 확정하고 목업·테스트 기대값에 연결한다. |
| `OPS-*` | RC 동결, 성능 예산, artifact 서명, 최종 승인과 운영 인수 | 이 문서와 해당 운영 Phase의 산출물·runbook | 미래 운영 정책을 초기 ADR의 선행조건으로 가정하지 않는다. |

`Implementation-Stack.md`의 체크된 `DEC-*`는 사용자가 선택한 구현 방향입니다. `ADR-*`는 그 방향을 실행 가능한 기술 계약으로 구체화하며, `PROD-*` 또는 `OPS-*`를 대신 승인하지 않습니다.

## 상태와 변경 규칙

- 상태는 `Proposed`, `Accepted`, `Superseded`를 사용한다.
- 결정 표의 `결정 Phase`가 최초 기록과 승인 책임을 가진다. `소비·재검증 Phase`는 승인된 결정을 구현하거나 다시 검증하되 의미를 조용히 바꾸지 않는다.
- 결정 전에는 후보와 임시 해석을 명시할 수 있지만, 이를 확정 구현이나 완료 조건의 근거로 사용하지 않는다.
- 변경 시 기존 ID를 재사용하거나 내용을 덮어쓰지 않는다. 대체 결정과 이유, 영향받는 작업 ID·schema·테스트·목업을 연결하고 이전 결정을 `Superseded`로 남긴다.
- 기술과 제품 의미가 함께 바뀌면 ADR과 PROD 결정을 각각 기록하고 서로 링크한다. 배포·복원·승인 책임까지 바뀌면 OPS 결정도 별도로 갱신한다.

## 아키텍처 결정

아래 아키텍처 결정은 모두 [`0.0.0 Phase 2`](./0.0.0/2phase.md)에서 제안·비교·승인합니다. 상세 기록의 단일 위치는 [`docs/adr`](../../docs/adr/README.md)입니다.

| ID | 결정 대상 | 기준 선택 | 주요 소비 시점 |
|---|---|---|---|
| `ADR-0001` | 자체 운영 애플리케이션 토폴로지와 workspace | DEC-01-D, DEC-10-C | 0.0.0 Phase 3~4 |
| `ADR-0002` | Google OIDC, 세션, 초대·허용 목록 | DEC-02-A, DEC-09-A | 0.1.0 |
| `ADR-0003` | PostgreSQL 접근, migration, 소유권·RLS | 사용자별 자료 격리 | 0.1.0 이후 모든 데이터 Phase |
| `ADR-0004` | 자동 병합의 사용자 범위와 CRDT 문서 의미 | DEC-02-A, DEC-06-C | 0.3.0~0.3.1 |
| `ADR-0005` | CRDT transport·영속화·평문 투영·snapshot | DEC-03-A, DEC-04-A, DEC-06-C, DEC-07-A | 0.3.0~0.3.1 |
| `ADR-0006` | 프록시, TLS, WebSocket 전달, 운영 지역 | DEC-10-C | 0.0.0 Phase 4, 0.9.1 |
| `ADR-0007` | PWA와 계정별 로컬 저장·업데이트 | DEC-04-A | 0.3.1, 0.9.0 |
| `ADR-0008` | 백업 암호화·보관·복원 환경 | DEC-12-A | 0.9.1 |
| `ADR-0009` | 오류·성능 관측과 창작물 본문 제거 | DEC-11-A | 0.9.1 |

## 제품 결정

| ID | 결정 대상 | 결정 Phase | 소비·재검증 Phase | 현재 상태 |
|---|---|---|---|---|
| `PROD-0001` | 모바일 주 탐색과 `더보기` 진입·복귀 방식 | [0.1.0 Phase 1](./0.1.0/1phase.md) | [0.1.0 Phase 4](./0.1.0/4phase.md), 0.9.0 | `Proposed` |
| [`PROD-0002`](../../docs/product/PROD-0002-song-resource-links.md) | 곡-라임·프롬프트 관계의 cardinality, 중복과 연결 해제 의미 | [0.2.0 Phase 1](./0.2.0/1phase.md) | [0.6.0 Phase 2](./0.6.0/2phase.md) | `Accepted` |
| [`PROD-0003`](../../docs/product/PROD-0003-songform.md) | 송폼 문법, 인식 실패와 단일·다중 구간 복사 의미 | [0.3.0 Phase 1](./0.3.0/1phase.md) | [Phase 3](./0.3.0/3phase.md), [Phase 4](./0.3.0/4phase.md) | `Accepted` |
| [`PROD-0004`](../../docs/product/PROD-0004-lyric-versions.md) | 이름 있는 가사 resource와 복구용 revision의 구분 | [0.3.0 Phase 1](./0.3.0/1phase.md) | [0.3.1 Phase 4](./0.3.1/4phase.md) | `Accepted` |
| `PROD-0005` | 빠른 아이디어의 자료 유형과 새 가사의 부모 곡 선택 방식 | [0.6.0 Phase 4](./0.6.0/4phase.md) | [0.0.0 Phase 1](./0.0.0/1phase.md)에 쟁점 등록, [0.6.0 Phase 5](./0.6.0/5phase.md)에서 검증 | `Proposed` |
| [`PROD-0006`](../../docs/product/PROD-0006-rhyme-lyric-insertion.md) | 라임 삽입 대상, 선택 영역, target 없음과 복사 대안 | [0.4.0 Phase 4](./0.4.0/4phase.md) | [0.6.0 Phase 4](./0.6.0/4phase.md) | `Accepted` |
| `PROD-0007` | 최근 작업의 의미, 정렬 기준, 마지막 cursor·송폼 복원 | [0.7.0 Phase 3](./0.7.0/3phase.md) | [0.7.0 Phase 5](./0.7.0/5phase.md) | `Proposed` |
| `PROD-0008` | 템플릿 적용 시 덮어쓰기·추가·취소와 기존 내용 보호 | [0.8.0 Phase 1](./0.8.0/1phase.md) | 0.8.0 Phase 5, 0.9.0 | `Proposed` |
| `PROD-0009` | 단축키 조합, 실행 문맥, 운영체제별 키 표기 | [0.8.0 Phase 3](./0.8.0/3phase.md) | 0.8.0 Phase 5, 0.9.0 | `Proposed` |
| [`PROD-0010`](../../docs/product/PROD-0010-soft-delete-restore.md) | soft delete, cascade, 연결 자료와 복원 후 관계의 의미 | [0.2.0 Phase 1](./0.2.0/1phase.md) | [0.8.0 Phase 4](./0.8.0/4phase.md) | `Accepted` |

허용 글꼴 목록, 글쓰기 표시값의 범위와 자산 제공 방식처럼 한 화면군에 국한된 세부 UI 정책은 [`0.8.0 Phase 2`](./0.8.0/2phase.md)의 작업·검증 산출물로 기록합니다. 다른 기능군이나 배포 구조까지 영향을 넓힐 때에만 새 `PROD-*` 또는 ADR로 승격합니다.

## 운영 결정

| ID | 결정 대상 | 결정 Phase | 소비·재검증 Phase | 초기 상태 |
|---|---|---|---|---|
| `OPS-0001` | RC 브랜치, 허용 변경, 태그 발행과 승인 절차 | [0.9.1 Phase 1](./0.9.1/1phase.md) | [1.0.0 Phase 5](./1.0.0/5phase.md) | `Proposed` |
| `OPS-0002` | image registry, 서명, provenance와 digest 승인 목록 | [0.9.1 Phase 5](./0.9.1/5phase.md) | [1.0.0 Phase 2](./1.0.0/2phase.md) | `Proposed` |
| `OPS-0003` | 기준 서버·DB 규모, 동시 작업 수와 성능 budget | [0.9.1 Phase 3](./0.9.1/3phase.md) | 0.9.1 Phase 4~5, 1.0.0 | `Proposed` |
| `OPS-0004` | 최종 gate 승인자, 예외 불가 조건과 운영 인수 책임 | [1.0.0 Phase 1](./1.0.0/1phase.md) | [1.0.0 Phase 5](./1.0.0/5phase.md) | `Proposed` |

## 결정 기록 최소 형식

각 결정 산출물에는 다음 내용을 남깁니다.

```text
ID와 상태:
결정 Phase와 승인자:
해결할 질문과 범위 밖 항목:
검토한 대안:
선택과 이유:
영향받는 작업 ID·화면·schema·운영 절차:
자동·수동 검증 기준:
되돌림 또는 대체 비용:
관련 ADR/PROD/OPS:
```

## Phase 진입 시 확인

1. 현재 Phase가 소비하는 ID가 이 색인에 있는지 확인한다.
2. 결정 Phase가 지났다면 `Accepted` 기록과 검증 기준을 확인한다.
3. 아직 결정 Phase가 아니라면 미래 정책을 선행조건으로 만들지 않고 쟁점만 인계한다.
4. 구현 중 의미 변경이 필요하면 현재 작업을 확장하기 전에 결정 소유자와 영향 범위를 갱신한다.
