# syntax=docker/dockerfile:1.7

# ---------- deps ----------
FROM --platform=$BUILDPLATFORM node:22-alpine AS deps
WORKDIR /app
# libc6-compat is recommended by the Next.js docs for Alpine builds.
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund


# ---------- builder ----------
FROM --platform=$BUILDPLATFORM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Public env values get baked into the bundle at build time. Callers can
# override these with --build-arg or via docker-compose's `build.args`.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY \
    NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build


# ---------- runtime ----------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN apk add --no-cache tini wget \
    && addgroup -S louis -g 1001 \
    && adduser  -S louis -G louis -u 1001

# `next build` with `output: "standalone"` emits a self-contained server
# bundle at .next/standalone plus a static asset tree.
COPY --from=builder --chown=louis:louis /app/public                  ./public
COPY --from=builder --chown=louis:louis /app/.next/standalone        ./
COPY --from=builder --chown=louis:louis /app/.next/static            ./.next/static

EXPOSE 3000

USER louis

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
