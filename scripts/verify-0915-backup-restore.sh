#!/usr/bin/env bash
set -euo pipefail

revision=${1:?Usage: verify-0915-backup-restore.sh IMAGE_TAG}
[[ "$revision" =~ ^[A-Za-z0-9._-]+$ ]]
app_version=$(tr -d '\r\n' < VERSION)
image="lyricscloud-backup-ci:$revision"
name="lyricscloud-0915-backup-$$-$RANDOM"
work=$(mktemp -d)
repository="$work/repository"
secrets="$work/secrets"
mkdir -m 700 "$repository" "$secrets"
allowlist_file="$work/auth-allowed-emails"
printf 'fixture@example.invalid\n' > "$allowlist_file"
chmod 0444 "$allowlist_file"
host_uid=$(id -u)
container_uid=$host_uid
container_gid=$(id -g)
if [[ "$host_uid" == 0 ]]; then
  container_uid=$(docker run --rm --entrypoint id "$image" -u)
  container_gid=$(docker run --rm --entrypoint id "$image" -g)
  chown "$container_uid:$container_gid" "$repository" "$secrets"
fi
[[ "$container_uid" != 0 && "$container_gid" =~ ^[0-9]+$ ]]

cleanup() {
  docker rm -f "$name-web" "$name-collaboration" "$name-source" "$name-restore" >/dev/null 2>&1 || true
  docker network rm "$name" >/dev/null 2>&1 || true
  rm -rf -- "$work"
}
trap cleanup EXIT

docker image inspect "$image" --format '{{.Config.User}}' | grep -Eq '^(postgres|[1-9][0-9]*)$'
docker network create "$name" >/dev/null
docker run -d --name "$name-source" --network "$name" --network-alias source-db \
  -e POSTGRES_USER=source_operator -e POSTGRES_DB=lyricscloud_source -e POSTGRES_PASSWORD=source-secret-only \
  postgres:18-bookworm >/dev/null
docker run -d --name "$name-restore" --network "$name" --network-alias restore-db \
  -e POSTGRES_USER=restore_operator -e POSTGRES_DB=lyricscloud_restore -e POSTGRES_PASSWORD=restore-secret-only \
  postgres:18-bookworm >/dev/null

for container in "$name-source" "$name-restore"; do
  ready=false
  for _ in {1..30}; do
    if docker exec "$container" pg_isready >/dev/null 2>&1; then ready=true; break; fi
    sleep 1
  done
  [[ "$ready" == true ]]
done

docker run --rm --network "$name" -e DATABASE_URL=postgresql://source_operator:source-secret-only@source-db:5432/lyricscloud_source \
  -e NODE_ENV=test -e "APP_VERSION=$app_version" -e "BUILD_ID=$revision" \
  "lyricscloud-migrate-ci:$revision" >/dev/null
session_token=backup-restore-session
session_hash=$(docker run --rm --entrypoint /nodejs/bin/node "lyricscloud-web-ci:$revision" -e \
  "process.stdout.write(require('node:crypto').createHash('sha256').update(process.argv[1]).digest('base64url'))" "$session_token")
docker exec -i "$name-source" psql -v ON_ERROR_STOP=1 -v session_hash="$session_hash" -U source_operator -d lyricscloud_source >/dev/null <<'SQL'
begin;
insert into app_users(id,status,withdrawal_requested_at,withdrawal_purge_at) values
  ('10000000-0000-4000-8000-000000000001','active',null,null),
  ('20000000-0000-4000-8000-000000000002','withdrawal_pending',now(),now()+interval '7 days');
insert into user_profiles(owner_id,display_name) values
  ('10000000-0000-4000-8000-000000000001','Synthetic Owner A'),
  ('20000000-0000-4000-8000-000000000002','Synthetic Owner B');
insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values
  (:'session_hash','10000000-0000-4000-8000-000000000001',now()+interval '1 hour',now()+interval '2 hours');
insert into resources(id,owner_id,type,title,deleted_at,purge_at) values
  ('11000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','song','Synthetic Backup Song',null,null),
  ('12000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','lyrics','Synthetic Backup Lyrics',null,null),
  ('13000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','rhyme_note','Synthetic Backup Rhyme',statement_timestamp()+interval '1 second',statement_timestamp()+interval '30 days 1 second'),
  ('14000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','prompt','Synthetic Backup Prompt',null,null),
  ('21000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','song','Synthetic Other Owner',null,null);
