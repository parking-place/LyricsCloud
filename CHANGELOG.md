# Changelog

사용자에게 의미 있는 변경을 버전별로 기록합니다. 형식은 Keep a Changelog의 범주를 따르되, 버전과 완료 조건은 [`0.Plans/1. Dev-phase`](<./0.Plans/1. Dev-phase/README.md>)를 기준으로 합니다.

## Unreleased

### Added

- 제품 기획, 15개 PC·모바일 목업, 구현 기술 결정 기준선
- `0.0.0`부터 `1.0.0`까지의 버전·Phase 실행 계획
- 사람과 AI Agent를 위한 저장소 안내 및 협업 골격
- 승인된 ADR-0001~0009와 Node.js/pnpm workspace
- Docker Compose 기반 web·collaboration·worker·PostgreSQL·migration 개발환경
- 15개 route 중립 화면과 liveness/readiness endpoint
- 빈 작업 사본·빈 Docker volume, 장애 회복, 데이터 지속·초기화, 보안·PC·모바일 기준선 검증 보고서
- Google OIDC Authorization Code + PKCE 경계, 비공개 베타 허용 목록, PostgreSQL opaque 세션과 로그아웃 API
- 내부 사용자 ID 기반 profile 소유권, transaction-local 사용자 문맥과 강제 RLS
- PC·모바일 Google 로그인 화면, 인증 상태 안내, 정책 문서와 보호된 반응형 작업 공간 셸
- 로컬 OIDC 기반 로그인·세션·로그아웃 E2E, A/B 소유권 공격 검사와 PC·모바일 시각 회귀 기준
- 모바일 셸 로그아웃, 계정별 브라우저 캐시 정리와 공통 응답 보안 헤더
- 0.2.0 resource 생성용 서버 owner context 계약
- 공통 resource·곡 1:1 데이터 모델, 상태·색상·길이 계약, owner RLS와 soft delete 기반

### Changed

- 홈랩 개발 서버의 공개 주소를 `devlyrics.parkingp.kr`로 변경
- 신규 릴리스 서버에 개발 환경과 분리된 Cloudflare Tunnel·DNS·HTTPS 경로 구성
- 개발·릴리스 서버에 Docker Engine·Compose·Buildx·Git 기본 운영 환경 구성

### Not yet implemented

- 곡·가사 업무 데이터 schema, CRDT 동기화
