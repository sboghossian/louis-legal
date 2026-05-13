# Self-hosting Louis

Louis ships first-party deployment artifacts so you can run the full stack on
your own infrastructure. There are two supported paths:

| Path                       | Best for                                            |
| -------------------------- | --------------------------------------------------- |
| **Docker Compose**         | Single VM, evaluation, hobbyists, on-premise pilots |
| **Helm chart (Kubernetes)** | Production, HA, multi-tenant deployments            |

Both paths assume an `amd64` host. ARM builds work but are not the primary
target.

---

## 1. Quickstart — Docker Compose

Requirements: Docker 24+ with the Compose plugin (`docker compose version`).

```bash
git clone https://github.com/sboghossian/louis.git
cd louis

# 1. Copy the env template and fill in secrets
cp .env.example .env
# Generate the two required signing secrets:
echo "DOWNLOAD_SIGNING_SECRET=$(openssl rand -hex 32)" >> .env
echo "USER_API_KEYS_ENCRYPTION_SECRET=$(openssl rand -hex 32)" >> .env
# Drop in at least one LLM key (ANTHROPIC_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY)
$EDITOR .env

# 2. Build images + start postgres, minio, backend, frontend
docker compose up -d --build

# 3. Apply database migrations on first boot (one-shot)
docker compose --profile setup run --rm migrate

# 4. Visit the app
open http://localhost:3000
```

Default endpoints:

| Service           | URL                       |
| ----------------- | ------------------------- |
| Frontend          | http://localhost:3000     |
| Backend API       | http://localhost:3001     |
| Backend health    | http://localhost:3001/health |
| Postgres          | localhost:5432            |
| Minio S3 API      | http://localhost:9000     |
| Minio console     | http://localhost:9001     |

### Tailing logs

```bash
docker compose logs -f backend frontend
```

### Stopping

```bash
docker compose down            # keep data volumes
docker compose down -v         # wipe postgres + minio data (destructive)
```

---

## 2. Production — Helm + Kubernetes

The chart at `deploy/helm/louis/` deploys **frontend** and **backend** only.
**Postgres and S3-compatible storage are intentionally external** — bring
managed services (Supabase, RDS, Neon, R2, S3, dedicated Minio Operator).

### Prereqs

- Kubernetes 1.27+
- Helm 3.13+
- An ingress controller (nginx by default — adjust `ingress.className`)
- cert-manager (optional, used by the default `letsencrypt-prod` annotation)
- A container registry where you have pushed `louis-backend` and `louis-frontend`

### Build and push images

```bash
# From the repo root
docker build -t ghcr.io/your-org/louis-backend:0.1.0  ./backend
docker build -t ghcr.io/your-org/louis-frontend:0.1.0 ./frontend \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://louis-api.example.com \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<anon-key>

docker push ghcr.io/your-org/louis-backend:0.1.0
docker push ghcr.io/your-org/louis-frontend:0.1.0
```

### Configure values

Create a `prod-values.yaml`:

```yaml
image:
    repository: ghcr.io/your-org/louis
    tag: "0.1.0"

config:
    FRONTEND_URL: https://louis.example.com
    NEXT_PUBLIC_API_BASE_URL: https://louis-api.example.com

externalDatabase:
    url: postgresql://louis:STRONG@db.example.com:5432/louis?sslmode=require

externalStorage:
    endpoint: https://s3.us-east-1.amazonaws.com
    bucket: my-louis-bucket
    accessKeyId: AKIA...
    secretAccessKey: ...

supabase:
    url: https://your-project.supabase.co
    anonKey: eyJ...
    serviceRoleKey: eyJ...

secrets:
    downloadSigningSecret: <openssl rand -hex 32>
    userApiKeysEncryptionSecret: <openssl rand -hex 32>

llm:
    anthropicApiKey: sk-ant-...
    # geminiApiKey: ...
    # openaiApiKey: ...

ingress:
    hosts:
        - host: louis.example.com
          paths:
              - { path: /, pathType: Prefix, service: frontend }
        - host: louis-api.example.com
          paths:
              - { path: /, pathType: Prefix, service: backend }
    tls:
        - secretName: louis-tls
          hosts: [louis.example.com, louis-api.example.com]
```

### Install / upgrade

```bash
kubectl create namespace louis

helm upgrade --install louis ./deploy/helm/louis \
  --namespace louis \
  --values prod-values.yaml

# Run migrations once (the NOTES.txt printed after install gives you the exact
# command for your release).
kubectl -n louis run louis-migrate --rm -i --restart=Never \
  --image=ghcr.io/your-org/louis-backend:0.1.0 \
  --env DATABASE_URL="$(kubectl -n louis get secret louis-secrets -o jsonpath='{.data.DATABASE_URL}' | base64 -d)" \
  --command -- /bin/sh -c "npm install --no-save tsx >/dev/null && npx tsx scripts/migrate.ts"
```

### Rollout, rollback, debug

```bash
kubectl -n louis rollout status deploy/louis-backend
kubectl -n louis rollout history deploy/louis-backend
kubectl -n louis rollout undo deploy/louis-backend
kubectl -n louis logs -f deploy/louis-backend
```

---

## 3. Upgrades

