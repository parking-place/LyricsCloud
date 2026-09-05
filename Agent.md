# LyricsCloud AI Agent 작업 지침

이 문서는 LyricsCloud에서 작업하는 모든 AI Agent의 공통 실행 규칙입니다. 대화 기록이 없어도 아래 순서를 따르면 현재 작업을 안전하게 이어갈 수 있어야 합니다.

## 1. 작업 시작 전 필수 확인

다음 문서를 순서대로 읽습니다.

1. [`0.Plans/Implementation-Stack.md`](./0.Plans/Implementation-Stack.md)의 실제 체크 상태와 `FINAL-APPROVAL`
2. [`0.Plans/Sketch.md`](./0.Plans/Sketch.md)
3. [`0.Plans/Mock-up/README.md`](./0.Plans/Mock-up/README.md)와 작업 화면의 `README.md`, `mockup.html`
4. [`0.Plans/1. Dev-phase/STATUS.md`](<./0.Plans/1. Dev-phase/STATUS.md>)
5. [`0.Plans/1. Dev-phase/Decision-Ownership.md`](<./0.Plans/1. Dev-phase/Decision-Ownership.md>)에서 현재 작업이 소비하는 결정 ID와 상태
6. 현재 버전 폴더의 `1phase.md`부터 현재 Phase까지
7. 작업 경로에 더 가까운 `AGENTS.md`가 있다면 그 지침

기준이 충돌하면 체크 완료된 구현 결정이 기술 방향을 정하고, `Sketch.md`가 기능 범위를 정하며, 페이지 README와 정적 목업이 화면 구성과 상태 표현을 정합니다. 아키텍처는 `ADR-*`, 사용자 동작은 `PROD-*`, 출시·운영 정책은 `OPS-*`의 승인 기록을 따르며 해결되지 않는 충돌은 해당 결정 또는 사용자 승인을 받기 전까지 코드로 고정하지 않습니다.

## 2. 현재 작업 범위 확인

- `STATUS.md`의 `current_version`, `current_phase`, `state`를 단일 진행 상태 원본으로 사용합니다.
- 시작 전 담당 Agent, 시작 시각, 수정할 경로를 `STATUS.md`의 활성 작업 표에 기록합니다.
- 현재 Phase의 고유 작업 ID만 수행합니다.
- 다음 Phase나 다음 버전의 기능을 편의상 미리 구현하지 않습니다.
- 선행 조건이 완료되지 않았으면 우회 구현을 만들지 않고 상태와 원인을 기록합니다.
- 범위 밖에서 발견한 일은 현재 구현에 섞지 않고 `STATUS.md`의 발견 사항에 남깁니다.

## 3. 보호해야 할 기준 문서

다음 경로는 사용자의 명시적인 변경 요청 없이는 수정·이동·삭제하지 않습니다.

- `0.Plans/Sketch.md`
- `0.Plans/Mock-up/**`
- `0.Plans/Implementation-Stack.md`

`0.Plans/1. Dev-phase/**`는 실행 상태를 반영하기 위해 체크박스와 인계 내용을 갱신할 수 있습니다. 다만 버전 범위 자체를 바꾸려면 이유와 영향 범위를 먼저 기록해야 합니다.

## 4. 확정된 기술 방향 준수

- 자체 운영 Docker + Node.js + PostgreSQL 구성을 전제로 합니다.
- 비공개·초대 베타 범위를 유지합니다.
- 창작물 본문은 UTF-8 순수 텍스트로 저장하고 사용자 HTML로 렌더링하지 않습니다.
- 가사 편집은 CodeMirror 6을 기준으로 합니다.
- 온라인 우선 PWA와 계정별 로컬 초안 복구를 제공합니다.
- 검색은 PostgreSQL의 정확·부분 문자열 검색을 우선합니다.
- 현재 계획은 같은 사용자의 여러 기기·탭만 자동 병합하고 다른 사용자 공유를 제외합니다. `ADR-0004`가 Accepted 되기 전에는 이 해석을 구현으로 고정하지 않습니다.
- 수정 기록, 휴지통, 인프라 백업을 서로 다른 복구 계층으로 유지합니다.
- 확정되지 않은 인증·ORM·CRDT 서버·프록시·관측 도구는 승인된 ADR 없이 교체하거나 추가하지 않습니다.

