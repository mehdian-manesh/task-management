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
    && rm -rf /var/lib/apt/lists/*

# Install dependencies directly with pip
RUN pip install --no-cache-dir django djangorestframework djangorestframework-simplejwt django-cors-headers drf-nested-routers pillow django-filter python-dateutil jdatetime weasyprint django-crontab user-agents drf-spectacular django-extensions gunicorn

# Copy project files
COPY . .

# Run migrations and collect static files
RUN python manage.py migrate
RUN python manage.py collectstatic --noinput

# Expose port
EXPOSE 8000

# Start gunicorn
CMD ["gunicorn", "task_management.wsgi:application", "--bind", "0.0.0.0:8000"]