# Storage setup — Cloudflare R2 or Supabase Storage

Louis uses S3-compatible object storage for document files. The cloned mike codebase ships with Cloudflare R2 config in `backend/.env`. You can use either R2 or Supabase Storage (the underlying SDK is the same).

## Option A — Cloudflare R2 (the upstream default)

1. Sign in at https://dash.cloudflare.com → R2.
2. Create a bucket (e.g., `louis`).
3. Generate an API token (R2 → Manage R2 API Tokens → Create API Token) with `Object Read & Write` permission on the bucket.
4. Fill in `backend/.env`:
   ```
   R2_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=<token-access-key-id>
   R2_SECRET_ACCESS_KEY=<token-secret>
   R2_BUCKET_NAME=louis
   ```

## Option B — Supabase Storage (S3-compatible, no extra vendor)

Supabase Storage is S3-compatible since 2024. Reusing the existing Louis OS project means one fewer vendor.

1. Open https://supabase.com/dashboard/project/dbgafihmnflvyzrwtaxz/storage/buckets
2. Click **New bucket** → name it `louis` → make it **private** (RLS-controlled). Click Create.
3. Click the bucket → click the **S3 Connection** tab.
4. Click **Generate new keys**. Copy the Access Key ID and Secret.
5. Fill in `backend/.env`:
   ```
   R2_ENDPOINT_URL=https://dbgafihmnflvyzrwtaxz.supabase.co/storage/v1/s3
   R2_ACCESS_KEY_ID=<paste S3 access key id>
   R2_SECRET_ACCESS_KEY=<paste S3 secret>
   R2_BUCKET_NAME=louis
   ```
   Then add this line if your AWS SDK needs the region hint:
   ```
   AWS_REGION=eu-west-1
   ```

The env var names start with `R2_` but the SDK doesn't care — it just configures an S3 client.

## Verifying

Restart the backend and upload a document via the upstream Mike flow (Projects → Add Document). If you get an HTTP 200 and the doc appears in your bucket, you're good.

## CORS

For browser-side direct uploads you may need to set CORS on the bucket:

- R2: bucket → Settings → CORS Policy. Allow `https://<your-deploy-host>` for `PUT`, `GET`.
- Supabase: bucket → CORS policy under storage settings.
