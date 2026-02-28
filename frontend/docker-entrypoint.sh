#!/bin/sh
set -e

PORT=${PORT:-3000}
BACKEND_URL=${BACKEND_URL:-http://localhost:8080}

# Ensure BACKEND_URL has http:// or https:// prefix
case "$BACKEND_URL" in
  http://*|https://*) ;;
  *) BACKEND_URL="http://${BACKEND_URL}" ;;
esac

# Strip trailing slash to prevent double-slash paths (//api/)
BACKEND_URL=${BACKEND_URL%/}

# Get DNS resolver from container (for dynamic upstream resolution)
RESOLVER=$(awk '/^nameserver/{print $2; exit}' /etc/resolv.conf)
RESOLVER=${RESOLVER:-127.0.0.11}

export PORT BACKEND_URL RESOLVER

envsubst '$PORT $BACKEND_URL $RESOLVER' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf

echo "Starting nginx on port ${PORT}, backend at ${BACKEND_URL}, resolver ${RESOLVER}"

exec nginx -g 'daemon off;'
