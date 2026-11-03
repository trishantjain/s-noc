
#!/bin/sh
set -eu

if [ -z "${TS_AUTHKEY:-}" ]; then
  echo "ERROR: TS_AUTHKEY is not configured"
  exit 1
fi

TS_SOCKET="/tmp/tailscaled.sock"

# Start Tailscale without requiring a kernel TUN device.
tailscaled \
  --tun=userspace-networking \
  --state=/tmp/tailscaled.state \
  --socket="$TS_SOCKET" \
  --socks5-server=127.0.0.1:1055 \
  >/tmp/tailscaled.log 2>&1 &

# Wait for the Tailscale daemon to become available.
ready=0
for i in $(seq 1 30); do
  if [ -S "$TS_SOCKET" ]; then
    ready=1
    break
  fi
  sleep 1
done

if [ "$ready" -ne 1 ]; then
  cat /tmp/tailscaled.log
  echo "ERROR: Tailscale daemon did not start"
  exit 1
fi

# Join your existing Tailscale network.
tailscale --socket="$TS_SOCKET" up \
  --auth-key="$TS_AUTHKEY" \
  --hostname=render-ems-backend \
  --accept-dns=false

# Confirm that Tailscale is connected before starting Express.
tailscale --socket="$TS_SOCKET" status

echo "Tailscale connected. Starting Express backend..."

exec node server_IP.js

# tskey-auth-katmtfKeU821CNTRL-tteCFEW1t21NBqVK4KYT21q3PGfsCMHUL

