#!/usr/bin/env bash
# Start the Louis Cloudflare tunnel using deploy/cloudflared/config.yml.
#
# Usage: ./deploy/cloudflared/run.sh
#
# Prerequisites (one-time, see config.yml):
#   brew install cloudflared
#   cloudflared tunnel login
#   cloudflared tunnel create louis-legal
#   cloudflared tunnel route dns louis-legal legal.dashable.dev
#   cloudflared tunnel route dns louis-legal legal-api.dashable.dev
#   (then fill in tunnel/credentials-file in config.yml)
#
# Assumes the local frontend (port 3000) and backend (port 3001) are running.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG="$SCRIPT_DIR/config.yml"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is not installed."
  echo "Install it: brew install cloudflared"
  exit 1
fi

if grep -q "REPLACE_WITH_TUNNEL_UUID" "$CONFIG"; then
  echo "config.yml still has placeholder values."
  echo "Run:"
  echo "  cloudflared tunnel login"
  echo "  cloudflared tunnel create louis-legal"
  echo "Then fill in tunnel UUID + credentials-file path in $CONFIG"
  exit 1
fi

# Spot-check the local services are up before opening the tunnel.
for port in 3000 3001; do
  if ! curl -fsS --max-time 1 "http://localhost:$port" >/dev/null 2>&1 \
      && ! curl -fsS --max-time 1 "http://localhost:$port/health" >/dev/null 2>&1; then
    echo "Warning: nothing responding on localhost:$port — the tunnel will return 502 until it's up."
  fi
done

exec cloudflared tunnel --config "$CONFIG" run
