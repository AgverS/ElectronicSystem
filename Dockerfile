FROM node:22-alpine AS base
# Prisma's engines need openssl on Alpine (musl).
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The client is generated from the schema, so it is never committed.
RUN pnpm prisma generate
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Run as an unprivileged user rather than root.
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Migration tooling kept beside the slim runtime: the Prisma CLI, the engine and
# the schema, so `migrate deploy` can run at start-up without bloating the
# application image itself.
COPY --from=deps /app/node_modules ./migrator/node_modules
COPY --from=builder /app/package.json ./migrator/package.json
COPY --from=builder /app/prisma.config.ts ./migrator/prisma.config.ts
COPY --from=builder /app/prisma ./migrator/prisma
COPY --from=builder /app/lib/prisma-client ./migrator/lib/prisma-client

RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./docker-entrypoint.sh"]