insert into songs(resource_id,owner_id,status) values
  ('11000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','writing_lyrics'),
  ('21000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','writing_lyrics');
insert into lyrics(resource_id,owner_id,song_id,body,status) values
  ('12000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','LC_CANARY_BACKUP_PLAINTEXT_0915','draft');
insert into rhyme_notes(resource_id,owner_id,body) values
  ('13000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','LC_CANARY_RHYME_0915');
insert into prompts(resource_id,owner_id,plain_text) values
  ('14000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','LC_CANARY_PROMPT_0915');
insert into sync_documents(document_key,resource_id,owner_id,resource_type,snapshot,snapshot_sequence,revision_body_sha256) values
  ('15000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','lyrics',decode('01020304','hex'),1,encode(sha256(convert_to('LC_CANARY_BACKUP_PLAINTEXT_0915','UTF8')),'hex'));
insert into lyric_revisions(document_key,owner_id,body,body_sha256,reason) values
  ('15000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','LC_CANARY_REVISION_0915',encode(sha256(convert_to('LC_CANARY_REVISION_0915','UTF8')),'hex'),'interval');
commit;
SQL

printf '%s\n' source-secret-only > "$secrets/source-password"
printf '%s\n' restore-secret-only > "$secrets/restore-password"
printf '%s\n' lyricscloud-0915-test-storage > "$repository/.lyricscloud-backup-storage-id"
chmod 0400 "$secrets/source-password" "$secrets/restore-password"
chmod 0600 "$repository/.lyricscloud-backup-storage-id"
if [[ "$host_uid" == 0 ]]; then
  chown "$container_uid:$container_gid" "$secrets/source-password" "$secrets/restore-password" "$repository/.lyricscloud-backup-storage-id"
fi
docker run --rm --user "$container_uid:$container_gid" --mount "type=bind,source=$secrets,target=/secrets" \
  --entrypoint age-keygen "$image" --output /secrets/identity >/dev/null 2>&1
docker run --rm --user "$container_uid:$container_gid" --mount "type=bind,source=$secrets,target=/secrets" \
  --entrypoint age-keygen "$image" -y /secrets/identity > "$secrets/recipient"
docker run --rm --user "$container_uid:$container_gid" --mount "type=bind,source=$secrets,target=/secrets" \
  --entrypoint age-keygen "$image" --output /secrets/wrong-identity >/dev/null 2>&1
chmod 0600 "$secrets/identity" "$secrets/wrong-identity"
chmod 0400 "$secrets/recipient"
if [[ "$host_uid" == 0 ]]; then
  chown "$container_uid:$container_gid" "$secrets/identity" "$secrets/wrong-identity" "$secrets/recipient"
fi

backup() {
  docker run --rm --user "$container_uid:$container_gid" --network "$name" \
    --mount "type=bind,source=$repository,target=/backup/repository" \
    --mount "type=bind,source=$secrets/source-password,target=/run/secrets/postgres_password,readonly" \
    --mount "type=bind,source=$secrets/recipient,target=/run/secrets/backup_age_recipient,readonly" \
    -e PGHOST=source-db -e PGUSER=source_operator -e PGDATABASE=lyricscloud_source \
    -e PGPASSWORD_FILE=/run/secrets/postgres_password -e AGE_RECIPIENT_FILE=/run/secrets/backup_age_recipient \
    -e BACKUP_REPOSITORY_DIR=/backup/repository -e BACKUP_STORAGE_ID=lyricscloud-0915-test-storage \
    -e BACKUP_RETENTION_DAYS=30 -e BACKUP_MIN_FREE_BYTES=1048576 \
    -e NODE_ENV=test -e "APP_VERSION=$app_version" -e "BUILD_ID=$revision" "$image"
}

backup >/dev/null
first_archive=$(find "$repository" -maxdepth 1 -type f -name 'lyricscloud-*.dump.age' -printf '%f\n' | sort | head -1)
cp "$repository/$first_archive" "$repository/lyricscloud-20000101T000000Z-00000000000000000000000000000000.dump.age"
cp "${repository}/${first_archive%.dump.age}.manifest.json" "$repository/lyricscloud-20000101T000000Z-00000000000000000000000000000000.manifest.json"
touch -d '31 days ago' "$repository/lyricscloud-20000101T000000Z-00000000000000000000000000000000.dump.age" \
  "$repository/lyricscloud-20000101T000000Z-00000000000000000000000000000000.manifest.json"
