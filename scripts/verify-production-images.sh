#!/usr/bin/env bash
set -euo pipefail

# Only disposable resources created by this invocation are removed.
revision=${1:?Usage: verify-production-images.sh IMAGE_TAG}
[[ "$revision" =~ ^[a-zA-Z0-9_.-]+$ ]] || exit 2
name="lyricscloud-image-smoke-$$-$RANDOM"
cleanup() {
  docker rm -f "$name-recovery" "$name-web" "$name-collaboration" "$name-worker" "$name-migrate" "$name-db" >/dev/null 2>&1 || true
  docker network rm "$name" >/dev/null 2>&1 || true
  docker volume rm "$name-data" >/dev/null 2>&1 || true
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
docker run --rm --name "$name-migrate" --network "$name" -e "DATABASE_URL=$database_url" "lyricscloud-migrate-ci:$revision"
for service in collaboration worker web; do
  docker run -d --name "$name-$service" --network "$name" --network-alias "$service" \
    -e "DATABASE_URL=$database_url" -e APP_ORIGIN=http://localhost:8080 \
    -e OIDC_TEST_FIXTURE=true -e GOOGLE_ISSUER=http://127.0.0.1:3100 \
    -e GOOGLE_CLIENT_ID=synthetic-image-client -e GOOGLE_CLIENT_SECRET=synthetic-image-secret \
    -e SESSION_SECRET=synthetic-image-session-secret-at-least-32-bytes \
    -e AUTH_ALLOWED_EMAILS=fixture@example.invalid -e AUTH_ALLOWED_EMAILS_FILE= \
    "lyricscloud-$service-ci:$revision" >/dev/null
done
check_http() {
  local container=$1 url=$2
  for attempt in {1..30}; do
    if docker exec "$container" node -e 'fetch(process.argv[1]).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' "$url" >/dev/null 2>&1; then return; fi
    sleep 1
  done
  printf 'Production image readiness failed: %s\n' "$container" >&2
  return 1
}
check_http "$name-collaboration" http://127.0.0.1:3001/health/ready
check_http "$name-worker" http://127.0.0.1:3002/health/ready
check_http "$name-web" http://127.0.0.1:3000/api/health/ready
check_http "$name-web" http://127.0.0.1:3000/collaboration/health/ready
docker exec -i --workdir /workspace/apps/collaboration "$name-collaboration" node --input-type=module < scripts/verify-production-revisions.mjs
docker run -i --name "$name-recovery" --network "$name" -e "DATABASE_URL=$database_url" \
  --entrypoint node --workdir /workspace/apps/collaboration "lyricscloud-collaboration-ci:$revision" \
  --input-type=module < scripts/verify-production-recovery.mjs &
recovery_pid=$!
recovery_ready=false
for attempt in {1..30}; do
  if docker exec "$name-recovery" test -f /tmp/p5-recovery-ready >/dev/null 2>&1; then recovery_ready=true; break; fi
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
docker exec "$name-recovery" touch /tmp/p5-recovery-restarted
wait "$recovery_pid"
printf 'Production images: migration completed; web, collaboration, worker and same-origin proxy ready.\n'
