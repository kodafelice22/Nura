#!/usr/bin/env bash
set -euo pipefail

mode="release"
if [[ "${1:-}" == "--bootstrap" ]]; then
  mode="bootstrap"
elif [[ "${1:-}" == "--preview" ]]; then
  mode="preview"
elif [[ -n "${1:-}" ]]; then
  echo "Usage: $0 [--bootstrap|--preview]" >&2
  exit 2
fi

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="${ENV_FILE:-${repo_dir}/.env}"
compose=(docker compose --env-file "$env_file")
previous_backend_image_id=""
previous_storefront_image_id=""
previous_caddy_image_id=""

env_value() {
  local key="$1"
  local value

  value="$(awk -v key="$key" '
    index($0, key "=") == 1 {
      value = substr($0, length(key) + 2)
    }
    END { print value }
  ' "$env_file")"
  value="${value%$'\r'}"

  if [[ ${#value} -ge 2 ]]; then
    if [[ "${value:0:1}" == '"' && "${value: -1}" == '"' ]] ||
       [[ "${value:0:1}" == "'" && "${value: -1}" == "'" ]]; then
      value="${value:1:${#value}-2}"
    fi
  fi

  printf '%s' "$value"
}

wait_for_service() {
  local service="$1"
  local timeout_seconds="${2:-300}"
  local container_id
  local state
  local elapsed=0

  while [[ "$elapsed" -lt "$timeout_seconds" ]]; do
    container_id="$("${compose[@]}" ps -q "$service")"
    if [[ -n "$container_id" ]]; then
      state="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id")"
      if [[ "$state" == "healthy" || "$state" == "running" ]]; then
        printf '%s is %s.\n' "$service" "$state"
        return 0
      fi
      if [[ "$state" == "unhealthy" || "$state" == "exited" || "$state" == "dead" ]]; then
        echo "$service entered state: $state" >&2
        "${compose[@]}" logs --tail=100 "$service" >&2
        return 1
      fi
    fi

    sleep 5
    elapsed=$((elapsed + 5))
  done

  echo "Timed out waiting for $service" >&2
  "${compose[@]}" logs --tail=100 "$service" >&2
  return 1
}

smoke_test() {
  local url="$1"
  local attempts=12

  for ((attempt = 1; attempt <= attempts; attempt++)); do
    if curl --fail --silent --show-error --max-time 15 "$url" >/dev/null; then
      printf 'Smoke test passed: %s\n' "$url"
      return 0
    fi
    sleep 5
  done

  echo "Smoke test failed: $url" >&2
  return 1
}

smoke_test_status() {
  local url="$1"
  local expected_status="$2"
  local attempts=12
  local actual_status

  for ((attempt = 1; attempt <= attempts; attempt++)); do
    actual_status="$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 15 "$url" || true)"
    if [[ "$actual_status" == "$expected_status" ]]; then
      printf 'Smoke test passed: %s returned %s\n' "$url" "$expected_status"
      return 0
    fi
    sleep 5
  done

  echo "Smoke test failed: $url returned $actual_status, expected $expected_status" >&2
  return 1
}

smoke_test_redirect() {
  local url="$1"
  local expected_url="$2"
  local attempts=12
  local result
  local actual_status
  local actual_url

  for ((attempt = 1; attempt <= attempts; attempt++)); do
    result="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}\n%{redirect_url}' --max-time 15 "$url" || true)"
    actual_status="${result%%$'\n'*}"
    actual_url="${result#*$'\n'}"
    if [[ "$actual_status" == "301" && "$actual_url" == "$expected_url" ]]; then
      printf 'Redirect smoke test passed: %s -> %s\n' "$url" "$expected_url"
      return 0
    fi
    sleep 5
  done

  echo "Redirect smoke test failed: $url returned $actual_status -> $actual_url" >&2
  return 1
}

capture_current_images() {
  local image_name
  local image_id

  for image_name in backend storefront caddy; do
    if docker image inspect "nura/${image_name}:current" >/dev/null 2>&1; then
      image_id="$(docker image inspect --format '{{.Id}}' "nura/${image_name}:current")"
      case "$image_name" in
        backend) previous_backend_image_id="$image_id" ;;
        storefront) previous_storefront_image_id="$image_id" ;;
        caddy) previous_caddy_image_id="$image_id" ;;
      esac
    fi
  done
}

