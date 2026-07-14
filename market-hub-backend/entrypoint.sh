#!/usr/bin/env bash
set -e

# Wait for the database to accept connections before running migrations.
if [ -n "$POSTGRES_HOST" ]; then
  echo "Waiting for PostgreSQL at $POSTGRES_HOST:${POSTGRES_PORT:-5432}..."
  until python -c "import socket,os,sys; s=socket.socket(); s.settimeout(2); \
    sys.exit(0) if s.connect_ex((os.environ['POSTGRES_HOST'], int(os.environ.get('POSTGRES_PORT','5432'))))==0 else sys.exit(1)" 2>/dev/null; do
    sleep 1
  done
  echo "PostgreSQL is up."
fi

echo "Applying database migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput || true

exec "$@"
