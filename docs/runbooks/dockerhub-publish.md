# Docker Hub versioned image 발행

GitHub Actions의 전체 검증을 통과한 LyricsCloud commit을 Docker Hub에 자동 발행한다. Docker Hub 비밀번호는 사용하지 않고, push 권한이 있는 전용 access token을 GitHub Actions secret에만 저장한다.

## 발행 image

| 서비스 | Docker Hub repository | Dockerfile target |
|---|---|---|
| web | `parkingplace/lyricscloud` | `Dockerfile.web`의 `runtime` |
| collaboration | `parkingplace/lyricscloud` | `Dockerfile.service`의 `collaboration` |
| worker | `parkingplace/lyricscloud` | `Dockerfile.service`의 `worker` |
| migrate | `parkingplace/lyricscloud` | `Dockerfile.service`의 `migrate` |

`parkingplace/lyricscloud` repository는 Docker Hub에서 미리 만들고 공개·비공개 여부를 명시적으로 선택한다. 네 실행 image는 service가 포함된 서로 다른 tag로 구분한다. 자동화에는 Docker 계정 비밀번호 대신 `Read & Write`만 가진 전용 PAT를 사용한다. Docker 공식 문서: [repository 생성](https://docs.docker.com/docker-hub/repos/create/), [access token 생성](https://docs.docker.com/security/access-tokens/personal-access-tokens/).

## 한 번만 하는 GitHub 설정

저장소 루트에서 `parkingplace/lyricscloud`에 push 권한이 있는 로그인 username을 Actions variable로 등록한다.

```bash
gh variable set DOCKERHUB_USERNAME --body '<login Docker ID>'
gh secret set DOCKERHUB_TOKEN
```

마지막 명령은 터미널의 보안 입력으로 token을 받는다. token을 `--body`, 셸 기록, `.env`, `.private` 문서에 넣지 않는다. repository와 token 권한을 확인한 뒤에만 발행을 활성화한다.

```bash
gh variable set DOCKERHUB_ENABLED --body 'true'
```

비활성화할 때는 token을 지우기 전에 `DOCKERHUB_ENABLED=false`로 바꾼다.

## 필수 tag 규칙

루트 `VERSION`과 `STATUS.md`의 `current_version`은 같아야 한다.

| 종류 | Docker tag 예시 | 의미 |
|---|---|---|
| commit 고정 beta | `0.2.0-beta.72ae674848f9-web` | 버전·commit·service가 고정된 재현 가능한 image |
| 버전 이동식 beta | `0.2.0-beta-web` | 같은 버전에서 가장 최근 검증된 web beta image |

각 형식의 끝에는 `web`, `collaboration`, `worker`, `migrate` 중 하나가 들어간다. `latest`, beta가 없는 정식 tag, service가 없는 tag는 만들지 않는다. 정식 발행은 사용자의 별도 명시적 승인 뒤에만 자동화 규칙을 변경해 연다. 다음 버전 작업을 시작할 때 `VERSION`, `STATUS.md`, runtime 기본 `APP_VERSION`을 같은 commit에서 갱신한다.

## 자동 실행과 수동 재시도

- `main`, `phase/**` push: CI 검증 성공 후 네 service의 고정·이동식 beta tag를 자동 발행한다.
- Git tag push: 정식 발행이 승인되기 전에는 workflow 발행 대상으로 등록하지 않는다.
- pull request: secret을 사용하거나 image를 발행하지 않는다.
- 수동 재시도: GitHub Actions의 `CI` workflow를 대상 commit에서 실행하고 `publish=true`를 선택한다.

각 image job은 Docker 공식 `login-action`, `metadata-action`, `setup-buildx-action`, `build-push-action`을 고정 commit으로 사용한다. 발행 성공 뒤 Actions 요약에서 repository tag와 digest를 확인한다. 공식 흐름은 [Docker의 GitHub Actions 안내](https://docs.docker.com/guides/gha/)와 [GitHub의 Docker image 발행 안내](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images)를 따른다.

## 실패 처리

- `DOCKERHUB_ENABLED=true`인데 username 또는 token이 없으면 발행 job을 실패시킨다.
- login 실패 시 token 만료·권한과 username을 확인하되 값을 로그로 출력하지 않는다.
- repository 권한 실패 시 자동 생성에 의존하지 말고 Docker Hub에서 `parkingplace/lyricscloud`와 로그인 계정의 push 권한을 확인한다.
- branch image 발행 실패를 `latest`나 버전 없는 임시 tag로 우회하지 않는다.
- 일부 service만 성공했다면 같은 commit으로 workflow를 다시 실행한다. version+SHA tag는 동일 build를 가리켜야 하므로 다른 commit으로 덮어쓰지 않는다.
