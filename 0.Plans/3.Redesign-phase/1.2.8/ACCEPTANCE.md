# 1.2.8 수용 기준 — 구조 정리·품질 자동화·검증 공백 해소

**계획 기준이며 아래 항목의 실행 결과는 모두 미확인이다.** 테스트 이름/명령은 실제 착수 시 현행 manifest와 대조해 정한다. 존재하지 않는 script가 이미 있다고 가정하지 않는다.

[버전 계획](README.md) · [공통 gate](../QUALITY-GATES.md) · [추적표](../REVIEW-TRACEABILITY.md)

| 수용 ID | 대상 | 통과 기준 | 상태 |
|---|---|---|---|
| `AC-RD-128-01` | 정적 의미 검사 | 기존 boundaries 검사 이름/보장 범위를 정확히 표시한다. 미처리 Promise·hook dependency·접근성·금지 레이어 import의 합성 위반 fixture가 해당 검사에서 실패하고 정상 예제가 통과한다. 전역 포맷 변경으로 범위를 키우지 않는다. | planned / 미실행 |
| `AC-RD-128-02` | 행동 보존 구조화 | transport/권한/보관 전이를 분리한 뒤 같은 Yjs update·epoch·raw·projection·복구 결과가 유지된다. 스타일 분리는 320/390/768/1440 양 테마·keyboard/zoom/fallback에서 기능과 대비를 보존한다. | planned / 미실행 |
| `AC-RD-128-03` | 경계 회귀 | 태그 동시 이동·IME remote queue·quota failure·bootstrap·stale 변환·늦은 pagination을 UI→editor→server/DB 경계로 검증한다. 선행 버전 검사를 중복 작성하지 않고 빠진 경계만 보강한다. | planned / 미실행 |
| `AC-RD-128-04` | CI·공급망 | 빠른 unit/contract/static과 최종 mandatory 검사를 구별하고 같은 SHA의 성공 증거를 재사용한다. skip/cancel은 PASS가 아니며 action SHA/digest 갱신은 정책·권한·호환 검증과 연결한다. | planned / 미실행 |
| `AC-RD-128-05` | 버전·발행 | 1.1.7a 제품/1.1.7.a 폴더/1.1.7 package의 승인된 예외와 다자리 patch/phase·3.Redesign 경로를 회귀로 유지한다. metadata 단일 생성/검증 경로 도입이 과거 tag/migration을 재작성하지 않는다. | planned / 미실행 |
| `AC-RD-128-06` | 검증 공백 | 실제 OS IME·AT·물리 모바일·전체 현재 E2E·장기 network partition·백업 복원·운영 부하/최신 보안 검사별 담당/환경/판정/잔여를 기록한다. 미실행을 통과로 바꾸지 않고 필요한 gate는 출시 전에 닫는다. | planned / 미실행 |

## 판정과 증거

각 항목마다 `source SHA / 시험 계층 / 환경 / 합성 fixture / 실행 명령 / 실패 전 결과 / 수정 뒤 결과 / 증거 위치 / 남은 실기기·외부 gate / 담당`을 기록한다. REPRODUCED나 재현 스크립트 exit 0은 결함 발생 증거이며 수정 PASS가 아니다.

실제 구현은 정상·빈·오류·권한 없음·offline·모바일 중 영향받는 상태를 포함한다. 단위 fixture, 실제 HTTP/DB, 브라우저, 물리 OS/AT, 공개 개발 smoke를 서로 대체하지 않는다. 개인정보 없는 합성 입력을 사용하며 비공개 원문 로그는 공개 계획에 복사하지 않는다.

## 중단·되돌림 기준

파일 분리와 도구 변경을 독립 commit으로 되돌릴 수 있게 한다. lint/CI 통과를 위해 기존 검사를 제거·완화하거나 필수 job을 skip하지 않는다. 새로운 pool·ORM·CRDT·관측 서비스 교체를 리팩터링 명목으로 포함하지 않으며 metadata rollback은 현재 발행 이력을 보존한다.

원문 유실·거짓 저장·권한 확대·복구 불가가 확인되면 release blocker로 남긴다. 미실행 필수 검사를 PASS로 바꾸거나 후속 버전에 배정해 완료시키지 않는다. 실제 Phase 완료 절차는 공통 gate와 Agent.md를 함께 따른다.

## 비교 브랜치 추가 인수

아래 항목도 구현 완료 기준에 포함하며 현재는 모두 계획/미실행이다. 원격 PASS를 새 통합 SHA에 자동 승계하지 않는다.

- **[WC-12 — Service Worker 다중 build·명시 업데이트](../BRANCH-COMPARISON-118-P4.md)**: 1.2.0 P1/P4에서 먼저 보존 gate로 인수한다. 구 탭 lazy chunk·unknown client/worker restart·탭별 승인·offline activation·private/no-store/Set-Cookie 배제·중복 fetch를 검사한다. 1.2.1 guard가 reload를 소비한다.

- **[WC-18 — 엄격한 release tag gate·build 설정](../BRANCH-COMPARISON-118-P4.md)**: annotated release gate와 fileURLToPath 의도를 검토하되 windows-native needs/assertion·1.1.8 build ID와 분리한다. native 재개 없이 같은 정책 의미를 유지하고 1.2.0 P1 metadata/6 Phase 지원을 재사용한다.
