#!/bin/sh

# Install dependencies including dev packages
pipenv install --dev --system

python manage.py runserver 0.0.0.0:8000
