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
cosign sign --yes --registry-referrers-mode=oci-1-1 "$artifact"
cosign verify --experimental-oci11 --certificate-identity "$identity" --certificate-oidc-issuer "$issuer" "$artifact" >/dev/null

provenance=$(docker buildx imagetools inspect "$artifact" --format '{{json .Provenance.SLSA.buildDefinition.externalParameters}}')
grep -Fq "\"label:org.opencontainers.image.revision\":\"$GITHUB_SHA\"" <<< "$provenance"
grep -Fq '"vcs:source":"https://github.com/parking-place/LyricsCloud"' <<< "$provenance"
grep -Fq "\"target\":\"$BUILD_TARGET\"" <<< "$provenance"
grep -Fq "\"path\":\"$(basename "$DOCKERFILE")\"" <<< "$provenance"

printf 'Artifact signature and provenance: PASS %s@%s\n' "$IMAGE" "$IMAGE_DIGEST"
