# Bingo Ranked

Système de classement compétitif (Elo + leaderboard public) ajouté par-dessus le datapack **Flytre Bingo** pour Minecraft Fabric 1.21.x.

> **Note** : ce projet a été développé avec l'assistance de Claude (IA Anthropic). Le code a été relu et validé manuellement.

---

## Ce que ça fait

Le datapack Flytre Bingo original annonce un gagnant dans le chat puis reset — sans aucune persistance. Ce projet ajoute :
Lien : https://www.flytre.net/bingo
- Un **Elo par mode de jeu** (normal, speed, nether, lockout, manhunt, blackout)
- Un **leaderboard public** trié par victoires (toutes modes) ou par Elo (par mode)
- Une **page de profil** par joueur avec historique des parties et évolution Elo
- Un **système de compte** pour lier son pseudo Minecraft à un profil web
- Un **affichage du delta Elo en chat** à la fin de chaque partie

---

## Architecture

Trois composants qui fonctionnent ensemble :

```
ranked_system/
├── backend/    Node.js + Express + SQLite (better-sqlite3)
│               Authentification Argon2id, JWT, HMAC-SHA256 pour le mod
├── mod/        Mod Fabric (Java 21)
│               Commandes /link et /rankedreport, communication HMAC avec le backend
└── datapack/   ranked_hooks — datapack companion appelé par le bingo pack
                Déclenche rankedreport start/end au bon moment

index.html      Frontend vanilla HTML/CSS/JS (GitHub Pages)
js/
css/
```

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Backend   | Node.js, Express, better-sqlite3, Argon2id, JWT |
| Mod       | Java 21, Fabric API, Loom |
| Frontend  | HTML/CSS/JS vanilla, pas de framework |
| Hébergement | Hetzner CX33 (backend + MC), GitHub Pages (frontend) |

---

## Modes de jeu supportés

| Mode | Hook datapack |
|------|--------------|
| Normal | `ranked:on_start_normal` |
| Speed | `ranked:on_start_speed` |
| Nether | `ranked:on_start_nether` |
| Lockout | `ranked:on_start_lockout` |
| Manhunt | `ranked:on_start_manhunt` |
| Blackout | `ranked:on_start_blackout` |

---

## Sécurité

- Les requêtes mod → backend sont signées **HMAC-SHA256** (`{timestamp}.{nonce}.{body}`)
- Les mots de passe sont hashés avec **Argon2id** (paramètres OWASP)
- Les tokens JWT (1h) et refresh tokens (30j, stockés hashés en DB) sont rotés à chaque usage
- Le frontend ne fait jamais `innerHTML` sur des données utilisateur

---

## Licence

Ce projet est partagé librement.

- ✅ Copie, modification et usage personnel autorisés
- ✅ Partage avec attribution autorisé
- ❌ Usage commercial interdit sans accord explicite de l'auteur

> Partiellement généré avec l'assistance de Claude (Anthropic). Utilisation soumise aux mêmes conditions.
