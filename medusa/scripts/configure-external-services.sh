#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="${ENV_FILE:-${repo_dir}/.env}"

if [[ ! -f "$env_file" ]]; then
  echo "Environment file not found: $env_file" >&2
  exit 1
fi

umask 077

set_env() {
  local key="$1"
  local value="$2"
  local temp_file

  temp_file="$(mktemp "${env_file}.tmp.XXXXXX")"
  NURA_ENV_VALUE="$value" awk -v key="$key" '
    BEGIN { found = 0 }
    index($0, key "=") == 1 {
      print key "=" ENVIRON["NURA_ENV_VALUE"]
      found = 1
      next
    }
    { print }
    END {
      if (!found) {
        print key "=" ENVIRON["NURA_ENV_VALUE"]
      }
    }
  ' "$env_file" > "$temp_file"
  chmod 600 "$temp_file"
  mv "$temp_file" "$env_file"
}

prompt_value() {
  local key="$1"
  local label="$2"
  local secret="${3:-false}"
  local value=""

  while [[ -z "$value" ]]; do
    if [[ "$secret" == "true" ]]; then
      read -r -s -p "${label}: " value
      printf '\n'
    else
      read -r -p "${label}: " value
    fi

    if [[ -z "$value" ]]; then
      echo "A value is required."
    fi
  done

  set_env "$key" "$value"
  printf 'Saved %s.\n' "$key"
}

prompt_https_url() {
  local key="$1"
  local label="$2"
  local value=""

  while true; do
    read -r -p "${label}: " value
    if [[ "$value" =~ ^https://[^[:space:]]+$ ]] &&
       [[ "$value" != *'`'* && "$value" != *'"'* && "$value" != *"'"* ]]; then
      break
    fi

    echo "A valid HTTPS URL without shell quoting characters is required."
  done

  set_env "$key" "$value"
  printf 'Saved %s.\n' "$key"
}

configure_resend() {
  prompt_value RESEND_API_KEY "Resend API key" true
  prompt_value RESEND_FROM_EMAIL "Resend sender email"
}

configure_s3() {
  prompt_value S3_ACCESS_KEY_ID "R2 Access Key ID" true
  prompt_value S3_SECRET_ACCESS_KEY "R2 Secret Access Key" true
  prompt_value S3_BUCKET "R2 bucket name"
  prompt_value S3_REGION "R2 region"
  prompt_https_url S3_ENDPOINT "R2 S3 endpoint"
  prompt_https_url S3_FILE_URL "R2 public URL"
}

configure_geoip() {
  prompt_value GEOIPUPDATE_ACCOUNT_ID "MaxMind account ID"
  prompt_value GEOIPUPDATE_LICENSE_KEY "MaxMind license key" true
}

configure_jeko() {
  prompt_value JEKO_API_KEY "Jeko API key" true
  prompt_value JEKO_API_KEY_ID "Jeko API key ID" true
  prompt_value JEKO_STORE_ID "Jeko store ID"
  prompt_value JEKO_WEBHOOK_SECRET "Jeko webhook secret" true
  prompt_https_url JEKO_API_URL "Jeko API URL"
  prompt_value JEKO_AMOUNT_MULTIPLIER "Jeko amount multiplier"
}

scope="${1:-all}"

echo "Configure ${scope} services. Values are written directly to ${env_file}."
case "$scope" in
  all)
    configure_resend
    configure_s3
    configure_geoip
    configure_jeko
    ;;
  resend)
    configure_resend
    ;;
  s3)
    configure_s3
    ;;
  geoip)
    configure_geoip
    ;;
  jeko)
    configure_jeko
    ;;
  *)
    echo "Usage: $0 [all|resend|s3|geoip|jeko]" >&2
    exit 64
    ;;
esac

chmod 600 "$env_file"
echo "External service configuration saved."