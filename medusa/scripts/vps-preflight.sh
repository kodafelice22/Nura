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
errors=0
warnings=0

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  errors=$((errors + 1))
}

warn() {
  printf 'WARN: %s\n' "$*" >&2
  warnings=$((warnings + 1))
}

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

require_value() {
  local key="$1"
  if [[ -z "$(env_value "$key")" ]]; then
    fail "$key is missing or empty in $env_file"
  fi
}

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    fail "required command not found: $command_name"
  fi
}

if [[ ! -f "$env_file" ]]; then
  echo "ERROR: environment file not found: $env_file" >&2
  echo "Create it with: cp ${repo_dir}/.env.example ${env_file}" >&2
  exit 1
fi

for command_name in awk curl docker openssl; do
  require_command "$command_name"
done

required_values=(
  POSTGRES_PASSWORD
  JWT_SECRET
  COOKIE_SECRET
  ORDER_ACCESS_SECRET
  BACKUP_ENCRYPTION_KEY
  STOREFRONT_DOMAIN
  BACKEND_DOMAIN
  STORE_CORS
  ADMIN_CORS
  AUTH_CORS
  NEXT_PUBLIC_MEDUSA_BACKEND_URL
  NEXT_PUBLIC_BASE_URL
  NEXT_PUBLIC_DEFAULT_REGION
  RESEND_API_KEY
  RESEND_FROM_EMAIL
  REFERRAL_REWARD_EUR
  REFERRAL_REWARD_XOF
  S3_FILE_URL
  S3_ACCESS_KEY_ID
  S3_SECRET_ACCESS_KEY
  S3_REGION
  S3_BUCKET
  S3_ENDPOINT
  MEILISEARCH_API_KEY
  REVALIDATE_SECRET
)

if [[ "$mode" != "bootstrap" ]]; then
  required_values+=(
    GEOIPUPDATE_ACCOUNT_ID
    GEOIPUPDATE_LICENSE_KEY
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  )
fi

if [[ "$mode" == "preview" ]]; then
  required_values+=(CADDY_CONFIG_FILE PREVIEW_ALLOWED_CIDRS)
fi

for key in "${required_values[@]}"; do
  require_value "$key"
done

