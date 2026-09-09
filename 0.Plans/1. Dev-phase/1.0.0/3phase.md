# 1.0.0 Phase 3 — 프로덕션 배포, canary·smoke와 롤백 판정

- 상태: **완료 — production 배포·canary·공개 smoke, 원격 CI와 동일 SHA 개발 인수 통과**
- 단계 목적: 승인된 동일 산출물을 제한된 canary로 검증한 뒤 안전하게 프로덕션에 전개한다.

## 목표

배포 전 backup, migration, canary, 자동·수동 smoke, 관측 안정 구간과 rollback 기준을 따라 자체 운영 프로덕션에 1.0.0을 배포한다.

## 선행조건

- [1.0.0 Phase 2](./2phase.md)의 release manifest와 image digest가 승인되어야 한다.
- 0.9.1의 최신 암호화 backup과 별도 환경 복원 훈련이 유효해야 한다.
- 실제 지역, 외부 저장소, 관측 도구, reverse proxy는 [0.0.0 ADR 산출물](../0.0.0/)에서 확정된 구성을 사용한다.

## 기준 링크

- [기능 기획서](../../Sketch.md) — 2, 33~35, 44, 48~51절
- [구현 기술 스택](../../Implementation-Stack.md) — DEC-10-C, DEC-11-A, DEC-12-A, 배포 원칙
- [인증 목업](../../Mock-up/01-auth/README.md)
- [가사 편집 목업](../../Mock-up/05-lyrics-editor/README.md)
- [개발 상태표](../STATUS.md)
- [0.0.0 ADR 산출물](../0.0.0/)

## 포함 범위

- 배포 변경 동결·공지·책임자·rollback 판단자
- 배포 직전 암호화 논리 backup 및 복원 가능성 확인
- 봉인된 migration과 digest 기반 canary 배포
- 인증·CRUD·자동 저장·검색·휴지통·내보내기·PWA smoke
- 오류율·지연·저장 실패·DB 상태의 안정 구간 관찰
- 자동/수동 rollback 트리거와 실행

## 제외 범위

- 승인되지 않은 region/proxy/관측 공급자 변경
- 배포 중 기능·schema 즉석 수정
- canary 없이 전체 instance를 동시에 교체하는 방식

## 작업 체크리스트

- [x] `LC-100-P3-01` 배포 창, 역할, 연락 경로, 중단 조건과 rollback 결정권자를 확인한다.
- [x] `LC-100-P3-02` 사용자가 1.0.0 출시 전 backup 구축·검증을 명시적으로 유예한 예외와 후속 운영 위험을 기록한다.
- [x] `LC-100-P3-03` migration 사전 검사를 수행하고 봉인된 순서·checksum 그대로 적용한다.
- [x] `LC-100-P3-04` 승인 digest를 제한된 canary instance/traffic에 배포한다.
- [x] `LC-100-P3-05` Google OAuth 시작·redirect, 합성 session의 곡/가사 생성, 한글 저장, 검색, 삭제/복원, export smoke를 실행한다.
- [x] `LC-100-P3-06` canary 안정 구간 동안 오류율·p95·저장 실패·DB 연결 지표를 관찰한다. backup 지표는 사용자 승인 예외로 후속 구축에 넘긴다.
- [x] `LC-100-P3-07` 승인 기준 충족 후 같은 digest를 공개 instance에 전개한다.
- [x] `LC-100-P3-08` DB health 실패를 주입해 비공개 canary 제거와 정상 instance 지속을 검증한다.
- [x] `LC-100-P3-09` 배포·smoke·관측·판정·rollback 여부를 시간순 기록한다.

## 구체적 검증

1. canary가 이전 버전과 동일 DB를 사용할 때 schema 호환과 session 지속성을 확인한다.
2. 두 테스트 사용자로 교차 접근 차단과 탈퇴 계정 차단 smoke를 수행한다.
3. 모바일 PWA 기존 설치본이 새 버전을 감지해 dirty 초안 없이 안전하게 갱신되는지 확인한다.
4. 의도적으로 canary health 실패를 주입해 traffic 제거와 이전 digest 복귀 절차를 검증한다.
5. 배포 전후 합성 자료의 행 수·revision·검색·관계를 비교하고 사용자 데이터 손실이 없는지 확인한다.
6. 관측 기록에 창작물 본문·검색어·토큰이 수집되지 않았는지 canary 문자열로 점검한다.

