REFLECHIS TROUJOURS AVANT DE REPONDRE. LIS BIEN LE CONTEXTE ET LES INVARIANTS. SI TU N'ES PAS SÛR, DEMANDE.

# Bingo Ranked — project context

## Communication
The user is French. **Reply in French.** They write casually with typos —
interpret intent generously, don't ask them to clarify obvious meanings.
They trust architectural/security/hosting calls; recommend and proceed for
low-stakes choices, only confirm for high-impact or destructive ones.

## What this project is
Adding a ranked ladder + public website on top of an existing Minecraft Bingo
datapack (Flytre Bingo, Fabric, MC 1.21.10). The original bingo announces a
winner in chat then resets — no persistence, no stats. We add three pieces
that together track per-player Elo and wins across a Minecraft server.

## Layout

```
ranked_system/
├── backend/      Node.js + Express + better-sqlite3 + Argon2id (/opt/backend sur Hetzner)
├── mod/          Fabric mod, Java 21, Loom build (/opt/minecraft/mods/ sur Hetzner)
├── datapack/     ranked_hooks companion datapack (/opt/minecraft/world/datapacks/)
└── docs/         Deployment guides (one per piece + integration)

Le frontend est à la **racine du repo** (index.html, player.html, js/, css/) —
GitHub Pages sert depuis là. Pas de sous-dossier frontend.

bingo_1_21_10/    The existing bingo system (Flytre Bingo, dézippé localement).
                  Don't modify directly — patch via ranked_hooks and the integration doc.
```

## Hosting — Hetzner CX33, Nuremberg, Ubuntu 24.04

- IP : `128.140.47.226`
- Domaine : `bingo-petitenc.duckdns.org` (HTTPS via certbot)
- MC server : Fabric 1.21.10, monde = `bingo_release_1_21`, port 25565
- Backend : Node.js port 3000, exposé via nginx+HTTPS
- Les deux tournent en tant qu'user `mc` via systemd (`minecraft.service` + `bingo-backend.service`)
- Console MC : `sudo -u mc screen -r minecraft`

**Pas de git sur le serveur.** `/opt/backend` est une copie manuelle.

**Workflow déploiement — pas de git sur le serveur, tout passe par SCP.**

```bash
# Backend
scp ranked_system/backend/src/routes/*.js root@128.140.47.226:/opt/backend/src/routes/
scp ranked_system/backend/src/utils/*.js root@128.140.47.226:/opt/backend/src/utils/
scp ranked_system/backend/migrations/*.sql root@128.140.47.226:/opt/backend/migrations/
scp ranked_system/backend/src/index.js root@128.140.47.226:/opt/backend/src/
ssh root@128.140.47.226 "systemctl restart bingo-backend.service"

# Datapack (ranked_hooks)
scp -r ranked_system/datapack/ranked_hooks root@128.140.47.226:/opt/minecraft/world/datapacks/
# Puis /reload dans la console MC

# Bingo datapacks (si modifiés)
scp -r bingo_1_21_10/bingo_release_1_21/datapacks/. root@128.140.47.226:/opt/minecraft/world/datapacks/
# Puis /reload dans la console MC
```

**Frontend** : GitHub Pages sert la **racine du repo**, pas `ranked_system/frontend/`.
Après chaque modif frontend, synchroniser vers la racine AVANT le push :
```bash
cp ranked_system/frontend/*.html .
cp -r ranked_system/frontend/js/. js/
cp -r ranked_system/frontend/css/. css/
```
Puis `git push` — GitHub Pages se met à jour automatiquement, aucun SCP.

## Architecture invariants (don't break)

- **Mod → Backend**: HMAC-SHA256 over `"{timestamp}.{nonce}.{rawBody}"`,
  hex-encoded in `X-Signature`. Timestamp window 5 min. Nonces cached.
  `MOD_HMAC_KEY` (backend `.env`) MUST byte-match `hmacKey`
  (`config/ranked_bingo.json` on the MC server).
- **Browser → Backend**: JWT access token (1h) in `Authorization: Bearer …`,
  opaque refresh token (30d) stored sha256-hashed in DB, rotated on each use.
- **Passwords**: Argon2id only, OWASP params (19 MiB / t=2 / p=1). Never weakened.
- **XSS hygiene**: frontend never uses `innerHTML` on user-controlled data.
  All DOM construction goes through `window.ui.el(...)` in `frontend/js/ui.js`.
- **`/rankedreport`**: Brigadier permission level 2. Players cannot fake wins.
- **Elo par mode** : `player_ratings` a une clé `(mc_uuid, mode)`. Un joueur a
  un Elo distinct par mode de jeu. Pas d'Elo global.

## Commands

```bash
# Backend (cwd: ranked_system/backend)
npm install        # first time only
npm run dev        # node --watch src/index.js

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
- **ClickEvent crash** (1.21.10 + Loom 1.7): instanciation directe crashe au
  runtime — presse-papier non supporté dans le mod.
- **maxCommandChainLength** : le datapack Flytre sature la limite par défaut
  (1 000 000 cmds) au lancement d'une partie. Réglé à 2 000 000 sur le serveur.
- **bingo_item manquant en lockout** : `supply_drop.json` référence
  `flytre:bingo_item` qui n'existe que dans `normal_set`/`nether_set`/`speed_set`.
  Corrigé : `bingo_item.json` copié dans `bingo_manual`.

## Status (as of 2026-05-03)

Déployé et fonctionnel en prod (Hetzner, backend + MC sur même machine) :
- ✅ Backend complet : auth, leaderboard, profil, admin, HMAC games
- ✅ Elo par mode — `player_ratings` clé `(mc_uuid, mode)`, migrations 003+004 appliquées
- ✅ Leaderboard : page principale par victoires, filtre mode par Elo du mode
- ✅ Delta Elo affiché en chat à chaque joueur en fin de partie
- ✅ Frontend sur GitHub Pages
- ✅ /link flow end-to-end fonctionnel
- ✅ Freeze joueurs non-liés (TP immédiat, défreeze auto 2s après /link)
- ✅ Bingo datapacks nettoyés (parasites supprimés, bingo_item.json ajouté dans bingo_manual)

Reste à faire :
- Patcher les fonctions bingo : ajouter `ranked:on_start_<mode>` et `ranked:on_win_<team>`
  dans le datapack existant (voir `docs/integrate-datapack.md`)
- Fix détection mode manhunt/lockout : identifier où le bingo pack sélectionne le mode
  (`bingo_manual/data/flytre/function/settings/`) et appeler le bon hook

## Conventions

- No comments explaining WHAT the code does — names should suffice. Comments
  only for non-obvious WHY (a hidden constraint, an invariant, a workaround).
- Don't add features the user didn't ask for. No speculative abstractions.
- Don't create new docs unless the user asks. Update existing ones in `docs/`.
- Secrets live only in `.env` (gitignored) on the server. Never commit them, never log them.
