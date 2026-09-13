# 1.1.4 Phase 2 — 핵심 기반·저장과 서버

- 상태: **완료** (`complete`, 후보 `3de111fdaf4f0b79d02b51d311b0c7293e02b67f`)
- 단계 목적: 공유 안정성·복구 동선 정리의 핵심 기반·저장과 서버을 완료하고 다음 단계에 검증 가능한 입력을 전달한다.
- 문서 작성과 구현/배포 완료는 별개다.

> 구현 담당자는 승인된 범위에서 실패 재현→최소 구현→관련 회귀→검토 가능한 commit을 수행한다. 로컬 Codex의 기존 수정·초안·운영 데이터를 덮어쓰지 않는다.

## 목표

이미 제공한 읽기·쓰기 공유를 실제 장시간/다중 기기 상황에서 검증하고 경계 결함과 복구 동선을 보완한다. 이번 Phase는 아래 작업 체크리스트의 책임만 가진다.

## 선행조건

- [1.1.4 P1](1phase.md)의 산출물·검증/승인과 실제 최종 SHA 인수.
- 현재 실행 STATUS·Agent/AGENTS·수정 파일 담당자 충돌 확인.
- [품질 게이트](../QUALITY-GATES.md)의 격리 환경·지원 런타임·필수 물리 기기 확보.

## 기준 링크

[버전 목표·수용 사례](README.md) · [세부 계약](../contracts/STABILIZATION.md) · [요구사항](../Requirements-Traceability.md) · [결정 권한](../Decision-Ownership.md) · [버전 규칙](../VERSIONING.md) · [릴리스 규칙](../RELEASE-POLICY.md)

## 포함 범위

`NF-REQ-034`, `NF-REQ-035`, `NF-REQ-036`. 아래 작업에서 다루는 현재 패치의 범위만 수행한다. 여러 버전에 걸친 요구는 이 패치의 부분 범위를 검증한 것으로 기록한다.

## 제외 범위

문서/검증만 발생하면 별도 소프트웨어 발행 없이 기록한다.

## 수정 책임 경로와 인터페이스

- `packages/editor/src`
- `apps/collaboration/src`
- `packages/database/src`
- `apps/web/src/components`
- `tests/e2e`

경로는 책임 영역이다. 신규 제안 표시는 아직 생성된 파일이 아니며 실제 이름·runner·package export는 P1 인수에서 확정한다. 디렉터리 전체를 리팩터링하라는 권한이 아니다. **입력**은 선행 계약·source SHA·fixture·권한 문맥이고 **출력**은 현 단계의 코드/설계·실행 증거·후속 호환 계약이다.

## 작업 체크리스트

- [x] `LC-NF-1.1.4-P2-01` 구현 전 `1.1.4` 수용 사례의 실패 테스트를 작성한다. 제안 위치는 `tests/new-feature/1.1.4.contract.test.ts`이며 runner 포함 여부를 확인한 뒤 실패 이유를 기록한다. — queue helper 부재 3건과 실제 DB의 delete 후 selected/public capability 잔존 2건을 실패로 확인
- [x] `LC-NF-1.1.4-P2-02` 다중 actor update/receipt/revision/권한 epoch 경계에서 재현한 문제만 수정한다. — 같은 capability/epoch끼리만 outbox를 lossless compact하고 in-flight update는 보호, 복원 중 같은 epoch의 writer 원문 병합 회귀 추가
- [x] `LC-NF-1.1.4-P2-03` worker projection 재처리·삭제 자료·검색/export 가용성을 owner별로 대조한다. — 전체 실제 DB suite의 projection recovery·resource lifecycle·search·export 회귀 PASS
- [x] `LC-NF-1.1.4-P2-04` bounded queue·연결 수·메모리·응답 p95를 측정하고 출력 동등성을 유지하는 병목만 줄인다. — outbox/IME remote queue 64건 또는 1 MiB 상한, Yjs 출력 동등성 단위 회귀와 S1 640→1 update microbenchmark p95 6.683 ms·peak 32.41 MiB
- [x] `LC-NF-1.1.4-P2-05` 기존 계정 로그아웃/탈퇴·beta grant 회수와 resource capability의 정책을 회귀한다. — 기존 auth/lifecycle/sharing 전체 회귀 PASS, 삭제 전환에서 selected/public capability를 모두 revoke하고 두 epoch를 증가시켜 trash 복원 뒤 부활 차단
- [x] `LC-NF-1.1.4-P2-06` 추가 schema가 있으면 실제 테스트 DB의 빈 설치·이전 schema 업그레이드·권한·되돌림을 검사한다. 원인 수정 후 동일 실패 테스트와 기존 관련 회귀를 다시 실행한다. — `1140_sharing_stability.sql` 반복 적용·검증·rollback/reapply와 1100~1130 recovery PASS

## 구체적 검증

