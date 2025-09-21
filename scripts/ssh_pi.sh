#!/usr/bin/env bash
set -euo pipefail
rootdir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
set -a; source "$rootdir/.env"; set +a

host="${PI_HOST}"
port="${PI_SSH_PORT:-22}"
user="${PI_USER}"

# If explicit IP is set, prefer it
if [[ -n "${PI_IP:-}" ]]; then host="$PI_IP"; fi

exec ssh -p "$port" "${user}@${host}" "$@"
