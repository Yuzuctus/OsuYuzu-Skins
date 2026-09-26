# Stockage des skins sur le VPS `fm`

Le site et l'admin restent sur Cloudflare. Le VPS sert uniquement les fichiers de skins et l'archive `Tout prendre` via `https://api.fm.yuzuctus.fr/skins-storage/`. Les aperçus restent sur R2, les fiches et leur ordre sur D1. Les URL publiques `/api/download/:id` et `/api/download-all` restent stables et redirigent vers le VPS.

## Installation actuelle

- Service : `osuyuzu-storage.service`, utilisateur `osuyuzu-storage`, écoute locale `127.0.0.1:8790`.
- Code : `/opt/osuyuzu-storage/server.mjs` ; données : `/srv/osuyuzu-skins/files/{skins,bundles}`.
- Configuration privée : `/etc/osuyuzu-storage.env`, avec `STORAGE_ROOT=/srv/osuyuzu-skins/files`, `STORAGE_SECRET`, `STORAGE_PORT=8790` et `STORAGE_ORIGINS=https://skins.yuzuctus.fr,http://localhost:5173`.
- Caddy route `/skins-storage/*` vers le service local. La configuration précédente est conservée dans `/etc/caddy/Caddyfile.pre-osuyuzu-2026-09-26`.
- Le même secret est configuré comme `SKIN_STORAGE_SECRET` dans le Worker `yuzu-skins`. Ne jamais le commiter ni l'afficher dans les journaux.

## Données et administration

L'admin demande au Worker un ticket d'upload limité à un nom, une taille, une clé et une durée. Le navigateur envoie les nouveaux skins par blocs de 8 Mio directement au VPS. Le Worker vérifie ensuite le fichier avant de mettre à jour D1. Les nouvelles clés sont immuables. Après une modification de la collection, demander la reconstruction depuis l'admin : le VPS crée l'archive directement à partir des fichiers qu'il possède.

La migration initiale se lance depuis Windows avec `pwsh -File scripts/migrate-skins-to-vps.ps1 -Execute`. Elle copie les fichiers indiqués par D1 depuis R2, compare taille et SHA-256, puis reconstruit l'archive sur le VPS. Sans `-Execute`, elle ne fait qu'un inventaire. Elle ne supprime pas les originaux R2 ; ceux-ci restent une sauvegarde pendant la transition.

## Contrôles et retour arrière

```sh
ssh fm 'systemctl status osuyuzu-storage.service --no-pager'
curl -I https://api.fm.yuzuctus.fr/skins-storage/files/bundles/all.zip
```

Pour interrompre les nouveaux téléchargements VPS, redéployer la version Cloudflare précédente du Worker. Les fichiers R2 n'ont pas été effacés. Ne restaurer la configuration Caddy précédente qu'après avoir redirigé les téléchargements, sinon les liens de la version actuelle du site échoueront.

Sauvegarder `/srv/osuyuzu-skins/files` et `/etc/osuyuzu-storage.env` sur le VPS, en gardant le secret hors du dépôt. La base D1 contient les noms, clés et métadonnées, pas les octets des skins.