second_backup_result=$(backup)
grep -q '"event":"backup_pruned".*"count":1' <<< "$second_backup_result"
grep -q '"event":"backup_completed"' <<< "$second_backup_result"
[[ "$(find "$repository" -maxdepth 1 -type f -name 'lyricscloud-*.dump.age' | wc -l)" == "2" ]]
[[ ! -e "$repository/lyricscloud-20000101T000000Z-00000000000000000000000000000000.dump.age" ]]
docker run --rm --user "$container_uid:$container_gid" --mount "type=bind,source=$repository,target=/backup/repository,readonly" \
  --entrypoint /usr/local/bin/lyricscloud-check-rpo -e BACKUP_REPOSITORY_DIR=/backup/repository \
  -e BACKUP_MAX_AGE_HOURS=24 "$image" >/dev/null
created_at=$(sed -n 's/.*"createdAt":"\([^"]*\)".*/\1/p' "$repository/last-success.json")
stale_epoch=$(( $(date -u -d "$created_at" +%s) + 90000 ))
if docker run --rm --user "$container_uid:$container_gid" --mount "type=bind,source=$repository,target=/backup/repository,readonly" \
  --entrypoint /usr/local/bin/lyricscloud-check-rpo -e BACKUP_REPOSITORY_DIR=/backup/repository \
  -e BACKUP_MAX_AGE_HOURS=24 -e "RPO_NOW_EPOCH=$stale_epoch" "$image" >/dev/null 2>&1; then
  echo 'stale RPO unexpectedly passed' >&2; exit 1
fi

archive=$(find "$repository" -maxdepth 1 -type f -name 'lyricscloud-*.dump.age' -printf '%f\n' | sort | tail -1)
before_failures=$(find "$repository" -maxdepth 1 -type f -name 'lyricscloud-*.dump.age' | wc -l)
storage_failure="$work/storage-failure.log"
if docker run --rm --user "$container_uid:$container_gid" --network "$name" \
  --mount "type=bind,source=$repository,target=/backup/repository,readonly" \
  --mount "type=bind,source=$secrets/source-password,target=/run/secrets/postgres_password,readonly" \
  --mount "type=bind,source=$secrets/recipient,target=/run/secrets/backup_age_recipient,readonly" \
  -e PGHOST=source-db -e PGUSER=source_operator -e PGDATABASE=lyricscloud_source \
  -e BACKUP_REPOSITORY_DIR=/backup/repository -e BACKUP_STORAGE_ID=lyricscloud-0915-test-storage "$image" >"$storage_failure" 2>&1; then
  echo 'read-only storage unexpectedly accepted a backup' >&2; exit 1
fi
grep -q '"errorCode":"BACKUP_STORAGE_UNAVAILABLE"' "$storage_failure"
capacity_failure="$work/capacity-failure.log"
if docker run --rm --user "$container_uid:$container_gid" --network "$name" \
  --mount "type=bind,source=$repository,target=/backup/repository" \
  --mount "type=bind,source=$secrets/source-password,target=/run/secrets/postgres_password,readonly" \
  --mount "type=bind,source=$secrets/recipient,target=/run/secrets/backup_age_recipient,readonly" \
  -e PGHOST=source-db -e PGUSER=source_operator -e PGDATABASE=lyricscloud_source \
  -e BACKUP_REPOSITORY_DIR=/backup/repository -e BACKUP_STORAGE_ID=lyricscloud-0915-test-storage \
  -e BACKUP_MIN_FREE_BYTES=999999999999999999 "$image" >"$capacity_failure" 2>&1; then
  echo 'capacity failure unexpectedly accepted a backup' >&2; exit 1
fi
grep -q '"errorCode":"BACKUP_CAPACITY_LOW"' "$capacity_failure"
[[ "$(find "$repository" -maxdepth 1 -type f -name 'lyricscloud-*.dump.age' | wc -l)" == "$before_failures" ]]

corrupt="lyricscloud-20990101T000000Z-ffffffffffffffffffffffffffffffff.dump.age"
cp "$repository/$archive" "$repository/$corrupt"
cp "${repository}/${archive%.dump.age}.manifest.json" "${repository}/${corrupt%.dump.age}.manifest.json"
sed -i "s/$archive/$corrupt/" "${repository}/${corrupt%.dump.age}.manifest.json"
chmod u+w "$repository/$corrupt"
printf x >> "$repository/$corrupt"
chmod 0400 "$repository/$corrupt"
if [[ "$host_uid" == 0 ]]; then
  chown "$container_uid:$container_gid" "$repository/$corrupt" "${repository}/${corrupt%.dump.age}.manifest.json"
