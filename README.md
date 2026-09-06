# LyricsCloud

LyricsCloud는 Suno 음악 제작 과정의 곡, 여러 가사 버전, 라임 노트, 생성 프롬프트를 하나의 창작 흐름으로 연결하는 개인용 웹 워크스페이스입니다. PC에서의 집중 편집과 모바일에서의 빠른 확인·수정·복사를 모두 지원하는 것을 목표로 합니다.

## 현재 상태

- 완료 기록: `0.0.0`~`0.4.0`, `0.5.0 Phase 1~3`; `0.5.0 Phase 4`는 원격 인수 중
- 현재 단계: [`0.5.0/4phase.md`](<./0.Plans/1. Dev-phase/0.5.0/4phase.md>) — CI·image·동일 SHA 개발 배포·공개 smoke
- 상태 원본: [`STATUS.md`](<./0.Plans/1. Dev-phase/STATUS.md>)
- 애플리케이션 코드: Google 로그인·소유권, 곡·가사 CRUD, 라임 노트·태그·곡 연결, 프롬프트 목록·토큰 편집·자동완성·중복 정리·접근 가능한 순서 변경·정확한 복사·복제·곡 연결, CodeMirror 편집·복사, 동일 owner CRDT 동기화, 수정 기록·비파괴 복원
- 개인 OAuth·수정 기록의 로컬 검증: [`Phase 4 기록`](./docs/runbooks/0.3.1-phase4-local-validation.md)
- 다중 탭·장애 복구·초안 보존 검증과 남는 인수 항목: [`Phase 5 기록`](./docs/runbooks/0.3.1-phase5-local-validation.md)
- 인수인계·로컬 실행·현재 검증 한계: [`0.3.1 로컬 검토`](./docs/runbooks/0.3.1-local-handoff-review.md)
- 기획, 화면 목업, 기술 선택, `0.0.0 → 1.0.0` 실행 계획과 Docker 개발 골격: 준비됨
- 기준선 검증: [`0.0.0 통합 검증 보고서`](./docs/runbooks/0.0.0-release-readiness.md) 통과, 원격 Phase 브랜치 확인 완료

실행 가능한 패키지 설정과 Docker 구성은 승인된 ADR-0001~0009와 현재 Phase 계약을 따릅니다. `main`의 초기 기준선과 개발 중인 `phase/**` 브랜치를 구분합니다.

## 목표

- 한 곡에 여러 가사 버전을 안전하게 작성·복제·비교·복원
- 송폼 탐색, 전체·구간 복사, 집중 모드를 갖춘 가사 편집 환경
- 라임 노트의 태그·검색·복사와 가사 커서 위치 삽입
- Suno 프롬프트의 태그 자동완성·중복 정리·순서 변경·복사
- 곡 중심 대시보드와 연결 자료, 최근 작업, 즐겨찾기, 핀, 통합 검색
- 자동 병합 동기화, 로컬 초안, 수정 기록, 휴지통, 내보내기로 창작물 보호
- 15개 화면의 PC·모바일 경험과 설치 가능한 온라인 우선 PWA

## 승인된 구현 기준 요약

[`Implementation-Stack.md`](./0.Plans/Implementation-Stack.md)의 저장된 체크 상태가 기준입니다.

| 영역 | 현재 선택 |
|---|---|
| 운영 | 서버·DB를 로컬 Docker에서 개발한 뒤 홈랩으로 이관 가능한 자체 운영 Node.js + PostgreSQL |
| 사용자 범위 | 개인 계정 중심 비공개 또는 초대 베타 |
| 편집 | CodeMirror 6, UTF-8 순수 텍스트 |
| 모바일 | 설치형 PWA, 온라인 우선, 작성 중 초안 로컬 복구 |
| 검색 | 제목·본문·태그의 정확·부분 문자열 검색 |
| 동기화 | CRDT/OT 계열 자동 병합. 현재 계획은 동일 계정의 여러 기기·탭으로 한정하며 ADR-0004에서 확정 |
| 수정 기록 | 5분 간격 및 중요 작업 전, 180일·항목당 200개 한도 |
| 삭제 | 휴지통 30일, 탈퇴 철회 7일 |
| 운영 안전 | 창작물 본문을 제외한 오류·성능 수집, 매일 암호화 논리 백업 |
| 이동성 | TXT/Markdown + JSON 전체 내보내기 |

