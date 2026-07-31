#!/bin/sh
set -e

# Bring the database up to date before serving anything. `migrate deploy` only
# applies migrations that already exist — it never invents one — so it is safe
# to run on every start.
echo "[entrypoint] applying database migrations…"
cd /app/migrator
node_modules/.bin/prisma migrate deploy

# Seed only when the database is empty, so a restart never overwrites real data.
echo "[entrypoint] seeding if the database is empty…"
node_modules/.bin/tsx prisma/seed.ts --if-empty || echo "[entrypoint] seeding skipped"

echo "[entrypoint] starting the server…"
cd /app
exec node server.js
