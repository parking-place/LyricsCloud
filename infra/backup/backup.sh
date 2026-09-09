#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

repository=${BACKUP_REPOSITORY_DIR:-/backup/repository}
retention_days=${BACKUP_RETENTION_DAYS:-30}
minimum_free_bytes=${BACKUP_MIN_FREE_BYTES:-67108864}
storage_id=${BACKUP_STORAGE_ID:-}
recipient_file=${AGE_RECIPIENT_FILE:-/run/secrets/backup_age_recipient}
password_file=${PGPASSWORD_FILE:-/run/secrets/postgres_password}
failure_code=BACKUP_FAILED
partial=""
manifest_partial=""
status_partial=""
lock_dir=""
lock_acquired=false

log_event() {
  local event=$1 outcome=$2 code=${3:-}
  if [[ -n "$code" ]]; then
    printf '{"signal":"log","event":"%s","operation":"backup","outcome":"%s","errorCode":"%s","service":"backup","environment":"%s","version":"%s","buildId":"%s","timestamp":"%s"}\n' \
      "$event" "$outcome" "$code" "${NODE_ENV:-production}" "${APP_VERSION:-unknown}" "${BUILD_ID:-unknown}" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  else
    printf '{"signal":"log","event":"%s","operation":"backup","outcome":"%s","service":"backup","environment":"%s","version":"%s","buildId":"%s","timestamp":"%s"}\n' \
      "$event" "$outcome" "${NODE_ENV:-production}" "${APP_VERSION:-unknown}" "${BUILD_ID:-unknown}" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  fi
}

cleanup() {
  [[ -z "$partial" ]] || rm -f -- "$partial"
  [[ -z "$manifest_partial" ]] || rm -f -- "$manifest_partial"
  [[ -z "$status_partial" ]] || rm -f -- "$status_partial"
  if [[ "$lock_acquired" == true ]]; then
    rmdir -- "$lock_dir" 2>/dev/null || true
    lock_acquired=false
  fi
}

failed() {
  local status=$?
  trap - ERR
  cleanup
  log_event backup_failed failure "$failure_code" >&2
  exit "$status"
}
trap failed ERR
trap cleanup EXIT

[[ "$retention_days" =~ ^[0-9]+$ && "$retention_days" -ge 1 ]]
[[ "$minimum_free_bytes" =~ ^[0-9]+$ ]]
[[ "$storage_id" =~ ^[A-Za-z0-9._-]{1,64}$ ]]
[[ "${PGHOST:-}" =~ ^[A-Za-z0-9._-]+$ ]]
[[ "${PGPORT:-5432}" =~ ^[0-9]+$ ]]
[[ "${PGUSER:-}" =~ ^[A-Za-z0-9._-]+$ ]]
[[ "${PGDATABASE:-}" =~ ^[A-Za-z0-9._-]+$ ]]

failure_code=BACKUP_STORAGE_UNAVAILABLE
[[ -d "$repository" && -w "$repository" ]]
[[ -f "$repository/.lyricscloud-backup-storage-id" ]]
[[ "$(tr -d '\r\n' < "$repository/.lyricscloud-backup-storage-id")" == "$storage_id" ]]
lock_dir="$repository/.backup.lock"
mkdir "$lock_dir"
lock_acquired=true

failure_code=BACKUP_SECRET_INVALID
[[ -s "$recipient_file" && -s "$password_file" ]]
recipient=$(tr -d '\r\n' < "$recipient_file")
[[ "$recipient" =~ ^age1[0-9a-z]{50,}$ ]]
[[ "$recipient" != AGE-SECRET-KEY-* ]]

failure_code=BACKUP_CAPACITY_LOW
available_bytes=$(df -P -B1 "$repository" | awk 'NR==2 {print $4}')
[[ "$available_bytes" =~ ^[0-9]+$ && "$available_bytes" -ge "$minimum_free_bytes" ]]

export PGPASSWORD
PGPASSWORD=$(tr -d '\r\n' < "$password_file")
failure_code=BACKUP_DATABASE_UNAVAILABLE
database_schema=$(psql --no-password --tuples-only --no-align --command \
  "select coalesce(max(name),'none') from schema_migrations" | tr -d '\r\n')
[[ "$database_schema" =~ ^[A-Za-z0-9._-]{1,128}$ ]]