`DEC-02-A`와 `DEC-06-C`의 결합은 1.0에서 “다른 사용자와 공유”가 아니라 “같은 사용자의 여러 기기·탭에서 자동 병합”하는 것으로 [`ADR-0004`](./docs/adr/ADR-0004-collaboration-scope.md)에서 확정했습니다. 여러 사용자 공동 작업으로 넓히려면 구현 전에 기획·권한 모델을 별도로 승인해야 합니다.

## 주요 디렉터리

| 경로 | 역할 |
|---|---|
| [`0.Plans`](./0.Plans/) | 변경 보호 대상인 기획·목업·기술 결정과 버전별 실행 계획 |
| [`apps`](./apps/) | 웹, 실시간 동기화, 백그라운드 작업 애플리케이션 경계 |
| [`packages`](./packages/) | 도메인, DB, 편집기, UI, 공통 설정 패키지 경계 |
| [`tests`](./tests/) | E2E, 통합, DB 격리, 안전한 테스트 fixture |
| [`infra`](./infra/) | 자체 운영 Docker, 프록시, 백업·복원 구성 |
| [`docs`](./docs/) | ADR, 아키텍처, 데이터 모델, 보안, 운영 runbook |
| [`scripts`](./scripts/) | 반복 가능하고 검증 가능한 개발·운영 보조 명령 |

위 애플리케이션·패키지 하위 경계는 ADR-0001~0009에 맞춰 `0.0.0`에서 확정·검증한 실행 기준선입니다.

## 개발 시작 방법

1. [`Agent.md`](./Agent.md)에서 저장소 작업 규칙을 읽습니다.
2. [`STATUS.md`](<./0.Plans/1. Dev-phase/STATUS.md>)에서 현재 버전과 Phase를 확인합니다.
3. 해당 Phase 문서의 선행 조건과 범위를 확인하고 담당자·시작 시각을 `STATUS.md`에 기록합니다.
4. Phase의 체크리스트만 구현하고 명시된 검증을 실행합니다.
5. 완료 조건을 모두 충족한 뒤 Phase 문서와 `STATUS.md`, 필요한 경우 [`CHANGELOG.md`](./CHANGELOG.md)를 갱신합니다.

로컬 실행은 `.env.example`을 `.env`로 복사해 값을 설정한 뒤 `docker compose up --build --wait`를 사용합니다. 기본 주소는 `http://localhost:8080`이며 상세 절차는 [`infra/docker/README.md`](./infra/docker/README.md)를 따릅니다.

## 기준 문서

- 제품 요구사항: [`Sketch.md`](./0.Plans/Sketch.md)
- 화면·상태 기준: [`Mock-up/README.md`](./0.Plans/Mock-up/README.md)
- 구현 결정: [`Implementation-Stack.md`](./0.Plans/Implementation-Stack.md)
- 전체 로드맵: [`1. Dev-phase/README.md`](<./0.Plans/1. Dev-phase/README.md>)
- 요구사항 추적: [`Requirements-Traceability.md`](<./0.Plans/1. Dev-phase/Requirements-Traceability.md>)
- 결정 권한: [`Decision-Ownership.md`](<./0.Plans/1. Dev-phase/Decision-Ownership.md>)

## 협업 원칙

- 한 작업은 한 버전·한 Phase의 완료 조건에 맞춰 작게 유지합니다.
- 같은 파일을 여러 작업자가 동시에 맡지 않도록 먼저 소유 범위를 기록합니다.
- 데이터 모델 변경은 migration과 검증을 함께 제출합니다.
- 실제 사용자 가사·토큰·백업·내보내기 파일을 저장소에 넣지 않습니다.
- 원본 기획 문서는 명시적인 기획 변경 요청이 없으면 수정하지 않습니다.
