#!/bin/bash
set -e

echo "⏳ Waiting for PostgreSQL..."
while ! python -c "
import asyncio, asyncpg, os
async def check():
    url = os.environ.get('DATABASE_URL', '').replace('+asyncpg', '')
    url = url.replace('postgresql://', 'postgresql://')
    conn = await asyncpg.connect(dsn=url.replace('postgresql+asyncpg', 'postgresql'))
    await conn.close()
asyncio.run(check())
" 2>/dev/null; do
  echo "  PostgreSQL not ready, retrying in 2s..."
  sleep 2
done

echo "✅ PostgreSQL is ready"

echo "🔄 Running database migrations..."
alembic upgrade head

echo "🚀 Starting backend server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
