# Bingo Ranked

Three-piece system that turns the existing Minecraft bingo datapack into a ranked
ladder with a public website.

```
ranked_system/
├── backend/        Node.js + Express + SQLite — runs on Fly.io
├── frontend/       Static HTML/CSS/JS — runs on GitHub Pages
├── mod/            Fabric mod — runs on the Minecraft server (Aternos)
├── datapack/       Companion datapack with hooks the bingo pack calls
└── docs/           Deployment & integration guides
```

## How the pieces talk

```
Player ──/link──▶ Mod ──HMAC POST /api/link/request──▶ Backend
                                                         │
Player visits site, logs in, pastes code ──▶ Frontend ──POST /api/link/redeem──▶ Backend
                                                                                  │
Game ends, datapack calls /rankedreport end ──▶ Mod ──HMAC POST /api/games──▶ Backend
                                                                                  │
                                              Leaderboard, profiles ◀──GET /api──┘
```

## Bring-up order

Set up in this order — each step depends on the previous one being reachable.

1. **Backend** (`backend/`) — get it running locally first, then deploy to Fly.io.
   See [docs/deploy-backend.md](docs/deploy-backend.md).
2. **Mod** (`mod/`) — point it at the deployed backend, build a JAR, upload to Aternos.
   See [docs/deploy-mod.md](docs/deploy-mod.md).
3. **Datapack hooks** (`datapack/ranked_hooks/`) — drop into the world's `datapacks/`
   folder and patch the bingo pack to call them.
   See [docs/integrate-datapack.md](docs/integrate-datapack.md).
4. **Frontend** (`frontend/`) — edit `js/config.js` with your backend URL, push to
   a `gh-pages` branch.
   See [docs/deploy-frontend.md](docs/deploy-frontend.md).

## Security model — what each link relies on

| Boundary | Threat | Defense |
|----------|--------|---------|
| Browser ↔ Backend | password theft, session hijack | Argon2id, HTTPS, JWT 1h + rotated refresh, rate limit |
| Mod ↔ Backend | spoofed wins, replay | Shared HMAC key, timestamp window, nonce cache |
| Frontend ↔ Browser | XSS | No `innerHTML`, strict CORS allowlist, helmet headers |
| Player ↔ Mod | spoofing /rankedreport | Permission level 2 (ops/console only) |

## Local development

```bash
# Terminal 1 — backend
cd backend
cp .env.example .env
# fill in JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, MOD_HMAC_KEY (see comments inside)
npm install
npm run dev

# Terminal 2 — frontend
cd frontend
# Any static server works; e.g.
python -m http.server 5173
# Then open http://localhost:5173
```
