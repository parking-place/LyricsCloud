# OPS-0004 — 최종 release gate 승인과 운영 인수

- ID와 상태: `OPS-0004`, **Accepted**
- 결정 Phase: 1.0.0 Phase 1
- 판정 시각: 2026-09-08 20:01 KST
- 관련 작업: `LC-100-P1-01`~`LC-100-P1-09`

## 역할과 권한

| 역할 | 책임과 승인 범위 |
|---|---|
| Evidence author / gate reviewer | Codex가 추적표·자동/수동 검증·CI·digest·개발 배포 증거를 대조하고 기술 gate PASS/FAIL을 기록한다. |
| Security/Data reviewer | 0.9.1 보안·소유권·migration·backup 결과에서 P0/P1과 예외가 없는지 검토한다. 현재는 자동 gate와 Codex 증거 검토가 이 역할을 수행한다. |
| Repository owner / final approver | 사용자가 `v1.0.0`, GitHub Release, `Release`·`latest` image 발행을 명시적으로 승인한다. |
| Operations acceptance owner | 사용자가 release server의 backup 준비, 배포, smoke, rollback 관찰과 최종 운영 인수를 승인한다. |

기술 gate의 Accepted 상태는 release server 변경 권한이 아니다. 현재 요청은 1.0.0 준비 작업을 계속할 권한이며, 정식 tag·GitHub Release·`main`·release server 변경은 해당 작업 직전에 사용자의 명시적 승인을 다시 확인한다.

## 예외 없는 차단 조건

- P0: 데이터 손실, 교차 사용자 노출, 인증 우회, 검증된 backup 복원 불가, 전체 서비스 불능
- P1: 우회 없는 핵심 흐름 실패, 무음 저장 충돌, 주요 모바일 불능, 삭제 또는 내보내기 오류
- source commit·서명 digest·provenance·SBOM 불일치
- migration checksum·순서 불일치, upgrade/rollback/restore 실패
- repository·image·log·관측 경로의 secret 또는 창작물 노출
- 필수 CI, 실제 iOS/Android 인수, 개발 exact-SHA 공개 smoke 미완료

P0/P1은 일정, 운영자 판단, 알려진 제한 표시만으로 하향하거나 예외 승인할 수 없다. 한 항목이라도 발생하면 gate는 자동 철회되고 마지막 검증된 개발 SHA를 유지한다. 수정 SHA에서 전체 gate를 처음부터 다시 실행한다.

## P2/P3 인수 규칙

P2/P3는 사용자 영향, 재현 조건, 안전한 우회 또는 제한된 topology, 책임자와 후속 목표 버전을 모두 기록한 경우에만 repository owner가 인수할 수 있다. 재현 결과가 P0/P1 정의와 겹치거나 승인 topology가 바뀌면 즉시 상향 재분류한다. 현재 인수 후보는 [`1.0.0 최종 추적표`](../architecture/1.0.0-FINAL-TRACEABILITY.md)의 세 항목뿐이다.

## Gate 판정표

| 항목 | 판정 | 증거 |
|---|---|---|
| 71개 출시 요구사항 | PASS | 최종 추적표의 71개 고유 ID와 canonical 구현·검증 링크 |
| 15개 목업·8개 제안 source | PASS | `UI-01`~`UI-15`, 8개 제안 처분, 공란·제외 0 |
| P0/P1 | PASS | 미해결 각 0건, GitHub open issue 0건 |
| 보안·성능·관측 | PASS | 0.9.1 Phase 2~4 보고서와 CI |
| backup·restore·upgrade·rollback | PASS | 0.9.1 Phase 5 보고서와 CI `34217076397` |
| 실제 기기 | PASS | 사용자 제공 `iOS update PASS, Android update PASS` |
| artifact·개발 환경 | PASS | exact SHA `4cdecf0ca7cd6900882376f41a49d360c1b9e441`, 서명 image와 공개 smoke |

Phase 1 기술 gate는 위 입력에 대해 PASS다. 다음 Phase는 이 RC 입력과 본 Phase의 최종 검증 SHA를 변경 불가 입력으로 사용한다. 정식 release와 운영 인수는 위 final approver의 별도 명시적 승인 전까지 대기한다.

## 검토한 대안과 철회

- Codex가 정식 release까지 자동 승인: 사용자 소유 인프라와 공개 tag를 변경하므로 제외했다.
- P1을 알려진 제한으로 공개: 핵심 흐름·데이터 신뢰를 훼손하므로 제외했다.
- 이동식 tag만 승인: source와 artifact를 불변으로 묶지 못해 제외했다.

철회 비용은 새 Phase commit에서 전체 CI·서명 image·개발 exact-SHA smoke를 다시 수행하는 것이다. 이미 발행된 RC tag는 이동하지 않는다. 관련 결정은 `OPS-0001`, `OPS-0002`, `OPS-0003`, `ADR-0001`~`ADR-0009`다.
