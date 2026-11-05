#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${BACKUP_ENCRYPTION_KEY:-}" && -n "${CREDENTIALS_DIRECTORY:-}" ]]; then
  credential_path="${CREDENTIALS_DIRECTORY}/backup-encryption-key"
  if [[ -r "$credential_path" ]]; then
    BACKUP_ENCRYPTION_KEY="$(<"$credential_path")"
    export BACKUP_ENCRYPTION_KEY
  fi
fi

: "${BACKUP_ENCRYPTION_KEY:?export BACKUP_ENCRYPTION_KEY before running backups}"

backup_dir="${BACKUP_DIR:-./backups}"
retention_days="${BACKUP_RETENTION_DAYS:-30}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_path="${backup_dir}/medusa-${timestamp}.dump.enc"
temporary_path="${backup_path}.tmp"
checksum_path="${backup_path}.sha256"
temporary_checksum_path="${checksum_path}.tmp"

mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
trap 'rm -f "$temporary_path" "$temporary_checksum_path"' EXIT

docker compose exec -T postgres pg_dump -U medusa -Fc medusa |
  openssl enc -aes-256-cbc -salt -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY \
    -out "$temporary_path"

openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY \
  -in "$temporary_path" |
  docker compose exec -T postgres pg_restore --list >/dev/null

openssl dgst -sha256 -r "$temporary_path" | awk '{ print $1 }' > "$temporary_checksum_path"
chmod 600 "$temporary_path"
chmod 600 "$temporary_checksum_path"
mv "$temporary_path" "$backup_path"
mv "$temporary_checksum_path" "$checksum_path"
find "$backup_dir" -type f -name 'medusa-*.dump.enc' -mtime "+$retention_days" -delete
find "$backup_dir" -type f -name 'medusa-*.dump.enc.sha256' -mtime "+$retention_days" -delete

echo "Encrypted backup created: $backup_path"