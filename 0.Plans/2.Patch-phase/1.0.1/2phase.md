# 1.0.1 Phase 2 — 긴급 관리자 베타코드 CLI·영속 상태

상태: **완료**. P1의 승인된 베타 코드·grant·receipt 계약과 환경 격리 기준을 구현했고, 후보 `0dcbd643fe045048ebee000093904e63d25ae1aa`의 원격 push·동일 SHA 개발 서버 인수를 완료했다.

## 목표와 경계

LyricsCloud betacode -n 7이 실제 서버 관리자 shell에서 정확히 7개의 영숫자 6자 코드를 commit 후 표시한다. 0·음수·소수·비숫자·대량 상한 초과는 비0 종료하고 부분 발급을 남기지 않는다.

담당 경로: 관리 CLI·auth/DB 코드 상태·설치 경로. 정확한 파일·명령은 착수 당시 소스로 확정한다. 다른 Phase 기능·후속 선택 아이디어·승인 없는 운영 변경은 포함하지 않는다.

## 선행조건·입출력

- [P1](1phase.md)의 산출물·해당 구현 인수, 소비할 ADR/PROD/OPS와 파일 소유권을 확인한다.
- 입력은 정확한 SHA·계약·합성 fixture·실제 환경과 잔여 결함이다. 출력은 아래 작업의 산출물과 수용 증거·실패 복구·다음 담당자의 경계다.
- [베타 계약](../contracts/BETA-ACCESS.md), [버전 정책](../VERSIONING.md), [릴리스 정책](../RELEASE-POLICY.md), [품질 게이트](../QUALITY-GATES.md)를 소비한다.
- P2는 P1의 승인된 코드/운영 계약을 즉시 소비한다. P3/P4 전에는 신규 가입을 열지 않으며 CLI 인수를 UI·로고 최종 승인까지 기다리게 하지 않는다.

## 작업 체크리스트

- [x] `LC-NF-1.0.1-P2-01` 베타코드 상태·가입 intent·접근 grant·소비 영수증을 추가 migration으로 구현한다. 앱 계정 상태와 접근 grant를 분리하고 blocked/withdrawn 계정의 재가입 우회를 차단한다.
- [x] `LC-NF-1.0.1-P2-02` 호스트에서 LyricsCloud betacode -n 7을 실행하면 CSPRNG 기반 A-Z0-9 6자리 7개가 생성되게 한다. 중복은 DB 유일 제약과 제한 재시도로 처리하고 used/revoked 코드는 재발급하지 않는다.
- [x] `LC-NF-1.0.1-P2-03` LyricsCloud betacode ls는 관리자에게 현재 사용 가능한 코드를 보여준다. 미사용 코드만 인증 암호화로 복구하고 웹 런타임에는 복호화 키·관리 권한을 주지 않는다.
- [x] `LC-NF-1.0.1-P2-04` LyricsCloud betacode refresh는 확인된 환경의 미사용·가입 대기 코드를 원자적으로 폐기한다. 기존 가입 grant·사용 이력·사용자 데이터는 변경하지 않는다.
- [x] `LC-NF-1.0.1-P2-05` 일괄 발급·조회·refresh에 최소 권한·출력 비밀성·시간 제한을 연결하고, P4 가입 엔드포인트가 소비할 재시작 영속 실패 budget을 schema로 준비한다. CLI 설치 wrapper와 컨테이너 실행 경로를 함께 문서화한다.

## 구체적 수용 기준

1. LyricsCloud betacode -n 7이 실제 서버 관리자 shell에서 정확히 7개의 영숫자 6자 코드를 commit 후 표시한다. 0·음수·소수·비숫자·대량 상한 초과는 비0 종료하고 부분 발급을 남기지 않는다.
2. ls는 미사용·미폐기·미만료만 확인한다. refresh와 소비의 DB 경쟁은 먼저 commit한 순서를 따른다. refresh 뒤 기존 grant·소비 기록은 유지된다.
3. 충돌 재시도 한도·동시 발급·출력 실패 후 ls 복구를 확인한다. P4 전에는 앱 가입이 제공된 것으로 안내하지 않는다.

## 검증과 완료 조건

- [x] 영향받은 실제 트리거와 결과를 기존 검사 중심으로 검증하고 명령·환경·SHA·미실행을 기록했다. 동일 입력/환경의 성공 증거를 재사용한다.
- [x] 원문·권한·기존 사용자·복구 불변조건과 위 수용 기준에 실제 증거가 있다.
- [x] 구현 Phase의 필수 CI·동일 SHA 개발 배포·공개 smoke와 상태 기록을 인수했다. P2 중간 push의 원격 전체 CI는 실행하지 않았고 P10 최종 후보 필수 CI로 유지했다.
- [x] [FUTURE-INTAKE](../FUTURE-INTAKE.md)에 따라 저장소 전역 Future 변경을 push 전 및 Phase 완료 때 한 번 대조하고 동일 변경은 재처리하지 않았다.
- [x] 실제 OS/기기·Google 설정·백업·외부 승인 잔여를 숨기지 않았으며 main/release 서버 변경을 별도 현재 승인 없이 실행하지 않았다.

## 다음 Phase 인계

[P3](3phase.md)에 변경 파일·migration·계약·수용 증거·잔여 항목을 넘긴다. 전체 10 Phase 인수 뒤에만 Private Beta release를 판단한다. 기존 task 재배정은 [변경 이력](../../../docs/planning/plan-revision-2026-09-09.md)에 남긴다.
