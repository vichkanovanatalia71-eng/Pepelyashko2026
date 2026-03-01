#!/bin/sh

PORT="${PORT:-8000}"

echo "=== Backend starting ==="
echo "PORT=$PORT"
echo "DATABASE_URL is $([ -n "$DATABASE_URL" ] && echo 'SET' || echo 'NOT SET')"

# Run migrations in background so the server starts immediately and
# Railway's healthcheck can pass while migrations are still running.
if [ "${SKIP_MIGRATIONS}" = "true" ]; then
  echo "SKIP_MIGRATIONS=true — skipping Alembic"
else
  echo "Running Alembic migrations (background)..."
  (timeout 30 alembic upgrade head && echo "Migrations OK" || echo "WARNING: migrations failed or timed out") &
fi

echo "Starting uvicorn on port $PORT..."
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --workers 1