## 5. 코드와 데이터 변경 원칙

- 기존 변경은 다른 사람의 작업일 수 있으므로 이유 없이 되돌리거나 전면 교체하지 않습니다.
- 데이터베이스 변경은 순서가 있는 migration으로만 수행하고 역방향 또는 복구 절차를 적습니다.
- destructive migration, 운영 볼륨 삭제, 백업 삭제는 별도 승인 없이 실행하지 않습니다.
- 사용자 소유 데이터에는 명시적 소유자와 서버 측 접근 검사를 적용합니다. RLS를 채택한 ADR이 있다면 애플리케이션 검사와 RLS를 함께 유지합니다.
- 인증 또는 소유권 경계를 바꾸면 두 사용자 교차 접근 차단 테스트를 추가합니다.
- 생성·복제·재시도 경로는 중복 생성 방지 키를 사용합니다.
- 제목·본문·태그를 로그, 오류 추적, 분석 이벤트에 넣지 않습니다.
- 테스트 fixture에는 실제 가사나 개인정보를 사용하지 않습니다.

## 6. 편집·동기화 변경 원칙

- 한글 IME의 조합 중간 값을 확정 입력으로 처리하지 않습니다.
- CRDT 원본, PostgreSQL 검색용 평문 투영본, 수정 기록 스냅샷의 책임을 섞지 않습니다.
- 로컬 저장소는 계정과 문서 ID로 격리하고 로그아웃·계정 전환·탈퇴 때 정리합니다.
- PWA 업데이트는 미전송 변경을 가진 화면을 강제로 새로고침하지 않습니다.
- 편집 관련 변경은 최소한 한글 IME, 오프라인 재연결, 여러 탭, 모바일 가상 키보드 시나리오를 확인합니다.

## 7. 화면 구현 원칙

- 화면을 처음 구현하는 Phase에서 PC와 모바일 구성을 함께 만듭니다.
- 목업의 색상·공간·정보 위계를 공통 토큰과 재사용 컴포넌트로 옮깁니다.
- 색상만으로 상태를 전달하지 않고 텍스트나 아이콘을 함께 제공합니다.
- 길게 누르기와 드래그는 보조 동작으로만 사용하며 보이는 버튼·키보드 대안을 둡니다.
- 저장, 복사, 실패, 동기화 지연 결과는 문장으로 알리고 보조 기술에도 전달합니다.
- 기능이 없는 빈 화면 대신 다음 행동을 안내합니다.
- 정적 목업의 `pointer-events: none` 같은 시연용 설정을 제품 코드에 복사하지 않습니다.

## 8. 여러 Agent 협업

- 시작 전에 활성 작업 표에서 파일 소유권이 겹치지 않는지 확인합니다.
- 가능하면 화면, DB, 테스트처럼 파일 경계가 분명한 단위로 병렬화합니다.
- 공통 타입이나 schema를 바꿀 Agent를 먼저 정하고 소비자는 해당 변경을 기준으로 작업합니다.
- 다른 Agent의 미완성 변경을 정리한다는 이유로 삭제하거나 덮어쓰지 않습니다.
- 충돌이 예상되면 상태 문서에 의존성을 기록하고 담당자에게 인계합니다.
- 완료 시 변경 파일, migration, 실행한 검증, 남은 위험을 인계 기록에 남깁니다.

## 9. 검증과 완료 처리

