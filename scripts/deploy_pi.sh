#!/usr/bin/env bash
set -euo pipefail
rootdir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
set -a; source "$rootdir/.env"; set +a

host="${PI_HOST}"; [[ -n "${PI_IP:-}" ]] && host="$PI_IP"
user="${PI_USER}"; port="${PI_SSH_PORT:-22}"
remote="${user}@${host}"

# Ensure directory exists
ssh -p "$port" "$remote" "mkdir -p ${PI_PROJECT_DIR}"

# Rsync repo (skip node_modules, build artefacts, .git)
rsync -az --delete \
  --exclude='.git' --exclude='node_modules' --exclude='dist' \
  -e "ssh -p ${port}" \
  "$rootdir/" "${remote}:${PI_PROJECT_DIR}/"

# Push Raspi5 .env if present
if [[ -f "$rootdir/Raspi5/.env" ]]; then
  scp -P "$port" "$rootdir/Raspi5/.env" "${remote}:${PI_PROJECT_DIR}/Raspi5/.env"
fi

echo "✅ Synced to ${remote}:${PI_PROJECT_DIR}"