| 수용 ID | 입력·상황 | 기대 결과 |
|---|---|---|
| `AC-1.1.4-01` | 기기 절전·네트워크 전환·서버 재시작 반복 | 원문·권한·영수증이 수렴하고 대기 queue가 무한 증가하지 않는다. |
| `AC-1.1.4-02` | owner가 복원 중 offline writer 재접속 | 승인된 복원/병합 정책과 서로의 원문 보존을 확인한다. |
| `AC-1.1.4-03` | 권한 회수 후 다른 계정 로그인 | 이전 actor의 자료·초안이 다음 계정에 노출되지 않는다. |
| `AC-1.1.4-04` | 가속 소크만 실행한 경우 | 실제 장시간·실기기 검증을 통과했다고 기록하지 않는다. |

P1은 위 기대 결과와 실제 구현 가능 경계를 승인하는 단계다. P2/P3은 관련 재현·수정과 사용자 흐름을 실행하며, P4에서 전체 교차 검증하고 P5에서 실제 결과를 인수한다. 표가 있다는 이유로 테스트 완료로 처리하지 않는다.

## 실행·증거 기록

[공통 명령·검증](../QUALITY-GATES.md)을 먼저 읽는다. 기존 runner의 영향받은 검사를 우선 사용하고 필요할 때만 회귀를 보강한다. 지원 환경에서 관련 DB/E2E를 선택하며 동일 변경의 full suite는 로컬/CI 중 한 곳과 필수 게이트만 따른다. native은 승인된 SDK/플랫폼 명령을 기록한다. 없는 도구·실제 IME·물리 기기 검증을 모사 결과로 통과시켰다고 표시하지 않는다. 문서-only Phase는 링크·범위·결정·설계 검토로 별도 인수한다.

- Node 24 + 실제 PostgreSQL 격리 DB `pnpm test`: PASS — 93 files, 364 tests; beta 외부 fixture 4건은 계약대로 skip.
- Node 24 `pnpm build`: PASS — production Next.js와 workspace build.
- `revisions.integration.test.ts` 5회 반복: PASS — CRDT 동시 삽입의 합법적 위치 차이를 허용하되 복원 대상과 writer 원문 보존, 폐기 owner 본문 부재를 모두 판정한다.
- `test:migration:1140` 및 1100·1110·1120·1130 recovery: PASS — 실제 DB 반복 적용, 삭제 fence 권한, rollback 뒤 재적용.
- S1 가속 microbenchmark: 30 rounds, 640 input updates → 1 update, output equivalent, p95 6.683 ms, heap peak 32.41 MiB. 실제 장시간·브라우저 memory·물리 기기 성능 증거로 승격하지 않는다.
- 남은 gate: 후보 원격 전체 CI, 네 dev image, 같은 SHA의 개발 서버 migration/health와 공개 기능 smoke. 실제 장시간·절전·물리 기기/IME는 P4/P5까지 미실행으로 유지한다.
- GitHub Actions `34778131953`: PASS — 전체 verify와 web·collaboration·worker·migrate 개발 image 발행·서명. 각 서비스의 40자리 SHA tag와 `dev-1.1.4-p2` tag digest가 일치한다.
- 개발 서버 후보 `3de111fdaf4f0b79d02b51d311b0c7293e02b67f`: PASS — checkout·runtime build id 동일, version `1.1.4`, channel `dev`, phase `p2`, schema `1140_sharing_stability.sql`, 네 서비스 healthy.
- 공개 개발 smoke: PASS — selected/public 삭제 fence, 두 epoch 증가, trash 복원 뒤 old capability 비부활, owner 본문 복원. 합성 계정·자료는 제거했다.
- 실제 장시간 절전·물리 기기/OS IME는 실행하지 않았고 P4/P5의 별도 증거로 남긴다. S1 가속 측정을 실제 duration 또는 실기기 PASS로 승격하지 않는다.

## 완료 조건

- [x] 작업 ID마다 코드/설계·실행/검토 증거·정확한 SHA가 연결되어 있다.
- [x] 현재 패치의 원문·권한·복구·오류 처리가 정상 동작과 함께 로컬 검증되었다.
- [x] 미실행·남은 결함·외부 차단·보류한 기술 결정이 숨김없이 기록되었다.
- [x] 현재 상태/담당/변경 파일·관련 문서가 실제 수행 내용과 일치한다.
- [x] 구현 Phase는 CI·동일 SHA 개발 인수를 갖췄다.
- [x] main·Release·운영 변경은 수행하지 않았다.

## 산출물

- 1.1.4 P2의 검토 가능한 변경/계약과 수용 사례 증거.
- 변경 파일·추가 migration·실행 명령/환경·결과·미실행/잔여 위험의 인수 기록.
- 후속 소비자가 유지할 API·데이터·copy·권한·UI 상태 계약.

## 다음 Phase 인계

[1.1.4 P3](3phase.md)에 입력·실행 결과·호환 및 중단 조건을 넘긴다. 다음 단계의 승인이 없거나 선행 증거가 부족하면 자동 진행하지 않는다. 문서 작성으로 runtime version을 바꾸지 않는다.