created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
stamp=$(date -u +%Y%m%dT%H%M%SZ)
run_id=$(tr -d '-' < /proc/sys/kernel/random/uuid)
base="lyricscloud-${stamp}-${run_id}"
archive="$repository/$base.dump.age"
manifest="$repository/$base.manifest.json"
partial="$repository/.$base.dump.age.partial"
manifest_partial="$repository/.$base.manifest.json.partial"

failure_code=BACKUP_DUMP_OR_ENCRYPT_FAILED
pg_dump --no-password --format=custom --no-owner --serializable-deferrable \
  | age --recipients-file "$recipient_file" --output "$partial"
unset PGPASSWORD
[[ -s "$partial" ]]
checksum=$(sha256sum "$partial" | awk '{print $1}')
size_bytes=$(stat -c %s "$partial")
[[ "$checksum" =~ ^[0-9a-f]{64}$ && "$size_bytes" -gt 0 ]]
retained_until=$(date -u -d "+${retention_days} days" +%Y-%m-%dT%H:%M:%SZ)
pg_dump_version=$(pg_dump --version | sed 's/[^A-Za-z0-9(). _-]//g')
age_version=$(age --version 2>&1 | sed 's/[^A-Za-z0-9(). _-]//g')

printf '{\n  "schemaVersion": "lyricscloud.backup.manifest.v1",\n  "databaseSchemaVersion": "%s",\n  "createdAt": "%s",\n  "retainedUntil": "%s",\n  "storageId": "%s",\n  "encryptedFile": "%s",\n  "encryptedSizeBytes": %s,\n  "sha256": "%s",\n  "pgDumpVersion": "%s",\n  "ageVersion": "%s",\n  "applicationVersion": "%s",\n  "buildId": "%s"\n}\n' \
  "$database_schema" "$created_at" "$retained_until" "$storage_id" "$(basename "$archive")" \
  "$size_bytes" "$checksum" "$pg_dump_version" "$age_version" "${APP_VERSION:-unknown}" "${BUILD_ID:-unknown}" \
  > "$manifest_partial"
chmod 0400 "$partial" "$manifest_partial"
mv -- "$partial" "$archive"
partial=""
mv -- "$manifest_partial" "$manifest"
manifest_partial=""

failure_code=BACKUP_CHECKSUM_INVALID
[[ "$(sha256sum "$archive" | awk '{print $1}')" == "$checksum" ]]
status_partial="$repository/.last-success.json.partial"
printf '{"schemaVersion":"lyricscloud.backup.status.v1","createdAt":"%s","encryptedFile":"%s","encryptedSizeBytes":%s,"checksumVerified":true}\n' \
  "$created_at" "$(basename "$archive")" "$size_bytes" > "$status_partial"
chmod 0400 "$status_partial"
mv -- "$status_partial" "$repository/last-success.json"
status_partial=""

pruned=0
while IFS= read -r -d '' old_archive; do
  [[ "$old_archive" == "$archive" ]] && continue
  old_manifest="${old_archive%.dump.age}.manifest.json"
  rm -f -- "$old_archive" "$old_manifest"
  pruned=$((pruned + 1))
done < <(find "$repository" -maxdepth 1 -type f -name 'lyricscloud-*.dump.age' -mtime "+$retention_days" -print0)

rmdir "$lock_dir"
lock_acquired=false
lock_dir=""
if [[ "$pruned" -gt 0 ]]; then
  printf '{"signal":"log","event":"backup_pruned","operation":"backup","outcome":"success","service":"backup","environment":"%s","version":"%s","buildId":"%s","count":%s,"timestamp":"%s"}\n' \
    "${NODE_ENV:-production}" "${APP_VERSION:-unknown}" "${BUILD_ID:-unknown}" "$pruned" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
fi
log_event backup_completed success
printf '{"signal":"metric","event":"backup_completed","operation":"backup","outcome":"success","service":"backup","environment":"%s","version":"%s","buildId":"%s","metric":"backup_size_bytes","value":%s,"unit":"bytes","count":%s,"timestamp":"%s"}\n' \
  "${NODE_ENV:-production}" "${APP_VERSION:-unknown}" "${BUILD_ID:-unknown}" "$size_bytes" "$pruned" "$created_at"
