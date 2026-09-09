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
allowlist_keyring=.private/keys/auth_allowlist_hmac_keyring
beta_index_key=.private/runtime/beta_code_index_key
if [ ! -s .env ] || [ ! -s .test_users ] || [ ! -s "$allowlist_keyring" ] || [ ! -s "$beta_index_key" ]; then
  printf 'Development .env, HMAC allowlist/keyring, or beta index key is missing.\n' >&2
  exit 6
fi
chmod 600 .env .test_users "$allowlist_keyring" "$beta_index_key"

# Compose implements local file secrets as bind mounts. Keep the source list at
# mode 600 while staging a nonroot-only runtime copy for the Distroless web UID.
runtime_secret_directory=.private/runtime
runtime_secret_file=$runtime_secret_directory/auth_allowed_emails
runtime_keyring_file=$runtime_secret_directory/auth_allowlist_hmac_keyring
runtime_beta_index_file=$runtime_secret_directory/web_beta_code_index_key
stage_runtime_auth_secrets() {
  local runtime_secret_temporary runtime_keyring_temporary runtime_beta_index_temporary
  install -d -m 700 "$runtime_secret_directory"
  runtime_secret_temporary=$(mktemp "$runtime_secret_directory/auth_allowed_emails.XXXXXX")
  runtime_keyring_temporary=$(mktemp "$runtime_secret_directory/auth_allowlist_hmac_keyring.XXXXXX")
  runtime_beta_index_temporary=$(mktemp "$runtime_secret_directory/web_beta_code_index_key.XXXXXX")
  cleanup_runtime_secret_temporaries() {
    [ -z "${runtime_secret_temporary:-}" ] || unlink "$runtime_secret_temporary" 2>/dev/null || true
    [ -z "${runtime_keyring_temporary:-}" ] || unlink "$runtime_keyring_temporary" 2>/dev/null || true
    [ -z "${runtime_beta_index_temporary:-}" ] || unlink "$runtime_beta_index_temporary" 2>/dev/null || true
  }
  trap cleanup_runtime_secret_temporaries EXIT
  install -o 65532 -g 65532 -m 400 .test_users "$runtime_secret_temporary"
  install -o 65532 -g 65532 -m 400 "$allowlist_keyring" "$runtime_keyring_temporary"
  install -o 65532 -g 65532 -m 400 "$beta_index_key" "$runtime_beta_index_temporary"
  mv "$runtime_secret_temporary" "$runtime_secret_file"
  mv "$runtime_keyring_temporary" "$runtime_keyring_file"
  mv "$runtime_beta_index_temporary" "$runtime_beta_index_file"
  runtime_secret_temporary=
  runtime_keyring_temporary=
  runtime_beta_index_temporary=
  trap - EXIT
  if [ "$(stat -c '%u:%g:%a' "$runtime_secret_file")" != "65532:65532:400" ] \
    || [ "$(stat -c '%u:%g:%a' "$runtime_keyring_file")" != "65532:65532:400" ] \
    || [ "$(stat -c '%u:%g:%a' "$runtime_beta_index_file")" != "65532:65532:400" ]; then
    printf 'Development runtime auth secret ownership verification failed.\n' >&2
    exit 6
  fi
}
stage_runtime_auth_secrets

environment_file=$(mktemp)
trap 'unlink "$environment_file" 2>/dev/null || true' EXIT
app_version=$(tr -d '\r\n' < VERSION)
if [[ ! $app_version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  printf 'Invalid application VERSION; deployment stopped.\n' >&2
  exit 6
fi
if [[ ! $branch =~ ^phase/[0-9]+\.[0-9]+\.[0-9]+-p([1-9][0-9]*)- ]]; then
  printf 'Development branch must include a version and pN phase.\n' >&2
  exit 6
fi
app_phase=p${BASH_REMATCH[1]}
awk -v build_id="$expected_commit" -v app_version="$app_version" -v app_phase="$app_phase" '
  BEGIN { found = 0; version_found = 0; channel_found = 0; phase_found = 0 }
  /^BUILD_ID=/ {
    if (!found) print "BUILD_ID=" build_id
    found = 1
    next
  }
  /^APP_VERSION=/ {
    if (!version_found) print "APP_VERSION=" app_version
    version_found = 1
    next
  }
  /^APP_CHANNEL=/ {
    if (!channel_found) print "APP_CHANNEL=dev"
    channel_found = 1
    next
  }
  /^APP_PHASE=/ {
    if (!phase_found) print "APP_PHASE=" app_phase
    phase_found = 1
    next
  }
  { print }
  END {
    if (!found) print "BUILD_ID=" build_id
    if (!version_found) print "APP_VERSION=" app_version
    if (!channel_found) print "APP_CHANNEL=dev"
    if (!phase_found) print "APP_PHASE=" app_phase
  }
' .env > "$environment_file"
chmod 600 "$environment_file"
mv "$environment_file" .env
trap - EXIT

"${compose[@]}" config --quiet
"${compose[@]}" build
"${compose[@]}" run --rm migrate
# Re-stage immediately before container replacement. Compose file secrets are
# bind mounts, so a missing source must never leave only part of the stack up.
stage_runtime_auth_secrets
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
    web_container=$("${compose[@]}" ps -q web)
    if [ "$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$web_container" | awk -F= '$1 == "NODE_ENV" { print $2 }')" != "production" ]; then
      printf 'Development web container is not running the production build.\n' >&2
      exit 8
    fi
    if [ "$(docker inspect --format '{{.Config.User}}' "$web_container")" != "65532" ]; then
      printf 'Development web container is not running as the Distroless nonroot user.\n' >&2
      exit 13
    fi
    auth_html=$(docker exec "$web_container" /nodejs/bin/node -e "fetch('http://127.0.0.1:3000/auth').then(async response => { if (!response.ok) process.exit(1); process.stdout.write(await response.text()) })")
    if printf '%s' "$auth_html" | grep -q 'browser_dev_hmr-client'; then
      printf 'Development web response contains Next.js development assets.\n' >&2
      exit 9
    fi
    mapfile -t css_paths < <(printf '%s' "$auth_html" | grep -oE '/_next/static/[^" ]+\.css' | sort -u || true)
    if [ "${#css_paths[@]}" -eq 0 ]; then
      printf 'Development web response does not reference a CSS asset.\n' >&2
      exit 10
    fi
    if ! docker exec "$web_container" /nodejs/bin/node -e '
      Promise.all(process.argv.slice(1).map(async path => {
        const response = await fetch("http://127.0.0.1:3000" + path);
        if (!response.ok) throw new Error("CSS asset request failed");
        return response.text();
      })).then(parts => {
        const css = parts.join("\n");
        if (!css.includes(".songs-page") || !css.includes(".dashboard-page")) process.exit(2);
      }).catch(() => process.exit(1));
    ' "${css_paths[@]}"; then
      printf 'Development web CSS asset does not match the song UI build.\n' >&2
      exit 11
    fi
    if ! ./scripts/cleanup-docker.sh --build-cache; then
      printf 'Development services are healthy, but Docker cleanup failed.\n' >&2
      exit 12
    fi
    printf 'Development deploy OK: %s\n' "$expected_commit"
    exit 0
  fi
  sleep 2
done

"${compose[@]}" ps
printf 'Development containers did not become healthy.\n' >&2
exit 7
