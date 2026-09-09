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

후속 기능을 검토하거나 P6 이후 작업을 인수할 때는 [후속 계획 안내](./0.Plans/2.Patch-phase/README.md)를 읽습니다. 그 폴더의 STATUS는 계획 상태이며, P6 인수 전 실행 상태 원본은 위 기존 STATUS입니다.

기준이 충돌하면 체크 완료된 구현 결정이 기술 방향을 정하고, `Sketch.md`가 기능 범위를 정하며, 페이지 README와 정적 목업이 화면 구성과 상태 표현을 정합니다. 아키텍처는 `ADR-*`, 사용자 동작은 `PROD-*`, 출시·운영 정책은 `OPS-*`의 승인 기록을 따르며 해결되지 않는 충돌은 해당 결정 또는 사용자 승인을 받기 전까지 코드로 고정하지 않습니다.

## 2. 현재 작업 범위 확인

후속 번호와 배분은 [VERSIONING](./0.Plans/2.Patch-phase/VERSIONING.md)을 따릅니다. **major는 사용자 명시 지시 전까지 1 고정**이며 minor/patch는 다자리 정수입니다. 현재 제품 단계의 변경은 다음 가용 patch를 우선하고 새 OS·기능·UI·자릿수로 minor를 자동 올리지 않습니다. 각 버전은 기본 5 Phase이며 의존성·업무량에 따라 더 둘 수 있습니다. 1.0.1은 10 Phase, 긴급 CLI는 P2이며 빈 Phase로 수를 채우지 않습니다. 이미 발행된 버전·Git·migration 이력은 보존합니다.

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
- 현재 1.0.0 실행 범위는 같은 사용자의 여러 기기·탭 자동 병합입니다. 다사용자 공동 편집·보기·presence/cursor는 후속 1.1.x 계획에서 별도 계약과 인수로 확장합니다. `ADR-0004`가 Accepted 되기 전에는 이 해석을 구현으로 고정하지 않습니다.
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

- 현재 계획 정비는 문서 담당자 한 명이 작성하고 부모는 원본 처리·기술 출처·Git/PR을 맡습니다.
- 1.0.1 P1 실제 구현 착수 뒤 난이도와 파일 경계에 따라 실익 있는 독립 작업만 여러 서브 에이전트에 위임할 수 있습니다. 어려운 코딩·큰 초안과 통합 판단은 부모가 맡습니다.
- 지정 `astra_worker`는 조사·구현·리뷰, `luna_runner`는 입력·명령·완료 조건이 확정된 실행만 맡습니다. 사용자가 지정한 model/effort를 덮어쓰지 않습니다.
- 한 에이전트에 한 결과와 명확한 cwd·파일/명령·목표·완료 조건을 줍니다. 기본 fork_context=false/fork_turns=none이며 중첩·자동 체인·중복 조사는 하지 않습니다.
- 파일당 한 작성자와 공유 타입 소유자를 정합니다. 타인의 미완성 변경·프로세스·worktree를 건드리지 않고 기존 에이전트·성공 결과를 재사용합니다.
- 부모는 인계와 최종 diff를 확인하고 성공한 동일 검증을 처음부터 반복하지 않습니다. 변경 파일·실행 증거·남은 실제 환경/승인 gate를 기록합니다.

## 9. 검증과 완료 처리

일상 검증은 사용자 PC의 로컬 명령과 Docker를 기본으로 한다. 문서·중간 작업 push는 로컬 검증 뒤 commit 메시지에 `[skip ci]`를 넣어 push/PR CI가 반복 실행되지 않게 한다. 같은 변경에서 성공한 검증은 재사용하고 문서 변경만으로 앱 전체 테스트나 이미지 빌드를 반복하지 않는다. 원격 필수 CI는 최종 Phase 통합·릴리스에 필요한 최종 후보에서만 수행하며, 중간 push마다 실행하거나 새 근거 없이 재실행하지 않는다. CI 생략·취소는 PASS로 기록하지 않고, 필수 검사나 같은 SHA의 개발 서버 인수 조건은 충족 전까지 남긴다. 기존 workflow·공용 Docker tag·타인의 실행은 이 규칙만으로 변경하지 않는다. [GitHub의 skip 지침](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs)은 push/PR에 적용되며 필수 검사를 대체하지 않는다.

**모든 push 직전과 각 Phase 완료 시** [Future 계획 검수 인수](./0.Plans/2.Patch-phase/FUTURE-INTAKE.md)를 한 번 수행한다. 저장소 전역의 tracked·untracked·hidden Future 문서를 rg/Git으로 발견하고, 이동·새 내용·체크 변경을 마지막 인수 commit/blob과 대조한다. 원본·백업·중복과 현행 입력을 구분하며 비공개/ignored 자료를 자동 공개하거나 강제 add하지 않는다. 상세 배정·충돌·중복 처리 기록은 연결 문서 한 곳에 둔다.

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
- 버전에 배정된 모든 Phase가 완료되고 버전 완료 기준이 충족된 뒤에만 다음 버전으로 이동합니다.

