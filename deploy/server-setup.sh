#!/usr/bin/env bash
# Phase B: prepare a fresh Ubuntu 24.04 droplet. Run as root:
#   bash server-setup.sh
# Safe to run again. It does NOT touch the firewall: use the DigitalOcean Cloud Firewall
# (Docker-published ports bypass ufw).
#
# Before running: make sure you can log in with your SSH key. This script turns off
# password login, so a key that doesn't work will lock you out.
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

if [[ ! -s /root/.ssh/authorized_keys ]]; then
  echo "No SSH key in /root/.ssh/authorized_keys. Refusing to disable password login." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> System update"
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg openssl

echo "==> Swap (2 GB)"
if ! swapon --show | grep -q '/swapfile'; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
sysctl -w vm.swappiness=10 >/dev/null
echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf

echo "==> Docker Engine from the official repository"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker

echo "==> Shared Docker network for Nginx Proxy Manager"
docker network inspect proxy >/dev/null 2>&1 || docker network create proxy

echo "==> SSH: key login only"
cat > /etc/ssh/sshd_config.d/99-hardening.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
sshd -t
systemctl reload ssh

echo "==> Checks"
docker run --rm hello-world >/dev/null && echo "docker: ok"
docker compose version
free -h | grep -i swap
echo "Listening TCP ports:"
ss -tlnp