fi

restore_run() {
  local selected_archive=$1 identity=$2
  docker run --rm --user "$container_uid:$container_gid" --network "$name" \
    --mount "type=bind,source=$repository,target=/backup/repository,readonly" \
    --mount "type=bind,source=$secrets/restore-password,target=/run/secrets/postgres_password,readonly" \
    --mount "type=bind,source=$identity,target=/run/secrets/backup_age_identity,readonly" \
    --entrypoint /usr/local/bin/lyricscloud-restore \
    -e PGHOST=restore-db -e PGUSER=restore_operator -e PGDATABASE=lyricscloud_restore \
    -e PGPASSWORD_FILE=/run/secrets/postgres_password -e AGE_IDENTITY_FILE=/run/secrets/backup_age_identity \
    -e BACKUP_REPOSITORY_DIR=/backup/repository -e BACKUP_STORAGE_ID=lyricscloud-0915-test-storage \
    -e BACKUP_ARCHIVE="$selected_archive" -e RESTORE_CONFIRM=empty-disposable \
    -e NODE_ENV=test -e "APP_VERSION=$app_version" -e "BUILD_ID=$revision" "$image"
}

corrupt_failure=$(restore_run "$corrupt" "$secrets/identity" 2>&1) && { echo 'corrupt backup unexpectedly restored' >&2; exit 1; }
grep -q '"errorCode":"RESTORE_CHECKSUM_INVALID"' <<< "$corrupt_failure"
wrong_key_failure=$(restore_run "$archive" "$secrets/wrong-identity" 2>&1) && { echo 'wrong age key unexpectedly restored' >&2; exit 1; }
grep -q '"errorCode":"RESTORE_DECRYPT_OR_ARCHIVE_INVALID"' <<< "$wrong_key_failure"
restore_started=$(date +%s%3N)
restore_result=$(restore_run "$archive" "$secrets/identity")
restore_duration_ms=$(( $(date +%s%3N) - restore_started ))
grep -q '"restoreValidation":"PASS"' <<< "$restore_result"

source_fingerprint=$(docker exec "$name-source" psql -Atq -U source_operator -d lyricscloud_source -c \
  "select encode(sha256(d.snapshot),'hex')||':'||encode(sha256(convert_to(l.body,'UTF8')),'hex') from sync_documents d join lyrics l on l.resource_id=d.resource_id")
restore_fingerprint=$(docker exec "$name-restore" psql -Atq -U restore_operator -d lyricscloud_restore -c \
  "select encode(sha256(d.snapshot),'hex')||':'||encode(sha256(convert_to(l.body,'UTF8')),'hex') from sync_documents d join lyrics l on l.resource_id=d.resource_id")
[[ -n "$source_fingerprint" && "$source_fingerprint" == "$restore_fingerprint" ]]
owner_a_count=$(docker exec "$name-restore" psql -Atq -U restore_operator -d lyricscloud_restore -c \
  "begin; set local role lyricscloud_app; select set_config('app.user_id','10000000-0000-4000-8000-000000000001',true); select count(*) from resources; rollback" | tail -1)
owner_b_count=$(docker exec "$name-restore" psql -Atq -U restore_operator -d lyricscloud_restore -c \
  "begin; set local role lyricscloud_app; select set_config('app.user_id','20000000-0000-4000-8000-000000000002',true); select count(*) from resources; rollback" | tail -1)
[[ "$owner_a_count" == "4" && "$owner_b_count" == "0" ]]
search_count=$(docker exec "$name-restore" psql -Atq -U restore_operator -d lyricscloud_restore -c \
  "select count(*) from resources where search_title like '%synthetic%'")
[[ "$search_count" -ge 1 ]]
smoke_token=backup-product-smoke-session
smoke_hash=$(docker run --rm --entrypoint /nodejs/bin/node "lyricscloud-web-ci:$revision" -e \
  "process.stdout.write(require('node:crypto').createHash('sha256').update(process.argv[1]).digest('base64url'))" "$smoke_token")
docker exec -i "$name-restore" psql -v ON_ERROR_STOP=1 -v smoke_hash="$smoke_hash" -U restore_operator -d lyricscloud_restore >/dev/null <<'SQL'
insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at)
values(:'smoke_hash','10000000-0000-4000-8000-000000000001',now()+interval '10 days',now()+interval '20 days');
SQL

