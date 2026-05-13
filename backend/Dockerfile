# syntax=docker/dockerfile:1.7

# ---------- builder ----------
FROM --platform=$BUILDPLATFORM node:22-alpine AS builder
WORKDIR /app

# Copy manifests first for better layer caching
COPY package.json package-lock.json* ./

# Install all deps (including dev) so `tsc` is available
RUN npm ci --no-audit --no-fund

# Copy the rest of the source and build
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY migrations ./migrations
COPY schema.sql ./schema.sql

RUN npm run build

# Prune to production deps for the runtime image
RUN npm prune --omit=dev


# ---------- runtime ----------
FROM node:22-alpine AS runtime

# libreoffice is used by `libreoffice-convert` to render .docx → .pdf
# and tini gives us proper PID-1 signal handling.
# fontconfig + freetype are needed by libreoffice headless.
RUN apk add --no-cache \
        tini \
        libreoffice \
        fontconfig \
        ttf-dejavu \
        freetype \
        wget \
    && addgroup -S louis -g 1001 \
    && adduser  -S louis -G louis -u 1001

WORKDIR /app

# Copy production deps + build output from the builder
COPY --from=builder --chown=louis:louis /app/node_modules ./node_modules
COPY --from=builder --chown=louis:louis /app/dist          ./dist
COPY --from=builder --chown=louis:louis /app/migrations    ./migrations
COPY --from=builder --chown=louis:louis /app/scripts       ./scripts
COPY --from=builder --chown=louis:louis /app/schema.sql    ./schema.sql
COPY --from=builder --chown=louis:louis /app/package.json  ./package.json

ENV NODE_ENV=production \
    PORT=3001 \
    NODE_OPTIONS=--enable-source-maps

EXPOSE 3001

USER louis

# /health is served by src/index.ts (see line ~183).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3001/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
