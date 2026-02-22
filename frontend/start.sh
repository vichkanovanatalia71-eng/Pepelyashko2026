#!/bin/sh
set -e

PORT="${PORT:-3000}"
BACKEND_HOST="${BACKEND_HOST:-localhost}"
BACKEND_PORT="${BACKEND_PORT:-8000}"

echo "=== Frontend starting ==="
echo "PORT=$PORT BACKEND=$BACKEND_HOST:$BACKEND_PORT"

# Generate nginx config from template using sed (more reliable than envsubst)
sed -e "s|\${PORT}|${PORT}|g" \
    -e "s|\${BACKEND_HOST}|${BACKEND_HOST}|g" \
    -e "s|\${BACKEND_PORT}|${BACKEND_PORT}|g" \
    /etc/nginx/nginx-app.conf.template > /etc/nginx/conf.d/default.conf

echo "--- Generated nginx config ---"
cat /etc/nginx/conf.d/default.conf
echo "-------------------------------"

# Validate before starting
nginx -t

echo "Starting nginx..."
exec nginx -g 'daemon off;'
