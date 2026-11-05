#!/usr/bin/env bash
set -euo pipefail

: "${ROLLBACK_CONFIRM:?set ROLLBACK_CONFIRM=application-only to confirm the rollback}"
if [[ "$ROLLBACK_CONFIRM" != "application-only" ]]; then
  echo "ROLLBACK_CONFIRM must equal application-only" >&2
  exit 1
fi

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="${ENV_FILE:-${repo_dir}/.env}"
compose=(docker compose --env-file "$env_file")
images=(backend storefront caddy)

cd "$repo_dir"

for image_name in "${images[@]}"; do
  if ! docker image inspect "nura/${image_name}:previous" >/dev/null 2>&1; then
    echo "Previous image is unavailable: nura/${image_name}:previous" >&2
    exit 1
  fi
done

for image_name in "${images[@]}"; do
  docker image tag "nura/${image_name}:previous" "nura/${image_name}:current"
done

"${compose[@]}" up -d --force-recreate --no-build --wait --wait-timeout 300 backend storefront caddy
"${compose[@]}" ps

cat <<'EOF'
Application images rolled back. Database migrations were not reversed.
Confirm that the previous application version is compatible with the current schema,
then verify the backend health endpoint and the storefront checkout flow.
EOF