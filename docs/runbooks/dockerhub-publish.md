# Docker Hub versioned image 발행

GitHub Actions의 전체 검증을 통과한 LyricsCloud commit을 Docker Hub에 자동 발행한다. Docker Hub 비밀번호는 사용하지 않고, push 권한이 있는 전용 access token을 GitHub Actions secret에만 저장한다.

## 발행 image

| 서비스 | Docker Hub repository | Dockerfile target |
|---|---|---|
| web | `<namespace>/lyricscloud-web` | `Dockerfile.web`의 `runtime` |
| collaboration | `<namespace>/lyricscloud-collaboration` | `Dockerfile.service`의 `collaboration` |
| worker | `<namespace>/lyricscloud-worker` | `Dockerfile.service`의 `worker` |
| migrate | `<namespace>/lyricscloud-migrate` | `Dockerfile.service`의 `migrate` |

네 repository는 Docker Hub에서 미리 만들고 공개·비공개 여부를 명시적으로 선택한다. 자동화에는 Docker 계정 비밀번호 대신 `Read & Write`만 가진 전용 PAT를 사용한다. Docker 공식 문서: [repository 생성](https://docs.docker.com/docker-hub/repos/create/), [access token 생성](https://docs.docker.com/security/access-tokens/personal-access-tokens/).

## 한 번만 하는 GitHub 설정

저장소 루트에서 username과 namespace를 Actions variable로 등록한다. 개인 계정이면 두 값은 보통 같은 Docker ID이고, 조직 repository라면 namespace에 조직명을 사용한다.

```bash
gh variable set DOCKERHUB_USERNAME --body '<login Docker ID>'
gh variable set DOCKERHUB_NAMESPACE --body '<image namespace>'
gh secret set DOCKERHUB_TOKEN
```

마지막 명령은 터미널의 보안 입력으로 token을 받는다. token을 `--body`, 셸 기록, `.env`, `.private` 문서에 넣지 않는다. repository 네 개와 token 권한을 확인한 뒤에만 발행을 활성화한다.

```bash
gh variable set DOCKERHUB_ENABLED --body 'true'
```

비활성화할 때는 token을 지우기 전에 `DOCKERHUB_ENABLED=false`로 바꾼다.

## 필수 tag 규칙

루트 `VERSION`과 `STATUS.md`의 `current_version`은 같아야 한다.

| Git ref | Docker tag 예시 | 의미 |
|---|---|---|
| Phase 또는 main branch commit | `0.2.0-dev.72ae674848f9` | 버전과 commit을 함께 고정한 개발 image |
| 정확한 release Git tag `v0.2.0` | `0.2.0` | 검증된 정식 버전 image |

`latest`만 있는 image는 만들지 않는다. `v0.2.1`처럼 `VERSION`과 다른 Git tag도 발행 전에 실패한다. 다음 버전 작업을 시작할 때 `VERSION`, `STATUS.md`, runtime 기본 `APP_VERSION`을 같은 commit에서 갱신한다.

## 자동 실행과 수동 재시도

- `main`, `phase/**` push: CI 검증 성공 후 네 image를 자동 발행한다.
- `v*.*.*` tag push: CI 검증과 버전 일치 확인 후 정확한 버전 tag로 발행한다.
- pull request: secret을 사용하거나 image를 발행하지 않는다.
- 수동 재시도: GitHub Actions의 `CI` workflow를 대상 commit에서 실행하고 `publish=true`를 선택한다.

각 image job은 Docker 공식 `login-action`, `metadata-action`, `setup-buildx-action`, `build-push-action`을 고정 commit으로 사용한다. 발행 성공 뒤 Actions 요약에서 repository tag와 digest를 확인한다. 공식 흐름은 [Docker의 GitHub Actions 안내](https://docs.docker.com/guides/gha/)와 [GitHub의 Docker image 발행 안내](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images)를 따른다.

## 실패 처리

- `DOCKERHUB_ENABLED=true`인데 username, namespace 또는 token이 없으면 발행 job을 실패시킨다.
- login 실패 시 token 만료·권한과 username을 확인하되 값을 로그로 출력하지 않는다.
- repository 권한 실패 시 자동 생성에 의존하지 말고 Docker Hub에서 repository와 namespace를 확인한다.
- branch image 발행 실패를 `latest`나 버전 없는 임시 tag로 우회하지 않는다.
- 일부 service만 성공했다면 같은 commit으로 workflow를 다시 실행한다. version+SHA tag는 동일 build를 가리켜야 하므로 다른 commit으로 덮어쓰지 않는다.
