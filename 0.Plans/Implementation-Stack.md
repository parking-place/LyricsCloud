# LyricsCloud 구현 기술 스택 및 결정 기록

> 작성 기준일: 2026-09-04  
> 기준 문서: [`Sketch.md`](./Sketch.md), [`Mock-up`](./Mock-up/README.md)

이 파일은 구현 전 기술 선택과 운영 원칙을 한곳에 고정하기 위한 기준 문서입니다. 이후 구현을 요청하면 이 파일에 저장된 체크 상태를 먼저 확인합니다.

---

## 0. 선택 방법

1. 각 `DEC-xx` 묶음에서 **정확히 하나만** `[x]`로 바꿉니다.
2. `권장` 표시는 제안일 뿐이며, 체크 전에는 선택된 것으로 보지 않습니다.
3. 필요한 설명은 각 묶음의 `선택 메모`에 적습니다.
4. 모두 고른 뒤 문서 하단의 `FINAL-APPROVAL`도 체크하고 파일을 저장합니다.
5. 이후 “`Implementation-Stack.md` 확인해줘”라고 요청하면 저장된 선택을 기준으로 구현합니다.

현재 결정 상태: **사용자 선택 전**

---

# 1. 구현 시작 전에 필요한 선택

## DEC-01. 애플리케이션·데이터 플랫폼

- [ ] `DEC-01-A` — **Next.js + Supabase 관리형 구성** — 권장
- [ ] `DEC-01-B` — Next.js + 별도 관리형 PostgreSQL + Drizzle + Auth.js
- [ ] `DEC-01-C` — React/Vite + Supabase
- [x] `DEC-01-D` — Docker 기반 자체 운영 Node.js + PostgreSQL

### 판단 기준

| 선택 | 장점 | 부담 |
|---|---|---|
| A | Google 로그인, PostgreSQL, 사용자별 접근 제어, 실시간 변경 감지를 한곳에서 구성 | Supabase 정책과 세션 방식을 익혀야 함 |
| B | 데이터베이스와 인증 공급자 이동성이 높음 | 인증, 권한, 연결 풀, 백업을 직접 조합해야 함 |
| C | 가장 단순한 클라이언트 앱 구성 | 특권 작업과 향후 서버 기능이 늘면 구조 변경 가능성이 큼 |
| D | 운영 환경을 완전히 통제 | 배포, 보안 패치, 백업, 장애 대응을 직접 담당 |

선택 메모:

