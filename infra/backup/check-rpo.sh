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

[[ -s "$status_file" ]] || fail
created_at=$(sed -n 's/.*"createdAt":"\([^"]*\)".*/\1/p' "$status_file")
size_bytes=$(sed -n 's/.*"encryptedSizeBytes":\([0-9][0-9]*\).*/\1/p' "$status_file")
verified=$(sed -n 's/.*"checksumVerified":\(true\|false\).*/\1/p' "$status_file")
created_epoch=$(date -u -d "$created_at" +%s 2>/dev/null) || fail
now_epoch=${RPO_NOW_EPOCH:-$(date -u +%s)}
[[ "$now_epoch" =~ ^[0-9]+$ && "$size_bytes" =~ ^[0-9]+$ && "$verified" == true ]] || fail
age_seconds=$((now_epoch - created_epoch))
[[ "$age_seconds" -ge 0 && "$age_seconds" -le $((maximum_age_hours * 3600)) ]] || fail

printf '{"signal":"metric","event":"rpo_checked","operation":"backup","outcome":"success","service":"backup","environment":"%s","version":"%s","buildId":"%s","metric":"backup_age_seconds","value":%s,"unit":"seconds","timestamp":"%s"}\n' \
  "${NODE_ENV:-production}" "${APP_VERSION:-unknown}" "${BUILD_ID:-unknown}" "$age_seconds" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf '{"signal":"metric","event":"rpo_checked","operation":"backup","outcome":"success","service":"backup","environment":"%s","version":"%s","buildId":"%s","metric":"backup_size_bytes","value":%s,"unit":"bytes","timestamp":"%s"}\n' \
  "${NODE_ENV:-production}" "${APP_VERSION:-unknown}" "${BUILD_ID:-unknown}" "$size_bytes" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf '{"signal":"metric","event":"rpo_checked","operation":"backup","outcome":"success","service":"backup","environment":"%s","version":"%s","buildId":"%s","metric":"backup_checksum_verified","value":1,"unit":"count","timestamp":"%s"}\n' \
  "${NODE_ENV:-production}" "${APP_VERSION:-unknown}" "${BUILD_ID:-unknown}" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
