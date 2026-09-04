# 0.0.0 Phase 3 — 아키텍처 중립 골격

- 상태: **완료**
- 버전 상태: [../STATUS.md](../STATUS.md)

## 목표

승인된 ADR의 경계를 반영하되 인증·데이터 접근·동기화·프록시 구현을 교체 가능한 모듈로 분리한 저장소 골격을 설계한다. 제품 화면보다 의존 방향, 설정 경계, 실행 계약을 먼저 고정한다.

## 선행조건

- 0.0.0 Phase 2의 필수 ADR이 Accepted 상태여야 한다.
- Proposed로 남은 영역에는 구체 라이브러리를 연결하지 않는다는 제한을 유지한다.

## 기준 문서

- [기능 기획](../../Sketch.md)
- [기술 선택과 결정 기록](../../Implementation-Stack.md)
- [전체 목업 안내](../../Mock-up/README.md)
- [개발 버전 상태](../STATUS.md)

## 포함 범위

- 웹, 도메인, 애플리케이션 서비스, 외부 어댑터, migration, 테스트, 운영 설정의 모듈 경계
- 화면 01부터 15까지의 경로 이름과 보호 여부를 담은 route manifest
- 인증 사용자, 현재 계정, 자료 ID, 오류 결과의 중립 타입 계약
- 환경 설정 스키마와 개발·검사·빌드 명령 계약
- health와 readiness 응답 형식
- PC와 모바일에서 공통으로 사용할 breakpoint·safe-area·테마 토큰 골격
- 도메인 계층이 특정 인증·ORM·CRDT·프록시 패키지를 직접 import하지 않는 규칙
- 루트 README, Agent 지침, 진행 상태, changelog와 GitHub PR·Issue 작업 경계
- secret·DB 볼륨·backup·export를 제외하는 저장소 기본 규칙

## 제외 범위

- 실제 로그인 화면과 보호 화면
- PostgreSQL 업무 테이블
- 곡·가사 CRUD
- 실시간 연결과 CRDT 문서
- 배포용 프록시 설정

## 작업 체크리스트

- [x] LC-000-P3-01 — Accepted 토폴로지를 반영한 최상위 모듈과 책임 설명을 작성한다.
- [x] LC-000-P3-02 — domain에서 application, adapter, UI로 향하는 허용 의존 방향을 규칙으로 고정한다.
- [x] LC-000-P3-03 — 15개 화면의 route, 공개·인증 필요 여부, 아직 사용할 수 없는 상태를 manifest에 정의한다.
- [x] LC-000-P3-04 — 사용자 ID, resource ID, 명령 결과, validation 오류의 공통 타입을 정의한다.
- [x] LC-000-P3-05 — 필수 환경 값 누락 시 시작 단계에서 이름만 알리고 값은 출력하지 않는 검증 계약을 만든다.
- [x] LC-000-P3-06 — liveness와 readiness가 서로 다른 실패를 표현하도록 응답 계약을 정의한다.
- [x] LC-000-P3-07 — PC 1440px와 모바일 390×844 기준의 레이아웃 토큰과 safe-area 규칙을 정리한다.
- [x] LC-000-P3-08 — 특정 인프라 패키지가 도메인 경계를 넘어오는지 검사할 정적 규칙을 준비한다.
- [x] LC-000-P3-09 — README·Agent.md·AGENTS.md·STATUS·CHANGELOG의 역할과 갱신 책임을 실제 파일과 대조한다.
- [x] LC-000-P3-10 — `.gitignore`, PR template, Phase 작업 Issue template이 비밀·대용량 runtime 자료와 범위 밖 변경을 막는지 검토한다.

## 검증 방법

- 모듈 의존 그래프를 생성해 순환 참조와 역방향 인프라 의존이 없는지 확인한다.
- route manifest의 모든 항목을 Mock-up의 15개 페이지 목록과 대조한다.
- 환경 값이 없거나 형식이 틀린 세 가지 사례에서 애플리케이션이 조기에 안전하게 실패하는지 설계 검토한다.
- liveness 성공과 데이터베이스 불가로 인한 readiness 실패를 서로 구분할 수 있는지 확인한다.
- 중립 레이아웃 골격을 1440px, 1024px, 390px 폭에서 확인할 수 있는 검증 시나리오를 작성한다.
- ADR에서 선택되지 않은 인증·ORM·CRDT·프록시 제품명이 소스 의존성에 포함되지 않았는지 확인한다.
- 새 작업자가 대화 맥락 없이 README → Agent 지침 → STATUS → 현재 Phase 순서로 작업 범위에 도달하는지 확인한다.
- 합성 `.env`, DB volume, backup, export 파일을 만들어 Git 추적 후보에서 제외되는지 검사한다.

## 완료 조건

- [x] 저장소 모듈 책임과 의존 방향이 문서화됐다.
- [x] 15개 route가 빠짐없이 manifest에 등록됐다.
- [x] 환경 설정과 health 계약이 검토됐다.
- [x] PC·모바일 공통 토큰 골격이 정의됐다.
- [x] 인프라 교체가 도메인 변경을 요구하지 않는 경계가 마련됐다.
- [x] 사람과 Agent가 현재 Phase와 파일 소유 범위를 찾을 수 있는 협업 문서가 검증됐다.
- [x] GitHub 협업 템플릿과 민감 파일 제외 규칙이 검증됐다.

## 산출물

- 저장소 구조 설명
- 모듈 의존 규칙
- route manifest
- 공통 타입·오류 계약
- 환경 설정 및 health 계약
- 반응형 토큰 기준
- 저장소 진입 문서와 GitHub 협업 템플릿 검토 결과

## 다음 Phase 인계

Phase 4에는 실행 단위, 각 단위의 health 경로, 필요한 환경 값 이름, 영속 볼륨과 migration 책임을 전달한다. 구체 서비스 이미지는 해당 ADR의 Accepted 항목만 사용한다.
