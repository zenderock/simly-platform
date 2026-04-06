#!/bin/sh
set -eu

if [ -n "${DATABASE_URL:-}" ]; then
  echo "Simly migration preflight..."
  ./simly-backend prepare-db
else
  echo "DATABASE_URL is not set, skipping migration preflight"
fi

echo "Starting Simly backend on port ${PORT:-8080}"
exec ./simly-backend
