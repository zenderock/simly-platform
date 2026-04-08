#!/bin/sh
set -eu

if [ -n "${DATABASE_URL:-}" ]; then
  # One-time Neon dump import: runs only if the sentinel table does not exist yet
  if [ -f "./neon_backup.dump" ]; then
    SENTINEL_CHECK=$(psql "$DATABASE_URL" -tAc "SELECT 1 FROM information_schema.tables WHERE table_name='_neon_import_done' AND table_schema='public';" 2>/dev/null || true)
    if [ "$SENTINEL_CHECK" != "1" ]; then
      echo "Importing Neon backup dump (one-time)..."
      if pg_restore --no-owner --no-privileges --clean --if-exists -d "$DATABASE_URL" ./neon_backup.dump; then
        psql "$DATABASE_URL" -c "CREATE TABLE IF NOT EXISTS _neon_import_done (imported_at timestamptz DEFAULT now());" \
          -c "INSERT INTO _neon_import_done DEFAULT VALUES;"
        echo "Neon dump import complete."
      else
        echo "WARNING: pg_restore exited with errors (may be partial). Continuing..."
      fi
    else
      echo "Neon dump already imported, skipping."
    fi
  fi

  echo "Simly migration preflight..."
  # Retry up to 10 times with 3s delay — handles cold-start and transient DB unavailability
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
