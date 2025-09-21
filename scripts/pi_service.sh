#!/usr/bin/env bash
set -euo pipefail
rootdir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
set -a; source "$rootdir/.env"; set +a

host="${PI_HOST}"; [[ -n "${PI_IP:-}" ]] && host="$PI_IP"
user="${PI_USER}"; port="${PI_SSH_PORT:-22}"
remote="${user}@${host}"

cmd="${1:-status}"

case "$cmd" in
  install)
    scp -P "$port" "$rootdir/Raspi5/homeeye.service" "${remote}:/tmp/homeeye.service"
    ssh -p "$port" "$remote" "sudo mv /tmp/homeeye.service /etc/systemd/system/homeeye.service && \
                              sudo systemctl daemon-reload && \
                              sudo systemctl enable homeeye && \
                              sudo systemctl restart homeeye && \
                              systemctl status --no-pager homeeye"
    ;;
  start|stop|restart|status|logs)
    case "$cmd" in
      logs)   ssh -p "$port" "$remote" "journalctl -u homeeye -e --no-pager -f" ;;
      *)      ssh -p "$port" "$remote" "sudo systemctl $cmd homeeye && systemctl status --no-pager homeeye" ;;
    esac
    ;;
  *)
    echo "Usage: $0 {install|start|stop|restart|status|logs}"
    exit 2
    ;;
esac
