#!/bin/sh

set -e

export LANG=${LANG:-C.UTF-8}

# Install dependencies including dev packages into the system environment
# For development, regenerate lock file if out of date, then install
echo "Checking Pipfile.lock..."
if ! pipenv install --dev --system --deploy 2>/dev/null; then
    echo "Pipfile.lock is out of date, regenerating..."
    pipenv lock
    pipenv install --dev --system
fi

python manage.py migrate --noinput
python manage.py runserver 0.0.0.0:8000
