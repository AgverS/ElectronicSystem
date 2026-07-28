FROM node:22-alpine AS base
# openssl is required by the Prisma schema engine on Alpine (musl)
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
RUN pnpm build
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache postgresql-client nginx

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Nginx config and setup
RUN mkdir -p /run/nginx
COPY nginx/prod.conf /etc/nginx/http.d/default.conf

# Forward nginx logs to stdout and stderr
RUN ln -sf /dev/stdout /var/log/nginx/access.log \
    && ln -sf /dev/stderr /var/log/nginx/error.log

# Migration tooling: full deps + Prisma CLI/engine + schema/migrations.
# Kept under /app/migrator so the slim standalone runtime stays untouched.
COPY --from=deps /app/node_modules ./migrator/node_modules
COPY --from=builder /app/package.json ./migrator/package.json
COPY --from=builder /app/prisma.config.ts ./migrator/prisma.config.ts
COPY --from=builder /app/prisma ./migrator/prisma

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 80
ENV PORT=80
ENV HOSTNAME="0.0.0.0"

CMD ["./docker-entrypoint.sh"]
