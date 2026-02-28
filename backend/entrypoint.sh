#!/bin/bash

PORT="${PORT:-8000}"

echo "=== Backend starting ==="
echo "PORT=$PORT"
echo "DATABASE_URL is $([ -n "$DATABASE_URL" ] && echo 'SET' || echo 'NOT SET')"

# Run migrations with a timeout to prevent hanging if DB is unreachable
echo "Running Alembic migrations..."
timeout 30 alembic upgrade head && echo "Migrations OK" || echo "WARNING: migrations failed or timed out, continuing..."

echo "Starting uvicorn on port $PORT..."
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --workers 2
