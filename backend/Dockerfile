# ── Build stage: install Python dependencies ──
FROM python:3.12-slim AS builder

WORKDIR /build

COPY requirements.txt .

# Filter out test/dev dependencies and install only production packages
RUN grep -vE '^\s*(#.*)?$' requirements.txt \
    | grep -viE '^(pytest|httpx|python-dotenv)' > requirements.prod.txt \
    && pip install --no-cache-dir --no-compile --prefix=/install -r requirements.prod.txt

# ── Production stage: minimal runtime image ──
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Copy only installed packages from builder (no pip cache, no build tools)
COPY --from=builder /install /usr/local

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