docker run -d --name "$name-collaboration" --network "$name" --network-alias collaboration \
  --read-only --tmpfs /tmp:size=64m,mode=1777 \
  -e DATABASE_URL=postgresql://restore_operator:restore-secret-only@restore-db:5432/lyricscloud_restore \
  -e NODE_ENV=test -e "APP_VERSION=$app_version" -e "BUILD_ID=$revision" \
  "lyricscloud-collaboration-ci:$revision" >/dev/null
docker run -d --name "$name-web" --network "$name" --network-alias web \
  --read-only --tmpfs /tmp:size=64m,mode=1777 \
  --mount "type=bind,source=$allowlist_file,target=/run/secrets/auth_allowed_emails,readonly" \
  -e DATABASE_URL=postgresql://restore_operator:restore-secret-only@restore-db:5432/lyricscloud_restore \
  -e NODE_ENV=test -e "APP_VERSION=$app_version" -e "BUILD_ID=$revision" -e APP_ORIGIN=http://localhost:8080 \
  -e COLLABORATION_INTERNAL_URL=http://collaboration:3001 -e GOOGLE_ISSUER=http://127.0.0.1:3100 \
  -e OIDC_TEST_FIXTURE=true \
  -e GOOGLE_CLIENT_ID=synthetic-restore-client -e GOOGLE_CLIENT_SECRET=synthetic-restore-secret \
  -e SESSION_SECRET=synthetic-restore-session-secret-at-least-32-bytes \
  -e AUTH_ALLOWED_EMAILS= -e AUTH_ALLOWED_EMAILS_FILE=/run/secrets/auth_allowed_emails "lyricscloud-web-ci:$revision" >/dev/null
check_http() {
  local container=$1 url=$2
  for _ in {1..30}; do
    if docker exec "$container" /nodejs/bin/node -e \
      'fetch(process.argv[1]).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' "$url" >/dev/null 2>&1; then return; fi
    sleep 1
  done
  return 1
}
check_http "$name-collaboration" http://127.0.0.1:3001/health/ready
check_http "$name-web" http://127.0.0.1:3000/api/health/ready
docker exec "$name-web" /nodejs/bin/node -e 'require("node:fs").accessSync(process.env.AUTH_ALLOWED_EMAILS_FILE)'
docker exec "$name-web" /nodejs/bin/node -e '
  const { Client } = require("pg");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  client.connect().then(() => client.query("select count(*)::int count from auth_sessions s join app_users u on u.id=s.user_id where s.token_hash=$1 and s.expires_at>now() and s.absolute_expires_at>now() and u.status=$2", [process.argv[1], "active"]))
    .then(result => { if (result.rows[0]?.count !== 1) process.exitCode = 1; })
    .finally(() => client.end());
' "$smoke_hash"
if ! docker exec "$name-web" /nodejs/bin/node -e '
  fetch("http://127.0.0.1:3000/api/auth/session", { headers: { cookie: `lc_session=${process.argv[1]}` } })
    .then(async response => { const payload = await response.json(); if (!response.ok || !payload.authenticated) { console.error(response.status, JSON.stringify(payload)); process.exit(1); } })
    .catch(() => process.exit(1));
' "$smoke_token"; then
  docker logs --tail 40 "$name-web" >&2 || true
  exit 1
fi
docker exec "$name-web" /nodejs/bin/node -e '
  fetch("http://127.0.0.1:3000/api/songs", { headers: { cookie: `lc_session=${process.argv[1]}` } })
    .then(async response => { const payload = await response.json(); if (!response.ok || !Array.isArray(payload.items) || payload.items.length !== 1) { console.error(response.status, JSON.stringify(payload)); process.exit(1); } })
    .catch(() => process.exit(1));
' "$smoke_token"
if grep -aE 'LC_CANARY_(BACKUP_PLAINTEXT|RHYME|PROMPT|REVISION)_0915' "$repository/$archive" >/dev/null; then
  echo 'plaintext canary found in encrypted archive' >&2; exit 1
fi

printf '{"backupRestore0915":"PASS","scheduledBackups":2,"retention":"PASS","rpoHours":24,"storageFailure":"PASS","capacityFailure":"PASS","corruptionFailure":"PASS","wrongKeyFailure":"PASS","restoreDurationMs":%s,"ownerIsolation":"PASS","search":"PASS","crdtProjectionFingerprint":"MATCH","productSmoke":"PASS","plaintextCanaryMatches":0}\n' "$restore_duration_ms"
