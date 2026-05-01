# Installation complète — nouveau serveur Hetzner

Tout tourne sur une seule machine : Minecraft + backend Node.js.  
Frontend sur GitHub Pages (rien à installer côté front).

---

## 1. Prérequis système

```bash
apt update && apt upgrade -y
apt install -y curl git screen ufw
```

### Utilisateur système dédié

```bash
useradd -r -m -d /opt/mc -s /bin/bash mc
```

Tous les services (backend + Minecraft) tournent sous cet utilisateur, jamais root.

### Java 21

```bash
apt install -y openjdk-21-jre-headless
java -version  # doit afficher openjdk 21
```

### Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version  # v20.x
```

---

## 2. Firewall

```bash
ufw allow 22      # SSH
ufw allow 25565   # Minecraft
ufw allow 80      # HTTP (si reverse proxy)
ufw allow 443     # HTTPS (si reverse proxy)
ufw enable
```

Le backend écoute sur `localhost:3000` uniquement — pas besoin d'ouvrir ce port.

---

## 3. Nginx (reverse proxy)

```bash
apt install -y nginx
```

```bash
nano /etc/nginx/sites-available/bingo-backend
```

```nginx
server {
    listen 80;
    server_name bingo-petitenc.duckdns.org;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/bingo-backend /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl start nginx
```

Vérifier que le frontend atteint le backend :
```bash
curl http://bingo-petitenc.duckdns.org/health
# → {"ok":true,"env":"production"}
```

---

## 4. Backend Node.js

### Copier les fichiers

```bash
mkdir -p /opt/backend
chown mc:mc /opt/backend
# Depuis ta machine locale :
scp -r ranked_system/backend/* root@<IP>:/opt/backend/
chown -R mc:mc /opt/backend
```

### Variables d'environnement

```bash
# Générer les secrets (à faire une seule fois)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"  # JWT_ACCESS_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"  # JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"  # MOD_HMAC_KEY

nano /opt/backend/.env
```

Contenu du `.env` :

```env
NODE_ENV=production
PORT=3000
DB_PATH=/opt/backend/data/ranked.db
JWT_ACCESS_SECRET=<hex généré>
JWT_REFRESH_SECRET=<hex généré différent>
MOD_HMAC_KEY=<hex généré — noter pour le mod>
ALLOWED_ORIGINS=https://kylian-han.github.io
```

### Installer les dépendances

```bash
apt install -y build-essential python3
cd /opt/backend
sudo -u mc npm install --omit=dev
sudo -u mc npm rebuild better-sqlite3
```

### Service systemd

```bash
nano /etc/systemd/system/bingo-backend.service
```

```ini
[Unit]
Description=Bingo Ranked Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/backend
ExecStart=/usr/bin/node src/index.js
EnvironmentFile=/opt/backend/.env
Restart=always
RestartSec=5
User=mc
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable bingo-backend
systemctl start bingo-backend
systemctl status bingo-backend

# Vérifier :
curl http://localhost:3000/health
# → {"ok":true,"env":"production"}
```

---

## 5. Serveur Minecraft

### Créer le dossier

```bash
mkdir -p /opt/minecraft/{mods,config,logs}
chown -R mc:mc /opt/minecraft
```

### Fabric Server

Télécharger le launcher Fabric depuis https://fabricmc.net/use/server/

```bash
cd /opt/minecraft
# Remplacer l'URL par la version correspondant à ta version MC
curl -OL https://meta.fabricmc.net/v2/versions/loader/1.21.10/<LOADER_VERSION>/<INSTALLER_VERSION>/server/jar -o fabric-server-launch.jar
java -jar fabric-server-launch.jar --installDir . nogui
# Accepter l'EULA :
echo "eula=true" > eula.txt
```

### Fabric API + mod ranked

```bash
# Depuis ta machine locale :
scp ranked_system/mod/build/libs/ranked-bingo-0.1.0.jar root@<IP>:/opt/minecraft/mods/
scp fabric-api-0.138.4+1.21.10.jar root@<IP>:/opt/minecraft/mods/
```

### Map + datapacks bingo

```bash
# Depuis ta machine locale — upload la map sous un nom temporaire :
scp -r bingo_1_21_10/bingo_release_1_21 root@<IP>:/opt/minecraft/bingo_release_1_21
# Depuis ta machine locale — ajouter le datapack ranked :
scp -r ranked_system/datapack/ranked_hooks root@<IP>:/opt/minecraft/bingo_release_1_21/datapacks/
# Sur le serveur — supprimer le world vide généré au premier boot, placer la map, corriger les permissions :
ssh root@<IP> "rm -rf /opt/minecraft/world && mv /opt/minecraft/bingo_release_1_21 /opt/minecraft/world && chown -R mc:mc /opt/minecraft/world"
```

### Démarrer une première fois pour générer la config

```bash
cd /opt/minecraft
sudo -u mc screen -dmS minecraft java -Xms2G -Xmx6G -jar fabric-server-launch.jar nogui
```

Attendre ~30s que le serveur démarre, puis rattacher le screen pour vérifier :

```bash
sudo -u mc screen -r minecraft
# Ctrl+A puis D pour détacher sans couper le serveur
```

### Op / whitelist

Une fois dans la console MC (via `screen -r` ci-dessus) :

```
op <ton_pseudo>
whitelist add <pseudo>
whitelist on
```

Puis détacher : `Ctrl+A` puis `D`.

```
op <ton_pseudo>
whitelist add <pseudo>
whitelist on
```

### Config du mod

⚠️ **Étape bloquante** — sans ça le `/link` et les reports échouent avec `bad_signature`.

Récupérer la clé générée dans le `.env` backend :
```bash
grep MOD_HMAC_KEY /opt/backend/.env
```

Puis remplir la config :
```bash
nano /opt/minecraft/config/ranked_bingo.json
```

```json
{
  "backendUrl": "http://127.0.0.1:3000/api",
  "hmacKey": "<valeur exacte de MOD_HMAC_KEY dans /opt/backend/.env>",
  "reportingEnabled": true
}
```

### Service systemd Minecraft (avec screen)

Le service lance le serveur dans un screen, ce qui permet d'accéder à la console MC directement.

```bash
nano /etc/systemd/system/minecraft.service
```

```ini
[Unit]
Description=Minecraft Bingo Server
After=network.target bingo-backend.service

[Service]
Type=forking
User=mc
WorkingDirectory=/opt/minecraft
ExecStart=/usr/bin/screen -dmS minecraft java -Xms2G -Xmx6G -jar fabric-server-launch.jar nogui
ExecStop=/usr/bin/screen -S minecraft -X stuff "stop\n"
Restart=on-failure
RestartSec=10
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable minecraft
systemctl start minecraft
```

**Accéder à la console MC :**
```bash
sudo -u mc screen -r minecraft
# Ctrl+A puis D pour détacher
```

---

## 6. Vérifications finales

```bash
# Backend OK
curl http://localhost:3000/health

# Logs Minecraft
tail -f /opt/minecraft/logs/latest.log | grep ranked

# Logs backend
journalctl -u bingo-backend -f
```

En jeu :
- `/link` → doit afficher un code dans le chat
- `/rankedreport start normal` puis `/rankedreport end red none` → doit logger `Game reported`

---

## 7. Mise à jour du mod

```bash
# Depuis ta machine locale :
scp ranked_system/mod/build/libs/ranked-bingo-0.1.0.jar root@<IP>:/opt/minecraft/mods/
systemctl restart minecraft
```

## 8. Mise à jour du backend

```bash
# Depuis ta machine locale :
scp -r ranked_system/backend/src root@<IP>:/opt/backend/
ssh root@<IP> "systemctl restart bingo-backend"
```

---

## Résumé des ports et chemins

| Quoi | Où |
|---|---|
| Backend | `/opt/backend` — port `3000` (localhost seulement) |
| Minecraft | `/opt/minecraft` — port `25565` (public) |
| Config mod | `/opt/minecraft/config/ranked_bingo.json` |
| Base de données | `/opt/backend/data/ranked.db` |
| Logs MC | `/opt/minecraft/logs/latest.log` |
| Logs backend | `journalctl -u bingo-backend` |
