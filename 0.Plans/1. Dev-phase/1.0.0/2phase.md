# 1.0.0 Phase 2 — 불변 릴리즈 산출물과 마이그레이션 봉인

- 상태: **대기**
- 단계 목적: 승인된 RC를 다시 빌드 가능한 source가 아니라 검증된 동일 산출물로 배포하게 한다.

## 목표

승인된 commit에서 versioned Docker image, lockfile, SBOM, migration과 설정 계약을 만들고 서명·digest·provenance로 프로덕션 배포 대상을 고정한다.

## 선행조건

- [1.0.0 Phase 1](./1phase.md)의 최종 gate가 승인되어야 한다.
- image registry, 서명·provenance와 비밀 관리 방식은 [결정 권한표](../Decision-Ownership.md)의 `OPS-0002` 승인 기록을 사용한다.
- 외부 저장소·지역·프록시·관측 도구를 이 단계에서 새로 선택하지 않는다.

## 기준 링크

- [기능 기획서](../../Sketch.md) — 49~51절
- [구현 기술 스택](../../Implementation-Stack.md) — DEC-10-C, 환경 분리·배포 원칙
- [전체 목업 안내](../../Mock-up/README.md)
- [개발 상태표](../STATUS.md)
- [결정 권한과 기록 위치](../Decision-Ownership.md) — `OPS-0002`

## 포함 범위

- 정확한 버전·commit·lockfile 기반 재현 빌드
- 앱/보조 서비스별 versioned Docker image와 digest
- SBOM, dependency/container scan과 라이선스 목록
- 순서·checksum이 고정된 DB migration
- 환경 변수 schema, secret 존재 검사, health/readiness 계약
- 운영 배포용 release manifest

## 제외 범위

- 배포 시 소스에서 다시 빌드
- latest 단독 태그에 의존한 배포
- P0/P1 수정 외 기능 변경이나 승인되지 않은 dependency 대규모 갱신

## 작업 체크리스트

- [ ] `LC-100-P2-01` 애플리케이션과 모든 내부 서비스의 버전을 `1.0.0`으로 일관되게 고정한다.
- [ ] `LC-100-P2-02` 승인 commit과 lockfile로 production Docker image를 깨끗한 builder에서 생성한다.
- [ ] `LC-100-P2-03` `OPS-0002`에 승인된 registry·서명 방식으로 각 image의 digest, source commit, build 시각과 build provenance를 release manifest에 기록한다.
- [ ] `LC-100-P2-04` SBOM과 dependency/container/secret scan을 생성하고 차단 결과가 없는지 확인한다.
- [ ] `LC-100-P2-05` migration 순서·checksum·최소/최대 호환 버전과 rollback 제약을 봉인한다.
- [ ] `LC-100-P2-06` 필수·선택 환경 변수, 형식과 secret 여부를 machine-readable schema로 검증한다.
- [ ] `LC-100-P2-07` image가 비루트 사용자, health/readiness, 신호 기반 종료와 persistent volume 경계를 만족하게 한다.
- [ ] `LC-100-P2-08` 동일 입력의 두 빌드 차이를 비교하고 설명되지 않는 변동을 제거하거나 기록한다.
- [ ] `LC-100-P2-09` 검증된 digest만 다음 배포 단계에서 허용하는 승인 목록을 만든다.

## 구체적 검증

1. 빈 Docker 환경에서 release manifest만 사용해 전체 서비스를 기동하고 smoke를 실행한다.
2. production image 내부와 layer history에 source secret, `.env`, backup, 사용자 자료가 없는지 검사한다.
3. 빈 DB와 직전 릴리즈 DB에 봉인된 migration을 적용해 schema checksum과 제품 smoke를 비교한다.
4. 잘못되거나 누락된 필수 환경 값에서 서비스가 안전하고 명확하게 기동 실패하는지 확인한다.
5. 태그가 아닌 digest로 실행한 image가 승인 RC의 버전·commit을 보고하는지 검증한다.

## 완료 조건

- [ ] 배포할 모든 Docker image가 digest와 승인 RC에 연결된다.
- [ ] SBOM·scan·migration·환경 schema가 release manifest에 포함된다.
- [ ] 빈 환경과 upgrade 환경 양쪽에서 동일 산출물의 smoke가 통과한다.
- [ ] image와 빌드 산출물에 secret 또는 사용자 창작물이 없다.

## 산출물

- versioned Docker image와 digest 승인 목록
- SBOM·scan·provenance
- 봉인된 migration 집합과 release manifest
- 환경 변수 schema 및 기동 검증 결과

## 다음 Phase 인계

Phase 3에 release manifest, 허용 digest, migration 순서, health/smoke 명령과 검증된 rollback 입력을 전달한다.
