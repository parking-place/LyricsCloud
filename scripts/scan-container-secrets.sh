#!/usr/bin/env bash
set -euo pipefail

revision=${1:?Usage: scan-container-secrets.sh IMAGE_TAG}
[[ "$revision" =~ ^[a-zA-Z0-9_.-]+$ ]] || exit 2
scan_root=$(mktemp -d)
cleanup() { rm -rf -- "$scan_root"; }
trap cleanup EXIT

for service in web collaboration worker migrate backup; do
  image="lyricscloud-$service-ci:$revision"
  service_root="$scan_root/$service"
  mkdir -p "$service_root/archive" "$service_root/layers"
  docker history --no-trunc "$image" > "$service_root/history.txt"
  docker inspect "$image" > "$service_root/inspect.json"
  docker save "$image" | tar -xf - -C "$service_root/archive"
  layer_index=0
  while IFS= read -r -d '' layer; do
    target="$service_root/layers/$layer_index"
    mkdir -p "$target"
    tar -xf "$layer" -C "$target"
    layer_index=$((layer_index + 1))
  done < <(find "$service_root/archive" -type f -name '*.tar' -print0)
done

node scripts/check-secret-leaks.mjs "$scan_root"
