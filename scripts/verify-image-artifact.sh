#!/usr/bin/env bash
set -euo pipefail

: "${IMAGE:?IMAGE is required}"
: "${IMAGE_DIGEST:?IMAGE_DIGEST is required}"
: "${DOCKERFILE:?DOCKERFILE is required}"
: "${BUILD_TARGET:?BUILD_TARGET is required}"
: "${GITHUB_SHA:?GITHUB_SHA is required}"
: "${GITHUB_WORKFLOW_REF:?GITHUB_WORKFLOW_REF is required}"
[[ "$IMAGE" =~ ^parkingplace/lyricscloud-(web|collaboration|worker|migrate)$ ]]
[[ "$IMAGE_DIGEST" =~ ^sha256:[0-9a-f]{64}$ ]]

artifact="$IMAGE@$IMAGE_DIGEST"
identity="https://github.com/$GITHUB_WORKFLOW_REF"
issuer=https://token.actions.githubusercontent.com
cosign sign --yes "$artifact"

signature_verified=false
for attempt in {1..10}; do
  if cosign verify --experimental-oci11 \
    --certificate-identity "$identity" \
    --certificate-oidc-issuer "$issuer" \
    "$artifact" >/dev/null; then
    signature_verified=true
    break
  fi

  if (( attempt < 10 )); then
    printf 'Signature discovery pending for %s (attempt %d/10); retrying.\n' "$artifact" "$attempt" >&2
    sleep 3
  fi
done

if [[ "$signature_verified" != true ]]; then
  printf 'Signature verification failed for %s after 10 attempts.\n' "$artifact" >&2
  exit 1
fi

provenance=$(docker buildx imagetools inspect "$artifact" --format '{{json .Provenance.SLSA.buildDefinition.externalParameters}}')
jq -e \
  --arg revision "$GITHUB_SHA" \
  --arg source "https://github.com/parking-place/LyricsCloud" \
  --arg dockerfile "$(basename "$DOCKERFILE")" \
  --arg target "$BUILD_TARGET" \
  '.request.args["label:org.opencontainers.image.revision"] == $revision
    and .request.root.request.args["vcs:revision"] == $revision
    and .request.root.request.args["vcs:source"] == $source
    and .request.args.target == $target
    and .configSource.path == $dockerfile' <<< "$provenance" >/dev/null

printf 'Artifact signature and provenance: PASS %s@%s\n' "$IMAGE" "$IMAGE_DIGEST"
