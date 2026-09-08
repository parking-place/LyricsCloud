#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

repository=${BACKUP_REPOSITORY_DIR:-/backup/repository}
storage_id=${BACKUP_STORAGE_ID:-}
archive=${BACKUP_ARCHIVE:-${1:-}}
identity_file=${AGE_IDENTITY_FILE:-/run/secrets/backup_age_identity}
password_file=${PGPASSWORD_FILE:-/run/secrets/postgres_password}
failure_code=RESTORE_FAILED

log_event() {
  local event=$1 outcome=$2 code=${3:-}
  if [[ -n "$code" ]]; then
    printf '{"signal":"log","event":"%s","operation":"restore","outcome":"%s","errorCode":"%s","service":"backup","environment":"%s","version":"%s","buildId":"%s","timestamp":"%s"}\n' \
      "$event" "$outcome" "$code" "${NODE_ENV:-production}" "${APP_VERSION:-unknown}" "${BUILD_ID:-unknown}" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  else
    printf '{"signal":"log","event":"%s","operation":"restore","outcome":"%s","service":"backup","environment":"%s","version":"%s","buildId":"%s","timestamp":"%s"}\n' \
      "$event" "$outcome" "${NODE_ENV:-production}" "${APP_VERSION:-unknown}" "${BUILD_ID:-unknown}" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  fi
}

failed() {
  local status=$?
  trap - ERR
  log_event restore_failed failure "$failure_code" >&2
  exit "$status"
}
trap failed ERR

[[ "${RESTORE_CONFIRM:-}" == "empty-disposable" ]]
[[ "$storage_id" =~ ^[A-Za-z0-9._-]{1,64}$ ]]
[[ "${PGHOST:-}" =~ ^[A-Za-z0-9._-]+$ ]]
[[ "${PGPORT:-5432}" =~ ^[0-9]+$ ]]
[[ "${PGUSER:-}" =~ ^[A-Za-z0-9._-]+$ ]]
[[ "${PGDATABASE:-}" =~ ^[A-Za-z0-9._-]+_restore$ ]]

failure_code=RESTORE_STORAGE_UNAVAILABLE
[[ -d "$repository" && -r "$repository" ]]
[[ -f "$repository/.lyricscloud-backup-storage-id" ]]
[[ "$(tr -d '\r\n' < "$repository/.lyricscloud-backup-storage-id")" == "$storage_id" ]]
[[ -n "$archive" ]]
if [[ "$archive" != /* ]]; then archive="$repository/$archive"; fi
[[ "$archive" == "$repository"/lyricscloud-*.dump.age && -s "$archive" ]]
manifest="${archive%.dump.age}.manifest.json"
[[ -s "$manifest" ]]

failure_code=RESTORE_MANIFEST_INVALID
manifest_value() {
  sed -n "s/^[[:space:]]*\"$1\":[[:space:]]*\"\([^\"]*\)\".*/\1/p" "$manifest"
}
expected_checksum=$(manifest_value sha256)
expected_file=$(manifest_value encryptedFile)
expected_schema=$(manifest_value databaseSchemaVersion)
[[ "$expected_checksum" =~ ^[0-9a-f]{64}$ ]]
[[ "$expected_file" == "$(basename "$archive")" ]]
[[ "$expected_schema" =~ ^[A-Za-z0-9._-]{1,128}$ ]]
failure_code=RESTORE_CHECKSUM_INVALID
actual_checksum=$(sha256sum "$archive" | awk '{print $1}')
[[ "$actual_checksum" == "$expected_checksum" ]]

failure_code=RESTORE_SECRET_INVALID
[[ -s "$identity_file" && -s "$password_file" ]]
key_mode=$(stat -c %a "$identity_file")
[[ "$key_mode" =~ ^[0-7]{3,4}$ ]]
(( (8#$key_mode & 077) == 0 ))
grep -q '^AGE-SECRET-KEY-' "$identity_file"

export PGPASSWORD
PGPASSWORD=$(tr -d '\r\n' < "$password_file")
failure_code=RESTORE_TARGET_NOT_EMPTY
table_count=$(psql --no-password --tuples-only --no-align --command \
  "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')" | tr -d '\r\n')
[[ "$table_count" == "0" ]]
psql --no-password --dbname postgres --command \
  "do \$\$ begin if not exists(select 1 from pg_roles where rolname='lyricscloud_app') then create role lyricscloud_app nologin nosuperuser nocreatedb nocreaterole noinherit; end if; end \$\$;" >/dev/null

failure_code=RESTORE_DECRYPT_OR_ARCHIVE_INVALID
age --decrypt --identity "$identity_file" "$archive" | pg_restore --list >/dev/null
age --decrypt --identity "$identity_file" "$archive" \
  | pg_restore --exit-on-error --no-owner --dbname "$PGDATABASE"

failure_code=RESTORE_INTEGRITY_FAILED
restored_schema=$(psql --no-password --tuples-only --no-align --command \
  "select coalesce(max(name),'none') from schema_migrations" | tr -d '\r\n')
[[ "$restored_schema" == "$expected_schema" ]]
integrity=$(psql --no-password --tuples-only --no-align --field-separator '|' <<'SQL'
select
  (select count(*) from app_users),
  (select count(*) from resources),
  (select count(*) from auth_sessions),
  (select count(*) from sync_documents),
  (select count(*) from lyric_revisions),
  (select count(*) from resources where deleted_at is not null),
  (select count(*) from app_users where status='withdrawal_pending'),
  (select count(*) from pg_indexes where schemaname='public' and indexname in
    ('resources_active_search_title_trgm_idx','lyrics_search_body_trgm_idx','rhyme_notes_search_body_trgm_idx','prompts_search_text_trgm_idx')),
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relrowsecurity and not c.relforcerowsecurity),
  (select count(*) from sync_documents d left join resources r
    on r.id=d.resource_id and r.owner_id=d.owner_id and r.type=d.resource_type where r.id is null);
SQL
)
IFS='|' read -r users resources sessions documents revisions trash withdrawals search_indexes rls_not_forced crdt_orphans <<< "$integrity"
[[ "$users" -ge 1 && "$resources" -ge 1 && "$search_indexes" == "4" && "$rls_not_forced" == "0" && "$crdt_orphans" == "0" ]]
unset PGPASSWORD
log_event restore_completed success
printf '{"restoreValidation":"PASS","databaseSchemaVersion":"%s","counts":{"users":%s,"resources":%s,"sessions":%s,"syncDocuments":%s,"revisions":%s,"trash":%s,"withdrawals":%s},"searchIndexes":%s,"forcedRlsViolations":%s,"crdtOrphans":%s}\n' \
  "$restored_schema" "$users" "$resources" "$sessions" "$documents" "$revisions" "$trash" "$withdrawals" "$search_indexes" "$rls_not_forced" "$crdt_orphans"
