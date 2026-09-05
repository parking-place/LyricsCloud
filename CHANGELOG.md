# Changelog

사용자에게 의미 있는 변경을 버전별로 기록합니다. 형식은 Keep a Changelog의 범주를 따르되, 버전과 완료 조건은 [`0.Plans/1. Dev-phase`](<./0.Plans/1. Dev-phase/README.md>)를 기준으로 합니다.

## Unreleased

### Added

- 0.3.0 가사 resource·현재본 API: 한 곡의 독립 가사 생성·복제·수정·삭제, 원문 보존과 오래된 저장 차단
- 실제 활성 가사 수 집계와 곡 삭제 시 같은 작업에 속한 활성 가사만 함께 숨기는 규칙
- CodeMirror 기반 순수 텍스트 가사 편집기, 한글 IME 안전 자동 저장, 저장 실패 재시도와 PC·모바일 장문 편집 화면
- 표준·사용자·반복 송폼 태그 강조와 PC 목차·모바일 시트 구간 탐색
- 현재 편집 중인 전체 가사·선택 송폼 복사, 권한 실패 수동 복사 대안과 PC·모바일 집중 모드
- 곡 대시보드의 실제 가사 카드·개수·빈 상태와 생성·전환·복제·삭제, editor 메타데이터, owner 범위 가사 검색을 잇는 0.3.0 전체 흐름

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
- owner 범위 곡 생성·수정·조회·soft delete와 멱등 생성, 검색·상태·다섯 정렬·cursor API
- PC·모바일 곡 목록, 새 곡·곡 수정 공통 폼, 기본 곡 대시보드와 작업 메모·pin·favorite 흐름
- 가사·라임·프롬프트 미지원 집계를 정직한 0과 구분된 빈 상태로 표시하는 0.2.0 곡 수직 흐름

### Changed

- 홈랩 개발 서버의 공개 주소를 `devlyrics.parkingp.kr`로 변경
- 신규 릴리스 서버에 개발 환경과 분리된 Cloudflare Tunnel·DNS·HTTPS 경로 구성
- 개발·릴리스 서버에 Docker Engine·Compose·Buildx·Git 기본 운영 환경 구성
- 공개 개발 web을 Next.js production standalone image로 전환해 Cloudflare·브라우저의 이전 CSS cache와 최신 HTML이 섞이지 않도록 보정
- 로컬·개발·릴리스 Docker 작업 뒤 LyricsCloud의 미사용 객체와 초과 build cache를 정리하되 volume과 실행 중 자산은 보존하도록 표준화
- CI 검증을 통과한 web·collaboration·worker·migrate image를 각 Docker Hub repository에 version·SHA·Dev 다중 tag로 발행하고, 승인된 릴리스만 Release·latest를 추가하도록 자동화

### Not yet implemented

- 가사 CRDT 동기화와 수정 기록