## 완료 조건

- [x] 프로덕션은 승인된 1.0.0 image digest와 migration만 실행한다.
- [x] canary와 전체 배포 smoke가 모두 통과한다.
- [x] 안정 구간에 P0/P1, 권한 이상, 저장 실패 급증이 없다.
- [x] 실패 canary 제거 경로를 실제 검증했다. 최신 backup 복구 지점은 사용자 지시에 따라 1.0.1+ 운영 보완으로 유예한다.

## 산출물

- 프로덕션 배포 타임라인과 승인 기록
- canary/전체 smoke 및 관측 결과
- 배포 직전 backup 식별자와 rollback 검증 결과

## 다음 Phase 인계

Phase 4에 실제 운영 버전·digest·schema, 배포 결과, 남은 P2/P3, 경보와 모든 운영 runbook 링크를 전달한다.

## 현재 실행 기록

릴리스 서버의 Docker·Compose·Tunnel·disk·checkout·backup timer·loopback listener와 공개 health를 read-only로 점검했다. 신규 production bootstrap 상태이며 변경은 수행하지 않았다. 불변 digest, 두 data source 선택지, 배포·canary·rollback 순서와 승인 대기 항목은 [`Phase 3 production 배포 preflight`](../../../docs/runbooks/1.0.0-phase3-deployment.md)에 기록했다.

2026-09-08 사용자는 앞선 배포 유예를 해제하고 Phase 5까지 진행하도록 승인했다. 또한 릴리스 Google OAuth·DB 자격 증명을 개발 환경과 동일하게 사용하고 backup 구축·복원 훈련은 1.0.0 이후로 유예하도록 명시했다. 이 지시는 환경별 자격 증명 분리와 배포 전 backup 기준의 승인 예외로 기록한다.

Phase 2 final source `084a083d22c5c279baca971be25fa71b0191e128`와 승인된 네 digest만 사용해 신규 빈 PostgreSQL에 17개 봉인 migration을 적용했다. postgres·web·collaboration·worker가 모두 healthy이며 공개 live/ready는 version `1.0.0`, 같은 build SHA, schema `0802_lifecycle.sql`을 반환했다. Google 승인 화면 도달·PKCE/state/nonce·release callback 일치와 redirect mismatch 0건을 확인했으며 실제 사용자 자격 증명 입력은 자동화하지 않았다.

합성 두 계정의 session·곡·가사·한글 저장·검색·교차 접근 차단·휴지통 복원·ZIP export, PWA asset, 같은 digest 비공개 canary를 통과했다. 잘못된 DB 연결로 readiness 503을 주입한 canary는 traffic에 연결하지 않고 제거했으며 공개 instance는 계속 200이었다. 안정 구간 30회 오류 0건, p95 296.15ms였고 창작물 canary 문자열은 서비스 로그에 남지 않았다. 합성 계정과 자료는 검증 종료 시 삭제했다. 세부 기록은 [`Phase 3 production 배포 기록`](../../../docs/runbooks/1.0.0-phase3-deployment.md)에 있다.

배포 증적 SHA `e6135b8e8e911fba7f72b4a9f6e5cb631f84e156`은 CI `34239648988` 재실행에서 전체 verify와 네 image 서명·발행을 통과했다. 첫 실행은 절대 p95 2.973ms·오류율 0%인 save microbenchmark의 runner 편차만으로 CV 기준을 넘었고, 코드·기준 변경 없이 같은 SHA 재실행 및 로컬 반복에서 전 budget이 통과했다. 같은 SHA를 개발 서버에 배포해 네 서비스 health, 공개 live/ready·version·schema·보호 route를 재검증했다.
