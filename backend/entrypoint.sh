#!/bin/sh

set -e

# Sets the LANG environment variable to C.UTF-8 (UTF-8 encoding) if it's not already defined.
# This ensures proper character encoding and locale settings for the application.
# The ${LANG:-C.UTF-8} syntax uses bash parameter expansion to use the default value C.UTF-8
# if LANG is unset or null, otherwise it uses the existing LANG value.
export LANG=${LANG:-C.UTF-8}

python manage.py migrate --noinput
python manage.py collectstatic --noinput
gunicorn task_management.wsgi:application --bind 0.0.0.0:8000