FROM python:3.11-slim AS builder

WORKDIR /app

COPY requirements.txt .
ENV PIP_DEFAULT_TIMEOUT=100
RUN pip install --timeout 100 --no-cache-dir -r requirements.txt

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

WORKDIR /app

COPY --from=builder /usr/local /usr/local
COPY app/ ./app

RUN adduser --disabled-password --gecos "" appuser && chown -R appuser /app
RUN mkdir -p data && chown -R appuser:appuser data
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
