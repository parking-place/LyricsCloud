#!/usr/bin/env bash
set -euo pipefail

branch=${1:-}
expected_commit=${2:-}

if ! git check-ref-format --branch "$branch" >/dev/null 2>&1; then
  printf 'Invalid development branch.\n' >&2
  exit 2
fi
if [[ ! $expected_commit =~ ^[0-9a-f]{40}$ ]]; then
  printf 'Expected commit must be a full Git SHA.\n' >&2
  exit 2
fi

repository_root=$(git rev-parse --show-toplevel)
cd "$repository_root"
compose=(docker compose -f compose.yaml -f compose.development-server.yaml)

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  printf 'Tracked server checkout has local changes; deployment stopped.\n' >&2
  exit 3
fi

remote_commit=$(git ls-remote --heads origin "refs/heads/$branch" | awk 'NR == 1 {print $1}')
if [ "$remote_commit" != "$expected_commit" ]; then
  printf 'Remote branch does not point at the requested commit.\n' >&2
  exit 4
fi

git fetch --no-tags origin "refs/heads/$branch"
git switch --detach "$expected_commit"

if [ "$(git rev-parse HEAD)" != "$expected_commit" ]; then
  printf 'Server checkout SHA verification failed.\n' >&2
  exit 5
fi
if [ ! -s .env ] || [ ! -s .test_users ]; then
  printf 'Development .env or .test_users is missing.\n' >&2
  exit 6
fi
chmod 600 .env .test_users

"${compose[@]}" config --quiet
"${compose[@]}" build
"${compose[@]}" run --rm migrate
"${compose[@]}" up -d --no-build --remove-orphans

for _attempt in $(seq 1 30); do
  healthy=true
  for service in postgres web collaboration worker; do
    container_id=$("${compose[@]}" ps -q "$service")
    if [ -z "$container_id" ] || [ "$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id")" != "healthy" ]; then
      healthy=false
      break
    fi
  done
  if [ "$healthy" = true ]; then
    printf 'Development deploy OK: %s\n' "$expected_commit"
    exit 0
  fi
  sleep 2
done

"${compose[@]}" ps
printf 'Development containers did not become healthy.\n' >&2
exit 7
