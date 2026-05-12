# Cloudflare Tunnel — legal.dashable.dev

This folder publishes the locally-running Louis to a public domain via a
Cloudflare Tunnel (no port-forwarding, no inbound firewall change). The
tunnel terminates TLS at Cloudflare and proxies plaintext traffic to your
Mac on a long-lived outbound HTTP/2 connection.

## Routes

| Host                       | Local target           | Purpose          |
| -------------------------- | ---------------------- | ---------------- |
| `legal.dashable.dev`       | `http://localhost:3000` | Next.js frontend |
| `api.legal.dashable.dev`   | `http://localhost:3001` | Express backend  |

For the frontend to actually talk to the tunneled backend, set in
`frontend/.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=https://api.legal.dashable.dev
```

And add the public origin to the backend's CORS allow-list in
`backend/.env`:

```
FRONTEND_URL=https://legal.dashable.dev
```

## One-time setup

```bash
brew install cloudflared
cloudflared tunnel login                                    # browser-auth
cloudflared tunnel create louis-legal                       # writes ~/.cloudflared/<uuid>.json
cloudflared tunnel route dns louis-legal legal.dashable.dev
cloudflared tunnel route dns louis-legal api.legal.dashable.dev
```

After `tunnel create`, `cloudflared` prints the tunnel UUID and the path to
the credentials JSON. Open `config.yml` and replace both
`REPLACE_WITH_TUNNEL_UUID` strings.

## Run

Either:

```bash
./deploy/cloudflared/run.sh
```

or, from the repo root:

```bash
npm run tunnel
```

The tunnel stays in the foreground; Ctrl-C closes it. To run it as a
launchd service that survives reboots:

```bash
sudo cloudflared service install
```

(launchd will pick up `~/.cloudflared/config.yml`; either symlink ours or
copy it across.)

## Smoke test

```bash
curl -s https://api.legal.dashable.dev/health
# → {"ok":true}

open https://legal.dashable.dev
```

## Failure modes

- **502 Bad Gateway**: local frontend/backend isn't running. `run.sh`
  prints a warning when port 3000 or 3001 don't respond.
- **DNS error**: `cloudflared tunnel route dns` hasn't run for the host,
  or the zone `dashable.dev` isn't on the Cloudflare account you logged
  into. List routes with `cloudflared tunnel route ip show` and
  `cloudflared tunnel list`.
- **CORS**: backend rejects browser requests until `FRONTEND_URL` is set
  to the public origin.
- **SSE chat hangs**: don't run cloudflared behind another reverse proxy
  that buffers responses — it'll silently break streaming.
