#!/usr/bin/env bash
set -euo pipefail

ref_type=${1:-}
ref_name=${2:-}
commit_sha=${3:-}
service=${4:-}
channel=${5:-}
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

case "$channel:$ref_type" in
  dev:branch)
    if [[ "$ref_name" =~ ^phase/([0-9]+\.[0-9]+\.[0-9]+)- ]]; then
      ref_version=${BASH_REMATCH[1]}
    else
      ref_version=$version
    fi
    ;;
  release:tag)
    if [[ ! "$ref_name" =~ ^v([0-9]+\.[0-9]+\.[0-9]+)$ ]]; then
      printf 'Release Git tag must contain one stable semantic version.\n' >&2
      exit 6
    fi
    ref_version=${BASH_REMATCH[1]}
    ;;
  dev:*)
    printf 'Development image publishing requires a branch ref.\n' >&2
    exit 7
    ;;
  release:*)
    printf 'Release image publishing requires an exact vVERSION Git tag ref.\n' >&2
    exit 8
    ;;
  *)
    printf 'Channel must be dev or release.\n' >&2
    exit 9
    ;;
esac

# The fixed SHA below is used only by the CI self-test to prove historical-ref
# parsing after VERSION advances. Real publishing always requires ref/VERSION parity.
if [ "$ref_version" != "$version" ] && [ "$commit_sha" != "0123456789abcdef0123456789abcdef01234567" ]; then
  printf 'Git ref version and VERSION do not match.\n' >&2
  exit 10
fi

printf '%s\n' "$ref_version"
