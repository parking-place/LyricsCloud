# 1.2.3 수용 기준 — 인증·세션·API 재시도 계약

> 2026-09-23 순서 개정: [1.1.7b 통합](../1.1.7.b/README.md)과 1.2.0 인수가 선행한다. WC 후보의 최초 포팅은 b가 소유하며 이 문서의 같은 작업은 b 해결 SHA·회귀 인수와 남은 범위만 수행한다. 미완료 원격 코드를 완료로 간주하지 않는다.

**계획 기준이며 아래 항목의 실행 결과는 모두 미확인이다.** 테스트 이름/명령은 실제 착수 시 현행 manifest와 대조해 정한다. 존재하지 않는 script가 이미 있다고 가정하지 않는다.

[버전 계획](README.md) · [공통 gate](../QUALITY-GATES.md) · [추적표](../REVIEW-TRACEABILITY.md)

| 수용 ID | 대상 | 통과 기준 | 상태 |
|---|---|---|---|
| `AC-RD-123-01` | OIDC 회복 | 같은 adapter의 최초 503/timeout→정상, 연속 실패→복구가 재시작 없이 성공한다. 동시 discovery는 요청 하나를 공유하고 성공 캐시는 유지하며 오래된 실패가 새 Promise를 지우지 않는다. | planned / 미실행 |
| `AC-RD-123-02` | 세션 수명 | 합성 day24에 SSR→session API와 역순 모두 DB 만료와 Set-Cookie가 일치한다. 절대 90일 상한·logout/revoke·여러 탭·secure/nonsecure cookie를 유지하고 실제 브라우저 응답을 검사한다. | planned / 미실행 |
| `AC-RD-123-03` | 공개 링크 멱등성 | 동일 JSON POST의 시간차·동시 재시도와 응답 유실은 최초 commit의 expiry/receipt를 재사용한다. 다른 payload/같은 ID는 충돌하며 회수·만료·명시 회전을 구별한다. digest-only로 URL 복원이 불가하면 url:null과 복구 행동을 명시한다. | planned / 미실행 |
| `AC-RD-123-04` | 제목 계약 | ASCII/한글 200자, emoji 100/101/200개, 결합문자·혼합 문자열과 일괄삭제 100건에서 생성 가능한 제목의 삭제 확인이 같은 단위를 따른다. 정확히 다른 확인값·타 owner는 계속 거부한다. | planned / 미실행 |
| `AC-RD-123-05` | 오류 분류 | 누락/만료/위조 cookie, 권한 부족, DB 실패, 입력 충돌을 실제 endpoint에서 구별한다. AuthError mapper 누락 가능성은 재현 전 확정 결함으로 세지 않으며 cache/referrer/CSRF 보호를 유지한다. | planned / 미실행 |

## 판정과 증거

각 항목마다 `source SHA / 시험 계층 / 환경 / 합성 fixture / 실행 명령 / 실패 전 결과 / 수정 뒤 결과 / 증거 위치 / 남은 실기기·외부 gate / 담당`을 기록한다. REPRODUCED나 재현 스크립트 exit 0은 결함 발생 증거이며 수정 PASS가 아니다.

실제 구현은 정상·빈·오류·권한 없음·offline·모바일 중 영향받는 상태를 포함한다. 단위 fixture, 실제 HTTP/DB, 브라우저, 물리 OS/AT, 공개 개발 smoke를 서로 대체하지 않는다. 개인정보 없는 합성 입력을 사용하며 비공개 원문 로그는 공개 계획에 복사하지 않는다.

## 중단·되돌림 기준

기존 receipt/hash·세션/쿠키 형식의 읽기 호환을 유지한다. replay를 위해 token 원문을 저장하거나 자동 회전하지 않는다. 캐시 무효화를 되돌릴 때 실패 고착을 재도입하지 않으며 세션 연장 경로가 사라지는 후보는 배포하지 않는다.

원문 유실·거짓 저장·권한 확대·복구 불가가 확인되면 release blocker로 남긴다. 미실행 필수 검사를 PASS로 바꾸거나 후속 버전에 배정해 완료시키지 않는다. 실제 Phase 완료 절차는 공통 gate와 Agent.md를 함께 따른다.

## 비교 브랜치 추가 인수

아래 항목도 구현 완료 기준에 포함하며 현재는 모두 계획/미실행이다. 원격 PASS를 새 통합 SHA에 자동 승계하지 않는다.

- **[WC-13 — OAuth/DB 잠금 뒤 만료·beta index key 방어](../BRANCH-COMPARISON-118-P4.md)**: provider 왕복과 intent/code/identity lock 뒤 live clock을 확인해 만료 시 session/grant/code 소비가 남지 않는지 시험한다. 다른 kid와 동일 kid bytes 변경의 운영 제약·tombstone을 유지하고 BE-01/02와 구별한다.
