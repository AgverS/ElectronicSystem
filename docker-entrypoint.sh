#!/bin/sh
set -e

# One-time self-heal: the add_backups migration once failed (a duplicated index
# rename) and left the DB stuck on a failed migration (P3009). It was fully
# rolled back, so drop ONLY its failed record (finished_at IS NULL) to let it be
# re-applied with the fixed, idempotent SQL. The condition makes this a safe
# no-op once the migration is successfully applied. TODO: remove after prod is
# confirmed healthy.
echo "[entrypoint] clearing any failed add_backups migration record…"
psql "$DATABASE_URL" -c "DELETE FROM \"_prisma_migrations\" WHERE migration_name = '20260614182556_add_backups' AND finished_at IS NULL;" \
  || echo "[entrypoint] cleanup skipped (continuing)"

# Apply pending database migrations before starting the server.
# Prisma CLI + engine + schema live under /app/migrator (full deps),
# kept separate from the slim Next.js standalone runtime in /app.
echo "[entrypoint] applying database migrations…"
cd /app/migrator
node_modules/.bin/prisma migrate deploy

echo "[entrypoint] testing nginx config…"
nginx -t

echo "[entrypoint] starting nginx…"
nginx

echo "[entrypoint] starting server…"
cd /app
# Force the standalone server to use port 3000 internally
export PORT=3000
exec node server.js
