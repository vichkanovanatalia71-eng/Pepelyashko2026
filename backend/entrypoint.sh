#!/bin/bash

PORT="${PORT:-8000}"

echo "=== Backend starting ==="
echo "PORT=$PORT"
echo "DATABASE_URL is $([ -n "$DATABASE_URL" ] && echo 'SET' || echo 'NOT SET')"

# Run migrations automatically
echo "Running Alembic migrations..."
alembic upgrade head && echo "Migrations OK" || echo "WARNING: migrations failed, continuing..."

echo "Starting uvicorn on port $PORT..."
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
