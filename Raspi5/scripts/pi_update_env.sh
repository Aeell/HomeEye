#!/usr/bin/env bash
# Safely update key=value pairs in Raspi5/.env
set -euo pipefail
KEY="$1"; VAL="$2"; ENV_FILE="Raspi5/.env"
if [[ ! -f "$ENV_FILE" ]]; then echo "Missing $ENV_FILE" >&2; exit 1; fi
if grep -q "^$KEY=" "$ENV_FILE"; then
sed -i "s|^$KEY=.*|$KEY=$VAL|" "$ENV_FILE"
else
echo "$KEY=$VAL" >> "$ENV_FILE"
fi
echo "Updated $KEY=$VAL"
