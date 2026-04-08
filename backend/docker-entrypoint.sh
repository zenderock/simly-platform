#!/bin/sh
set -eu

if [ -n "${DATABASE_URL:-}" ]; then
  echo "Simly migration preflight..."
  # Retry up to 10 times with 3s delay — handles Neon cold-start and transient DB unavailability
  attempt=1
  max_attempts=10
  until ./simly-backend prepare-db; do
    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "Migration preflight failed after $max_attempts attempts. Aborting."
      exit 1
    fi
    echo "Migration preflight attempt $attempt/$max_attempts failed, retrying in 3s..."
    attempt=$((attempt + 1))
    sleep 3
  done
  echo "Migration preflight complete."
else
  echo "DATABASE_URL is not set, skipping migration preflight"
fi

echo "Starting Simly backend on port ${PORT:-8080}"
exec ./simly-backend
