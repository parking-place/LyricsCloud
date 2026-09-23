# 1.2.7 수용 기준 — 공유·복구·계정 사용자 경험

> 2026-09-23 순서 개정: [1.1.7b 통합](../1.1.7.b/README.md)과 1.2.0 인수가 선행한다. WC 후보의 최초 포팅은 b가 소유하며 이 문서의 같은 작업은 b 해결 SHA·회귀 인수와 남은 범위만 수행한다. 미완료 원격 코드를 완료로 간주하지 않는다.

**계획 기준이며 아래 항목의 실행 결과는 모두 미확인이다.** 테스트 이름/명령은 실제 착수 시 현행 manifest와 대조해 정한다. 존재하지 않는 script가 이미 있다고 가정하지 않는다.

[버전 계획](README.md) · [공통 gate](../QUALITY-GATES.md) · [추적표](../REVIEW-TRACEABILITY.md)

| 수용 ID | 대상 | 통과 기준 | 상태 |
|---|---|---|---|
| `AC-RD-127-01` | 로그인·프로필 | 신규 초대 가입/기존 로그인·실패 복귀를 구별하고 returnTo·작성물 보호를 유지한다. 프로필 저장된 값/미저장 값·이름 성공+사진 실패·충돌·Google 복귀·표시 설정 저장/취소가 실제 결과와 일치한다. | planned / 미실행 |
| `AC-RD-127-02` | 공유 권한 | owner/selected reader/writer/public guest에서 보이는 필드와 가능한 동작을 설명한다. 두 계정이 수신자 코드 획득→grant→별도 링크 전달→문서 열기를 완료하며, 가사가 없는 수신자와 잘못된 코드도 검사하고 계정 존재 정보를 누설하지 않는다. 발급·복사 실패·url:null replay·명시 회전·만료/회수는 구별되고 잘못된 사람에게 쓰기 권한을 부여하지 않는다. | planned / 미실행 |
| `AC-RD-127-03` | 공유 첫 입력·종료 | 준비/쓰기 가능/읽기 전용/권한 종료 상태가 실제 readiness/epoch와 일치한다. guest tab 종료·session/link 만료 때 보관 한계와 authoredText 복구를 안내하며 private snapshot을 노출하지 않는다. | planned / 미실행 |
| `AC-RD-127-04` | 복구·휴지통 | 수정 기록·local recovery·휴지통·infra backup을 다른 복구 수단으로 구별한다. restore/delete mutation 성공 뒤 목록 refresh만 실패하면 완료 사실을 유지하고 같은 파괴 작업 재시도를 유도하지 않는다. | planned / 미실행 |
| `AC-RD-127-05` | 내보내기·탈퇴 | 서버 ZIP과 아직 전송하지 않은 기기 초안의 포함 범위를 구별하고 원문 export와 프로필 사진 포함 범위를 실제 계약대로 안내한다. 다운로드 시작을 실제 파일 저장 확인으로 표시하지 않는다. 탈퇴 시 즉시 이용 중지와 예약된 영구삭제를 구별한다. 탈퇴 철회는 기한 직전/직후·재인증 만료·응답 유실로 시험하고 기존 기간/정책을 바꾸지 않는다. export 준비/실패·권한 회수·삭제/탈퇴의 영향과 확인을 구별하고 제목 Unicode/owner 확인을 유지한다. 삭제 복원으로 공유 capability가 부활하지 않는다. | planned / 미실행 |

## 판정과 증거

각 항목마다 `source SHA / 시험 계층 / 환경 / 합성 fixture / 실행 명령 / 실패 전 결과 / 수정 뒤 결과 / 증거 위치 / 남은 실기기·외부 gate / 담당`을 기록한다. REPRODUCED나 재현 스크립트 exit 0은 결함 발생 증거이며 수정 PASS가 아니다.

실제 구현은 정상·빈·오류·권한 없음·offline·모바일 중 영향받는 상태를 포함한다. 단위 fixture, 실제 HTTP/DB, 브라우저, 물리 OS/AT, 공개 개발 smoke를 서로 대체하지 않는다. 개인정보 없는 합성 입력을 사용하며 비공개 원문 로그는 공개 계획에 복사하지 않는다.

## 중단·되돌림 기준

UI rollback이 권한 epoch·공개 projection·복구 namespace·프로필 provider/override를 바꾸지 않게 한다. 이미 성공한 restore/delete를 목록 갱신 실패로 다시 실행하지 않는다. 삭제·탈퇴·token 회전 같은 비가역 행동은 기존 명시 확인을 유지한다.

원문 유실·거짓 저장·권한 확대·복구 불가가 확인되면 release blocker로 남긴다. 미실행 필수 검사를 PASS로 바꾸거나 후속 버전에 배정해 완료시키지 않는다. 실제 Phase 완료 절차는 공통 gate와 Agent.md를 함께 따른다.

## 비교 브랜치 추가 인수

아래 항목도 구현 완료 기준에 포함하며 현재는 모두 계획/미실행이다. 원격 PASS를 새 통합 SHA에 자동 승계하지 않는다.

- **[WC-15 — guest 회수 뒤 서버 상태·authoredText 분리](../BRANCH-COMPARISON-118-P4.md)**: 회수/epoch-stale 시 서버 수용 body/cache로 복귀하고 작성 원문만 복구함에 둔다. 재연결·재허용 뒤 거절 입력 자동 재생이 없으며 ES-06 실패 보관과 충돌하지 않는지 실제 WS/DB로 인수한다.

- **[WC-16 — export v1 검증·휴지통 결과·삭제 영향](../BRANCH-COMPARISON-118-P4.md)**: 과거 v1 사진 필드 부재·새 Suno/photo 참조·owner 격리와 실제 export→validator를 검사한다. mutation 성공/refresh 실패를 분리하고 deletion batch 복원 수와 전체 cascade 자식 수를 구별한다. BE-04는 별도다.
