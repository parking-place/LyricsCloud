# 1.0.0 Phase 3 — 프로덕션 배포, canary·smoke와 롤백 판정

- 상태: **대기**
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

- [ ] `LC-100-P3-01` 배포 창, 역할, 연락 경로, 중단 조건과 rollback 결정권자를 확인한다.
- [ ] `LC-100-P3-02` 배포 직전 DEC-12-A backup을 생성·암호화·검증하고 복구 지점을 기록한다.
- [ ] `LC-100-P3-03` migration 사전 검사를 수행하고 봉인된 순서·checksum 그대로 적용한다.
- [ ] `LC-100-P3-04` 승인 digest를 제한된 canary instance/traffic에 배포한다.
- [ ] `LC-100-P3-05` Google 로그인, 곡/가사 생성, 한글 자동 저장, 검색, 복사, 삭제/복원, export smoke를 실행한다.
- [ ] `LC-100-P3-06` canary 안정 구간 동안 오류율·p95·저장 실패·DB 연결·backup 지표를 관찰한다.
- [ ] `LC-100-P3-07` 승인 기준 충족 후 같은 digest를 나머지 instance에 점진 배포한다.
- [ ] `LC-100-P3-08` P0/P1, migration 오류, 저장 실패 급증, 권한 이상 또는 health 실패를 즉시 rollback 조건으로 적용한다.
- [ ] `LC-100-P3-09` 배포·smoke·관측·판정·rollback 여부를 시간순 기록한다.

## 구체적 검증

1. canary가 이전 버전과 동일 DB를 사용할 때 schema 호환과 session 지속성을 확인한다.
2. 두 테스트 사용자로 교차 접근 차단과 탈퇴 계정 차단 smoke를 수행한다.
3. 모바일 PWA 기존 설치본이 새 버전을 감지해 dirty 초안 없이 안전하게 갱신되는지 확인한다.
4. 의도적으로 canary health 실패를 주입해 traffic 제거와 이전 digest 복귀 절차를 검증한다.
5. 배포 전후 합성 자료의 행 수·revision·검색·관계를 비교하고 사용자 데이터 손실이 없는지 확인한다.
6. 관측 기록에 창작물 본문·검색어·토큰이 수집되지 않았는지 canary 문자열로 점검한다.

## 완료 조건

- [ ] 프로덕션은 승인된 1.0.0 image digest와 migration만 실행한다.
- [ ] canary와 전체 배포 smoke가 모두 통과한다.
- [ ] 안정 구간에 P0/P1, 권한 이상, 저장 실패 급증이 없다.
- [ ] rollback 경로가 실제 검증되었고 최신 backup 복구 지점이 확인되었다.

## 산출물

- 프로덕션 배포 타임라인과 승인 기록
- canary/전체 smoke 및 관측 결과
- 배포 직전 backup 식별자와 rollback 검증 결과

## 다음 Phase 인계

Phase 4에 실제 운영 버전·digest·schema, 배포 결과, 남은 P2/P3, 경보와 모든 운영 runbook 링크를 전달한다.
