#!/bin/bash
set -e

PORT="${PORT:-8000}"

echo "=== Backend starting ==="
echo "PORT=$PORT"
echo "DATABASE_URL is $([ -n "$DATABASE_URL" ] && echo 'SET' || echo 'NOT SET')"

# Run migrations automatically
echo "Running Alembic migrations..."
if alembic upgrade head; then
    echo "Migrations completed successfully."
else
    echo "WARNING: Alembic migrations failed (exit code $?). Continuing startup..."
fi

# Build uvicorn command
UVICORN_CMD="uvicorn app.main:app --host 0.0.0.0 --port $PORT"
if [ "${UVICORN_RELOAD:-0}" = "1" ]; then
    UVICORN_CMD="$UVICORN_CMD --reload"
    echo "Starting uvicorn on port $PORT (with hot-reload)..."
else
    echo "Starting uvicorn on port $PORT..."
fi

# exec replaces the shell process so uvicorn runs as PID 1
# and receives signals (SIGTERM) directly for graceful shutdown
exec $UVICORN_CMD
