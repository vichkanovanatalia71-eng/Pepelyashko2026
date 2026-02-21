#!/bin/bash

PORT="${PORT:-8000}"

# Try migrations with 15s timeout — if DB isn't ready, skip and start server
echo "Attempting database migrations (timeout 15s)..."
timeout 15 alembic upgrade head 2>&1 || echo "WARNING: migrations skipped (DB may not be ready yet)"

echo "Starting backend server on port $PORT..."
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
