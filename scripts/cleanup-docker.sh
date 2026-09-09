#!/usr/bin/env bash
set -euo pipefail

project=${COMPOSE_PROJECT_NAME:-lyricscloud}
prune_build_cache=false
dry_run=false

usage() {
  cat <<'EOF'
Usage: scripts/cleanup-docker.sh [options]

Remove unused Docker objects created by one Compose project. Docker volumes are
never removed. Build cache cleanup is opt-in because a builder can be shared by
multiple projects.

Options:
  --project NAME          Compose project name (default: lyricscloud)
  --build-cache           Remove all unused cache in the active builder
  --dry-run               List project candidates without deleting anything
  -h, --help              Show this help
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --project)
      [ "$#" -ge 2 ] || { printf '%s\n' 'Missing value for --project.' >&2; exit 2; }
      project=$2
      shift 2
      ;;
    --build-cache)
      prune_build_cache=true
      shift
      ;;
    --dry-run)
      dry_run=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown option: %s\n' "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ ! $project =~ ^[A-Za-z0-9][A-Za-z0-9_.-]*$ ]]; then
  printf 'Invalid Compose project name: %s\n' "$project" >&2
  exit 2
fi
if ! docker info >/dev/null 2>&1; then
  printf '%s\n' 'Docker daemon is unavailable.' >&2
  exit 3
fi

project_label="com.docker.compose.project=$project"

if [ "$dry_run" = true ]; then
  printf 'Docker cleanup dry run for Compose project %s\n' "$project"
  printf '%s\n' 'Stopped containers:'
  docker container ls --all \
    --filter "label=$project_label" \
    --filter status=created \
    --filter status=exited \
    --filter status=dead \
    --format '  {{.ID}} {{.Names}} {{.Status}}'
  printf '%s\n' 'Project images (only unused images are removed in apply mode):'
  docker image ls \
    --filter "label=$project_label" \
    --format '  {{.ID}} {{.Repository}}:{{.Tag}} {{.Size}}'
  printf '%s\n' 'Project networks (only unused networks are removed in apply mode):'
  docker network ls \
    --filter "label=$project_label" \
    --format '  {{.ID}} {{.Name}}'
  if [ "$prune_build_cache" = true ]; then
    printf '%s\n' 'All unused cache in the shared builder would be removed; volumes would not be touched.'
  else
    printf '%s\n' 'Shared builder cache would be left unchanged.'
  fi
  exit 0
fi

printf 'Cleaning unused Docker objects for Compose project %s...\n' "$project"
docker container prune --force --filter "label=$project_label"
docker image prune --all --force --filter "label=$project_label"
docker network prune --force --filter "label=$project_label"

if [ "$prune_build_cache" = true ]; then
  printf '%s\n' 'Removing unused shared builder cache...'
  docker builder prune --all --force
fi

printf '%s\n' 'Docker cleanup OK. Volumes, running containers, and in-use images were preserved.'
