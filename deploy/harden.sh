#!/usr/bin/env bash
# Hardening of the EXISTING droplet (the bonus asks for a "deploy" user, no root login,
# no password login and automatic security updates). Run as root, in two steps:
#
#   1) bash harden.sh
#      Creates "deploy" (SSH key from root, sudo without password, docker group),
#      turns on unattended-upgrades and swap. Root login still works.
#   2) In a NEW terminal check that this works:  ssh deploy@<server-ip>  and  sudo whoami
#   3) bash harden.sh --lock
#      Forbids root and password login. Run it only after step 2 worked.
#
# Safe to run again. A new droplet gets the same with deploy/cloud-init.yml.
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "Run as root." >&2; exit 1; }

USER_NAME=deploy

if [[ "${1:-}" == "--lock" ]]; then
  if [[ ! -s /home/$USER_NAME/.ssh/authorized_keys ]]; then
    echo "No SSH key for $USER_NAME. Run step 1 first." >&2
    exit 1
  fi
  cat > /etc/ssh/sshd_config.d/99-hardening.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
EOF
  sshd -t
  systemctl reload ssh
  echo "Root and password login are now disabled. Log in as: ssh $USER_NAME@<server-ip>"
  exit 0
fi

echo "==> User $USER_NAME"
if ! id "$USER_NAME" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$USER_NAME"
fi
usermod -aG sudo,docker "$USER_NAME"
echo "$USER_NAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/90-$USER_NAME
chmod 440 /etc/sudoers.d/90-$USER_NAME
install -d -m 700 -o "$USER_NAME" -g "$USER_NAME" /home/$USER_NAME/.ssh
install -m 600 -o "$USER_NAME" -g "$USER_NAME" /root/.ssh/authorized_keys /home/$USER_NAME/.ssh/authorized_keys

echo "==> Automatic security updates"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y unattended-upgrades
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
systemctl enable --now unattended-upgrades

echo "==> Swap (2 GB)"
if ! swapon --show | grep -q '/swapfile'; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
sysctl -p /etc/sysctl.d/99-swappiness.conf >/dev/null

echo
echo "Done. Now, in a NEW terminal (keep this one open):"
echo "  ssh $USER_NAME@<server-ip>"
echo "  sudo whoami          # must print: root"
echo "  docker ps            # must work without sudo"
echo "If both work, come back here and run:  bash $0 --lock"
