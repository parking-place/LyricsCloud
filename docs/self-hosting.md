# LyricsCloud 1.0.3 정식·1.0.5 후보 셀프호스팅

이 문서는 새 Linux 호스트 한 대에 단일 web replica, PostgreSQL 18, collaboration, worker를 Docker Compose로 실행하는 1.0 지원 경로다. 다중 web replica는 현재 메모리 기반 rate limiter를 공유하지 않으므로 지원 범위가 아니다.

## 요구 조건

- Linux x86-64, Docker Engine 26+와 Docker Compose v2.24.4+ (`!reset` 지원)
- Git, HTTPS reverse proxy 또는 tunnel, Google Cloud OAuth Web application client
- 외부에는 HTTPS 443만 공개하고 PostgreSQL·collaboration·worker는 Docker network 안에 둔다.
- 호스트 시간은 UTC 동기화하고, checkout과 PostgreSQL data를 지속 디스크에 둔다.

## 1. 고정 source와 환경 준비

현재 정식 설치 기준은 불변 `v1.0.3` tag다. 1.0.5 후보 검토는 승인된 전체 40자리 commit SHA만 사용한다. moving alias나 branch 이름을 운영 checkout 기준으로 쓰지 않는다.

```bash
git clone https://github.com/parking-place/LyricsCloud.git
cd LyricsCloud
APPROVED_REF=v1.0.3
git checkout --detach "$APPROVED_REF"
cp .env.example .env
cp .test_users.example .test_users
```

`.env`의 모든 `CHANGE_ME`를 바꾼다. `NODE_ENV=production`, `APP_VERSION=1.0.3`, `BUILD_ID=<현재 40자리 SHA>`, `APP_CHANNEL=release`, `APP_ORIGIN=https://<호스트>`로 설정하고 release에서는 `APP_PHASE`를 비운다. 개발 후보만 `APP_CHANNEL=dev`, `APP_PHASE=p<N>`을 사용한다. `DATABASE_URL`의 사용자·비밀번호·DB명은 같은 파일의 PostgreSQL 값과 일치해야 한다. `SESSION_SECRET`은 32바이트 이상의 무작위 값이어야 한다. 실제 값은 채팅·Issue·Git·image build argument에 넣지 않는다.

`.test_users`에 허용할 Google 이메일을 한 줄에 하나씩 적은 뒤, 릴리스 환경 전용 keyring과 암호화 rollback key를 만들고 HMAC JSONL로 전환한다. 아래 backup 경로는 새 파일이어야 하며 기존 파일을 덮어쓰지 않는다.

```bash
node scripts/provision-auth-allowlist-keys.mjs --kid release-2026-09
node scripts/migrate-test-users-hmac.mjs --dry-run \
  --source .test_users --keyring .private/keys/auth_allowlist_hmac_keyring \
  --environment release
node scripts/migrate-test-users-hmac.mjs --apply \
  --source .test_users --keyring .private/keys/auth_allowlist_hmac_keyring \
  --environment release \
  --backup-key .private/keys/auth_allowlist_migration_backup_key \
  --backup-output .private/backups/test-users-pre-hmac.enc
install -d -m 0700 .private/runtime
sudo install -o 65532 -g 65532 -m 0400 .test_users .private/runtime/auth_allowed_emails
sudo install -o 65532 -g 65532 -m 0400 .private/keys/auth_allowlist_hmac_keyring .private/runtime/auth_allowlist_hmac_keyring
git check-ignore -v .env .test_users .private/runtime/auth_allowed_emails .private/runtime/auth_allowlist_hmac_keyring
```

환경별 keyring은 공유하지 않는다. HMAC은 익명화가 아니며 rollback backup은 기존 계정 로그인과 복원을 검증한 뒤 정한 보존 기한까지 별도 보호한다. 자세한 회전·복원 절차는 [P3 운영 인수](./runbooks/1.0.1-phase3-hmac-allowlist.md)를 따른다.

정식 환경 이름·형식의 기준은 봉인된 [1.0.3 environment schema](../config/environment-schema.1.0.3.json)다. 1.0.5 후보는 같은 환경·schema 계약에서 `APP_VERSION=1.0.5`, `APP_CHANNEL=dev`, `APP_PHASE=p5`, `BUILD_ID=<후보 SHA>`로만 검증하며 release 설정·별칭으로 승격하지 않는다. Google 설정은 아래 OAuth 절차를 먼저 마친다. 릴리스 적용 전에는 해당 tag에 포함된 schema로 web·collaboration·worker·migrate·admin 설정을 각각 검사한다.

## 2. 구성 검사, 기동과 health

