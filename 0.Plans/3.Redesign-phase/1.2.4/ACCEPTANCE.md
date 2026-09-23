# 1.2.4 수용 기준 — 백업·프록시·운영 복구와 관측

> 2026-09-23 순서 개정: [1.1.7b 통합](../1.1.7.b/README.md)과 1.2.0 인수가 선행한다. WC 후보의 최초 포팅은 b가 소유하며 이 문서의 같은 작업은 b 해결 SHA·회귀 인수와 남은 범위만 수행한다. 미완료 원격 코드를 완료로 간주하지 않는다.

**계획 기준이며 아래 항목의 실행 결과는 모두 미확인이다.** 테스트 이름/명령은 실제 착수 시 현행 manifest와 대조해 정한다. 존재하지 않는 script가 이미 있다고 가정하지 않는다.

[버전 계획](README.md) · [공통 gate](../QUALITY-GATES.md) · [추적표](../REVIEW-TRACEABILITY.md)

| 수용 ID | 대상 | 통과 기준 | 상태 |
|---|---|---|---|
| `AC-RD-124-01` | 백업 잠금 | 정상 완료·검증 오류·TERM·KILL·재부팅 후 후속 실행이 가능하고 같은 저장소의 정상 동시 실행은 배제된다. incomplete archive 정리와 completed manifest를 보존하며 실제 암호화→격리 복원까지 별도로 검사한다. | planned / 미실행 |
| `AC-RD-124-02` | 신뢰 경계 | 직접/프록시/CDN/복수 프록시별 신뢰 계약을 고정하고 cf/x-real/xff 위조로 bucket key가 바뀌지 않음을 실제 프록시에서 검사한다. 정상 client가 전부 unknown-client로 합쳐지지 않으며 owner/RLS 우회라고 과장하지 않는다. | planned / 미실행 |
| `AC-RD-124-03` | 업로드 상한 | 프로필 경로에서 2 MiB 파일+정한 multipart 여유를 허용하고 일반 API 상한은 유지한다. 경계 아래/동일/초과, PNG/JPEG/WebP, MIME 위장·과도한 pixel을 프록시와 앱에서 각각 검사한다. | planned / 미실행 |
| `AC-RD-124-04` | worker 건강 | DB ping 정상이어도 purge 실패/지연/backlog age가 관측된다. 무한 작업 중첩·락 대기·SIGTERM drain·안전 재시도와 마지막 성공 시각을 확인한다. | planned / 미실행 |
| `AC-RD-124-05` | DB·health 예산 | web store별 pool×process + collaboration/worker/migration 연결 예산과 health 빈도/비용을 측정한다. 필요할 때만 작은 pool/짧은 cache를 도입하며 장애/schema 탐지 지연·RLS A→B 연결 재사용·shutdown을 검증한다. | planned / 미실행 |

## 판정과 증거

각 항목마다 `source SHA / 시험 계층 / 환경 / 합성 fixture / 실행 명령 / 실패 전 결과 / 수정 뒤 결과 / 증거 위치 / 남은 실기기·외부 gate / 담당`을 기록한다. REPRODUCED나 재현 스크립트 exit 0은 결함 발생 증거이며 수정 PASS가 아니다.

실제 구현은 정상·빈·오류·권한 없음·offline·모바일 중 영향받는 상태를 포함한다. 단위 fixture, 실제 HTTP/DB, 브라우저, 물리 OS/AT, 공개 개발 smoke를 서로 대체하지 않는다. 개인정보 없는 합성 입력을 사용하며 비공개 원문 로그는 공개 계획에 복사하지 않는다.

## 중단·되돌림 기준

백업 잠금을 단순 시간 경과로 삭제하지 않는다. 잠금 구현과 파일시스템 보장을 검증하고 rollback 때 진행 중 백업의 소유권을 침범하지 않는다. 프록시 변경은 승인된 개발 환경에서 검증 후 적용하며 실패 시 직전 검증 설정으로 복구한다. 기존 archive·DB volume·외부 백업 예외는 그대로 보존한다.

원문 유실·거짓 저장·권한 확대·복구 불가가 확인되면 release blocker로 남긴다. 미실행 필수 검사를 PASS로 바꾸거나 후속 버전에 배정해 완료시키지 않는다. 실제 Phase 완료 절차는 공통 gate와 Agent.md를 함께 따른다.

## 비교 브랜치 추가 인수

아래 항목도 구현 완료 기준에 포함하며 현재는 모두 계획/미실행이다. 원격 PASS를 새 통합 SHA에 자동 승계하지 않는다.

- **[WC-14 — 협업 projection 재시도 공정성](../BRANCH-COMPARISON-118-P4.md)**: 지속 실패 20개 뒤 정상 문서가 굶지 않는 keyset/wrap·trash 제외·timer 재진입 방지·Y.Doc cleanup·timestamp/오류 marker 보존을 검사한다. worker purge M-04 완료와 구별한다.

- **[WC-17 — 환경 값·allowlist 날짜 도구](../BRANCH-COMPARISON-118-P4.md)**: 제공된 optional env의 안전 정수/공백·backup 값과 offset deadline의 ISO UTC 정규화를 인수한다. import-safe main guard/test를 함께 가져오며 실제 secret/keyring을 복사하거나 회전하지 않는다.

## 잠금·프록시 전환의 추가 조건

구·신 잠금 구현이 동시에 동작해 상호 배제가 깨지지 않도록 스케줄/스크립트 전환을 통제한다. proxy가 쓰는 정규화 헤더와 app이 읽는 헤더는 함께 인수하고, 설정만 되돌려 spoofing이나 모든 client의 unknown 합류를 재도입하지 않는다. purge 관측/timeout 변경으로 기존 삭제·보존 기간 정책을 변경하지 않는다.
