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

export PORT BACKEND_URL

envsubst '$PORT $BACKEND_URL' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf

# Validate nginx config before starting (shows errors if any)
nginx -t 2>&1

echo "Starting nginx on port ${PORT}, backend at ${BACKEND_URL}"

exec nginx -g 'daemon off;'
