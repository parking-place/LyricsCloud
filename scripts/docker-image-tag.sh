#!/usr/bin/env bash
set -euo pipefail

ref_type=${1:-}
ref_name=${2:-}
commit_sha=${3:-}
service=${4:-}
repository_root=$(git rev-parse --show-toplevel)

version=$(tr -d '\r\n' < "$repository_root/VERSION")
status_version=$(awk -F'"' '/^current_version:/ { print $2; exit }' \
  "$repository_root/0.Plans/1. Dev-phase/STATUS.md")

if [[ ! $version =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
  printf 'VERSION must contain one stable semantic version.\n' >&2
  exit 2
fi
if [ "$status_version" != "$version" ]; then
  printf 'VERSION and STATUS current_version do not match.\n' >&2
  exit 3
fi
if [[ ! $commit_sha =~ ^[0-9a-f]{40}$ ]]; then
  printf 'Commit SHA must contain 40 lowercase hexadecimal characters.\n' >&2
  exit 4
fi
case "$service" in
  web|collaboration|worker|migrate) ;;
  *)
    printf 'Service must be web, collaboration, worker, or migrate.\n' >&2
    exit 5
    ;;
esac

case "$ref_type" in
  branch)
    printf '%s-beta.%s-%s\n' "$version" "${commit_sha:0:12}" "$service"
    ;;
  *)
    printf 'Only beta branch images are enabled until release publishing is explicitly approved: %s\n' "$ref_type" >&2
    exit 6
    ;;
esac
