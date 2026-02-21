#!/bin/sh
# Substitute only our custom env vars (preserve nginx vars like $host, $uri)
envsubst '${PORT} ${BACKEND_HOST} ${BACKEND_PORT}' \
  < /etc/nginx/nginx-app.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "Starting nginx on port ${PORT}..."
exec nginx -g 'daemon off;'