```bash
docker compose --env-file .env -f compose.yaml -f compose.selfhost.yaml config --quiet
docker compose --env-file .env -f compose.yaml -f compose.selfhost.yaml build --pull
docker compose --env-file .env -f compose.yaml -f compose.selfhost.yaml up -d --wait
curl --fail --silent http://127.0.0.1:8080/api/health/live
curl --fail --silent http://127.0.0.1:8080/api/health/ready
```

두 endpoint는 200이어야 하고 1.0.3 ready 응답의 `version`, `build.id`, `channel`, `phase`, `database.latestMigration`은 각각 `1.0.3`, checkout SHA, `release`, `null`, `1000_prompt_modes.sql`이어야 한다. 1.0.5 개발 후보도 schema `1000_prompt_modes.sql`을 유지하며 `channel=dev`와 해당 `phase`를 반환한다. `/api/health/metrics` 같은 공개 metrics 경로는 제공하지 않는다. 보호 API는 비로그인 요청을 거부해야 한다.

`docker compose down`은 컨테이너만 내리고 DB volume을 보존한다. `docker compose down --volumes`는 운영·개발 자료를 영구 삭제하므로 이 문서의 정상 운영 명령이 아니다.

## 3. Google OAuth와 초대 제한

Google Cloud의 Web application client에 다음 값을 정확히 등록한다.

```text
Authorized JavaScript origin=https://<APP_ORIGIN_HOST>
Authorized redirect URI=https://<APP_ORIGIN_HOST>/api/auth/callback
```

scope는 `openid email profile`만 사용한다. `.test_users`는 Google Audience 목록과 별개인 LyricsCloud 초대 허용 목록이다. 현재 기본 신원 scope만 요청하면 [Google Testing 예외](https://support.google.com/cloud/answer/15549945?hl=en)상 Test users 등록은 필수가 아니다. 실제 Audience·조직/계정 제한을 확인하고 추가 scope 도입 시 재평가한다. 앱 `.test_users` 허용과 검증된 ID token/issuer+sub 경계는 유지한다. `/api/auth/login`이 Google 승인 화면으로 이동하고 callback이 같은 host인지 확인한 뒤, 허용 계정으로 로그인·보호 route·로그아웃을 직접 확인한다. 자세한 절차는 [Google OAuth 설정](./runbooks/google-oauth-setup.md)을 따른다.

## 4. secret과 redirect 교체

DB password를 바꿀 때는 PostgreSQL role password와 `POSTGRES_PASSWORD`·`DATABASE_URL`을 같은 작업 창에서 바꾸고 migration one-shot과 readiness를 확인한다. Google secret 또는 client를 바꾸면 Google Console과 `.env`를 함께 바꾼다. session secret 교체는 기존 세션을 모두 만료시키므로 사용자에게 재로그인을 안내한다.

```bash
docker compose --env-file .env -f compose.yaml -f compose.selfhost.yaml config --quiet
docker compose --env-file .env -f compose.yaml -f compose.selfhost.yaml up -d --no-deps --force-recreate web collaboration worker
```

redirect host를 바꿀 때는 새 HTTPS·Google redirect·`APP_ORIGIN`을 먼저 준비하고, 새 host 로그인 smoke가 통과한 뒤 이전 redirect를 제거한다. old/new secret을 로그에 출력하지 않는다.

## 5. upgrade와 rollback

upgrade 전 현재 SHA·schema·container와 정상 backup 상태를 기록한다. 현재 공식 릴리스 서버처럼 backup 구축을 유예한 환경은 복구 지점이 없다는 위험을 운영자가 인수한 경우에만 진행한다.

새 승인 SHA를 별도 checkout에서 build하고 `migrate`를 먼저 실행한 뒤 세 서비스를 함께 전환한다. readiness와 합성 로그인·생성·편집·검색 smoke가 실패하면 DB volume을 지우거나 down migration하지 말고 직전 호환 image로 application rollback한다. schema 무결성이 깨졌다면 쓰기를 중단하고 새 빈 DB에 최신 유효 backup을 restore한 뒤 전환한다. 검증 명령과 중단 조건은 [backup·restore·upgrade·rollback runbook](./runbooks/backup-restore-upgrade.md)에 있다.

## 6. 운영 시작 체크

- [ ] HTTPS, OAuth callback, allowlist 로그인과 로그아웃 PASS
- [ ] web·collaboration·worker healthy, migration one-shot exit 0
- [ ] live/ready의 version·SHA·schema 일치
- [ ] 합성 곡·가사 한글 저장·검색·삭제/복원·export 뒤 합성 자료 제거
- [ ] [관측 데이터 정책](./operations/OBSERVABILITY-DATA-CLASSIFICATION.md)과 [경보 runbook](./runbooks/observability-alerts.md) 연결
- [ ] backup을 구축했거나, 미구축 위험·책임자·후속 목표를 명시적으로 기록
- [ ] container 정리는 [Docker 정리 runbook](./runbooks/docker-cleanup.md)으로 volume·실행 중 image를 보존
