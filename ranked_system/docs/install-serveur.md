# Installation complète — nouveau serveur Hetzner

Tout tourne sur une seule machine : Minecraft + backend Node.js.  
Frontend sur GitHub Pages (rien à installer côté front).

---

## 1. Prérequis système

```bash
apt update && apt upgrade -y
apt install -y curl git screen ufw
```

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

## 3. Backend Node.js

### Copier les fichiers

```bash
mkdir -p /opt/backend
# Depuis ta machine locale :
scp -r ranked_system/backend/* root@<IP>:/opt/backend/
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
cd /opt/backend
npm install --omit=dev
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
User=root

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

## 4. Serveur Minecraft

### Créer l'utilisateur et le dossier

```bash
mkdir -p /opt/minecraft/{mods,config,logs}
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
# Télécharger Fabric API sur https://modrinth.com/mod/fabric-api et uploader aussi
```

### Démarrer une première fois pour générer la config

```bash
cd /opt/minecraft
java -Xms1G -Xmx3G -jar fabric-server-launch.jar nogui
# Attendre que ça démarre puis Ctrl+C
```

### Config du mod

```bash
nano /opt/minecraft/config/ranked_bingo.json
```

```json
{
  "backendUrl": "http://127.0.0.1:3000/api",
  "hmacKey": "<le MOD_HMAC_KEY du .env backend>",
  "reportingEnabled": true
}
```

### Datapack ranked_hooks

```bash
# Depuis ta machine locale :
scp -r ranked_system/datapack/ranked_hooks root@<IP>:/opt/minecraft/world/datapacks/
```

### Service systemd Minecraft

```bash
nano /etc/systemd/system/minecraft.service
```

```ini
[Unit]
Description=Minecraft Bingo Server
After=network.target bingo-backend.service

[Service]
Type=simple
WorkingDirectory=/opt/minecraft
ExecStart=/usr/bin/java -Xms1G -Xmx3G -jar fabric-server-launch.jar nogui
Restart=on-failure
RestartSec=10
User=root

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable minecraft
systemctl start minecraft
```

---

## 5. Vérifications finales

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

## 6. Mise à jour du mod

```bash
# Depuis ta machine locale :
scp ranked_system/mod/build/libs/ranked-bingo-0.1.0.jar root@<IP>:/opt/minecraft/mods/
systemctl restart minecraft
```

## 7. Mise à jour du backend

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
