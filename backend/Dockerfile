# Production Dockerfile for Backend
FROM python:3.13-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    libglib2.0-0 \
    libcairo2 \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libffi-dev \
    pipenv \
    && rm -rf /var/lib/apt/lists/*

# Copy project files
COPY . .

RUN mv /app/task_management/settings_prod.py /app/task_management/settings.py

# Install dependencies
RUN pipenv install --system

# Expose port
EXPOSE 8000

# Start server
CMD ["sh", "/app/entrypoint.sh"]