# LyricsCloud

LyricsCloud 1.0은 곡, 여러 가사 버전, 라임 노트와 Suno 프롬프트를 하나의 개인 창작 흐름으로 연결하는 셀프호스트 웹 앱이다. PC 집중 편집, 모바일 빠른 확인·수정·복사, 같은 계정의 여러 기기·탭 자동 병합과 온라인 우선 PWA를 지원한다.

## 1.0 핵심 기능

- 곡 CRUD, 상태·메모·필터·즐겨찾기·핀과 곡 중심 대시보드
- CodeMirror 한글 가사 편집, 송폼 탐색, 전체·구간 복사, 집중 모드, 수정 기록 비교·비파괴 복원
- 같은 owner의 브라우저·기기·탭 CRDT 병합, 계정별 offline 초안과 재연결 복구
- 라임 노트 태그·검색·곡 연결·cursor 삽입, 프롬프트 토큰 자동완성·중복 정리·순서 변경·복사
- 통합 검색, 최근 작업·위치 복원, 템플릿, 표시 설정과 키보드 명령
- 정확한 30일 휴지통, 탈퇴 즉시 접근 차단과 7일 철회, TXT/Markdown+JSON 전체 ZIP 내보내기
- 15개 PC/mobile 화면, 설치형 PWA, 접근성·양 테마·오류/오프라인 상태
- owner 격리, Google OIDC PKCE, nonce CSP, 요청 제한, non-root read-only production image와 본문 없는 관측

여러 사용자 공동 편집, AI 생성과 미디어 업로드는 1.0 범위가 아니다.

## 상태

- 제품 version: `1.0.0`
- 현재 작업: [1.0.0 Phase 5 — 최종 릴리스](<./0.Plans/1. Dev-phase/1.0.0/5phase.md>)
- 상태 단일 원본: [STATUS.md](<./0.Plans/1. Dev-phase/STATUS.md>)
- 프로덕션: 승인된 Phase 2 digest와 schema `0802_lifecycle.sql`로 배포·공개 smoke 완료
- 예외: 공식 릴리스 서버의 OAuth/DB 자격 증명은 사용자 승인으로 개발 서버와 같은 값을 사용하며, 외부 암호화 backup·24시간 RPO·복원 훈련은 1.0.1+로 유예됨

## 요구 조건

- 로컬 개발: Node.js 24, pnpm 11, Docker Engine와 Compose
- 셀프호스트: Linux x86-64, Docker Engine 26+, Compose v2.24.4+, PostgreSQL 18 image, HTTPS, Google OAuth Web client
- 브라우저: Chromium/Firefox 111+, Safari 16.4+, iOS/iPadOS 16.4+ Safari, Android 12+ Chrome

## 빠른 시작

개발 환경은 source bind mount와 개발 server를 사용한다.

```bash
cp .env.example .env
cp .test_users.example .test_users
# .env의 모든 CHANGE_ME와 .test_users의 허용 계정을 설정
docker compose config --quiet
docker compose up --build --wait
curl --fail http://127.0.0.1:8080/api/health/ready
```

기본 주소는 `http://localhost:8080`이다. 일반 종료는 `docker compose down`이며 DB volume은 보존된다. `docker compose down --volumes`는 자료를 영구 삭제하므로 초기화가 명시된 disposable 환경 외에는 실행하지 않는다.

production-mode 셀프호스트는 환경 검증, runtime allowlist 권한, HTTPS/OAuth와 backup 위험 확인이 더 필요하다. [셀프호스팅 안내](./docs/self-hosting.md)를 처음부터 따른다.

## 문서 지도

| 대상 | 문서 |
|---|---|
| 사용자 | [1.0 사용자 안내](./docs/user-guide.md), [지원·알려진 제한](./docs/support.md) |
| 셀프호스트 운영자 | [설치·설정·health·upgrade](./docs/self-hosting.md), [Docker 구성](./infra/docker/README.md) |
| 인증 운영자 | [Google OAuth·초대 allowlist·교체](./docs/runbooks/google-oauth-setup.md) |
| 복구 담당자 | [backup·restore·upgrade·rollback](./docs/runbooks/backup-restore-upgrade.md) |
| 장애 담당자 | [경보 대응](./docs/runbooks/observability-alerts.md), [사고 기록 양식](./docs/runbooks/incident-record-template.md) |
| 보안 보고자 | [Security policy](./SECURITY.md), [보안 감사](./docs/security/0.9.1-security-audit.md) |
| 검토자 | [1.0.0 release notes](./docs/releases/1.0.0.md), [최종 요구사항 추적](./docs/architecture/1.0.0-FINAL-TRACEABILITY.md), [1.0 release manifest](./config/release-manifest.1.0.0.json), [1.0.1+ backlog](./docs/operations/1.0.1-backlog.md), [CHANGELOG](./CHANGELOG.md) |
| 기여자 | [Agent 지침](./Agent.md), [개발 로드맵](<./0.Plans/1. Dev-phase/README.md>), [ADR 색인](./docs/adr/README.md) |

## 데이터와 개인정보 경계

애플리케이션 자료는 PostgreSQL에, 편집 중 offline 초안은 계정별 브라우저 저장소에 둔다. 로그·관측에는 제목, 본문, 태그, 프롬프트, 검색어, 이메일, OAuth/session 값과 동적 resource ID를 넣지 않는다. 전체 내보내기는 사용자가 보관할 이동용 사본이며 운영 backup을 대신하지 않는다.

실제 `.env`, `.test_users`, DB volume, backup archive·identity, export와 창작물은 Git에 넣지 않는다. 취약점은 공개 Issue가 아닌 [비공개 보안 보고 절차](./SECURITY.md)를 사용한다.

## 저장소 구조

| 경로 | 역할 |
|---|---|
| `apps/` | web, collaboration, worker runtime |
| `packages/` | auth, database, domain, editor, observability, UI |
| `tests/` | 통합·E2E·owner 격리·브라우저 회귀 |
| `infra/` | Docker production image와 backup 도구 |
| `config/` | 환경·migration·artifact·성능·경보의 machine-readable 계약 |
| `docs/` | 사용자·셀프호스트·ADR·보안·운영 runbook |
| `scripts/` | 검증·migration·배포 보조 명령 |
| `0.Plans/` | 보호된 기획·목업·기술 결정과 Phase 상태 |
