#!/bin/bash
set -e

# Resolve DATABASE_URL for the health check connection string
DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@db:5432/pepelyashko}"
# Convert asyncpg:// back to plain postgresql:// for asyncpg.connect
PLAIN_URL=$(echo "$DB_URL" | sed 's|postgresql+asyncpg://|postgresql://|')

echo "Waiting for PostgreSQL..."
until python -c "
import asyncio, asyncpg
asyncio.run(asyncpg.connect('$PLAIN_URL'))
" 2>/dev/null; do
  echo "  PostgreSQL not ready, retrying in 2s..."
  sleep 2
done
echo "PostgreSQL is ready"

echo "Running database migrations..."
alembic upgrade head

PORT="${PORT:-8000}"
RELOAD_FLAG=""
if [ "${UVICORN_RELOAD:-0}" = "1" ]; then
  RELOAD_FLAG="--reload"
fi
echo "Starting backend server on port $PORT..."
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT" $RELOAD_FLAG
