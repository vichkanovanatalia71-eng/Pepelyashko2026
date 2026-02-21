#!/bin/bash
set -e

PORT="${PORT:-8000}"

# Try to run migrations (non-blocking: if DB isn't ready, skip and start server)
echo "Attempting database migrations..."
alembic upgrade head 2>&1 || echo "WARNING: migrations skipped (DB may not be ready yet)"

RELOAD_FLAG=""
if [ "${UVICORN_RELOAD:-0}" = "1" ]; then
  RELOAD_FLAG="--reload"
fi
echo "Starting backend server on port $PORT..."
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT" $RELOAD_FLAG
