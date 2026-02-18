#!/bin/bash
set -e

echo "Waiting for PostgreSQL..."
until python -c "
import asyncio, asyncpg
asyncio.run(asyncpg.connect('postgresql://postgres:postgres@db:5432/pepelyashko'))
" 2>/dev/null; do
  echo "  PostgreSQL not ready, retrying in 2s..."
  sleep 2
done
echo "PostgreSQL is ready"

echo "Running database migrations..."
alembic upgrade head

echo "Starting backend server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
