# Commandes utiles — Serveur Hetzner

## Connexion
```bash
ssh root@<ip-hetzner>
```

## Console Minecraft
```bash
sudo -u mc screen -r minecraft   # Attacher à la console
# Ctrl+A puis D                  # Détacher sans tuer le serveur
# Ctrl+A puis [                  # Mode scroll (flèches/PgUp), Q pour quitter
```

## Minecraft (service)
```bash
systemctl start minecraft
systemctl stop minecraft
systemctl restart minecraft
systemctl status minecraft
journalctl -u minecraft -f       # Logs en temps réel
```

## Backend Node.js (service)
```bash
systemctl start bingo-backend
systemctl stop bingo-backend
systemctl restart bingo-backend
systemctl status bingo-backend
journalctl -u bingo-backend -f   # Logs en temps réel
```

## Mettre à jour le backend
```bash
# Depuis ton PC (PowerShell)
scp -r C:\DOCUMENTS\systeme_ranked_mc\ranked_system\backend\src root@<ip>:/opt/backend/

# Sur le serveur
systemctl restart bingo-backend
```

## Mettre à jour le mod
```bash
# Depuis ton PC (PowerShell)
scp C:\DOCUMENTS\systeme_ranked_mc\ranked_system\mod\build\libs\ranked-bingo-0.1.0.jar root@<ip>:/opt/minecraft/mods/

# Sur le serveur
systemctl restart minecraft
```

## Datapacks
```bash
ls /opt/minecraft/bingo_release_1_21/datapacks/   # Lister les datapacks
# Dans la console Minecraft :
# /reload                                           # Recharger les datapacks
```

## Base de données
```bash
sqlite3 /opt/backend/data/ranked.db               # Ouvrir la DB
# .tables                                          # Lister les tables
# .quit                                            # Quitter
```

## Nginx
```bash
systemctl reload nginx          # Appliquer changements de config
nginx -t                        # Tester la config avant de recharger
```

## Renouvellement HTTPS (automatique, mais si besoin)
```bash
certbot renew
```
