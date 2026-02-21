#!/bin/bash

PORT="${PORT:-8000}"

echo "=== Backend starting ==="
echo "PORT=$PORT"
echo "DATABASE_URL is $([ -n "$DATABASE_URL" ] && echo 'SET' || echo 'NOT SET')"

# Skip migrations at startup — run them manually or via Railway cron
# This ensures the server starts immediately regardless of DB state
echo "Starting uvicorn on port $PORT..."
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