### Docker Compose

```bash
git pull
docker compose build --pull
docker compose up -d
docker compose --profile setup run --rm migrate   # apply new migrations
```

### Helm

```bash
git pull
# Re-build & push images with the new tag, then:
helm upgrade louis ./deploy/helm/louis \
  --namespace louis \
  --values prod-values.yaml \
  --set image.tag=0.2.0
# Re-run the migrate Job documented above.
```

---

## 4. Backups

| What            | How                                                       |
| --------------- | --------------------------------------------------------- |
| Postgres        | `pg_dump` against `DATABASE_URL` on a schedule. For the   |
|                 | bundled Postgres: `docker compose exec postgres pg_dump`  |
|                 | `-U louis louis > backup.sql`.                            |
| Object storage  | Mirror your bucket with `rclone sync` or your provider's  |
|                 | snapshot feature. The bundled Minio writes to the         |
|                 | `minio-data` Docker volume — back up the volume.          |
| Secrets         | Re-read from your password manager. The chart can also    |
|                 | consume an externally-managed `existingSecret`.           |

---

## 5. Environment variable reference

### Required

| Var                                | Used by  | Notes                                                              |
| ---------------------------------- | -------- | ------------------------------------------------------------------ |
| `DATABASE_URL`                     | backend  | Postgres connection string. Used by app code.                       |
| `SUPABASE_DB_URL`                  | migrate  | Same value as `DATABASE_URL`; used by `npm run migrate`.            |
| `SUPABASE_URL`                     | backend  | Supabase project URL (auth + storage adapter).                      |
| `SUPABASE_SECRET_KEY`              | backend  | Supabase service-role key.                                          |
| `NEXT_PUBLIC_SUPABASE_URL`         | frontend | Baked into the browser bundle at build time.                        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | frontend | Supabase anon key, baked at build time.                  |
| `NEXT_PUBLIC_API_BASE_URL`         | frontend | Where the browser calls the backend. Baked at build time.           |
| `FRONTEND_URL`                     | backend  | Comma-separated CORS allow-list.                                    |
| `R2_ENDPOINT_URL`                  | backend  | S3-compatible endpoint (Minio / R2 / AWS S3).                       |
| `R2_BUCKET_NAME`                   | backend  | Bucket name.                                                        |
| `R2_ACCESS_KEY_ID`                 | backend  | S3 access key.                                                      |
| `R2_SECRET_ACCESS_KEY`             | backend  | S3 secret key.                                                      |
| `DOWNLOAD_SIGNING_SECRET`          | backend  | HMAC key, signs `/download/:token` URLs. `openssl rand -hex 32`.    |
| `USER_API_KEYS_ENCRYPTION_SECRET`  | backend  | Encrypts per-user provider keys at rest. `openssl rand -hex 32`.    |

### Optional (BYO LLM)

At least one of these is required for chat features to work:

| Var                  | Provider     |
| -------------------- | ------------ |
| `ANTHROPIC_API_KEY`  | Anthropic    |
| `GEMINI_API_KEY`     | Google Gemini |
| `OPENAI_API_KEY`     | OpenAI / compatible |

### Optional (other)

| Var                  | Purpose                                                    |
| -------------------- | ---------------------------------------------------------- |
| `RESEND_API_KEY`     | Transactional email via Resend.                            |
| `NODE_ENV`           | Defaults to `production` in the images.                    |
| `TRUST_PROXY_HOPS`   | How many proxy hops Express trusts (default `1`).          |
| `RATE_LIMIT_*`       | Rate-limit overrides — see `backend/src/index.ts`.         |

---

## 6. Architectural notes

- **Backend port:** `3001`. Healthcheck: `GET /health` (returns `{ok: true}`).
- **Frontend port:** `3000`. Next.js `output: "standalone"` bundle.
- **LibreOffice** is baked into the backend image because
  `libreoffice-convert` shells out to it for `.docx → .pdf` conversion. This
  is why the backend image is heavier than the frontend image — ~600 MB.
- **Supabase coupling.** Both packages currently depend on `@supabase/*` for
  auth. A fully Supabase-free deployment would need an in-tree replacement
  (PostgREST + GoTrue, or a custom auth path). Tracked separately.

---

## 7. Maintainer follow-ups (TODOs)

- [ ] Optional: bundle a `helm` sub-chart for Postgres + Minio so a single
      `helm install` works on bare clusters. Currently both are external.
- [ ] Optional: add a CI workflow that builds and pushes the two images to
      `ghcr.io/sboghossian/louis-{frontend,backend}` on tag.
- [ ] Optional: ship a `seed` script for an initial admin user once
      Supabase signup is wired to the local Postgres.
- [ ] Verify the Supabase Postgres "direct" connection string works for
      `npm run migrate` against PgBouncer-fronted projects. The script
      requires transactions (BEGIN/COMMIT), which PgBouncer's transaction
      mode does not fully support — use port 5432 direct.
- [ ] The bundled compose `postgres` is plain Postgres 15, not the full
      Supabase stack (GoTrue + Storage + Realtime). For full auth flows in
      a self-hosted compose install, run the official `supabase/supabase`
      compose alongside, or use a managed Supabase project.
