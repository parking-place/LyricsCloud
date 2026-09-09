#!/usr/bin/env bash
set -euo pipefail

revision=${1:?Usage: verify-0915-upgrade-rollback.sh IMAGE_TAG}
[[ "$revision" =~ ^[A-Za-z0-9._-]+$ ]]
current_version=$(tr -d '\r\n' < VERSION)
previous_version=$(node -p 'require("./config/release-operations.0915.json").previousRc.version')
current_schema=$(find packages/database/migrations -maxdepth 1 -type f -name '*.sql' -printf '%f\n' | sort | tail -1)
name="lyricscloud-0915-upgrade-$$-$RANDOM"
allowlist_file=$(mktemp)
printf 'fixture@example.invalid\n' > "$allowlist_file"
chmod 0444 "$allowlist_file"

mapfile -t previous_images < <(node -e '
  const config = require("./config/release-operations.0915.json");
  for (const service of ["web", "collaboration", "worker", "migrate"]) console.log(config.previousRc.images[service]);
')
declare -A previous=(
  [web]="${previous_images[0]}"
  [collaboration]="${previous_images[1]}"
  [worker]="${previous_images[2]}"
  [migrate]="${previous_images[3]}"
)

cleanup() {
  docker rm -f \
    "$name-broken-web" "$name-current-web" "$name-current-collaboration" "$name-current-worker" \
    "$name-previous-web" "$name-previous-collaboration" "$name-previous-worker" "$name-db" >/dev/null 2>&1 || true
  docker network rm "$name" >/dev/null 2>&1 || true
  docker volume rm "$name-data" >/dev/null 2>&1 || true
  unlink "$allowlist_file" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for service in web collaboration worker migrate; do
  docker image inspect "lyricscloud-$service-ci:$revision" >/dev/null
  docker pull "${previous[$service]}" >/dev/null
  docker image inspect "${previous[$service]}" --format '{{join .RepoDigests "\n"}}' | grep -Fq "${previous[$service]}"
done

docker network create "$name" >/dev/null
docker volume create "$name-data" >/dev/null
docker run -d --name "$name-db" --network "$name" --network-alias db \
  --mount "type=volume,source=$name-data,target=/var/lib/postgresql" \
  -e POSTGRES_USER=upgrade_operator -e POSTGRES_DB=lyricscloud_upgrade -e POSTGRES_PASSWORD=upgrade-secret-only \
  postgres:18-bookworm >/dev/null
for _ in {1..30}; do
  docker exec "$name-db" pg_isready -h 127.0.0.1 -U upgrade_operator -d lyricscloud_upgrade >/dev/null 2>&1 && break
  sleep 1
done
docker exec "$name-db" pg_isready -h 127.0.0.1 -U upgrade_operator -d lyricscloud_upgrade >/dev/null
database_url=postgresql://upgrade_operator:upgrade-secret-only@db:5432/lyricscloud_upgrade

run_migration() {
  local image=$1
  docker run --rm --network "$name" --read-only --tmpfs /tmp:size=32m,mode=1777 \
    -e "DATABASE_URL=$database_url" -e NODE_ENV=test -e BUILD_ID="$revision" "$image" >/dev/null
}

check_http() {
  local container=$1 url=$2
  for _ in {1..30}; do
    if docker exec "$container" /nodejs/bin/node -e \
      'fetch(process.argv[1]).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' "$url" >/dev/null 2>&1 \
      || docker exec "$container" node -e \
      'fetch(process.argv[1]).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' "$url" >/dev/null 2>&1; then return; fi
    sleep 1
  done
  printf 'Readiness failed: %s %s\n' "$container" "$url" >&2
  docker exec "$container" /nodejs/bin/node -e \
    'fetch(process.argv[1]).then(async r=>console.error(r.status, await r.text())).catch(error=>console.error(error.code ?? error.name))' "$url" >&2 \
    || docker exec "$container" node -e \
    'fetch(process.argv[1]).then(async r=>console.error(r.status, await r.text())).catch(error=>console.error(error.code ?? error.name))' "$url" >&2 || true
  docker logs --tail 40 "$container" >&2 || true
  return 1
}

start_generation() {
  local generation=$1 source=$2
  local app_version=$current_version
  [[ "$source" == previous ]] && app_version=$previous_version
  for service in collaboration worker web; do
    local image
    if [[ "$source" == previous ]]; then image=${previous[$service]}; else image="lyricscloud-$service-ci:$revision"; fi
    mounts=()
    if [[ "$service" == web ]]; then
      mounts+=(--mount "type=bind,source=$allowlist_file,target=/run/secrets/auth_allowed_emails,readonly")
    fi
    docker run -d --name "$name-$generation-$service" --network "$name" --network-alias "$service" \
      --read-only --tmpfs /tmp:size=64m,mode=1777 "${mounts[@]}" \
      -e "DATABASE_URL=$database_url" -e NODE_ENV=test -e "APP_VERSION=$app_version" -e BUILD_ID="$revision" \
      -e APP_ORIGIN=http://localhost:8080 -e COLLABORATION_INTERNAL_URL=http://collaboration:3001 \
      -e GOOGLE_ISSUER=http://127.0.0.1:3100 -e GOOGLE_CLIENT_ID=synthetic-upgrade-client \
      -e GOOGLE_CLIENT_SECRET=synthetic-upgrade-secret -e SESSION_SECRET=synthetic-upgrade-session-secret-at-least-32-bytes \
      -e AUTH_ALLOWED_EMAILS_FILE=/run/secrets/auth_allowed_emails "$image" >/dev/null
  done
  check_http "$name-$generation-collaboration" http://127.0.0.1:3001/health/ready
  check_http "$name-$generation-worker" http://127.0.0.1:3002/health/ready
  check_http "$name-$generation-web" http://127.0.0.1:3000/api/health/ready
}

stop_generation() {
  local generation=$1
  docker rm -f "$name-$generation-web" "$name-$generation-collaboration" "$name-$generation-worker" >/dev/null 2>&1 || true
}

run_migration "${previous[migrate]}"
docker exec "$name-db" psql -v ON_ERROR_STOP=1 -U upgrade_operator -d lyricscloud_upgrade -c \
  "begin; insert into app_users(id,status) values('90000000-0000-4000-8000-000000000001','active'); insert into user_profiles(owner_id,display_name) values('90000000-0000-4000-8000-000000000001','Synthetic Upgrade Owner'); insert into resources(id,owner_id,type,title) values('91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','song','LC_CANARY_UPGRADE_0915'); insert into songs(resource_id,owner_id,status) values('91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','idea'); commit;" >/dev/null
start_generation previous previous

stop_generation previous
upgrade_started=$(date +%s%3N)
run_migration "lyricscloud-migrate-ci:$revision"
start_generation current current
upgrade_duration_ms=$(( $(date +%s%3N) - upgrade_started ))

if docker exec -i "$name-db" psql -v ON_ERROR_STOP=1 -U upgrade_operator -d lyricscloud_upgrade >/dev/null 2>&1 <<'SQL'
begin;
create table synthetic_failed_migration(id integer primary key);
insert into synthetic_failed_migration values(1);
select synthetic_missing_migration_function();
commit;
SQL
then
  echo 'fault-injected migration unexpectedly passed' >&2
  exit 1
fi
[[ "$(docker exec "$name-db" psql -Atq -U upgrade_operator -d lyricscloud_upgrade -c "select to_regclass('public.synthetic_failed_migration') is null")" == t ]]

stop_generation current
docker run -d --name "$name-broken-web" --network "$name" --network-alias web \
  --read-only --tmpfs /tmp:size=64m,mode=1777 \
  --mount "type=bind,source=$allowlist_file,target=/run/secrets/auth_allowed_emails,readonly" \
  -e DATABASE_URL=postgresql://invalid:invalid@db:1/unavailable -e NODE_ENV=test -e "APP_VERSION=$current_version" -e BUILD_ID="$revision" \
  -e APP_ORIGIN=http://localhost:8080 -e GOOGLE_ISSUER=http://127.0.0.1:3100 \
  -e GOOGLE_CLIENT_ID=synthetic-upgrade-client -e GOOGLE_CLIENT_SECRET=synthetic-upgrade-secret \
  -e SESSION_SECRET=synthetic-upgrade-session-secret-at-least-32-bytes \
  -e AUTH_ALLOWED_EMAILS_FILE=/run/secrets/auth_allowed_emails "lyricscloud-web-ci:$revision" >/dev/null
health_failed=true
for _ in {1..10}; do
  if docker exec "$name-broken-web" /nodejs/bin/node -e \
    'fetch("http://127.0.0.1:3000/api/health/ready").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' >/dev/null 2>&1; then
    health_failed=false
    break
  fi
  sleep 1
done
[[ "$health_failed" == true ]]

rollback_started=$(date +%s%3N)
docker rm -f "$name-broken-web" >/dev/null
start_generation previous previous
rollback_duration_ms=$(( $(date +%s%3N) - rollback_started ))
[[ "$rollback_duration_ms" -le 180000 ]]
[[ "$(docker exec "$name-db" psql -Atq -U upgrade_operator -d lyricscloud_upgrade -c "select count(*) from resources where title='LC_CANARY_UPGRADE_0915'")" == 1 ]]
# Application rollback intentionally keeps forward-compatible migrations in place.
[[ "$(docker exec "$name-db" psql -Atq -U upgrade_operator -d lyricscloud_upgrade -c "select max(name) from schema_migrations")" == "$current_schema" ]]

stop_generation previous
run_migration "lyricscloud-migrate-ci:$revision"
start_generation current current

printf '{"upgradeRollback0915":"PASS","previousRc":"0.9.0","upgradeDurationMs":%s,"migrationFaultRollback":"PASS","healthFault":"PASS","applicationRollbackDurationMs":%s,"schemaDuringApplicationRollback":"%s","dataCanary":"PRESERVED","rollForward":"PASS"}\n' \
  "$upgrade_duration_ms" "$rollback_duration_ms" "$current_schema"
