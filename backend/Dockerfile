FROM python:3.12-slim

WORKDIR /app

ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install only production dependencies (filter out test/dev packages)
COPY requirements.txt .
RUN grep -vE '^\s*(#.*)?$' requirements.txt \
    | grep -viE '^(pytest|pytest-asyncio|python-dotenv)' > requirements.prod.txt \
    && pip install --no-cache-dir -r requirements.prod.txt \
    && rm -f requirements.prod.txt

# Copy application code
COPY . .

# Fix Windows line endings + set permissions + create non-root user (single layer)
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh \
    && addgroup --system appgroup && adduser --system --ingroup appgroup appuser \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

CMD ["./entrypoint.sh"]