> 권장 이유: LyricsCloud는 곡·가사·태그·연결 자료·수정 기록처럼 관계가 많은 개인 데이터 앱입니다. PostgreSQL이 자연스럽고, Supabase는 Google 로그인과 데이터베이스의 Row Level Security를 함께 사용할 수 있습니다. [Supabase Auth](https://supabase.com/docs/guides/auth), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)

---

## DEC-02. 1차 출시의 사용자 범위

- [X] `DEC-02-A` — 개인 계정 중심의 비공개 또는 초대 베타 — 권장
- [ ] `DEC-02-B` — 누구나 Google 계정으로 가입 가능한 공개 서비스
- [ ] `DEC-02-C` — 처음부터 팀 워크스페이스와 자료 공유 포함
- [ ] `DEC-02-D` — 처음부터 같은 문서의 실시간 공동 편집 포함

### 선택에 따른 차이

- `A`: 모든 자료를 `owner_id`로 소유하게 하며 가장 단순하고 안전합니다.
- `B`: 봇 방지, 요청 제한, 이용 안내, 개인정보 안내, 사용자별 저장 한도가 출시 전에 필요합니다.
- `C`: `workspace`, `member`, `role`, 초대·탈퇴·소유권 이전 구조가 처음부터 필요합니다.
- `D`: 편집 충돌 안내가 아니라 CRDT/OT 기반 공동 편집 체계가 필요하며 작업량이 크게 늘어납니다.

선택 메모:

---

## DEC-03. 가사 편집기 방식

- [X] `DEC-03-A` — **CodeMirror 6 + 순수 텍스트 저장** — 권장
- [ ] `DEC-03-B` — 기본 `textarea` + 별도 송폼 목차·미리보기
- [ ] `DEC-03-C` — Tiptap/Lexical 계열 구조화 리치 텍스트 편집기

### 판단 기준

- `A`: `[Verse]`, `[Hook]` 줄을 편집 화면 안에서 강조하고, 구간 선택·탐색·단축키를 확장하기 좋습니다. CodeMirror의 transaction과 decoration을 사용합니다. [CodeMirror 참고 문서](https://codemirror.net/docs/ref/)
- `B`: 모바일 한글 입력이 가장 단순하고 안정적이지만, 편집 중 송폼을 부분별로 꾸미기 어렵습니다.
- `C`: 굵게·표·이미지 같은 문서 편집에는 적합하지만, LyricsCloud의 복사·검색·diff·Suno 입력용 순수 텍스트 흐름에는 과합니다.

어느 방식을 골라도 가사 원본은 UTF-8 순수 텍스트로 저장합니다. 글꼴·글자 크기·자간·줄 간격은 본문과 분리된 표시 설정으로 저장합니다.

선택 메모:

---

## DEC-04. 모바일 설치·오프라인 범위

- [X] `DEC-04-A` — **설치 가능한 PWA + 온라인 우선 + 작성 중 초안 로컬 복구** — 권장
- [ ] `DEC-04-B` — 반응형 웹만 제공하고 서버에 연결된 동안만 편집
- [ ] `DEC-04-C` — 모든 곡·가사·라임·프롬프트를 완전 오프라인에서도 편집하고 나중에 동기화

### 권장안의 범위

- 입력 직후 현재 초안을 브라우저의 IndexedDB에 보관합니다.
- 약 1초간 입력이 멈추면 서버 저장을 시도합니다.
- 연결이 끊기면 `이 기기에 임시 저장됨`을 표시하고 재연결 후 다시 전송합니다.
- PWA 캐시는 앱 화면과 정적 자원에만 사용하며, 인증된 창작물 응답을 공용 캐시에 저장하지 않습니다.
- 로그아웃·계정 전환·탈퇴 시 해당 계정의 로컬 초안과 캐시를 제거합니다.

IndexedDB는 브라우저에서 구조화 데이터를 비동기로 보관할 수 있지만 서버 백업을 대신하지 않습니다. [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), [Dexie React 안내](https://dexie.org/docs/Tutorial/React)

선택 메모:

---

## DEC-05. 한국어 통합 검색 수준

- [X] `DEC-05-A` — **제목·본문·태그의 정확/부분 문자열 검색** — 권장
- [ ] `DEC-05-B` — 부분 검색 + 오타 유사 검색 + 한글 초성 검색
- [ ] `DEC-05-C` — 한국어 형태소 검색과 고급 순위까지 제공

### 판단 기준

- `A`: PostgreSQL `pg_trgm`과 GIN/GiST 인덱스로 `LIKE`/`ILIKE`, 부분 문자열, 유사도 검색을 지원합니다. 사용자별 데이터 규모에는 충분합니다. [PostgreSQL pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html)
- `B`: 초성 파생 값과 별도 검색 규칙이 추가됩니다.
- `C`: 전용 검색 서비스와 색인 동기화, 삭제 동기화, 별도 권한 보호가 필요합니다.

공통 규칙:

- 원문은 바꾸지 않고 검색 전용 값만 Unicode 정규화, 영문 소문자화, 공백 정리를 적용합니다.
- 결과 순위는 `제목 완전 일치 → 제목 시작 일치 → 제목 포함 → 태그 → 본문 → 최근 수정` 순서를 기본으로 합니다.
- 검색 결과와 스니펫도 현재 사용자의 삭제되지 않은 자료만 반환합니다.

선택 메모:

---

## DEC-06. 여러 기기·탭에서 동시에 편집할 때의 규칙

- [ ] `DEC-06-A` — **충돌을 감지하고 두 내용을 모두 보존한 뒤 사용자가 선택** — 권장
- [ ] `DEC-06-B` — 가장 마지막에 저장을 마친 내용이 무조건 최종본
- [X] `DEC-06-C` — Google Docs처럼 자동 병합되는 실시간 공동 편집

### 권장안의 동작

- 모든 편집 자료에 증가하는 `row_version`을 둡니다.
- 저장할 때 사용자가 열었던 버전과 서버 버전이 같은 경우에만 갱신합니다.
- 다르면 자동으로 덮어쓰지 않고 `내 내용`, `다른 기기 내용`, `내 내용을 복사본으로 저장`을 제시합니다.
- 같은 브라우저의 여러 탭은 `BroadcastChannel`로 중복 편집을 미리 알립니다.
- 실시간 연결은 공동 편집보다 다른 기기의 변경 감지와 목록 갱신에 사용합니다. Supabase는 PostgreSQL 변경 구독을 제공합니다. [Supabase Realtime](https://supabase.com/docs/guides/realtime/postgres-changes)

선택 메모:

---

## DEC-07. 자동 수정 기록 정책

- [X] `DEC-07-A` — **편집 중 5분 간격 + 화면 이탈·복원·복제·대규모 붙여넣기 전 스냅샷, 180일/항목당 200개 한도** — 권장
- [ ] `DEC-07-B` — 편집 중 15분 간격 + 중요 작업 전 스냅샷, 90일/항목당 100개 한도
- [ ] `DEC-07-C` — 모든 자동 저장을 수정 기록으로 남김
- [ ] `DEC-07-D` — 수정 기록을 기간·개수 제한 없이 보관
- [ ] `DEC-07-E` — 직접 지정: 간격 `______` / 기간 `______` / 항목당 개수 `______`

`사용자가 만든 가사 버전`과 `시스템 자동 수정 기록`은 별개입니다. 가사 버전은 계속 보관하는 독립 문서이고, 수정 기록은 실수 복구용 스냅샷입니다.

복원할 때는 현재 상태도 먼저 새 스냅샷으로 남기고, 과거 스냅샷을 지우지 않은 채 최신 상태로 다시 적용합니다.

선택 메모:

---

## DEC-08. 휴지통 보관 기간

- [X] `DEC-08-A` — **삭제 후 30일이 지나면 자동 완전 삭제** — 권장
- [ ] `DEC-08-B` — 삭제 후 90일이 지나면 자동 완전 삭제
- [ ] `DEC-08-C` — 사용자가 직접 완전 삭제할 때까지 계속 보관
- [ ] `DEC-08-D` — 직접 지정: `______일`

곡을 휴지통으로 보내면 소속 가사도 한 번에 숨깁니다. 삭제된 곡의 가사만 복원할 경우에는 부모 곡도 함께 복원하거나 새 곡으로 옮길지를 묻습니다.

수정 기록, 휴지통, 인프라 백업은 서로 다른 복구 수단입니다.

선택 메모:

---

## DEC-09. 회원 탈퇴 처리

- [X] `DEC-09-A` — **즉시 접근 차단, 7일 안에는 탈퇴 철회 가능, 이후 완전 삭제** — 권장
- [ ] `DEC-09-B` — 최종 확인 즉시 계정과 모든 자료를 완전 삭제
- [ ] `DEC-09-C` — 30일의 탈퇴 철회 기간 후 완전 삭제

공통 규칙:

- 탈퇴 직전에 Google 재인증을 요구합니다.
- 데이터 내보내기 기회를 먼저 제공합니다.
- 탈퇴 즉시 모든 세션을 종료하고 기기의 로컬 초안도 지웁니다.
- 완전 삭제는 브라우저가 아니라 서버의 관리자 작업으로만 실행합니다.

선택 메모:

---

# 2. 공개 출시 전에 필요한 선택

## DEC-10. 배포 방식과 지역

- [ ] `DEC-10-A` — **Vercel + Supabase, 데이터베이스는 서울 리전** — 국내 사용자 중심 권장
- [ ] `DEC-10-B` — Cloudflare 기반 웹 배포 + Supabase 서울 리전
- [X] `DEC-10-C` — Docker로 자체 운영, 서버와 PostgreSQL을 같은 지역에 배치
- [ ] `DEC-10-D` — 지금은 로컬 개발만 하고 배포 방식은 나중에 결정

Vercel은 Next.js를 별도 변환 없이 배포하는 경로를 제공하며, Supabase는 서울 리전을 지원합니다. 데이터베이스 지역은 주 사용자의 위치와 데이터 보관 지역을 고려해 프로젝트 생성 시 정합니다. [Vercel의 Next.js 배포](https://vercel.com/docs/frameworks/full-stack/nextjs), [Supabase 지원 지역](https://supabase.com/docs/guides/platform/regions)

선택 메모: **단, 일단은 서버와 DB 모두 로컬로 개발, 어느정도 개발 이후, 홈랩 서버로 이관 예정.
DB및 서버 모두  Docker 기반으로 만들어 쉽게 추후 개인이 셀프호스팅 서버를 사용 가능하도록 할 예정.**

---

## DEC-11. 오류 수집과 사용자 행동 분석

- [X] `DEC-11-A` — **오류·성능 정보만 수집하고 창작물 본문은 제거** — 권장
- [ ] `DEC-11-B` — 오류·성능 + 익명 사용 흐름 분석
- [ ] `DEC-11-C` — 외부 오류 수집과 행동 분석을 모두 사용하지 않음

어느 선택이든 서버 로그에는 가사, 라임, 프롬프트 본문, Google 토큰을 남기지 않습니다. 로그에는 자료 ID, 결과 상태, 처리 시간, 익명화된 오류 종류만 남깁니다.

선택 메모:

---

## DEC-12. 데이터베이스 백업 수준

- [X] `DEC-12-A` — **비공개 베타: 하루 1회 암호화된 별도 논리 백업, 목표 손실 범위 24시간** — 권장 시작안
- [ ] `DEC-12-B` — 공개 운영: 관리형 일일 백업 + 실제 복원 훈련
- [ ] `DEC-12-C` — 중요 운영: Point-in-Time Recovery, 목표 손실 범위 수분 단위
- [ ] `DEC-12-D` — 직접 지정: 목표 손실 범위 `______` / 복구 목표 시간 `______` / 보존 기간 `______`

Supabase는 유료 플랜에 일일 백업을 제공하며, 더 짧은 복구 지점은 별도 PITR 옵션입니다. 무료 프로젝트에는 정기적인 별도 논리 백업이 권장됩니다. [Supabase 백업 안내](https://supabase.com/docs/guides/platform/backups)

선택 메모:

---

## DEC-13. 사용자 데이터 내보내기

- [X] `DEC-13-A` — **1차 출시에 전체 자료 TXT/Markdown + JSON 묶음 내보내기 포함** — 권장
- [ ] `DEC-13-B` — 개별 가사·라임·프롬프트 복사만 제공하고 전체 내보내기는 이후 추가
- [ ] `DEC-13-C` — 직접 지정: `________________________________`

전체 내보내기는 서비스 이동, 계정 탈퇴 전 보관, 운영 장애 시 사용자 신뢰에 도움이 됩니다. 오디오나 이미지 첨부는 현재 기획 범위에 포함하지 않습니다.

선택 메모:

---

# 3. 권장 기본 기술 스택

아래는 `DEC-01-A`를 선택했을 때의 권장 구성입니다. 사용자 경험을 크게 바꾸지 않는 항목은 별도 체크 대상으로 만들지 않았습니다.

| 영역 | 권장 기술 | 사용 목적 |
|---|---|---|
| 언어 | TypeScript strict | 화면, 서버, 데이터 타입을 한 언어로 관리 |
| 런타임 | Node.js 24 LTS | 지원 중인 장기 지원 버전 사용 |
| 패키지 관리 | pnpm + lockfile | 의존성 버전 고정과 빠른 설치 |
| 웹 프레임워크 | Next.js App Router + React | 인증 화면, 작업 화면, 서버 작업, 라우팅 |
| UI | Tailwind CSS + shadcn/ui/Radix 계열 + CSS 변수 | 목업의 공통 컴포넌트, 키보드 접근성, 밝음·어두움 테마 |
| 아이콘 | Lucide React | 일관된 메뉴·행동 아이콘 |
| 폼 | React Hook Form + Zod | 곡·노트·프롬프트 입력과 검증 |
| 서버 데이터 | TanStack Query | 목록 캐시, 재시도, 저장 상태, 변경 후 갱신 |
| 화면 상태 | React state 우선, 필요할 때만 Zustand | 패널, 집중 모드, 선택 구간 등 일시 상태 |
| 데이터베이스 | Supabase PostgreSQL | 관계형 데이터, 검색, 수정 기록, 휴지통 |
| 인증 | Supabase Auth Google OAuth + 쿠키 세션 + PKCE | Google 로그인과 로그인 상태 유지 |
| 데이터 접근 | `@supabase/supabase-js` + SSR용 공식 패키지 | 브라우저·서버에서 사용자 세션에 맞춘 접근 |
| 사용자 격리 | PostgreSQL RLS | 모든 조회·생성·수정·삭제를 현재 사용자 자료로 제한 |
| 실시간 감지 | Supabase Realtime | 다른 기기에서 변경된 자료 감지와 목록 갱신 |
| 로컬 초안 | IndexedDB + Dexie | 네트워크 단절·탭 종료 전 미전송 입력 복구 |
| 가사 편집 | DEC-03 결과 | 송폼 파싱, 구간 이동, 구간 복사, 단축키 |
| 프롬프트 순서 | 접근 가능한 정렬 UI | 포인터 드래그와 `앞으로`·`뒤로` 버튼 병행 |
| 날짜 처리 | `Intl` 우선, 필요한 경우 `date-fns` | 사용자 시간대의 수정 시각 표시 |
| 단위 테스트 | Vitest + React Testing Library | 파서, 정규화, 화면 상태, 저장 상태 |
| 브라우저 테스트 | Playwright | PC·모바일 주요 흐름과 브라우저 차이 검증 |
| DB 보안 테스트 | Supabase DB 테스트/pgTAP | 다른 사용자의 자료에 접근할 수 없는지 검증 |
| CI | GitHub Actions | 타입 검사, 테스트, 빌드, 마이그레이션 검사 |
| 배포 | DEC-10 결과 | 미리보기 환경과 운영 환경 분리 |

Node.js 공식 릴리스 표에서 v24는 현재 LTS입니다. Next.js 공식 기본 구성은 TypeScript, App Router, Tailwind CSS를 지원합니다. 실제 프로젝트를 만들 때는 각 패키지의 당시 안정판을 설치하고 lockfile로 정확한 버전을 고정합니다. [Node.js 릴리스](https://nodejs.org/en/about/previous-releases), [Next.js App Router](https://nextjs.org/docs/app), [Next.js 설치](https://nextjs.org/docs/app/getting-started/installation), [Tailwind + Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs), [shadcn/ui + Next.js](https://ui.shadcn.com/docs/installation/next)

## 도입하지 않는 기본 항목

- Redux: 초기 화면 상태에는 불필요합니다.
- 별도 GraphQL 계층: 현재 CRUD와 검색 요구에는 추가 복잡도만 생깁니다.
- Elasticsearch/OpenSearch: `DEC-05-C`가 아니면 사용하지 않습니다.
- Firebase/Firestore: 관계, 버전, 통합 검색 요구가 PostgreSQL에 더 적합합니다.
- Google Drive·Gmail 권한: Google은 로그인에만 사용합니다.
- Suno 직접 API 연동: 현재는 복사·붙여넣기 흐름만 지원합니다.
- 리치 텍스트 HTML 저장: 검색, diff, 전체 복사, 송폼 파싱을 어렵게 만듭니다.
- 오디오·이미지 업로드: 현재 기획 범위 밖입니다.

---

# 4. 권장 애플리케이션 구조

| 영역 | 책임 |
|---|---|
| 브라우저 화면 | 편집, 검색, 필터, 복사, 집중 모드, 모바일 시트 |
| 편집 상태 | 현재 원고, 선택 구간, 송폼 목차, 저장 상태 |
| 로컬 초안 보관소 | 서버에 아직 전송되지 않은 최신 원고와 재시도 큐 |
| Next.js 서버 경계 | 로그인 보호, 회원 탈퇴, 완전 삭제, 내보내기 등 특권 작업 |
| Supabase Auth | Google 로그인, 세션 발급·갱신 |
| PostgreSQL | 최신 자료, 관계, 수정 기록, 휴지통, 검색 인덱스 |
| Realtime | 다른 기기의 변경 알림과 캐시 갱신 |
| 백업 저장소 | 서비스 데이터베이스와 분리된 복구 사본 |

일반 CRUD는 사용자 세션을 가진 Supabase 클라이언트와 RLS를 사용하고, 회원 탈퇴·대량 내보내기·완전 삭제 같은 작업은 서버 경계를 통과시킵니다. 관리자용 secret/service-role 키는 브라우저 번들에 절대 포함하지 않습니다.

Supabase SSR 방식은 쿠키 기반 세션을 지원합니다. 인증 판단에는 저장된 세션 객체만 신뢰하지 않고 검증된 claims 또는 최신 사용자 확인을 사용합니다. [Supabase 서버 세션](https://supabase.com/docs/guides/auth/server-side), [Supabase 서버 패키지 선택](https://supabase.com/docs/guides/auth/choosing-a-server-package)

---

# 5. 권장 데이터 구조

## 핵심 테이블

| 테이블 | 핵심 내용 |
|---|---|
| `profiles` | 사용자 표시 이름, 가입·탈퇴 상태 |
| `resources` | 공통 소유자, 자료 종류, 제목, 즐겨찾기, 핀, 색상, 생성·수정·삭제 시각, `row_version` |
| `songs` | 곡 상태, 설명, 작업 메모 |
| `lyrics` | 연결 곡, 순수 텍스트 본문, 가사 상태, 개별 표시 설정 |
| `rhyme_notes` | 자유 형식 라임 내용 |
| `prompts` | 프롬프트 설명과 연결 정보 |
| `prompt_tokens` | 프롬프트 요소의 표시 값, 정규화 값, 순서 |
| `tags` | 사용자별 라임 노트 태그 |
| `resource_tags` | 라임 노트와 태그의 연결 |
| `song_resource_links` | 곡과 라임 노트·프롬프트 연결 |
| `templates` | 가사 구조 또는 프롬프트 템플릿 |
| `resource_revisions` | 제목·본문·설정 스냅샷과 생성 사유 |
| `recent_items` | 마지막 열람 시각, 마지막 커서·송폼 위치 |
| `user_settings` | 테마와 기본 글쓰기 환경 |

## 데이터 무결성 원칙

- 모든 사용자 데이터는 `owner_id NOT NULL`이며 RLS를 적용합니다.
- 자식 자료가 다른 사용자의 부모 자료에 연결되지 않도록 소유자까지 함께 검증합니다.
- 프롬프트 태그는 쉼표 문자열 하나가 아니라 순서를 가진 항목으로 저장합니다.
- 같은 프롬프트 안에서 정규화 값이 같은 태그가 중복되지 않게 제한합니다.
- 서버 시간이 `created_at`, `updated_at`을 결정합니다.
- 생성·복제 요청은 재시도되어도 중복 생성되지 않게 고유 요청 ID를 사용합니다.
- 삭제는 `deleted_at`, 자동 삭제 예정은 `purge_at`을 사용합니다.
- 곡 삭제·복원과 소속 가사 처리는 한 작업 단위로 묶습니다.
- 최근 작업은 단순 조회와 수정을 구분할 수 있도록 `last_opened_at`을 별도로 둡니다.
- 원문과 검색용 정규화 값은 분리합니다.

---

# 6. 자동 저장·동기화 규칙

## 저장 흐름

1. 사용자가 입력합니다.
2. 현재 원고를 즉시 메모리와 IndexedDB에 기록합니다.
3. 마지막 입력 후 약 `800~1,000ms`가 지나면 저장 요청을 보냅니다.
4. 계속 입력하더라도 최대 `5초` 안에는 중간 저장을 시도합니다.
5. 같은 문서의 저장 요청은 순서대로 처리합니다.
6. 서버는 `row_version`이 일치할 때만 최신본을 갱신합니다.
7. 성공하면 로컬 미전송 표시를 제거하고 `서버에 저장됨`을 보여줍니다.
8. 실패하면 로컬 초안을 유지하고 재시도합니다.
9. 충돌이면 양쪽 내용을 모두 보존하고 DEC-06에서 선택한 방식으로 처리합니다.

## 화면에 표시할 상태

- `변경 내용 있음`
- `저장 중…`
- `서버에 저장됨`
- `이 기기에 임시 저장됨`
- `저장 실패 · 다시 시도 중`
- `다른 기기의 변경과 충돌`

## 반드시 다룰 입력 상황

- 한글 IME의 `compositionstart`부터 `compositionend`까지 조합 중간 문자를 확정 입력으로 취급하지 않음
- 붙여넣기와 대량 삭제
- 브라우저 새로고침과 강제 종료
- 모바일 가상 키보드와 화면 회전
- 같은 계정의 두 기기·두 탭 편집
- 로그아웃 직전 미전송 초안

---

# 7. 검색 설계

## 1차 검색 대상

- 곡 제목
- 가사 제목·본문
- 라임 노트 제목·본문·태그
- 프롬프트 제목·태그

## 기본 검색 방식

- 자료 유형별 검색 결과를 하나의 사용자 범위 검색 함수에서 합칩니다.
- 제목과 태그에는 높은 점수, 본문에는 기본 점수를 줍니다.
- `pg_trgm` 인덱스는 충분한 길이의 부분 문자열과 유사도 검색에 사용합니다.
- 1~2글자 검색은 인덱스 효과가 낮을 수 있으므로 실제 한국어 샘플로 성능을 측정합니다.
- `%`, `_` 같은 검색 문자는 정규식이 아니라 문자 그대로 찾도록 처리합니다.
- 검색 스니펫은 HTML로 신뢰하지 않고 안전하게 이스케이프한 뒤 일치 부분만 표시합니다.

PostgreSQL은 내장 Full Text Search를 제공하지만, 한국어 가사의 부분 문자열 요구에는 기본 언어별 형태소 처리만 가정하지 않습니다. [Supabase PostgreSQL 검색](https://supabase.com/docs/guides/database/full-text-search), [PostgreSQL pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html)

---

# 8. 인증·보안 원칙

## Google 로그인

- 요청 권한은 `openid`, `email`, `profile`만 사용합니다.
- Google Drive, Gmail, YouTube 등 추가 권한을 요청하지 않습니다.
- Google API를 호출하지 않으므로 provider access/refresh token을 별도 저장하지 않습니다.
- Authorization Code + PKCE 흐름과 정확한 redirect 허용 목록을 사용합니다.
- 이메일 문자열이 아니라 인증 공급자의 고정 사용자 ID로 계정을 식별합니다.
- 로그인 후 이동 주소는 앱 내부의 허용된 경로만 받습니다.

Supabase는 Google OAuth 설정과 PKCE 기반 서버 인증 흐름을 안내합니다. [Supabase Google 로그인](https://supabase.com/docs/guides/auth/social-login/auth-google)

## 데이터 접근

- `profiles`, `resources`, 모든 하위 자료, 태그, 연결, 수정 기록에 RLS를 적용합니다.
- `SELECT`, `INSERT`, `UPDATE`, `DELETE`를 각각 검사합니다.
- 검색용 함수와 뷰에도 같은 사용자 범위를 적용합니다.
- 서로 다른 두 테스트 사용자로 교차 계정 접근 차단을 자동 검증합니다.
- 관리자 키는 회원 탈퇴·운영 정리처럼 제한된 서버 작업에서만 사용합니다.

## 창작물 보호

- 제목, 가사, 라임, 프롬프트는 사용자 HTML이 아니라 순수 텍스트로 처리합니다.
- 사용자 입력을 `dangerouslySetInnerHTML`로 출력하지 않습니다.
- 인증된 화면과 API 응답을 CDN 공용 캐시에 저장하지 않습니다.
- 오류 추적, 분석, 서버 로그에 창작물 본문이나 OAuth 토큰을 전송하지 않습니다.
- 복사 기능이 브라우저 권한 때문에 실패하면 선택 영역 표시와 수동 복사 대안을 제공합니다.

---

# 9. 테스트 기준

## 단위 테스트

- 송폼 태그 파서와 목차 위치 계산
- 프롬프트 태그 정규화·중복 제거·순서 변경
- 검색어 정규화와 특수문자 처리
- 자동 저장 상태 전환과 재시도 순서
- 수정 기록 생성 조건
- 휴지통 복원 규칙

## 화면·통합 테스트

- 곡 생성 → 가사 작성 → 자동 저장 → 다시 열기
- 가사 복제 → 버전 비교 → 이전 상태 복원
- 라임 노트 삽입과 전체·선택 복사
- 프롬프트 자동완성, 중복 안내, 순서 변경, 복사
- 통합 검색 → 원래 자료와 송폼 위치 열기
- 곡 삭제 → 소속 가사 숨김 → 복원
- Google 로그인, 세션 갱신, 로그아웃, 탈퇴 철회·완전 삭제

## 위험 시나리오 테스트

- 사용자 A가 사용자 B의 ID를 직접 요청해도 읽기·수정·검색 불가
- 네트워크 단절 후 입력하고 재연결했을 때 손실 없음
- 두 기기에서 같은 가사를 수정했을 때 무음 덮어쓰기 없음
- 한글 IME 조합 중 잘린 글자나 중복 저장 없음
- iOS Safari와 Android Chrome의 긴 텍스트 선택·복사·가상 키보드
- PWA 업데이트 중 미전송 초안이 있을 때 강제 새로고침 없음
- 백업으로 별도 환경에 실제 복원 가능

Playwright는 Chromium, Firefox, WebKit과 모바일 에뮬레이션을 지원합니다. GitHub Actions에서는 타입 검사, lint, 단위 테스트, DB/RLS 테스트, E2E 핵심 흐름, 운영 빌드를 순서대로 실행합니다. [Playwright](https://playwright.dev/docs/intro), [GitHub Actions Node.js CI](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs)

---

# 10. 환경 분리·배포 원칙

- `local`, `preview/staging`, `production` 데이터베이스와 인증 redirect를 분리합니다.
- 데이터베이스 변경은 SQL migration으로 남기고 테스트 후 순서대로 적용합니다.
- destructive migration은 자동 운영 배포에 포함하지 않습니다.
- 브랜치 또는 Pull Request마다 미리보기 환경에서 핵심 흐름을 확인합니다.
- 운영 배포 전에 RLS, 인덱스, 요청 제한, 백업, 복원 절차를 확인합니다. [Supabase 운영 체크리스트](https://supabase.com/docs/guides/deployment/going-into-prod)
- 공개 환경의 비밀 값은 저장소와 클라이언트 코드에 넣지 않습니다.

## 환경 값 분류

| 종류 | 노출 범위 |
|---|---|
| Supabase 프로젝트 URL | 클라이언트 사용 가능 |
| Supabase publishable key | RLS를 전제로 클라이언트 사용 가능 |
| Supabase secret/service-role key | 서버 전용, 클라이언트 금지 |
| Google OAuth client secret | Supabase 인증 설정 또는 서버 비밀 저장소 전용 |
| 오류 추적 전송 키 | 공개용·서버용을 분리하고 본문 제거 규칙 적용 |

---

# 11. 구현 순서

1. 이 문서의 선택 확정
2. 프로젝트 기본 구성, 공통 테마, 라우팅, 개발·검사 명령
3. Google 로그인과 사용자별 데이터 격리
4. 공통 자료 구조, 곡 목록, 새 곡, 곡 대시보드
5. 가사 편집기, 송폼 파서, 전체·구간 복사
6. 로컬 초안, 자동 저장, 충돌 감지, 수정 기록
7. 라임 노트와 가사 삽입
8. 프롬프트 태그, 자동완성, 중복 제거, 순서 변경
9. 통합 검색, 최근 작업, 즐겨찾기, 핀, 휴지통
10. 템플릿, 사용자 설정, 테마, 단축키
11. DEC-04에 따른 PWA·오프라인 범위
12. 데이터 내보내기, 탈퇴, 자동 완전 삭제 작업
13. 보안·성능·모바일·백업 복원 검증
14. 미리보기 배포 후 공개 출시

---

# 12. 1차 기본 제외 범위

아래 기능은 해당 선택에서 명시하지 않는 한 1차 구현에 넣지 않습니다.

- 여러 사용자의 실시간 공동 편집
- 공개 가사 페이지와 외부 공유 링크
- AI 가사 생성·교정·추천
- Suno 계정 또는 생성 API 직접 연동
- 음원·이미지·동영상 업로드
- Google Drive 동기화
- 네이티브 iOS·Android 앱
- 결제와 요금제
- 운영자용 창작물 열람 화면

---

# 13. 최종 선택 확인

필수 확인:

- [X] `CHECK-01` — `DEC-01`부터 `DEC-09`까지 각 묶음에서 하나만 선택했습니다.
- [X] `CHECK-02` — 공개 출시 전 `DEC-10`부터 `DEC-13`까지의 선택 또는 결정 시점을 확인했습니다.
- [ ] `CHECK-03` — 선택 메모에 필요한 예외와 우선순위를 적었습니다.
- [X] `FINAL-APPROVAL` — 이 문서의 선택을 기준으로 구현해도 됩니다.

선택 확정일: `2026-09-04`  
선택자 메모:

---

# 14. 공식 참고 문서

- [Next.js App Router](https://nextjs.org/docs/app)
- [Node.js 지원 릴리스](https://nodejs.org/en/about/previous-releases)
- [Tailwind CSS와 Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- [shadcn/ui와 Next.js](https://ui.shadcn.com/docs/installation/next)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Google 로그인](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Supabase 데이터베이스 백업](https://supabase.com/docs/guides/platform/backups)
- [Supabase 지원 지역](https://supabase.com/docs/guides/platform/regions)
- [PostgreSQL pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html)
- [CodeMirror 6 Reference](https://codemirror.net/docs/ref/)
- [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Playwright](https://playwright.dev/docs/intro)
- [GitHub Actions Node.js CI](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs)
