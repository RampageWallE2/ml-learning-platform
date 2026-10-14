FROM python:3.12-slim

# Más margen para descargas lentas o fallos temporales de conexión a PyPI.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DEFAULT_TIMEOUT=60 \
    PIP_RETRIES=10

WORKDIR /app

COPY requirements-production.lock .
RUN pip install --no-cache-dir -r requirements-production.lock && pip check

COPY . .

EXPOSE 5000

CMD ["flask", "--app", "app", "run", "--host", "0.0.0.0", "--port", "5000"]
