<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="apps/web/public/icons/lyricscloud-mark-dark.svg">
    <img src="apps/web/public/icons/lyricscloud-mark-light.svg" width="112" height="112" alt="LyricsCloud">
  </picture>
</p>

# LyricsCloud

[![CI](https://github.com/parking-place/LyricsCloud/actions/workflows/ci.yml/badge.svg)](https://github.com/parking-place/LyricsCloud/actions/workflows/ci.yml)

LyricsCloud는 곡, 여러 가사 버전, 라임 노트와 Suno 프롬프트를 한곳에서 관리하는 셀프호스트 웹 앱이다. PC 집중 편집, 모바일 확인·수정·복사, 같은 계정의 여러 기기·탭 자동 병합, 지정 사용자·공개 링크 공동 편집과 온라인 우선 PWA를 지원한다.

현재 운영 서버의 정식 릴리스는 [`v1.1.7`](https://github.com/parking-place/LyricsCloud/releases/tag/v1.1.7)이다. P1~P5와 main/tag CI, 네 signed exact digest 이미지, 운영 공개 smoke를 완료했다.

[1.1.7 release notes](./docs/releases/1.1.7.md)와 [CHANGELOG.md](./CHANGELOG.md)에 사용자 변화·호환성·미실행 gate를 기록한다.

## 주요 기능

- 곡 CRUD, 상태·메모·필터·즐겨찾기·핀과 곡 중심 대시보드
- 곡별 Suno 모델명과 최대 20개 수동 작업 링크·제목·메모·순서 저장, 보호된 새 탭 열기
- 곡·라임 노트·프롬프트의 drag·버튼·키보드 사용자정렬, 모바일 copy gesture 분리와 계정별 순서 복원
- 곡·라임 노트·프롬프트 목록의 리스트·소/중/대 그리드와 계정·자료유형별 보기 저장
- CodeMirror 기반 한글 가사 편집, `[TAG:sub tag]` 탐색, Extend 원문/Suno 복사 분리, PC 우클릭·키보드·모바일 송폼 삽입, 전체·구간 복사와 3,000자 초과 안내, 수정 기록 비교·복원
- 같은 owner의 브라우저·기기·탭 CRDT 병합, 계정별 offline 초안과 재연결 복구
- 라임 노트와 태그형·문장형 Suno 프롬프트 작성, 원문 보존 변환·마침표 구간 표시·최종 복사 1,000자 초과 안내
- 통합 검색, 최근 작업·위치 복원, 템플릿, 표시 설정과 키보드 명령
- 30일 휴지통, 탈퇴 철회, TXT/Markdown+JSON 전체 ZIP 내보내기
- 설치형 PWA, light/dark 테마, 접근 가능한 PC·모바일 화면
- 승인 B-1 통합 작업공간, 현재 영역 header·접힌 rail tooltip, 모바일 다섯 주 내비+focus 복귀 More와 Flat-depth surface
- 새 라임·프롬프트의 호출 화면 exact 복귀, 목록 filter·sort·view query 보존과 공유/Suno 작업 뒤 focus·동선 복원
- reduced transparency·increased contrast·forced colors의 불투명 판독 fallback과 reduced motion·200% 확대 대리 reflow
- 계정·가사별 Noto Sans KR 선택, same-origin immutable/PWA cache와 system sans fallback
- 계정별 비열거 공유 코드, 특정 가사 selected-read, 읽기 전용 live update·최소 presence·즉시 권한 회수
- selected-read 안의 지정 사용자 본문 쓰기, 서버 검증 cursor/presence, 권한 epoch와 거부 원문 복구함
- 256비트 공개 링크, 선택 필드·최대 30일 만료·일회 링크 복사, fragment 제거·read-only live·즉시 회수
- owner 위험 확인 뒤 공개 링크의 비로그인 guest 본문 공동 편집, 탭별 session/presence·지속 제한·중지와 rejected-only 복구
- Google OIDC와 1회성 초대 코드 기반 Private Beta 가입

AI 생성과 미디어 업로드는 1.1.7 범위가 아니다.

## 현재 상태

| 항목 | 상태 |
|---|---|
| 소스·runtime version | `1.1.8` |
| 현재 작업 | [1.1.8 Phase 3 — Windows 읽기·복사 사용자 흐름](<./0.Plans/2.Patch-phase/1.1.8/3phase.md>) 완료, P4 준비 |
| 실행 상태 원본 | [STATUS.md](<./0.Plans/1. Dev-phase/STATUS.md>) |
| 정식 릴리스 | `v1.1.7`, main/tag `edb8b4a`, exact digest 운영 배포·공개 복귀/접근성/공유/복구·재시작·전역 beta CLI smoke 완료 |
| 개발 인수 | 1.1.8 P3 후보 `b96200c`, 전체 CI·Windows WinUI x64 build/개발 artifact·네 signed dev image·동일 SHA 개발 native 곡/가사 read-only smoke 완료 |
| 운영 제한 | 외부 암호화 backup·24시간 RPO·복원 훈련은 사용자 승인 예외로 아직 미구축 |

1.1.1 공개 링크는 raw capability를 fragment에서 즉시 제거하고 서버에는 digest만 저장한다. 익명 reader는 지정 가사의 승인 필드만 보며 workspace·메모·연결 자료·revision·export·presence·write는 사용할 수 없다. 회수·만료는 열린 연결과 이후 API를 함께 차단한다.

1.1.2 지정 사용자 공동 편집은 활성 읽기 grant 안에서만 본문 쓰기를 허용한다. writer는 ACL·메타데이터·revision·삭제·소유권을 관리할 수 없고, 권한 강등·회수 뒤 거부된 로컬 원문은 계정·actor·자료·grant·epoch별 복구함에 보존되며 자동 재적용하지 않는다.

1.1.3 공개 쓰기는 기존 공개 읽기 링크의 같은 자료·token·만료 범위에서 owner가 별도 위험 확인한 경우에만 비로그인 guest의 본문 편집을 허용한다. guest는 서버 발급 익명 세션으로만 구분하며 workspace·목록·메모·연결 자료·revision·ACL·metadata·삭제·소유권·계정 권한은 얻지 않는다.

1.1.4는 가사·상위 곡 삭제 시 selected/public capability를 회수하고 epoch를 올려 휴지통 복원 뒤 과거 공유가 부활하지 않게 한다. owner revision 복원은 같은 epoch의 offline writer 원문과 수렴하며, 브라우저 전송 대기열은 capability별 64건 또는 1 MiB 안에서 lossless compact된다. 로그아웃·계정 전환 뒤 이전 actor의 snapshot·outbox·복구 원문·presence를 다음 계정에 노출하지 않는다.

1.1.5는 승인된 B-1 통합 작업공간과 Flat-depth를 적용한다. desktop은 현재 영역 header와 접힌 rail tooltip을, 모바일은 곡·라임·프롬프트·검색·더보기와 focus 복귀 More 시트를 사용한다. shell 조작 중에도 같은 CodeMirror·IME·selection·undo·draft/store를 유지하고 기존 URL·filter·사용자정렬·API·DB·공유 권한은 바꾸지 않는다. 시각/탐색 rollback은 `LC_UI_VARIANT=classic`이다.

1.1.6은 같은 CodeMirror와 store를 유지한 채 가사·라임·프롬프트 편집기, 자료 패널, 새 자료 생성, 곡 연결 관리, beta 가입·공유 회수·guest 복구·탈퇴 재인증 화면까지 B-1 상태 언어를 확장한다. light/dark·desktop/mobile 전환 중 입력·selection·undo·초점을 보존하고 서버 ACK 전에는 저장 완료를 표시하지 않는다. classic/B-1의 copy/export payload와 기존 URL·deep link·API·DB·capability는 동일하다.

1.1.7은 새 라임·프롬프트 생성에 명시적 내부 `returnTo`를 사용해 호출 화면으로 정확히 복귀하고, 곡 목록의 filter·sort·view query를 대시보드·가사·공유·Suno 작업 뒤에도 보존한다. 공유 dialog와 모바일 More는 trigger focus를 복원하며 접힌 rail·drag/context 기능에는 keyboard/버튼 대안이 있다. reduced transparency·contrast/forced-colors fallback은 표현만 바꾸고 CodeMirror/Yjs·API·DB·권한·저장 원문을 바꾸지 않는다.

1.1.8 P3는 WinUI 3/.NET 읽기·복사 전용 Windows 앱에 곡/가사·라임·프롬프트 탐색, exact copy, loading/empty/no-access/error, adaptive/theme/keyboard/accessibility 계약과 owner 가사 목록 API를 연결한다. native session은 `read` scope만 가지며 기존 쓰기 route에는 사용할 수 없다. Windows runner build와 개발 artifact는 통과했지만 실제 Windows 실행·한국어 IME·Narrator·고대비·DPI/다중 monitor·DPAPI/process kill·clipboard 및 신뢰 서명 MSIX 설치/업데이트/제거는 P4/P5 gate라 아직 정식 릴리스 기능으로 표시하지 않는다.

## 화면

신규 사용자는 초대 코드와 Google 계정 이메일을 입력하고, 같은 계정의 Google 본인 확인을 마쳐야 코드 소비와 접근권 등록이 함께 완료된다. 아래는 실제 계정·코드가 없는 합성 검증 화면이다.

<p align="center">
  <img src="docs/runbooks/evidence/1.0.1-phase4-beta-signup-desktop.png" width="760" alt="LyricsCloud 1.0.1 초대 코드 가입 PC 화면">
</p>

<p align="center">
  <img src="docs/runbooks/evidence/1.0.1-phase4-beta-signup-mobile.png" width="300" alt="LyricsCloud 1.0.1 초대 코드 가입 모바일 화면">
</p>

## 빠른 시작

로컬 개발에는 Node.js 24, pnpm 11, Docker Engine와 Compose가 필요하다.

```bash
cp .env.example .env
cp .test_users.example .test_users
# CHANGE_ME 값을 설정하고 HMAC allowlist 전환 절차를 완료한 뒤
docker compose config --quiet
docker compose up --build --wait
curl --fail http://127.0.0.1:8080/api/health/ready
```

기본 주소는 `http://localhost:8080`이다. 일반 종료는 `docker compose down`이며 DB volume은 보존된다. `docker compose down --volumes`는 자료를 삭제하므로 disposable 초기화 환경 외에는 실행하지 않는다.

운영 설치·HTTPS·OAuth·secret·upgrade 설정은 [셀프호스팅 안내](./docs/self-hosting.md)를 처음부터 따른다.

## Private Beta 운영

P2 관리자 CLI는 초대 코드 발급·조회·전체 교체를 제공한다. 원문 코드와 키를 명령 인수, 로그, Issue 또는 Git에 넣지 않는다.

```bash
LyricsCloud betacode -n 10
LyricsCloud betacode ls
LyricsCloud betacode refresh
```

정확한 입력·출력·동시성·복구 계약은 [Beta 관리자 runbook](./docs/runbooks/1.0.1-phase2-beta-admin.md), 기존 계정 HMAC 전환은 [allowlist runbook](./docs/runbooks/1.0.1-phase3-hmac-allowlist.md), Google 설정은 [OAuth runbook](./docs/runbooks/google-oauth-setup.md)을 따른다.

## 보안·백업 경계

창작물은 PostgreSQL에, 전송 전 offline 초안은 계정별 브라우저 저장소에 둔다. 로그와 관측에는 제목·본문·태그·프롬프트·검색어·이메일·OAuth/session 값과 동적 resource ID를 넣지 않는다. 전체 내보내기는 이동용 사본이며 운영 backup을 대신하지 않는다.

실제 `.env`, `.test_users`, DB volume, backup archive·identity, export와 창작물은 Git에 넣지 않는다. 현재 공식 릴리스 서버의 외부 backup은 미구축 상태이며 호스트 손실 시 복구 지점을 보장하지 않는다. 구축 전에는 이 위험과 승인 예외를 각 릴리스 기록에 명시한다. 취약점은 공개 Issue가 아닌 [비공개 보안 보고 절차](./SECURITY.md)를 사용한다.

## 문서

| 대상 | 문서 |
|---|---|
| 사용자 | [사용자 안내](./docs/user-guide.md), [지원 환경·알려진 제한](./docs/support.md) |
| 셀프호스트 운영자 | [설치·설정·health·upgrade](./docs/self-hosting.md), [Docker 구성](./infra/docker/README.md) |
| 인증·베타 운영자 | [Google OAuth](./docs/runbooks/google-oauth-setup.md), [초대 코드 CLI](./docs/runbooks/1.0.1-phase2-beta-admin.md), [HMAC allowlist](./docs/runbooks/1.0.1-phase3-hmac-allowlist.md) |
| 복구·배포 담당자 | [backup·restore·upgrade·rollback](./docs/runbooks/backup-restore-upgrade.md), [개발 배포](./docs/runbooks/development-deploy.md), [Docker Hub 발행](./docs/runbooks/dockerhub-publish.md) |
| 보안·장애 담당자 | [Security policy](./SECURITY.md), [경보 대응](./docs/runbooks/observability-alerts.md), [사고 기록 양식](./docs/runbooks/incident-record-template.md) |
| 릴리스 검토자 | [1.1.6 release notes](./docs/releases/1.1.6.md), [1.1.6 Phase 5](./docs/runbooks/1.1.6-phase5-final-acceptance.md), [1.1.6 추적](./docs/architecture/1.1.6-FINAL-TRACEABILITY.md), [CHANGELOG.md](./CHANGELOG.md) |
| 기여자 | [Agent 지침](./Agent.md), [후속 계획](./0.Plans/2.Patch-phase/README.md), [ADR 색인](./docs/adr/README.md) |

## 저장소 구조

| 경로 | 역할 |
|---|---|
| `apps/` | web, collaboration, worker runtime |
| `packages/` | auth, database, domain, editor, observability, UI |
| `tests/` | 통합·E2E·owner 격리·브라우저 회귀 |
| `infra/` | production image와 backup 도구 |
| `config/` | 환경·migration·artifact·성능·경보 계약 |
| `docs/` | 사용자·셀프호스트·ADR·보안·운영 runbook |
| `scripts/` | 검증·migration·배포 보조 명령 |
| `0.Plans/` | 보호된 기획·목업·기술 결정과 Phase 상태 |

Suno 자동 메타데이터·사전·native 앱 후보와 미선택 디자인은 [최신 요구 대응표](./docs/planning/latest-requirements-mapping.md)에 분리되어 있다. 1.1.6은 승인된 B-1 편집·자료·가입/공유/복구 화면까지만 제공하고 1.1.7 이후 범위와 native 조건부 gate를 선소비하지 않는다.