- Phase 문서의 검증 명령과 수용 기준을 모두 통과해야 완료로 표시합니다.
- 실행하지 못한 검증을 통과한 것으로 기록하지 않습니다.
- 실패한 테스트를 삭제·완화하거나 범위를 줄여 통과시키지 않습니다.
- 기능 변경은 정상 흐름뿐 아니라 빈 상태, 오류, 권한 없음, 모바일 상태를 확인합니다.
- 완료 후 현재 Phase 체크리스트, `STATUS.md`, 사용자 관점 변화가 있으면 `CHANGELOG.md`를 갱신합니다.
- Phase 산출물과 상태 문서를 한 커밋 또는 의미가 분명한 작은 커밋들로 정리하고 Phase 전용 원격 브랜치에 push합니다.
- 원격 branch가 해당 로컬 commit을 가리키고 필수 CI가 통과한 뒤 그 **정확한 commit**을 개발 서버에 배포합니다.
- 개발 서버의 migration과 컨테이너 health, 공개 HTTPS의 live·ready 및 변경 기능 smoke test를 통과하고 배포 SHA를 기록하기 전에는 Phase 완료를 사용자에게 보고하거나 다음 Phase로 이동하지 않습니다.
- 인증·네트워크·원격 거부로 push하지 못하면 완료로 간주하지 않고 `STATUS.md`를 `review` 또는 실제 원인에 맞는 상태로 남기며, 실패 원인과 재시도 명령을 인계합니다.
- 개발 서버 배포나 공개 검증에 실패해도 완료로 간주하지 않습니다. 기존 개발 배포를 임의로 지우지 않고 상태를 `review`로 남긴 뒤 실패 단계, 현재·목표 SHA와 안전한 재시도 또는 rollback 절차를 인계합니다.
- 버전의 다섯 Phase가 모두 완료되고 버전 완료 기준이 충족된 뒤에만 다음 버전으로 이동합니다.

## 10. GitHub 협업

- 한 PR은 원칙적으로 한 Phase 또는 서로 독립된 한 작업 묶음만 다룹니다.
- 브랜치와 PR 제목에 버전·Phase를 포함합니다.
- PR 설명에 관련 작업 ID, 기준 화면, DB 영향, 검증 결과, 남은 위험을 씁니다.
- Phase 완료 시 `git push -u origin <phase-branch>`를 실행하고 원격 commit 반영을 확인합니다. 후속 commit이 생기면 같은 브랜치에 다시 push합니다.
- 직접 `main`에 push하지 않고 Phase 브랜치와 PR을 사용하며, 필수 검사를 통과한 변경만 병합합니다.
- 비밀 값, `.env`, DB 볼륨, 백업, export 묶음, 실제 사용자 자료를 커밋하지 않습니다.
- 배포·migration·백업 복원처럼 운영 상태를 바꾸는 작업은 승인과 runbook을 확인합니다.

Phase 완료 순서는 `로컬 수용 테스트 → commit → 원격 push와 SHA 일치 확인 → 필수 CI → version·commit SHA·Dev·Dev-latest tag를 포함한 Docker Hub image 발행 → 개발 서버에 같은 SHA 배포 → 공개 개발 주소 smoke test → 상태·배포 기록`으로 고정합니다. Docker Hub 초기 연결 전에는 발행 job이 비활성 상태임을 완료 보고에 명시하고, 연결 이후에는 발행 실패를 건너뛰지 않습니다. 구체적인 명령과 중단·되돌림 기준은 [`개발 서버 배포 runbook`](./docs/runbooks/development-deploy.md)과 [`Docker Hub 발행 runbook`](./docs/runbooks/dockerhub-publish.md)을 따릅니다.

## 11. 서버 정보와 환경별 운영 권한

