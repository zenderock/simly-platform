#!/bin/sh
set -eu

if [ -n "${DATABASE_URL:-}" ]; then
  echo "Simly migration preflight..."
  ./simly-backend prepare-db
else
  echo "DATABASE_URL is not set, skipping migration preflight"
fi

exec ./simly-backend
