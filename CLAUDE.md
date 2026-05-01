REFLECHIS TROUJOURS AVANT DE REPONDRE. LIS BIEN LE CONTEXTE ET LES INVARIANTS. SI TU N'ES PAS SÛR, DEMANDE.

# Bingo Ranked — project context

## Communication
The user is French. **Reply in French.** They write casually with typos —
interpret intent generously, don't ask them to clarify obvious meanings.
They trust architectural/security/hosting calls; recommend and proceed for
low-stakes choices, only confirm for high-impact or destructive ones.

## What this project is
Adding a ranked ladder + public website on top of an existing Minecraft Bingo
datapack (Flytre Bingo, Fabric, MC ~1.21.x). The original bingo announces a
winner in chat then resets — no persistence, no stats. We add three pieces
that together track per-player wins across a Minecraft server hosted on
**Aternos** (free Fabric host).

## Layout

```
ranked_system/
├── backend/      Node.js + Express + better-sqlite3 + Argon2id (Fly.io target)
├── frontend/     Vanilla HTML/CSS/JS (GitHub Pages target)
├── mod/          Fabric mod, Java 21, Loom build (uploaded to Aternos)
├── datapack/     ranked_hooks companion datapack (drops in world's datapacks/)
└── docs/         Deployment guides (one per piece + integration)

bingo_1_21_10/    The existing bingo system. Don't modify directly — patch via
                  the ranked_hooks companion datapack and the integration doc.
```

## Architecture invariants (don't break)

- **Mod → Backend**: HMAC-SHA256 over `"{timestamp}.{nonce}.{rawBody}"`,
  hex-encoded in `X-Signature`. Timestamp window 5 min. Nonces cached.
  `MOD_HMAC_KEY` (backend env) MUST byte-match `hmacKey`
  (`config/ranked_bingo.json` on the MC server). Different keys per env (local
  dev vs Fly.io) is fine, as long as each env's mod and backend agree.
- **Browser → Backend**: JWT access token (1h) in `Authorization: Bearer …`,
  opaque refresh token (30d) stored sha256-hashed in DB, rotated on each use.
- **Passwords**: Argon2id only, OWASP params (19 MiB / t=2 / p=1). Never
  weakened.
- **XSS hygiene**: frontend never uses `innerHTML` on user-controlled data.
  All DOM construction goes through `window.ui.el(...)` in `frontend/js/ui.js`.
- **`/rankedreport`**: Brigadier permission level 2. Players cannot fake wins.

## Commands

```bash
# Backend (cwd: ranked_system/backend)
npm install        # first time only
npm run dev        # node --watch src/index.js
npm run migrate    # not normally needed — DB module migrates on import

# Frontend (cwd: ranked_system/frontend)
python -m http.server 5173    # any static server works

# Mod (cwd: ranked_system/mod, requires JDK 21)
./gradlew build               # outputs build/libs/ranked-bingo-*.jar
```

## Gotchas already hit

- **Migrations run at db module load**, not via a separate `migrate()` call in
  index.js. Routes `db.prepare(...)` at top level — schema must exist first.
  Don't reintroduce a separate migrate step in startup.
- **Plugin vs mod**: the bingo system uses Flytre Bingo (Fabric-only). A
  Bukkit/Spigot/Paper plugin is not feasible. Keep it Fabric.
- **Datapack hooks**: the ranked_hooks pack is shipped, but the user has to
  add `function ranked:on_start_*` and `function ranked:on_win_<team>` calls
  to the existing bingo pack manually. Don't auto-patch the bingo pack —
  see `docs/integrate-datapack.md`.
- **Win condition** (row/column/diagonal/blackout): currently always reported
  as `none`. Capturing it would require patching ~50 bingo functions; deferred
  to v2. Don't promise it without that prep work.

## Status (as of 2026-04-30)

Built and locally verified:
- ✅ Backend `/health` (200) and `/api/auth/register` (201, valid JWT pair)
- ✅ SQLite migrates correctly, `testuser` exists in `backend/data/ranked.db`

Built but not yet tested end-to-end:
- ⚠️ Login / refresh / logout / me endpoints
- ⚠️ /link flow (mod ↔ backend ↔ frontend)
- ⚠️ /games HMAC endpoint
- ⚠️ Leaderboard + profile pages in browser
- ⚠️ Mod build (JDK 21 needed)
- ⚠️ Datapack hooks integration in actual bingo
- ⚠️ Fly.io and GitHub Pages deployments

## Conventions

- No comments explaining WHAT the code does — names should suffice. Comments
  only for non-obvious WHY (a hidden constraint, an invariant, a workaround).
- Don't add features the user didn't ask for. No speculative abstractions.
- Don't create new docs unless the user asks. Update existing ones in `docs/`.
- Secrets live only in `.env` (gitignored) locally and in `fly secrets` in
  prod. Never commit them, never log them.