- 개발·릴리스 서버의 주소, 계정, 비밀번호, 키, 복구 코드, OAuth 비밀 값은 Git에서 제외된 `.private/`에만 기록합니다.
- Google OAuth 테스트 계정 메일은 각 환경에서 Git과 Docker build context에서 제외된 `.test_users`에 한 줄에 하나씩 기록합니다. 애플리케이션 허용 목록에는 자동 반영되지만 Google Console의 Test users에는 수동으로 등록합니다. 개발·릴리스 파일을 합치거나 다른 환경으로 복사하지 않습니다.
- `.private/`와 `.test_users`의 내용은 `git add -f`로 강제 추가하지 않으며 이슈, PR, 채팅, 터미널 출력, 로그에도 노출하지 않습니다. 작업 중 필요한 경우에도 값 자체가 아니라 설정 여부와 참조 위치만 보고합니다.
- 개발 서버는 사용자가 요청한 작업 범위 안에서 변경할 수 있습니다.
- 검증을 마친 Phase commit은 위 완료 순서에 따라 개발 서버에 자동 반영합니다. 서버의 tracked 변경이나 목표 SHA 불일치, 필수 secret 누락이 발견되면 덮어쓰지 않고 중단합니다.
- 릴리스 서버는 사용자가 **현재 요청에서 릴리스 서버 변경을 명시적으로 지시한 경우에만** 상태를 변경합니다. 배포, 재시작, 환경변수, migration, 데이터, 방화벽, DNS, TLS, 리버스 프록시, OAuth 클라이언트, 백업·복원 변경이 모두 이에 포함됩니다.
- 릴리스 서버 변경 지시가 없으면 진단과 계획 수립까지만 수행하고, 실행 명령도 자동 적용하지 않습니다.
- 서버 주소나 공개 origin이 바뀌면 `.private/server-inventory.local.md`의 Google OAuth 변경 절차에 따라 대상 환경의 redirect URI, JavaScript origin, Branding, Audience, 앱 허용 메일을 함께 점검합니다.
- 릴리스 변경을 수행한 경우 `.private/server-inventory.local.md`의 승인·변경 기록에 요청 내용, 변경 대상, 배포 버전, 검증 및 되돌리기 결과를 남깁니다. 비밀 값은 기록하지 않습니다.

## 12. Docker 저장소 정리

- 로컬 수용 테스트나 개발·릴리스 배포에서 Docker image를 build한 작업은 검증 성공 뒤 [`scripts/cleanup-docker.sh`](./scripts/cleanup-docker.sh)를 실행해 LyricsCloud의 중지 컨테이너, 미사용 image와 network를 정리합니다. 별도 Compose project name으로 검증했다면 그 이름도 `--project`로 각각 정리합니다.
- 개발·릴리스 전용 서버에서는 같은 스크립트의 `--build-cache` 옵션으로 사용하지 않는 BuildKit cache도 정리합니다. 로컬에서도 Phase Docker 검증이 끝나면 같은 명령을 사용합니다.
- 정리는 새 컨테이너의 health와 필수 asset 검증 뒤에만 실행합니다. 그 전에 실패한 배포의 조사·rollback에 필요한 container와 image는 원인이 확인될 때까지 보존합니다.
- Docker volume은 정리 명령에 포함하지 않습니다. 특히 PostgreSQL, 백업, 의존성 volume은 사용자의 별도 명시적 승인 없이 prune하거나 삭제하지 않습니다.
- 릴리스 서버의 정리는 릴리스 변경이 명시적으로 승인된 작업 안에서만 실행하며, 이 규칙이 릴리스 서버에 임의로 접속하거나 배포할 권한을 만들지는 않습니다.

## 13. Docker Hub image 발행

- GitHub Actions의 전체 `verify` job을 통과한 push만 `parkingplace/lyricscloud-web`, `parkingplace/lyricscloud-collaboration`, `parkingplace/lyricscloud-worker`, `parkingplace/lyricscloud-migrate` 발행 대상으로 사용합니다.
- 개발 발행은 각 repository에 `<version>`, 전체 `<commit SHA>`, `Dev`, `Dev-latest` 네 tag를 같은 image digest로 발행합니다.
- 릴리스 발행은 위 네 tag에 `Release`, `latest`를 추가합니다. 사용자의 명시적 릴리스 지시가 있고 수동 workflow가 정확한 `v<VERSION>` Git tag에서 `release=true`로 실행될 때만 허용합니다.
- `VERSION`, `STATUS.md`의 `current_version`, runtime의 기본 `APP_VERSION`을 함께 갱신합니다. 서로 다르면 image 발행을 중단합니다.
- Docker Hub token은 GitHub Actions secret `DOCKERHUB_TOKEN`에만 저장하고 저장소, 로컬 문서, 명령 인수나 로그에 기록하지 않습니다. 로그인 username은 Actions variable로 관리합니다.
- 발행 성공 시 repository별 필수 tag와 digest 일치를 CI 증거로 확인합니다. Docker Hub 연결이 활성화된 뒤에는 발행 실패 상태로 개발 서버 배포나 Phase 완료를 진행하지 않습니다.
