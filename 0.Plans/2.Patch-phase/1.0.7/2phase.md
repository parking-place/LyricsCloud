# 1.0.7 Phase 2 — 핵심 기반·저장과 서버

- 상태: **완료** (`complete`, 2026-09-11)
- 단계 목적: 목록 보기 선택·밀도 설정의 핵심 기반·저장과 서버을 완료하고 다음 단계에 검증 가능한 입력을 전달한다.
- 문서 작성과 구현/배포 완료는 별개다.

> 구현 담당자는 승인된 범위에서 실패 재현→최소 구현→관련 회귀→검토 가능한 commit을 수행한다. 로컬 Codex의 기존 수정·초안·운영 데이터를 덮어쓰지 않는다.

## 목표

곡·라임 노트·프롬프트 목록에서 리스트와 소·중·대 그리드를 선택하고 개인별로 기억한다. 이번 Phase는 아래 작업 체크리스트의 책임만 가진다.

## 선행조건

- [1.0.7 P1](1phase.md)의 산출물·검증/승인과 실제 최종 SHA 인수.
- 현재 실행 STATUS·Agent/AGENTS·수정 파일 담당자 충돌 확인.
- [품질 게이트](../QUALITY-GATES.md)의 격리 환경·지원 런타임·필수 물리 기기 확보.

## 기준 링크

[버전 목표·수용 사례](README.md) · [세부 계약](../contracts/LIBRARY-SUNO.md) · [요구사항](../Requirements-Traceability.md) · [결정 권한](../Decision-Ownership.md) · [버전 규칙](../VERSIONING.md) · [릴리스 규칙](../RELEASE-POLICY.md)

## 포함 범위

`NF-REQ-029`. 아래 작업에서 다루는 현재 패치의 범위만 수행한다. 여러 버전에 걸친 요구는 이 패치의 부분 범위를 검증한 것으로 기록한다.

## 제외 범위

다른 패치의 기능·사용자가 선택하지 않은 Future 아이디어·승인 없는 기술 교체·운영 변경은 제외한다.

## 수정 책임 경로와 인터페이스

- `apps/web/src/components`
- `packages/domain/src`
- `packages/database/src`
- `apps/web/src/lib`

경로는 책임 영역이다. 신규 제안 표시는 아직 생성된 파일이 아니며 실제 이름·runner·package export는 P1 인수에서 확정한다. 디렉터리 전체를 리팩터링하라는 권한이 아니다. **입력**은 선행 계약·source SHA·fixture·권한 문맥이고 **출력**은 현 단계의 코드/설계·실행 증거·후속 호환 계약이다.

## 작업 체크리스트

- [x] `LC-NF-1.0.7-P2-01` `tests/new-feature/1.0.7.contract.test.ts`와 runner include를 추가하고 미구현 함수로 3건 실패를 확인한 뒤 구현 후 PASS했다.
- [x] `LC-NF-1.0.7-P2-02` 별도 `library_view_settings`에 owner+유형별 mode/default/row version을 저장하고 인증 GET/PUT을 구현했다.
- [x] `LC-NF-1.0.7-P2-03` 보기 CAS를 `user_settings`와 분리하고 실제 PostgreSQL 및 공개 API에서 글꼴 동시 저장과 stale 409를 확인했다.
- [x] `LC-NF-1.0.7-P2-04` `withLibraryViewMode`가 item/query identity와 cursor/선택/scroll을 유지하고 mode만 바꾸는 단위 fixture를 통과했다.
- [x] `LC-NF-1.0.7-P2-05` P3가 mode state만 변경하고 기존 자료 ID key/배열을 그대로 소비할 수 있는 불변 contract를 고정했다. 실제 목록 UI 재마운트 검증은 P3/P4 책임으로 남겼다.
- [x] `LC-NF-1.0.7-P2-06` PostgreSQL 18에서 1001 빈 설치·반복·제약·강제 RLS·rollback 후 재적용과 owner/CAS integration을 통과했다.

## 구체적 검증

| 수용 ID | 입력·상황 | 기대 결과 |
|---|---|---|
| `AC-1.0.7-01` | 검색·필터·현재 페이지 상태에서 보기 4종 전환 | 같은 자료 집합과 순서를 유지한다. |
| `AC-1.0.7-02` | 계정 A는 리스트, B는 큰 그리드 | 계정 전환으로 A의 설정이 B에 새지 않는다. |
| `AC-1.0.7-03` | 320px·200% 확대·긴 한글 제목 | 액션과 내용이 겹치지 않고 키보드 이동이 가능하다. |
| `AC-1.0.7-04` | 다른 탭이 글꼴 설정 갱신 중 밀도 저장 | 무관한 글꼴 설정을 되돌리지 않는다. |

P1은 위 기대 결과와 실제 구현 가능 경계를 승인하는 단계다. P2/P3은 관련 재현·수정과 사용자 흐름을 실행하며, P4에서 전체 교차 검증하고 P5에서 실제 결과를 인수한다. 표가 있다는 이유로 테스트 완료로 처리하지 않는다.

## 실행·증거 기록

[공통 명령·검증](../QUALITY-GATES.md)을 먼저 읽는다. 기존 runner의 영향받은 검사를 우선 사용하고 필요할 때만 회귀를 보강한다. 지원 환경에서 관련 DB/E2E를 선택하며 동일 변경의 full suite는 로컬/CI 중 한 곳과 필수 게이트만 따른다. native은 승인된 SDK/플랫폼 명령을 기록한다. 없는 도구·실제 IME·물리 기기 검증을 모사 결과로 통과시켰다고 표시하지 않는다. 문서-only Phase는 링크·범위·결정·설계 검토로 별도 인수한다.

## 완료 조건

- [x] 작업 ID마다 코드·실행 증거와 후보 SHA `b37f3101551fc2147698aa064f7bd3bd831bbf64`가 [P2 인수 기록](../../../docs/runbooks/1.0.7-phase2-library-view-store.md)에 연결되어 있다.
- [x] 자료 원문 불변·owner/RLS·CAS 복구·400/403/409 오류를 정상 저장과 함께 검증했다.
- [x] 미실행 목록 UI/browser/실기기 검증과 중간 CI `[skip ci]`를 숨김없이 기록했다.
- [x] 현재 상태/담당/변경 파일·관련 문서가 실제 수행 내용과 일치한다.
- [x] 로컬/DB 검증, 원격 branch/PR, 후보와 동일 SHA 개발 migration·공개 API 인수를 갖췄다. 최종 P2 문서 SHA 인수는 이 commit push 후 갱신한다.
- [x] P2에서 main·Release·릴리스 서버를 변경하지 않았다.

## 산출물

- 1.0.7 P2의 검토 가능한 변경/계약과 수용 사례 증거.
- 변경 파일·추가 migration·실행 명령/환경·결과·미실행/잔여 위험의 인수 기록.
- 후속 소비자가 유지할 API·데이터·copy·권한·UI 상태 계약.

## 다음 Phase 인계

[1.0.7 P3](3phase.md)에 입력·실행 결과·호환 및 중단 조건을 넘긴다. 다음 단계의 승인이 없거나 선행 증거가 부족하면 자동 진행하지 않는다. 문서 작성으로 runtime version을 바꾸지 않는다.

P3는 공통 mode selector/client hook을 만들어 songs/rhymes/prompts의 기존 item ID key와 query/load-more 상태를 유지한 채 class만 전환한다. 저장 실패 rollback·409 최신값 재조회·양 테마·PC/mobile 접근성을 browser에서 확인한다.
