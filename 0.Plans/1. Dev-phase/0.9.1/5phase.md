# 0.9.1 Phase 5 — 자체 운영 백업·복원·업그레이드 RC

- 상태: **대기**
- 단계 목적: DEC-10-C와 DEC-12-A를 실제 복구·롤백 가능한 운영 절차로 검증한다.

## 목표

Docker 기반 자체 운영 환경에서 매일 한 번 암호화된 PostgreSQL 논리 백업을 만들고 별도 환경에 복원하며, 애플리케이션·DB 업그레이드와 실패 시 롤백을 RC 수준으로 완성한다.

## 선행조건

- [0.9.1 Phase 4](./4phase.md)의 안전한 운영 관측과 경보가 완료되어야 한다.
- 백업 외부 저장소, 암호화 키 보관, 배포 지역, 관측 도구, reverse proxy는 [0.0.0 ADR 산출물](../0.0.0/)에서 확정된 값만 사용한다.
- 해당 ADR이 미승인이라면 실제 운영 스크립트 작성과 RC 승인을 진행하지 않는다.

## 기준 링크

- [기능 기획서](../../Sketch.md) — 2, 33~35, 49, 50-5절
- [구현 기술 스택](../../Implementation-Stack.md) — DEC-10-C, DEC-11-A, DEC-12-A, 환경 분리·배포 원칙
- [설정 목업](../../Mock-up/15-settings/README.md)
- [개발 상태표](../STATUS.md)
- [0.0.0 ADR 산출물](../0.0.0/)
- [결정 권한과 기록 위치](../Decision-Ownership.md) — `OPS-0002`

## 포함 범위

- 하루 1회 암호화 PostgreSQL 논리 백업과 목표 손실 범위 24시간
- DB와 분리된 ADR 승인 저장 위치, 키 분리, 보존·정리
- 빈 별도 환경으로의 정기 복원 훈련과 무결성 검사
- versioned Docker image, migration, upgrade, health check와 rollback
- 1.0 배포 image의 registry·서명·provenance·digest 승인 계약
- 운영·복원·장애 runbook과 관측

## 제외 범위

- PITR와 수분 단위 RPO
- ADR에 없는 특정 cloud, 지역, proxy, 관측 도구의 임의 채택
- backup을 수정 기록이나 휴지통 대신 사용하는 제품 기능

## 작업 체크리스트

- [ ] `LC-091-P5-01` backup 대상에 사용자 DB schema, auth/session 관련 필요 데이터와 CRDT 원본이 빠짐없이 포함되는지 정의한다.
- [ ] `LC-091-P5-02` 하루 1회 일관된 논리 dump를 생성하고 승인된 방식으로 암호화한 뒤 DB와 분리해 전송한다.
- [ ] `LC-091-P5-03` 암호화 키를 backup 파일·repository·container image·로그와 분리한다.
- [ ] `LC-091-P5-04` backup 성공 여부, 크기, 생성 시각, 검증 checksum과 24시간 초과를 안전한 지표로 기록한다.
- [ ] `LC-091-P5-05` 승인된 보존 기간에 맞춰 오래된 backup을 멱등 정리하고 삭제 기록을 남긴다.
- [ ] `LC-091-P5-06` 최신 backup을 빈 격리 환경에 복호화·복원하고 schema·행 수·관계·검색을 검증한다.
- [ ] `LC-091-P5-07` 이전 RC에서 현재 RC로 application image와 DB migration을 순서대로 업그레이드한다.
- [ ] `LC-091-P5-08` health/smoke 실패 시 application rollback과 호환 가능한 DB 복구 절차를 실행한다.
- [ ] `LC-091-P5-09` 신규 홈랩 운영자가 문서만으로 설치·backup·restore·upgrade·rollback을 재현하게 한다.
- [ ] `LC-091-P5-10` `OPS-0002`에 image registry, 서명·검증 방식, provenance 필드, digest 승인자와 비밀 값 보관 경계를 기록한다.

## 구체적 검증

1. 예정 backup을 두 차례 이상 자동 실행해 암호화 파일과 성공/실패 경보를 확인한다.
2. application/DB와 자격 증명을 공유하지 않는 별도 환경에서 최신 backup을 처음부터 복원한다.
3. 복원 DB의 사용자 격리, 검색 인덱스, 수정 기록, 휴지통, 탈퇴 예약과 CRDT/최신 본문을 표본 검증한다.
4. 손상·잘못된 키·저장소 불가·용량 부족을 주입해 명확히 실패하고 이전 정상 backup을 보존하는지 확인한다.
5. migration 중간 실패와 새 image health 실패를 재현해 runbook의 rollback을 시간 측정과 함께 수행한다.
6. backup이나 운영 로그에서 가사·라임·프롬프트 본문이 평문으로 노출되지 않는지 검사한다.

## 완료 조건

- [ ] DEC-12-A의 일 1회 암호화 논리 backup과 24시간 RPO 감시가 동작한다.
- [ ] 최신 backup을 별도 환경에 실제 복원하고 제품 smoke가 통과한다.
- [ ] Docker upgrade와 rollback이 문서만으로 재현된다.
- [ ] `OPS-0002`가 Accepted 상태이며 1.0.0이 재사용할 artifact 검증 계약이 고정되었다.
- [ ] 외부 저장소·지역·관측·proxy는 승인 ADR과 일치하며 임의 선택이 없다.
- [ ] 미해결 운영 P0/P1 결함 없이 1.0.0 승인을 시작할 수 있다.

## 산출물

- 암호화 backup/보존 자동화와 안전한 상태 지표
- 독립 복원 훈련 보고서
- Docker 설치·upgrade·rollback·장애 runbook
- `OPS-0002` registry·서명·provenance·digest 승인 기록
- 0.9.1 RC 이미지/변경 기록과 결함 목록

## 다음 Phase 인계

1.0.0 Phase 1에 RC 식별자, 전체 추적표, 보안·성능 결과, 복원 증적, 운영 runbook과 미해결 P2/P3 목록을 전달한다.
