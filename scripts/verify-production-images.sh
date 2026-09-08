#!/usr/bin/env bash
set -euo pipefail

# Only disposable resources created by this invocation are removed.
revision=${1:?Usage: verify-production-images.sh IMAGE_TAG}
[[ "$revision" =~ ^[a-zA-Z0-9_.-]+$ ]] || exit 2
[[ "$revision" =~ ^[0-9a-f]{40}$ ]] || { printf 'Production image verification requires a full Git SHA.\n' >&2; exit 2; }
app_version=$(tr -d '\r\n' < VERSION)
name="lyricscloud-image-smoke-$$-$RANDOM"
allowlist_file=$(mktemp)
printf 'fixture@example.invalid\n' > "$allowlist_file"
chmod 444 "$allowlist_file"
cleanup() {
  docker rm -f "$name-recovery" "$name-web" "$name-collaboration" "$name-worker" "$name-migrate" "$name-db" >/dev/null 2>&1 || true
  docker network rm "$name" >/dev/null 2>&1 || true
  docker volume rm "$name-data" >/dev/null 2>&1 || true
  unlink "$allowlist_file" >/dev/null 2>&1 || true
}
trap cleanup EXIT
docker network create "$name" >/dev/null
# A tmpfs is erased by container restart and cannot prove durable recovery.
docker volume create "$name-data" >/dev/null
docker run -d --name "$name-db" --network "$name" --network-alias db --mount "type=volume,source=$name-data,target=/var/lib/postgresql" \
  -e POSTGRES_USER=lyricscloud_test -e POSTGRES_DB=lyricscloud_test -e POSTGRES_PASSWORD=lyricscloud_test_only \
  postgres:18-bookworm >/dev/null
database_url=postgresql://lyricscloud_test:lyricscloud_test_only@db:5432/lyricscloud_test
ready=false
for attempt in {1..30}; do
  if docker exec "$name-db" pg_isready -U lyricscloud_test -d lyricscloud_test >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
[[ "$ready" == true ]]
docker run --rm --name "$name-migrate" --network "$name" --read-only --tmpfs /tmp:size=32m,mode=1777 \
  -e "DATABASE_URL=$database_url" -e "APP_VERSION=$app_version" -e "BUILD_ID=$revision" "lyricscloud-migrate-ci:$revision"
for service in collaboration worker web; do
  runtime_mounts=()
  if [[ "$service" == web ]]; then
    runtime_mounts+=(--mount "type=bind,source=$allowlist_file,target=/run/secrets/auth_allowed_emails,readonly")
  fi
  docker run -d --name "$name-$service" --network "$name" --network-alias "$service" \
    --read-only --tmpfs /tmp:size=64m,mode=1777 \
    "${runtime_mounts[@]}" \
    -e "DATABASE_URL=$database_url" -e "APP_VERSION=$app_version" -e "BUILD_ID=$revision" -e APP_ORIGIN=http://localhost:8080 \
    -e OIDC_TEST_FIXTURE=true -e GOOGLE_ISSUER=http://127.0.0.1:3100 \
    -e GOOGLE_CLIENT_ID=synthetic-image-client -e GOOGLE_CLIENT_SECRET=synthetic-image-secret \
    -e SESSION_SECRET=synthetic-image-session-secret-at-least-32-bytes \
    -e AUTH_ALLOWED_EMAILS= -e AUTH_ALLOWED_EMAILS_FILE=/run/secrets/auth_allowed_emails \
    "lyricscloud-$service-ci:$revision" >/dev/null
done
for service in collaboration worker web; do
  image_user=$(docker inspect --format '{{.Config.User}}' "$name-$service")
  [[ -n "$image_user" && "$image_user" != "0" && "$image_user" != "root" ]]
  [[ "$(docker inspect --format '{{.HostConfig.ReadonlyRootfs}}' "$name-$service")" == true ]]