if [[ "$mode" != "bootstrap" ]]; then
  geoip_account_id="$(env_value GEOIPUPDATE_ACCOUNT_ID)"
  geoip_license_key="$(env_value GEOIPUPDATE_LICENSE_KEY)"
  publishable_key="$(env_value NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY)"

  if [[ ! "$geoip_account_id" =~ ^[1-9][0-9]*$ ]]; then
    fail "GEOIPUPDATE_ACCOUNT_ID must be a positive numeric MaxMind account ID"
  fi
  if [[ -n "$geoip_license_key" && ${#geoip_license_key} -lt 16 ]]; then
    fail "GEOIPUPDATE_LICENSE_KEY is too short to be a valid MaxMind license key"
  fi
  if [[ ! "$publishable_key" =~ ^pk_[[:alnum:]_-]{32,}$ ]]; then
    fail "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY must be a valid Medusa publishable key"
  fi
fi

rbac_enabled="$(env_value MEDUSA_FF_RBAC)"
rbac_filter_fields="$(env_value MEDUSA_FF_RBAC_FILTER_FIELDS)"

if [[ "$rbac_enabled" != "true" && "$rbac_enabled" != "false" ]]; then
  fail "MEDUSA_FF_RBAC must be explicitly set to true or false"
elif [[ "$rbac_enabled" == "true" ]]; then
  require_value MEDUSA_LICENSE_KEY
fi

if [[ "$rbac_filter_fields" != "true" && "$rbac_filter_fields" != "false" ]]; then
  fail "MEDUSA_FF_RBAC_FILTER_FIELDS must be explicitly set to true or false"
elif [[ "$rbac_filter_fields" == "true" && "$rbac_enabled" != "true" ]]; then
  fail "MEDUSA_FF_RBAC_FILTER_FIELDS requires MEDUSA_FF_RBAC=true"
fi

secret_values=(
  POSTGRES_PASSWORD
  JWT_SECRET
  COOKIE_SECRET
  ORDER_ACCESS_SECRET
  BACKUP_ENCRYPTION_KEY
  MEILISEARCH_API_KEY
  REVALIDATE_SECRET
)

for key in "${secret_values[@]}"; do
  value="$(env_value "$key")"
  if [[ -n "$value" && ${#value} -lt 32 ]]; then
    fail "$key must contain at least 32 characters"
  fi
done

for ((first = 0; first < ${#secret_values[@]}; first++)); do
  first_key="${secret_values[$first]}"
  first_value="$(env_value "$first_key")"
  [[ -z "$first_value" ]] && continue

  for ((second = first + 1; second < ${#secret_values[@]}; second++)); do
    second_key="${secret_values[$second]}"
    if [[ "$first_value" == "$(env_value "$second_key")" ]]; then
      fail "$first_key and $second_key must use different secrets"
    fi
  done
done

storefront_domain="$(env_value STOREFRONT_DOMAIN)"
backend_domain="$(env_value BACKEND_DOMAIN)"

for domain_name in "$storefront_domain" "$backend_domain"; do
  if [[ -n "$domain_name" && ("$domain_name" == *://* || "$domain_name" == */*) ]]; then
    fail "domain values must be hostnames without scheme or path: $domain_name"
  fi
done

if [[ -n "$storefront_domain" && "$(env_value NEXT_PUBLIC_BASE_URL)" != "https://${storefront_domain}" ]]; then
  fail "NEXT_PUBLIC_BASE_URL must equal https://${storefront_domain}"
fi

if [[ -n "$backend_domain" && "$(env_value NEXT_PUBLIC_MEDUSA_BACKEND_URL)" != "https://${backend_domain}" ]]; then
  fail "NEXT_PUBLIC_MEDUSA_BACKEND_URL must equal https://${backend_domain}"
fi

s3_endpoint="$(env_value S3_ENDPOINT)"
s3_file_url="$(env_value S3_FILE_URL)"

for url_name in S3_ENDPOINT S3_FILE_URL; do
  if [[ "$url_name" == "S3_ENDPOINT" ]]; then
    url_value="$s3_endpoint"
  else
    url_value="$s3_file_url"
  fi

  if [[ ! "$url_value" =~ ^https://[^[:space:]]+$ ]] ||
     [[ "$url_value" == *'`'* || "$url_value" == *'"'* || "$url_value" == *"'"* ]]; then
    fail "$url_name must be a valid HTTPS URL without shell quoting characters"
  fi
done

if [[ "$mode" == "preview" ]]; then
  if [[ "$(env_value CADDY_CONFIG_FILE)" != "/etc/caddy/Caddyfile.preview" ]]; then
    fail "preview mode requires CADDY_CONFIG_FILE=/etc/caddy/Caddyfile.preview"
  fi

  preview_allowed_cidrs="$(env_value PREVIEW_ALLOWED_CIDRS)"
  if [[ "$preview_allowed_cidrs" == *"0.0.0.0/0"* || "$preview_allowed_cidrs" == *"::/0"* ]]; then
    fail "PREVIEW_ALLOWED_CIDRS must not allow the entire internet"
  fi
elif [[ "$mode" == "release" && "$(env_value CADDY_CONFIG_FILE)" == "/etc/caddy/Caddyfile.preview" ]]; then
  fail "release mode must not use the private preview Caddy configuration"
fi

if [[ "$mode" != "bootstrap" && "$(env_value MEDUSA_BOOTSTRAP_MODE)" == "true" ]]; then
  fail "MEDUSA_BOOTSTRAP_MODE must not be enabled for preview or release"
fi

stripe_ready=false
if [[ -n "$(env_value STRIPE_API_KEY)" &&
      -n "$(env_value STRIPE_WEBHOOK_SECRET)" &&
      -n "$(env_value NEXT_PUBLIC_STRIPE_KEY)" ]]; then
  stripe_ready=true
fi

jeko_ready=false
if [[ -n "$(env_value JEKO_API_KEY)" &&
      -n "$(env_value JEKO_API_KEY_ID)" &&
      -n "$(env_value JEKO_STORE_ID)" &&
      -n "$(env_value JEKO_WEBHOOK_SECRET)" &&
      -n "$(env_value JEKO_API_URL)" &&
      -n "$(env_value JEKO_AMOUNT_MULTIPLIER)" ]]; then
  jeko_ready=true
fi

if [[ "$jeko_ready" == true ]]; then
  jeko_api_url="$(env_value JEKO_API_URL)"
  jeko_amount_multiplier="$(env_value JEKO_AMOUNT_MULTIPLIER)"

  if [[ ! "$jeko_api_url" =~ ^https://[^[:space:]]+$ ]]; then
    fail "JEKO_API_URL must be a valid HTTPS URL"
  fi
  if [[ ! "$jeko_amount_multiplier" =~ ^[1-9][0-9]*$ ]]; then
    fail "JEKO_AMOUNT_MULTIPLIER must be a positive integer confirmed with Jeko"
  fi
fi

if [[ "$mode" == "release" && "$jeko_ready" != true ]]; then
  fail "release requires a complete Jeko configuration for the Côte d'Ivoire region"
fi

if command -v stat >/dev/null 2>&1; then
  if [[ "$(uname -s)" == "Linux" ]]; then
    env_permissions="$(stat -c '%a' "$env_file")"
  else
    env_permissions="$(stat -f '%Lp' "$env_file")"
  fi
  if [[ "$env_permissions" != "600" && "$env_permissions" != "400" ]]; then
    warn "$env_file permissions are $env_permissions; use chmod 600"
  fi
fi

if [[ -r /proc/meminfo ]]; then
  memory_kib="$(awk '/MemTotal/ { print $2 }' /proc/meminfo)"
  if [[ "$memory_kib" -lt 3500000 ]]; then
    warn "less than 4 GB RAM detected; builds may require swap"
  fi
fi

available_kib="$(df -Pk "$repo_dir" | awk 'NR == 2 { print $4 }')"
if [[ "$available_kib" =~ ^[0-9]+$ ]] && [[ "$available_kib" -lt 10485760 ]]; then
  warn "less than 10 GB disk space is available"
fi

if command -v getent >/dev/null 2>&1; then
  for domain_name in "$storefront_domain" "$backend_domain"; do
    if [[ -n "$domain_name" ]] && ! getent ahosts "$domain_name" >/dev/null 2>&1; then
      fail "DNS does not resolve: $domain_name"
    fi
  done
fi

if command -v docker >/dev/null 2>&1; then
  if ! docker info >/dev/null 2>&1; then
    fail "Docker daemon is not reachable"
  elif ! docker compose version >/dev/null 2>&1; then
    fail "Docker Compose v2 is not available"
  elif [[ "$errors" -eq 0 ]]; then
    if ! (cd "$repo_dir" && docker compose --env-file "$env_file" config --quiet); then
      fail "docker compose configuration is invalid"
    fi
  fi
fi

if [[ "$errors" -gt 0 ]]; then
  printf '\nPreflight failed: %d error(s), %d warning(s).\n' "$errors" "$warnings" >&2
  exit 1
fi

printf 'Preflight passed in %s mode with %d warning(s).\n' "$mode" "$warnings"