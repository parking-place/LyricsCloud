#!/usr/bin/env bash
set -euo pipefail

revision=${1:?Usage: scan-container-vulnerabilities.sh IMAGE_TAG}
[[ "$revision" =~ ^[a-zA-Z0-9_.-]+$ ]] || exit 2
cache_path=${TRIVY_CACHE_PATH:-.private/trivy-cache}
mkdir -p "$cache_path"
cache_path=$(cd "$cache_path" && pwd)
scanner='aquasec/trivy:0.68.2@sha256:05d0126976bdedcd0782a0336f77832dbea1c81b9cc5e4b3a5ea5d2ec863aca7'

for service in web collaboration worker migrate; do
  scan_json=$(docker run --rm \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v "$cache_path:/root/.cache/" \
    "$scanner" image --ignore-unfixed --severity HIGH,CRITICAL --scanners vuln \
    --no-progress --format json "lyricscloud-$service-ci:$revision" 2>/dev/null)
  count=$(jq '[.Results[]?.Vulnerabilities[]?] | length' <<<"$scan_json")
  printf '%s high_or_critical_with_fix=%s\n' "$service" "$count"
  if [[ "$count" != "0" ]]; then
    jq -r '.Results[]?.Vulnerabilities[]? | [.VulnerabilityID,.PkgName,.InstalledVersion,.FixedVersion] | @tsv' \
      <<<"$scan_json" | sort -u
    exit 1
  fi
done
