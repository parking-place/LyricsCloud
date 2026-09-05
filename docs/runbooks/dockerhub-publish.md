# Docker Hub versioned image 발행

GitHub Actions의 전체 검증을 통과한 LyricsCloud commit을 Docker Hub에 자동 발행한다. Docker Hub 비밀번호는 사용하지 않고, push 권한이 있는 전용 access token을 GitHub Actions secret에만 저장한다.

## 발행 image

| 서비스 | Docker Hub repository | Dockerfile target |
|---|---|---|
| web | `parkingplace/lyricscloud-web` | `Dockerfile.web`의 `runtime` |
| collaboration | `parkingplace/lyricscloud-collaboration` | `Dockerfile.service`의 `collaboration` |
| worker | `parkingplace/lyricscloud-worker` | `Dockerfile.service`의 `worker` |
| migrate | `parkingplace/lyricscloud-migrate` | `Dockerfile.service`의 `migrate` |

네 repository는 Docker Hub에서 미리 만들고 공개·비공개 여부를 명시적으로 선택한다. image 종류는 repository로 구분하고 모든 repository에 같은 tag 규칙을 적용한다. 자동화에는 Docker 계정 비밀번호 대신 `Read & Write`만 가진 전용 PAT를 사용한다. Docker 공식 문서: [repository 생성](https://docs.docker.com/docker-hub/repos/create/), [access token 생성](https://docs.docker.com/security/access-tokens/personal-access-tokens/).

## 한 번만 하는 GitHub 설정

저장소 루트에서 네 `parkingplace/lyricscloud-*` repository에 push 권한이 있는 로그인 username을 Actions variable로 등록한다.

```bash
gh variable set DOCKERHUB_USERNAME --body '<login Docker ID>'
gh secret set DOCKERHUB_TOKEN
```

마지막 명령은 터미널의 보안 입력으로 token을 받는다. token을 `--body`, 셸 기록, `.env`, `.private` 문서에 넣지 않는다. repository와 token 권한을 확인한 뒤에만 발행을 활성화한다.

```bash
gh variable set DOCKERHUB_ENABLED --body 'true'
```

비활성화할 때는 token을 지우기 전에 `DOCKERHUB_ENABLED=false`로 바꾼다.

## 다중 tag 규칙

루트 `VERSION`과 `STATUS.md`의 `current_version`은 같아야 한다.

| tag | 개발 발행 | 릴리스 발행 | 의미 |
|---|---|---|---|
| `<VERSION>` (예: `0.2.0`) | 필수 | 필수 | 해당 버전의 가장 최근 검증 image |
| 전체 `<commit SHA>` | 필수 | 필수 | 정확한 source commit에 고정된 불변 식별자 |
| `Dev` | 필수 | 필수 | 개발 채널 alias |
| `Dev-latest` | 필수 | 필수 | 가장 최근 검증된 개발 image alias |
| `Release` | 금지 | 필수 | 릴리스 채널 alias |
| `latest` | 금지 | 필수 | 가장 최근 승인된 릴리스 image alias |

한 번의 build 결과에 표의 tag를 동시에 붙이며, 같은 발행에 속한 tag는 모두 같은 digest를 가리켜야 한다. commit tag는 축약하지 않고 40자리 전체 SHA를 사용한다. Docker tag의 대소문자를 규칙 일부로 취급하므로 `Dev`, `Dev-latest`, `Release`를 표기 그대로 사용한다. 다음 버전 작업을 시작할 때 `VERSION`, `STATUS.md`, runtime 기본 `APP_VERSION`을 같은 commit에서 갱신한다.

## 자동 실행과 수동 재시도

- `main`, `phase/**` push: CI 검증 성공 후 네 repository에 개발용 네 tag를 자동 발행한다.
- 개발 수동 재시도: GitHub Actions의 `CI` workflow를 branch commit에서 실행하고 `publish=true`, `release=false`를 선택한다.
- 릴리스: 사용자가 명시적으로 릴리스를 지시한 경우에만 정확한 `v<VERSION>` Git tag를 만든다. 그 tag를 대상으로 `publish=true`, `release=true` 수동 workflow를 실행하면 여섯 tag를 발행한다.
- `release=true`인데 대상 ref가 정확한 `v<VERSION>` tag가 아니면 발행 전에 실패한다. 반대로 tag ref에서 개발 발행도 허용하지 않는다.
- pull request: secret을 사용하거나 image를 발행하지 않는다.

각 image job은 Docker 공식 `login-action`, `metadata-action`, `setup-buildx-action`, `build-push-action`을 고정 commit으로 사용한다. 발행 성공 뒤 Actions 요약에서 repository tag와 digest를 확인한다. 공식 흐름은 [Docker의 GitHub Actions 안내](https://docs.docker.com/guides/gha/)와 [GitHub의 Docker image 발행 안내](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images)를 따른다.

## 실패 처리

- `DOCKERHUB_ENABLED=true`인데 username 또는 token이 없으면 발행 job을 실패시킨다.
- login 실패 시 token 만료·권한과 username을 확인하되 값을 로그로 출력하지 않는다.
- repository 권한 실패 시 자동 생성에 의존하지 말고 Docker Hub에서 대상 `parkingplace/lyricscloud-*`와 로그인 계정의 push 권한을 확인한다.
- 개발 image 발행 실패를 `Release`나 `latest`로 우회하지 않는다.
- 일부 service만 성공했다면 같은 commit과 같은 channel로 workflow를 다시 실행한다. 동일 실행의 다중 tag가 서로 다른 digest를 가리키지 않는지 확인한다.
