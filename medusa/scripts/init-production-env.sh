#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="${ENV_FILE:-${repo_dir}/.env}"
example_file="${repo_dir}/.env.example"

if [[ ! -f "$env_file" ]]; then
  cp "$example_file" "$env_file"
fi

env_value() {
  local key="$1"

  awk -v key="$key" '
    index($0, key "=") == 1 {
      value = substr($0, length(key) + 2)
    }
    END { print value }
  ' "$env_file"
}

set_value() {
  local key="$1"
  local value="$2"
  local temporary_file

  temporary_file="$(mktemp "${env_file}.XXXXXX")"
  awk -v key="$key" -v value="$value" '
    BEGIN { found = 0 }
    index($0, key "=") == 1 {
      print key "=" value
      found = 1
      next
    }
    { print }
    END {
      if (!found) {
        print key "=" value
      }
    }
  ' "$env_file" > "$temporary_file"
  chmod 600 "$temporary_file"
  mv "$temporary_file" "$env_file"
}

set_default() {
  local key="$1"
  local value="$2"

  if [[ -z "$(env_value "$key")" ]]; then
    set_value "$key" "$value"
    printf 'Initialized %s.\n' "$key"
  fi
}

generate_secret() {
  local key="$1"

  if [[ -z "$(env_value "$key")" ]]; then
    set_value "$key" "$(openssl rand -hex 32)"
    printf 'Generated %s.\n' "$key"
  fi
}

for key in \
  POSTGRES_PASSWORD \
  JWT_SECRET \
  COOKIE_SECRET \
  ORDER_ACCESS_SECRET \
  BACKUP_ENCRYPTION_KEY \
  MEILISEARCH_API_KEY \
  REVALIDATE_SECRET; do
  generate_secret "$key"
done

set_default NEXT_PUBLIC_DEFAULT_REGION "ci"
set_default REFERRAL_REWARD_EUR "10"
set_default REFERRAL_REWARD_XOF "6500"
set_default S3_REGION "auto"
set_default ALLOW_PLACEHOLDER_PRODUCT_IMAGES "false"
set_default MEDUSA_FF_RBAC "false"
set_default MEDUSA_FF_RBAC_FILTER_FIELDS "false"
set_default STOREFRONT_DOMAIN "nurabeautyco.com"
set_default BACKEND_DOMAIN "api.nurabeautyco.com"
set_default STORE_CORS "https://nurabeautyco.com"
set_default ADMIN_CORS "https://api.nurabeautyco.com"
set_default AUTH_CORS "https://nurabeautyco.com,https://api.nurabeautyco.com"
set_default NEXT_PUBLIC_MEDUSA_BACKEND_URL "https://api.nurabeautyco.com"
set_default NEXT_PUBLIC_BASE_URL "https://nurabeautyco.com"

chmod 600 "$env_file"

cat <<EOF
Production environment initialized at $env_file.
Existing values were preserved. Complete domains, legal identity and external
service credentials, then run: bash scripts/vps-preflight.sh --bootstrap
EOF