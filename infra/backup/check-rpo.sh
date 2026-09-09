#!/usr/bin/env bash
set -Eeuo pipefail

repository=${BACKUP_REPOSITORY_DIR:-/backup/repository}
maximum_age_hours=${BACKUP_MAX_AGE_HOURS:-24}
status_file="$repository/last-success.json"
[[ "$maximum_age_hours" =~ ^[0-9]+$ && "$maximum_age_hours" -ge 1 ]]

fail() {
  printf '{"signal":"alert","event":"backup_failed","operation":"backup","outcome":"failure","errorCode":"BACKUP_RPO_EXCEEDED","service":"backup","environment":"%s","version":"%s","buildId":"%s","metric":"backup_failure_count","value":1,"unit":"count","severity":"critical","runbook":"docs/runbooks/backup-restore-upgrade.md#rpo-exceeded","timestamp":"%s"}\n' \
    "${NODE_ENV:-production}" "${APP_VERSION:-unknown}" "${BUILD_ID:-unknown}" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >&2
  exit 1
}

# backup.sh writes this compact v1 record atomically. Read it once so a
# concurrent successful backup cannot mix fields from different status files.
[[ -f "$status_file" && -s "$status_file" && ! -L "$status_file" ]] || fail
status=$(cat -- "$status_file") || fail
status_pattern='^\{"schemaVersion":"lyricscloud\.backup\.status\.v1","createdAt":"([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z)","encryptedFile":"(lyricscloud-[0-9]{8}T[0-9]{6}Z-[0-9a-f]{32}\.dump\.age)","encryptedSizeBytes":([1-9][0-9]*),"checksumVerified":true\}$'
[[ "$status" =~ $status_pattern ]] || fail
created_at=${BASH_REMATCH[1]}
encrypted_file=${BASH_REMATCH[2]}
size_bytes=${BASH_REMATCH[3]}
created_epoch=$(date -u -d "$created_at" +%s 2>/dev/null) || fail
now_epoch=${RPO_NOW_EPOCH:-$(date -u +%s)}
[[ "$now_epoch" =~ ^[0-9]{1,12}$ ]] || fail
age_seconds=$((10#$now_epoch - created_epoch))
[[ "$age_seconds" -ge 0 && "$age_seconds" -le $((maximum_age_hours * 3600)) ]] || fail

# Historical checksumVerified=true is not proof the archive still exists.
# These checks read the actual encrypted bytes; this is an integrity probe,
# not a cheap process-liveness endpoint. No archive paths enter telemetry.
archive="$repository/$encrypted_file"
manifest="${archive%.dump.age}.manifest.json"
marker="$repository/.lyricscloud-backup-storage-id"
[[ -f "$archive" && -s "$archive" && ! -L "$archive" ]] || fail
[[ -f "$manifest" && -s "$manifest" && ! -L "$manifest" ]] || fail
[[ -f "$marker" && ! -L "$marker" ]] || fail
storage_id=$(tr -d '\r\n' < "$marker") || fail
[[ "$storage_id" =~ ^[A-Za-z0-9._-]{1,64}$ ]] || fail
[[ -z "${BACKUP_STORAGE_ID:-}" || "$storage_id" == "$BACKUP_STORAGE_ID" ]] || fail
manifest_text=$(cat -- "$manifest") || fail
manifest_value() {
  sed -n "s/^[[:space:]]*\"$1\":[[:space:]]*\"\([^\"]*\)\".*/\1/p" <<< "$manifest_text"
}
[[ "$(manifest_value schemaVersion)" == "lyricscloud.backup.manifest.v1" ]] || fail
[[ "$(manifest_value encryptedFile)" == "$encrypted_file" ]] || fail
[[ "$(manifest_value createdAt)" == "$created_at" ]] || fail
[[ "$(manifest_value storageId)" == "$storage_id" ]] || fail
manifest_size=$(sed -n 's/^[[:space:]]*"encryptedSizeBytes":[[:space:]]*\([0-9][0-9]*\),\{0,1\}[[:space:]]*$/\1/p' <<< "$manifest_text")
[[ "$manifest_size" == "$size_bytes" ]] || fail
actual_size=$(stat -c %s -- "$archive") || fail
[[ "$actual_size" == "$size_bytes" ]] || fail
expected_checksum=$(manifest_value sha256)
[[ "$expected_checksum" =~ ^[0-9a-f]{64}$ ]] || fail
actual_checksum=$(sha256sum -- "$archive") || fail
[[ "${actual_checksum%% *}" == "$expected_checksum" ]] || fail

printf '{"signal":"metric","event":"rpo_checked","operation":"backup","outcome":"success","service":"backup","environment":"%s","version":"%s","buildId":"%s","metric":"backup_age_seconds","value":%s,"unit":"seconds","timestamp":"%s"}\n' \
  "${NODE_ENV:-production}" "${APP_VERSION:-unknown}" "${BUILD_ID:-unknown}" "$age_seconds" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf '{"signal":"metric","event":"rpo_checked","operation":"backup","outcome":"success","service":"backup","environment":"%s","version":"%s","buildId":"%s","metric":"backup_size_bytes","value":%s,"unit":"bytes","timestamp":"%s"}\n' \
  "${NODE_ENV:-production}" "${APP_VERSION:-unknown}" "${BUILD_ID:-unknown}" "$size_bytes" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf '{"signal":"metric","event":"rpo_checked","operation":"backup","outcome":"success","service":"backup","environment":"%s","version":"%s","buildId":"%s","metric":"backup_checksum_verified","value":1,"unit":"count","timestamp":"%s"}\n' \
  "${NODE_ENV:-production}" "${APP_VERSION:-unknown}" "${BUILD_ID:-unknown}" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
