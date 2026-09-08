#!/usr/bin/env bash
set -euo pipefail

revision=${1:-$(git rev-parse HEAD)}
[[ "$revision" =~ ^[0-9a-f]{40}$ ]] || { printf 'Revision must be a full Git SHA.\n' >&2; exit 2; }
work=$(mktemp -d)
prefix="lyricscloud-repro-${revision:0:12}"
cleanup() {
  for service in web collaboration worker migrate; do
    docker image rm "$prefix-$service-a" "$prefix-$service-b" >/dev/null 2>&1 || true
  done
  rm -rf -- "$work"
}
trap cleanup EXIT

build() {
  local suffix=$1
  build_image "$suffix-web" --no-cache --file infra/docker/Dockerfile.web --target runtime --tag "$prefix-web-$suffix"
  build_image "$suffix-collaboration" --no-cache --file infra/docker/Dockerfile.service --target collaboration --tag "$prefix-collaboration-$suffix"
  for service in worker migrate; do
    build_image "$suffix-$service" --file infra/docker/Dockerfile.service --target "$service" --tag "$prefix-$service-$suffix"
  done
}

build_image() {
  local name=$1
  shift
  if ! docker build --progress=plain "$@" . >"$work/build-$name.log" 2>&1; then
    printf 'Build failed: %s\n' "$name" >&2
    tail -n 80 "$work/build-$name.log" >&2
    return 1
  fi
}

normalized_hash() {
  local image=$1 root=$2 container
  mkdir -p "$root"
  container=$(docker create "$image")
  docker export "$container" | tar -xf - -C "$root"
  docker rm "$container" >/dev/null
  if [[ -f "$root/app/apps/web/.next/prerender-manifest.json" ]]; then
    node - "$root" <<'NODE'
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const root = process.argv[2];
const prerenderPath = join(root, "app/apps/web/.next/prerender-manifest.json");
const prerender = JSON.parse(readFileSync(prerenderPath, "utf8"));
for (const key of ["previewModeId", "previewModeSigningKey", "previewModeEncryptionKey"]) prerender.preview[key] = "<per-build-cryptographic-key>";
writeFileSync(prerenderPath, JSON.stringify(prerender));
const referenceJsonPath = join(root, "app/apps/web/.next/server/server-reference-manifest.json");
const reference = JSON.parse(readFileSync(referenceJsonPath, "utf8"));
reference.encryptionKey = "<per-build-cryptographic-key>";
writeFileSync(referenceJsonPath, JSON.stringify(reference));
const referenceJsPath = join(root, "app/apps/web/.next/server/server-reference-manifest.js");
const source = readFileSync(referenceJsPath, "utf8");
const equals = source.indexOf("=");
const embedded = JSON.parse(source.slice(equals + 1));
const jsReference = JSON.parse(embedded);
jsReference.encryptionKey = "<per-build-cryptographic-key>";
writeFileSync(referenceJsPath, `${source.slice(0, equals + 1)}${JSON.stringify(JSON.stringify(jsReference))}`);
NODE
  fi
  if [[ -f "$root/app/node_modules/.modules.yaml" ]]; then
    sed -i 's/^  "prunedAt": .*$/  "prunedAt": "<build-time>",/' "$root/app/node_modules/.modules.yaml"
  fi
  (
    cd "$root"
    find . -type f -print0 | sort -z | xargs -0 sha256sum
    find . -type l -printf '%p\0' | sort -z | while IFS= read -r -d '' link; do printf '%s -> %s\n' "$link" "$(readlink "$link")"; done
  ) | sha256sum | awk '{print $1}'
}

build a
build b
for service in web collaboration worker migrate; do
  config_a=$(docker image inspect "$prefix-$service-a" --format '{{json .Config}}' | sha256sum | awk '{print $1}')
  config_b=$(docker image inspect "$prefix-$service-b" --format '{{json .Config}}' | sha256sum | awk '{print $1}')
  content_a=$(normalized_hash "$prefix-$service-a" "$work/$service-a")
  content_b=$(normalized_hash "$prefix-$service-b" "$work/$service-b")
  [[ "$config_a" == "$config_b" ]] || { printf '%s runtime config differs\n' "$service" >&2; exit 1; }
  [[ "$content_a" == "$content_b" ]] || { printf '%s runtime content differs\n' "$service" >&2; exit 1; }
  id_a=$(docker image inspect "$prefix-$service-a" --format '{{.Id}}')
  id_b=$(docker image inspect "$prefix-$service-b" --format '{{.Id}}')
  exact=false
  [[ "$id_a" == "$id_b" ]] && exact=true
  printf '%s config=%s content=%s exact_image_id=%s\n' "$service" "$config_a" "$content_a" "$exact"
done
printf 'Independent image rebuild comparison: PASS (runtime config and normalized filesystem content are identical; per-build Next preview/server-action keys, pnpm prunedAt and OCI timestamps are intentionally variable).\n'
