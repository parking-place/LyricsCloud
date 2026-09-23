# 1.2.1 수용 기준 — 입력 보관·저장 상태·공통 이탈 보호

> 2026-09-23 순서 개정: [1.1.7b 통합](../1.1.7.b/README.md)과 1.2.0 인수가 선행한다. WC 후보의 최초 포팅은 b가 소유하며 이 문서의 같은 작업은 b 해결 SHA·회귀 인수와 남은 범위만 수행한다. 미완료 원격 코드를 완료로 간주하지 않는다.

**계획 기준이며 아래 항목의 실행 결과는 모두 미확인이다.** 테스트 이름/명령은 실제 착수 시 현행 manifest와 대조해 정한다. 존재하지 않는 script가 이미 있다고 가정하지 않는다.

[버전 계획](README.md) · [공통 gate](../QUALITY-GATES.md) · [추적표](../REVIEW-TRACEABILITY.md)

| 수용 ID | 대상 | 통과 기준 | 상태 |
|---|---|---|---|
| `AC-RD-121-01` | 저장 사실 | selected와 guest 각각 IDB open/transaction/abort/quota 실패를 주입하고 후속 입력·연속 실패·재시도를 거친다. 실패 뒤 outbox가 0이어도 저장 완료/live로 덮지 않으며, 휘발성 원문 복사·다운로드와 복구 후 서버 재조회 값이 정확히 일치한다. | planned / 미실행 |
| `AC-RD-121-02` | 초기 준비 | 빈 캐시+느린 bootstrap, 초기 실패→retry, API 완료 후 socket 지연에서 화면 editable과 transaction 수용 시점이 일치한다. snapshot과 handler 설치 전 입력은 준비 상태로 안내하며 안전한 cached offline 편집은 유지한다. | planned / 미실행 |
| `AC-RD-121-03` | 이탈 보호 | 닉네임·사진·표시 설정·라임 제목/태그·프롬프트 본문·새 문서·빠른 추가에 대해 로고/rail/tab/mobile/back/reload/PWA/logout을 대조한다. 취소하면 원문·selection·focus·사진 미리보기가 유지된다. | planned / 미실행 |
| `AC-RD-121-04` | 권한·수명 | 실패 중 write 회수·link 만료·계정 전환·과거 epoch ACK를 검사한다. 다른 계정/guest session으로 초안이 섞이거나 회수된 private snapshot이 재전송되지 않으며 authoredText만 허용 범위로 복구된다. | planned / 미실행 |
| `AC-RD-121-05` | 모달 오류 | 빠른 추가 실패 후 오류·재시도·복사가 모달 안에서 키보드로 도달 가능하고 읽기 순서에 포함된다. 원문 재입력 없이 재시도하며 닫기 취소와 성공 후 focus 복귀가 동작한다. | planned / 미실행 |

## 판정과 증거

각 항목마다 `source SHA / 시험 계층 / 환경 / 합성 fixture / 실행 명령 / 실패 전 결과 / 수정 뒤 결과 / 증거 위치 / 남은 실기기·외부 gate / 담당`을 기록한다. REPRODUCED나 재현 스크립트 exit 0은 결함 발생 증거이며 수정 PASS가 아니다.

실제 구현은 정상·빈·오류·권한 없음·offline·모바일 중 영향받는 상태를 포함한다. 단위 fixture, 실제 HTTP/DB, 브라우저, 물리 OS/AT, 공개 개발 smoke를 서로 대체하지 않는다. 개인정보 없는 합성 입력을 사용하며 비공개 원문 로그는 공개 계획에 복사하지 않는다.

## 중단·되돌림 기준

화면 어댑터는 단계적으로 되돌릴 수 있게 하되 오류를 무시하던 저장 판정으로 복귀하지 않는다. 저장소 포맷을 바꾸면 구버전 읽기·재처리 조건을 먼저 정하고 outbox·거절 초안을 삭제하지 않는다. 원문 유실이나 거짓 saved가 재현되면 출시를 중단하고 읽기/복사 복구를 우선한다.

원문 유실·거짓 저장·권한 확대·복구 불가가 확인되면 release blocker로 남긴다. 미실행 필수 검사를 PASS로 바꾸거나 후속 버전에 배정해 완료시키지 않는다. 실제 Phase 완료 절차는 공통 gate와 Agent.md를 함께 따른다.

## 비교 브랜치 추가 인수

아래 항목도 구현 완료 기준에 포함하며 현재는 모두 계획/미실행이다. 원격 PASS를 새 통합 SHA에 자동 승계하지 않는다.

- **[WC-01 — metadata 초안·늦은 ACK·계정별 복구](../BRANCH-COMPARISON-118-P4.md)**: owner/kind/document/revision별 보관, offline 닫기→재진입·명시 복원·quota·계정 전환·다른 탭 revision/새 입력을 늦은 ACK가 지우지 않는지 확인한다.

- **[WC-03 — guarded client navigation·shortcut](../BRANCH-COMPARISON-118-P4.md)**: 동일 URL no-op·modified click·editor veto를 유지하며 await 뒤 pending 상태를 재확인한다. profile/PWA·back/reload와 page-local 링크까지 누락 경계를 마무리한다.

- **[WC-04 — 전역·가사 표시 설정 저장 응답 경쟁](../BRANCH-COMPARISON-118-P4.md)**: 제출 snapshot만 ACK하고 대기 중 새 draft/default/theme preview를 유지한다. reset conflict retry는 DELETE 의미와 최신 rowVersion을 보존한다.

- **[WC-05 — Suno 수동 workspace 초안·생성 재시도](../BRANCH-COMPARISON-118-P4.md)**: owner namespace·legacy key 정리·동기 in-flight lock·응답 뒤 계속 입력 보존·ACK된 생성의 edit 전환을 한 묶음으로 검사한다. 자동 metadata 수집은 포함하지 않는다.
