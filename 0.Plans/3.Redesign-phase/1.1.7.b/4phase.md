# 1.1.7b Phase 4 — 통합 회귀·잔여 차단·DB 호환·되돌림

**상태: 계획 / 구현 미착수 (`planned`)**. [수용 기준](ACCEPTANCE.md) · [통합 맵](SOURCE-MAP.md) · [차단 목록](BLOCKERS.md).

## 목표·진입

b가 안전한 리디자인 출발점인지 독립 경계 시험으로 판정한다.

선행: [P3](3phase.md)의 실제 인수 SHA·실행/미실행 기록. 실제 착수 전에 실행 STATUS에 담당·시작 시각·작업 ID·source SHA·수정 경로를 등록하고 미커밋 변경과 다른 작업자의 결과를 보존한다. 현재 문서는 실제 착수나 완료 기록이 아니다.

## 작업

- [ ] `LC-RD-117B-P4-01` 원래 0922 입력과 원격 신규 회귀를 새 b SHA에서 실행해 22개 원인을 선해결/재현/미확인으로 판정한다. 원격 CI 성공이나 후보 코드 존재를 현재 PASS로 쓰지 않는다.
- [ ] `LC-RD-117B-P4-02` ES-01 raw move/move·move/remove→store ACK, ES-03 제목/조합, ES-05 volatile guard, ES-06 selected/guest quota latch·원문 복구, ES-07 빈 캐시 bootstrap의 잔여를 검증한다. 현재 재현되는 손실/거짓 저장은 최소 보정과 같은 입력 회귀로 닫고 범위가 커지면 인수를 중단한다.
- [ ] `LC-RD-117B-P4-03` BE-01 최초 discovery 실패→회복을 필수로 확인하고 BE-02 SSR/cookie, BE-03 동일 POST expiry/replay, BE-04 Unicode 삭제 확인은 실제 API 결과로 판정한다. 상태/권한/파괴 작업에 영향을 주는 잔여는 차단표에 기록하며 후속 번호만으로 면제하지 않는다.
- [ ] `LC-RD-117B-P4-04` OPS-01 KILL 뒤 잠금 회복, 실제 환경에 적용되는 OPS-02 신뢰 proxy와 UI-01/02 입력 보존을 인수 차단으로 확인한다. OPS-03 업로드 경계 등 P2도 영향·재현·후속을 명시하고 OPS-100-001 예외와 코드 결함을 분리한다. 필요한 최소 수정/검사만 b에 편입한다.
- [ ] `LC-RD-117B-P4-05` 새 웹 DB·populated 1.1.7a DB·기존 1150+1151 DB의 migration 집합/checksum·native 객체/권한·RLS·원문/사진/export를 검사한다. ready 1151만으로 동등성을 주장하지 않으며 native 1150을 down/drop/재번호화하지 않는다.
- [ ] `LC-RD-117B-P4-06` 서비스 재시작·offline 재연결·다중탭/계정 전환·권한 회수·두 build 동시 사용·unknown SW client에서 원문/outbox·cache 비공개·반영 상태를 검사한다. owner/selected/guest 수명과 과거 ACK를 구별한다.
- [ ] `LC-RD-117B-P4-07` 현행 지원 브라우저·320/390/768/1440 양 테마·200%/forced colors·reduced motion·가상 키보드/OS IME/AT·성능 예산을 영향 범위로 인수한다. 합성 browser 결과와 실제 OS/물리 기기 미실행을 구별한다.
- [ ] `LC-RD-117B-P4-08` 환경별 application rollback을 검증하고 기존 웹 a 이미지와 native 포함 PC 이미지를 구분한다. 통합된 draft/outbox를 삭제하지 않고 필요시 쓰기 중단·원문 복구를 먼저 수행하며 필수 미실행/미해결 P0/P1이면 P4를 review로 남긴다.

## 책임 경로·산출물

통합된 제품 경계의 필요한 최소 보정, tests/격리 DB/브라우저, BLOCKERS/ACCEPTANCE/통합 기록. 현재/원격 경로는 SOURCE-MAP과 실제 착수 SHA에서 확인한다. 공유 파일은 한 작성자가 담당하고 새 파일/타입을 가져올 때 호출자와 회귀 시험을 함께 검토한다.

산출물에는 작업별 원본 commit → 채택 변경 → 현재 후보 SHA를 연결하고, 변경 파일·계약·테스트 입력/결과·제외 사유·미실행·다음 담당을 기록한다. raw 로그·실제 창작물·token·서버 비밀은 공개 문서에 넣지 않는다.

## 검증·실패 조건

AC-RD-117B-19~24 및 WC별 기존 수용. 입력 손실·거짓 저장·인가 확대·복구 불가와 필수 gate 미완료는 P5/1.2.0 진입을 막는다.

실제 함수 fixture·HTTP/DB·브라우저·물리 기기/AT·공개 개발 smoke의 검증 수준을 구별한다. 원격 0375825의 성공은 선행 증거이며 새 b tree의 PASS가 아니다. 테스트는 실제 경계의 수정 전 실패 → 수정 후 성공을 확인하며, 통과를 위해 검사를 삭제하거나 완화하지 않는다.

## 완료·중단·되돌림

[Agent](../../../Agent.md)와 [품질 gate](../QUALITY-GATES.md)의 각 Phase 완료 절차를 적용한다. 필수 CI·동일 SHA 개발 인수 전에는 완료 체크를 하지 않는다. 해당 Phase의 필수 검사 미실행, 새로 도입하거나 악화한 원문 손실·거짓 저장·권한/복구 위반은 `review`로 두고 다음 Phase로 넘기지 않는다. P1에 등록한 기존 차단은 담당 수정 Phase와 인수 조건을 명시해 추적한다. 전체 잔여를 확인하는 P4/P5에서는 필수 차단이 모두 해소되어야 하며 1.2.0으로 넘기지 않는다. 중간 개발 인수가 정식 사용자 공개 승인을 뜻하지 않으며, 기존 위험의 노출을 통제할 수 없으면 앞 단계에서도 중단한다.

되돌림은 [수용표의 환경별 절차](ACCEPTANCE.md)를 따른다. native 1150 down/drop·기존 migration 재작성·초안/outbox 삭제·a 태그 이동은 금지한다. 제품 동작을 바꾸지 않은 문서 수정은 문서 검증으로 기록한다.

다음: [P5](5phase.md).
