FROM python:3.12-slim

WORKDIR /app

ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install production dependencies only (no pytest/httpx)
COPY requirements.prod.txt .
RUN pip install --no-cache-dir -r requirements.prod.txt

# Copy application code
COPY . .

# Fix Windows line endings + set permissions + create non-root user (single layer)
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh \
    && addgroup --system appgroup && adduser --system --ingroup appgroup appuser \
    && chown -R appuser:appgroup /app
USER appuser

EXPOSE 8000

CMD ["./entrypoint.sh"]