done
check_http() {
  local container=$1 url=$2
  for attempt in {1..30}; do
    if docker exec "$container" /nodejs/bin/node -e 'fetch(process.argv[1]).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' "$url" >/dev/null 2>&1; then return; fi
    sleep 1
  done
  printf 'Production image readiness failed: %s\n' "$container" >&2
  return 1
}
check_http "$name-collaboration" http://127.0.0.1:3001/health/ready
check_http "$name-worker" http://127.0.0.1:3002/health/ready
check_http "$name-web" http://127.0.0.1:3000/api/health/ready
check_http "$name-web" http://127.0.0.1:3000/collaboration/health/ready
docker exec "$name-web" /nodejs/bin/node -e '
  fetch("http://127.0.0.1:3000/collaboration/metrics", { redirect: "manual" })
    .then(async response => {
      const payload = await response.json();
      if (response.status !== 404 || payload?.error?.code !== "NOT_FOUND"
        || "connections" in payload || "pendingProjections" in payload) process.exit(1);
    })
    .catch(() => process.exit(1));
'
session_token=image-smoke-session
session_hash=$(docker exec "$name-web" /nodejs/bin/node -e "process.stdout.write(require('node:crypto').createHash('sha256').update(process.argv[1]).digest('base64url'))" "$session_token")
docker exec "$name-db" psql -v ON_ERROR_STOP=1 -U lyricscloud_test -d lyricscloud_test -c \
  "insert into app_users(id,status) values('00000000-0000-4000-8000-000000000091','active'); insert into user_profiles(owner_id,display_name) values('00000000-0000-4000-8000-000000000091','Image Smoke'); insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values('$session_hash','00000000-0000-4000-8000-000000000091',now()+interval '1 day',now()+interval '2 days');" >/dev/null
docker exec "$name-web" /nodejs/bin/node -e '
  fetch("http://127.0.0.1:3000/api/auth/session", { headers: { cookie: `lc_session=${process.argv[1]}` } })
    .then(async response => { if (!response.ok || !(await response.json()).authenticated) process.exit(1); })
    .catch(() => process.exit(1));
' "$session_token"
worker_purge=false
for attempt in {1..30}; do
  if [[ "$(docker exec "$name-db" psql -U lyricscloud_test -d lyricscloud_test -Atc "select count(*) from lifecycle_purge_runs where status='success'" 2>/dev/null)" != "0" ]]; then worker_purge=true; break; fi
  sleep 1
done
[[ "$worker_purge" == true ]]
docker exec -i --workdir /app "$name-collaboration" /nodejs/bin/node --input-type=module < scripts/verify-production-revisions.mjs
docker run -i --name "$name-recovery" --network "$name" -e "DATABASE_URL=$database_url" \
  --read-only --tmpfs /tmp:size=64m,mode=1777 --entrypoint /nodejs/bin/node --workdir /app "lyricscloud-collaboration-ci:$revision" \
  --input-type=module < scripts/verify-production-recovery.mjs &
recovery_pid=$!
recovery_ready=false
for attempt in {1..30}; do
  if docker exec "$name-recovery" /nodejs/bin/node -e "require('node:fs').accessSync('/tmp/p5-recovery-ready')" >/dev/null 2>&1; then recovery_ready=true; break; fi
  kill -0 "$recovery_pid" 2>/dev/null || { wait "$recovery_pid"; exit 1; }
  sleep 1
done
[[ "$recovery_ready" == true ]]
docker restart "$name-db" >/dev/null
# Neither application is allowed to crash as a side effect of the DB restart.
for service in web collaboration; do
  [[ "$(docker inspect --format '{{.State.Running}}' "$name-$service")" == true ]]
done
check_http "$name-collaboration" http://127.0.0.1:3001/health/ready
check_http "$name-web" http://127.0.0.1:3000/api/health/ready
docker restart "$name-collaboration" >/dev/null
check_http "$name-collaboration" http://127.0.0.1:3001/health/ready
docker exec "$name-recovery" /nodejs/bin/node -e "require('node:fs').writeFileSync('/tmp/p5-recovery-restarted','ready')"
wait "$recovery_pid"
printf 'Production images: migration completed; web, collaboration, worker and same-origin proxy ready.\n'