## 10. GitHub 협업

- 한 PR은 원칙적으로 한 Phase 또는 서로 독립된 한 작업 묶음만 다룹니다.
- 브랜치와 PR 제목에 버전·Phase를 포함합니다.
- PR 설명에 관련 작업 ID, 기준 화면, DB 영향, 검증 결과, 남은 위험을 씁니다.
- Phase 완료 시 `git push -u origin <phase-branch>`를 실행하고 원격 commit 반영을 확인합니다. 후속 commit이 생기면 같은 브랜치에 다시 push합니다.
- Phase 브랜치와 PR을 사용합니다. `main`에는 필수 검사를 통과하고 사용자가 승인한 릴리스 때만 병합하며 직접 push하지 않습니다. 구현 Phase 브랜치는 기존 `phase/<version>-p<phase>-<topic>` 관례를 따르고 발행 브랜치 이력을 보존합니다.
- 비밀 값, `.env`, DB 볼륨, 백업, export 묶음, 실제 사용자 자료를 커밋하지 않습니다.
- 배포·migration·백업 복원처럼 운영 상태를 바꾸는 작업은 승인과 runbook을 확인합니다.

Phase 완료 순서는 `로컬 수용 테스트 → commit → 원격 push와 SHA 일치 확인 → 필수 CI → 해당 시점에 승인된 정책의 SHA 기반 Docker Hub image 발행 → 개발 서버에 같은 SHA 배포 → 공개 개발 주소 smoke test → 상태·배포 기록`으로 고정합니다. Docker Hub 초기 연결 전에는 발행 job이 비활성 상태임을 완료 보고에 명시하고, 연결 이후에는 발행 실패를 건너뛰지 않습니다. 구체적인 명령과 중단·되돌림 기준은 [`개발 서버 배포 runbook`](./docs/runbooks/development-deploy.md)과 [`Docker Hub 발행 runbook`](./docs/runbooks/dockerhub-publish.md)을 따릅니다.

## 11. 서버 정보와 환경별 운영 권한

- 개발·릴리스 서버의 주소, 계정, 비밀번호, 키, 복구 코드, OAuth 비밀 값은 Git에서 제외된 `.private/`에만 기록합니다.
- 현재 구현은 환경별 `.test_users`의 평문 메일을 앱 허용 목록으로 사용합니다. 1.0.1 P3은 역추정·정규화·key rotation을 고려한 해시 기반 이행, P4는 검증된 Google identity 이후의 원자 grant 등록을 구현할 계획입니다. 인수 전 해시가 적용됐다고 안내하지 않습니다. 현재 `openid email profile`만 요청하면 Google Testing 예외상 Console Test users 등록은 필수가 아닙니다. 실제 scope/Audience/조직·계정 제한을 확인하고 추가 scope 도입 시 재평가합니다. Google Cloud Console 설정은 앱 허용 등록과 별개이며 앱이 자동 변경하지 않습니다. 파일은 Git/build context에서 제외하고 환경끼리 합치거나 복사하지 않습니다.
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

- 현행 발행 도구·workflow는 기존 1.0.0 규칙을 포함합니다. `release-phase-state.mjs`는 1.0.0 P5/P6 기준이므로 1.0.1·가변 Phase·다자리 숫자·새 계획 경로 대응을 [1.0.1 P8](./0.Plans/2.Patch-phase/1.0.1/8phase.md)에서 구현·검증합니다. 문서가 이미 지원한다는 근거가 되지 않습니다.
- 1.0.1 이후 목표는 [릴리스 정책](./0.Plans/2.Patch-phase/RELEASE-POLICY.md)의 dev/정식 tag 분리입니다. 정식 release에서는 서비스별 `Release`, `latest`, `Release-latest`와 immutable version/SHA가 같은 digest를 가리켜야 합니다. dev push는 정식 tag를 이동시키지 않습니다.
- 이 문서 개정은 기존 workflow 실행·tag 이동·공용 채널 발행을 승인하지 않습니다. P6 candidate 격리와 기존 발행 이력을 보존합니다.
- `VERSION`, 실행 STATUS, runtime metadata와 발행 SHA의 일치는 실제 구현/릴리스 Phase에서 확인합니다. 계획 작성만으로 해당 값을 변경하지 않습니다.
- Docker Hub token은 GitHub Actions secret `DOCKERHUB_TOKEN`에 저장하고 로그인 username은 Actions variable로 관리합니다. 실제 값은 저장소·명령 인수·로그에 넣지 않습니다. 필수 CI 및 서비스별 digest 일치가 확인되지 않으면 발행·배포 완료로 처리하지 않습니다.
