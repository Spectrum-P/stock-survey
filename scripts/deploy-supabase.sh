#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "Set SUPABASE_DB_URL to the exact direct or session-pooler Postgres URI from the Supabase dashboard." >&2
  exit 1
fi

echo "Previewing pending migrations..."
npx --yes supabase db push --db-url "$SUPABASE_DB_URL" --dry-run
echo "Applying migration and development seed..."
npx --yes supabase db push --db-url "$SUPABASE_DB_URL" --include-seed
