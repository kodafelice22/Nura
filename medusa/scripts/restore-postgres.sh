#!/usr/bin/env bash
set -euo pipefail

: "${BACKUP_ENCRYPTION_KEY:?export BACKUP_ENCRYPTION_KEY before restoring}"
: "${RESTORE_CONFIRM:?set RESTORE_CONFIRM=medusa to confirm destructive restore}"

if [[ "$RESTORE_CONFIRM" != "medusa" ]]; then
  echo "RESTORE_CONFIRM must equal medusa" >&2
  exit 1
fi

backup_path="${1:?usage: scripts/restore-postgres.sh backups/medusa-TIMESTAMP.dump.enc}"
repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="${ENV_FILE:-${repo_dir}/.env}"
compose=(docker compose --env-file "$env_file")

if [[ ! -f "$backup_path" ]]; then
  echo "Backup not found: $backup_path" >&2
  exit 1
fi
backup_path="$(cd "$(dirname "$backup_path")" && pwd)/$(basename "$backup_path")"

checksum_path="${backup_path}.sha256"
if [[ -f "$checksum_path" ]]; then
  expected_checksum="$(<"$checksum_path")"
  actual_checksum="$(openssl dgst -sha256 -r "$backup_path" | awk '{ print $1 }')"
  if [[ "$actual_checksum" != "$expected_checksum" ]]; then
    echo "Backup checksum mismatch: $backup_path" >&2
    exit 1
  fi
else
  echo "Warning: no checksum sidecar found for this legacy backup" >&2
fi

cd "$repo_dir"
"${compose[@]}" up -d --wait --wait-timeout 120 postgres

openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY \
  -in "$backup_path" |
  "${compose[@]}" exec -T postgres pg_restore \
    -U medusa -d medusa --clean --if-exists --no-owner --no-privileges

echo "Restore completed from: $backup_path"