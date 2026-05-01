# Deploy the backend (Fly.io)

The backend is a small Node.js + SQLite app. We deploy it to Fly.io because
the free allowance keeps a tiny VM running 24/7 with a persistent disk for the
database — no cold starts when someone hits the leaderboard.

## 1. Install Node.js locally (one time)

Required to run `npm install` and test before deploying.

- Windows: install Node 20 LTS from https://nodejs.org
- Verify: `node --version` should print `v20.x` or higher

## 2. Generate secrets

Open `backend/.env.example`, copy it to `.env`, and fill these three values:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# → use for JWT_ACCESS_SECRET

node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# → use for JWT_REFRESH_SECRET (must be different)

node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# → use for MOD_HMAC_KEY (also paste this into the mod config)
```

**Save the `MOD_HMAC_KEY` somewhere** — you'll paste it into the mod's
`config/ranked_bingo.json` later. If those two values ever drift apart, the
backend will reject every game-end POST.

## 3. Test locally

```bash
cd backend
npm install
npm run dev
```

You should see `[server] listening on :3000 (development)`.

Smoke test:
```bash
curl http://localhost:3000/health
# → {"ok":true,"env":"development"}
```

## 4. Deploy to Fly.io

Fly.io has a free tier that's plenty for this: 3 shared-cpu-1x VMs, 256 MB RAM,
a 1 GB persistent volume, and outbound bandwidth.

1. Install the CLI: https://fly.io/docs/flyctl/install/
2. `fly auth signup` (or `fly auth login`)
3. From the `backend/` directory:

```bash
fly launch --no-deploy
```

When prompted:
- **App name**: pick something unique (e.g. `mybingo-ranked-api`)
- **Region**: pick the one closest to your players (`cdg` for Paris, `iad` for east US)
- **Postgres / Redis / Tigris**: `No` to all
- **Deploy now?**: `No` (we need to add a volume first)

4. Create the persistent volume for the SQLite file:
```bash
fly volumes create ranked_data --size 1 --region cdg
```

5. Edit the generated `fly.toml` so the app uses the volume — replace the
   `[mounts]` section (add it if missing):

```toml
[mounts]
  source = "ranked_data"
  destination = "/data"

[env]
  NODE_ENV = "production"
  DB_PATH = "/data/ranked.db"
```

Also make sure your fly.toml has at least:
```toml
[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1
```

6. Push your secrets (these stay encrypted on Fly's side, never in git):

```bash
fly secrets set \
  JWT_ACCESS_SECRET="<paste-the-hex>" \
  JWT_REFRESH_SECRET="<paste-the-other-hex>" \
  MOD_HMAC_KEY="<paste-the-mod-key>" \
  ALLOWED_ORIGINS="https://YOURUSER.github.io"
```

(Use your real GitHub Pages URL. Multiple origins comma-separated.)

7. Deploy:
```bash
fly deploy
```

8. Get the URL Fly assigned and test:
```bash
curl https://your-app-name.fly.dev/health
```

## 5. Save the backend URL

You'll paste `https://your-app-name.fly.dev/api` into:
- `frontend/js/config.js` — `API_BASE`
- The mod's `config/ranked_bingo.json` — `backendUrl`

## Troubleshooting

- **`fly deploy` fails on `argon2`**: the build does need a C toolchain.
  Fly's default Dockerfile (auto-generated) handles this — make sure you're
  using the auto-generated one, not a custom alpine image.
- **DB file gone after redeploy**: you forgot the volume mount. Verify with
  `fly ssh console -C "ls /data"`.
- **CORS errors in browser**: the origin in `ALLOWED_ORIGINS` must match
  exactly (including `https://`, no trailing slash).
