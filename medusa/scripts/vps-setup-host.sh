#!/usr/bin/env bash
set -euo pipefail

deploy_user="${DEPLOY_USER:-deploy}"
ssh_public_key_file="${SSH_PUBLIC_KEY_FILE:-}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root on the VPS." >&2
  exit 1
fi

if [[ ! -r /etc/os-release ]]; then
  echo "Cannot detect the operating system." >&2
  exit 1
fi

# shellcheck disable=SC1091
source /etc/os-release
if [[ "${ID:-}" != "ubuntu" && "${ID:-}" != "debian" ]]; then
  echo "Unsupported operating system: ${ID:-unknown}. Use Ubuntu or Debian." >&2
  exit 1
fi

if [[ -n "$ssh_public_key_file" && ! -r "$ssh_public_key_file" ]]; then
  echo "SSH public key is not readable: $ssh_public_key_file" >&2
  exit 1
fi

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  ca-certificates \
  curl \
  fail2ban \
  git \
  gnupg \
  openssl \
  unattended-upgrades \
  ufw

if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl --fail --show-error --silent "https://download.docker.com/linux/${ID}/gpg" |
    gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  architecture="$(dpkg --print-architecture)"
  codename="${VERSION_CODENAME:?missing VERSION_CODENAME in /etc/os-release}"
  printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/%s %s stable\n' \
    "$architecture" "$ID" "$codename" > /etc/apt/sources.list.d/docker.list

  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin
fi

if ! id "$deploy_user" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$deploy_user"
fi
usermod -aG sudo,docker "$deploy_user"

if [[ -n "$ssh_public_key_file" ]]; then
  deploy_home="$(getent passwd "$deploy_user" | cut -d: -f6)"
  install -d -m 700 -o "$deploy_user" -g "$deploy_user" "${deploy_home}/.ssh"
  install -m 600 -o "$deploy_user" -g "$deploy_user" \
    "$ssh_public_key_file" "${deploy_home}/.ssh/authorized_keys"
fi

cat > /etc/fail2ban/jail.d/nura-sshd.local <<'EOF'
[sshd]
enabled = true
maxretry = 5
findtime = 10m
bantime = 1h
EOF

ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

systemctl enable --now docker fail2ban unattended-upgrades

install -d -m 755 -o "$deploy_user" -g "$deploy_user" /opt/nura
install -d -m 700 /etc/nura /var/backups/nura

docker info >/dev/null
docker compose version
ufw status verbose
systemctl --no-pager --full status fail2ban.service | sed -n '1,12p'

cat <<EOF
VPS preparation completed for user: $deploy_user
Before disabling SSH password authentication, open a second terminal and verify
that public-key login works for this user.
EOF