preserve_previous_images() {
  if [[ -n "$previous_backend_image_id" ]]; then
    docker image tag "$previous_backend_image_id" "nura/backend:previous"
  fi
  if [[ -n "$previous_storefront_image_id" ]]; then
    docker image tag "$previous_storefront_image_id" "nura/storefront:previous"
  fi
  if [[ -n "$previous_caddy_image_id" ]]; then
    docker image tag "$previous_caddy_image_id" "nura/caddy:previous"
  fi
}

cd "$repo_dir"
if [[ "$mode" == "bootstrap" ]]; then
  bash scripts/vps-preflight.sh --bootstrap
elif [[ "$mode" == "preview" ]]; then
  bash scripts/vps-preflight.sh --preview
else
  bash scripts/vps-preflight.sh
fi

postgres_id="$("${compose[@]}" ps -q postgres)"
if [[ -n "$postgres_id" ]] && [[ "$(docker inspect --format '{{.State.Running}}' "$postgres_id")" == "true" ]]; then
  export BACKUP_ENCRYPTION_KEY
  BACKUP_ENCRYPTION_KEY="$(env_value BACKUP_ENCRYPTION_KEY)"
  BACKUP_DIR="${BACKUP_DIR:-${repo_dir}/backups}" bash scripts/backup-postgres.sh
fi

capture_current_images
preserve_previous_images

"${compose[@]}" pull postgres redis meilisearch

if [[ "$mode" == "bootstrap" ]]; then
  "${compose[@]}" build --pull backend caddy
  "${compose[@]}" rm --stop --force geoipupdate
  MEDUSA_BOOTSTRAP_MODE=true "${compose[@]}" up -d --remove-orphans postgres redis meilisearch backend

  for service in postgres redis meilisearch backend; do
    wait_for_service "$service"
  done

  CADDY_CONFIG_FILE=/etc/caddy/Caddyfile.bootstrap "${compose[@]}" up -d --no-deps caddy
  wait_for_service caddy

  smoke_test "https://$(env_value BACKEND_DOMAIN)/health"
  echo "Bootstrap deployment completed. Create the publishable key, then run this script without --bootstrap."
  exit 0
fi

"${compose[@]}" pull geoipupdate
"${compose[@]}" build --pull backend storefront caddy
"${compose[@]}" up -d --remove-orphans

for service in postgres redis meilisearch geoipupdate backend storefront caddy; do
  wait_for_service "$service"
done

if [[ "$mode" == "release" ]]; then
  "${compose[@]}" exec -T backend npx medusa exec ./src/scripts/seed-region.js
fi

if [[ "$mode" == "preview" ]]; then
  smoke_test_status "https://$(env_value BACKEND_DOMAIN)/health" 403
  smoke_test_status "https://$(env_value STOREFRONT_DOMAIN)/" 403
else
  smoke_test "https://$(env_value BACKEND_DOMAIN)/health"
  smoke_test "https://$(env_value BACKEND_DOMAIN)/meilisearch/health"
  smoke_test "https://$(env_value STOREFRONT_DOMAIN)/"
  smoke_test_redirect \
    "https://www.$(env_value STOREFRONT_DOMAIN)/deployment-smoke?source=nura" \
    "https://$(env_value STOREFRONT_DOMAIN)/deployment-smoke?source=nura"
fi

"${compose[@]}" ps
docker image prune --force --filter "until=168h" >/dev/null
echo "Deployment completed successfully."