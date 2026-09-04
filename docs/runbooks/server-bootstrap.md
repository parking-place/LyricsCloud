# 개발·릴리스 서버 기본 환경 구성

이 문서는 Debian 기반 LyricsCloud 서버에 Docker Engine, Compose, Buildx, Git과 최소 운영 도구를 설치하고 검증하는 절차다. 서버 주소·계정·비밀번호와 공개 origin은 Git에서 제외된 `.private/` 문서에서 확인한다. 릴리스 서버 변경은 사용자가 현재 요청에서 명시적으로 승인한 경우에만 수행한다.

## 검증된 기준

2026-09-05에 개발 서버와 릴리스 서버에서 다음 구성을 각각 검증했다.

| 항목 | 검증 값 |
|---|---|
| OS / architecture | Debian 13 / amd64 |
| Docker Engine | 29.8.0 |
| Docker Compose plugin | 5.5.1 |
| Docker Buildx plugin | 0.37.0 |
| Git | 2.47.3 |
| Docker storage / cgroup | `overlayfs` / `systemd` |
| Docker 서비스 | 부팅 자동 시작, active |

호스트에는 Node.js와 pnpm을 설치하지 않는다. 애플리케이션 빌드·실행 도구는 Docker 이미지와 lockfile로 고정하며 서버는 Docker와 Git 기반 배포 경계만 제공한다.

## 설치 범위

- Docker 공식 APT 저장소의 `docker-ce`, CLI, `containerd.io`
- Docker Compose와 Buildx 플러그인
- Git, CA 인증서, curl, GnuPG, jq, OpenSSH client, rsync, unzip
- Git의 서버 공통 fast-forward·prune 기본값

GitHub 인증 키, deploy key, OAuth secret, `.env`, `.test_users`와 데이터베이스 비밀번호는 이 절차에서 만들거나 복사하지 않는다.

## 사전 검사

기존 Docker 데이터나 다른 배포판 패키지가 있다면 자동으로 제거하지 말고 작업을 중단한다.

```bash
for pkg in docker.io docker-doc docker-compose podman-docker containerd runc; do
  dpkg-query -W -f='${db:Status-Abbrev}' "$pkg" 2>/dev/null || true
done

test ! -e /var/lib/docker
test ! -e /etc/docker/daemon.json
```

기존 데이터가 있다면 volume·image·daemon 설정의 소유자를 확인하고 별도 이전 또는 백업 계획을 세운다.

## 기본 패키지와 Docker 설치

```bash
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y \
  ca-certificates curl gnupg git jq openssh-client rsync unzip

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg \
  -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

. /etc/os-release
printf '%s\n' \
  'Types: deb' \
  'URIs: https://download.docker.com/linux/debian' \
  "Suites: $VERSION_CODENAME" \
  'Components: stable' \
  "Architectures: $(dpkg --print-architecture)" \
  'Signed-By: /etc/apt/keyrings/docker.asc' \
  > /etc/apt/sources.list.d/docker.sources

apt-get update
apt-get install -y \
  docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

systemctl enable --now docker
```

## Git 기본값

서버 전체에 작성자 이름이나 이메일, credential helper를 설정하지 않는다. 저장소별 배포 신원은 별도의 deploy key와 명시적인 설정으로 관리한다.

```bash
git config --system init.defaultBranch main
git config --system pull.ff only
git config --system fetch.prune true
```

`pull.ff=only`는 서버에서 자동 merge commit이 생기는 것을 막는다. 실제 릴리스 갱신은 승인된 tag 또는 commit을 checkout하는 배포 절차를 우선한다.

## 검증

버전과 daemon 상태를 확인한다.

```bash
git --version
docker --version
docker compose version
docker buildx version
systemctl is-enabled docker
systemctl is-active docker
docker info
```

Compose와 컨테이너 실행을 함께 검사하는 일회성 smoke test는 다음과 같다.

```bash
smoke_dir=$(mktemp -d)
printf '%s\n' \
  'services:' \
  '  smoke:' \
  '    image: hello-world:latest' \
  > "$smoke_dir/compose.yaml"

docker compose -p lyricscloud-bootstrap-smoke \
  -f "$smoke_dir/compose.yaml" \
  up --abort-on-container-exit --exit-code-from smoke

docker compose -p lyricscloud-bootstrap-smoke \
  -f "$smoke_dir/compose.yaml" \
  down --remove-orphans
unlink "$smoke_dir/compose.yaml"
rmdir "$smoke_dir"
docker image rm hello-world:latest
```

최종적으로 다음 조건을 확인한다.

- Docker가 `overlayfs`와 systemd cgroup driver를 사용한다.
- `2375`, `2376` TCP 포트가 열려 있지 않고 기본 Unix socket만 사용한다.
- 명시적으로 승인한 비-root 계정 외에는 `docker` 그룹에 넣지 않는다. Docker socket 접근은 사실상 root 권한이다.
- smoke test 컨테이너와 image가 남지 않는다.
- 기존 `cloudflared` 서비스가 계속 active 상태다.
- GitHub 원격 저장소에 read-only 네트워크 접근이 가능하다.

## 업데이트와 되돌리기

일반 보안 업데이트는 다음 경로를 사용하고, Docker major version 변경 전에는 Compose 호환성과 백업·복원 절차를 확인한다.

```bash
apt-get update
apt-get upgrade
```

Docker 패키지 제거가 필요해도 `/var/lib/docker`와 애플리케이션 volume을 자동 삭제하지 않는다. 앱 배포 후에는 먼저 Compose stack을 중단하고 DB 백업을 검증한 뒤 패키지 제거와 데이터 보존 여부를 별도로 결정한다.

## 공식 참고 자료

- <https://docs.docker.com/engine/install/debian/>
- <https://docs.docker.com/engine/install/linux-postinstall/>
- <https://git-scm.com/docs/git-config>
