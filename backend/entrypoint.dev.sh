#!/bin/sh
set -e

export LANG=${LANG:-C.UTF-8}

# Install dependencies including dev packages into the system environment
pipenv install --dev --system --deploy

python manage.py runserver 0.0.0.0:8000
