# Déploiement de Nura en production

Ce projet est prêt à être déployé sur n'importe quel serveur (VPS) capable de
faire tourner Docker — Hetzner, DigitalOcean, OVH, Scaleway, etc. Tout tourne
alors sur ton propre serveur : tu possèdes le code et les données.

## Prérequis côté toi

1. **Un VPS** — 2 vCPU / 4 Go de RAM suffisent pour démarrer
   (ex. Hetzner CX22 ou équivalent, ~5-10 €/mois).
2. **Un nom de domaine** pointé vers l'IP du serveur (deux sous-domaines :
   un pour la boutique, un pour l'API — ex. `nura-paris.com` et
   `api.nura-paris.com`, en enregistrements DNS de type A).
3. **Docker installé sur le serveur** :

   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

## Préparer et durcir le VPS

Sur un Ubuntu LTS ou Debian neuf, copie le dépôt ou au minimum ce script sur le
serveur, puis lance la préparation en tant que root. L'option de clé publique
est recommandée et n'accepte qu'un fichier public `.pub` :

```bash
sudo SSH_PUBLIC_KEY_FILE=/root/deploy-key.pub \
   DEPLOY_USER=deploy \
   ./scripts/vps-setup-host.sh
```

Le script installe Docker depuis son dépôt officiel, Docker Compose, Git,
Fail2ban, les mises à jour de sécurité et UFW. Il n'ouvre que SSH, HTTP et
HTTPS, puis prépare `/opt/nura`, `/etc/nura` et `/var/backups/nura`.

La clé SSH publique doit être installée dans `/home/deploy/.ssh/authorized_keys`.
Teste une nouvelle connexion avec `deploy` avant de désactiver l'authentification
SSH par mot de passe. L'appartenance au groupe `docker` donne de fait des droits
équivalents à root : elle doit rester limitée à cet utilisateur d'exploitation.

Place le dépôt dans `/opt/nura/medusa`, ce qui correspond aux unités systemd
fournies pour les sauvegardes :

```bash
sudo install -d -o deploy -g deploy /opt/nura
sudo -u deploy git clone <URL_DU_DEPOT> /opt/nura/medusa
cd /opt/nura/medusa
```

## Étapes

1. **Cloner le dépôt sur le serveur** et se placer dans `medusa/`.

2. **Créer le fichier `.env`** à partir de `.env.example` :

   ```bash
   bash scripts/init-production-env.sh
   ```

   Cette commande crée le fichier s'il manque, génère les secrets internes
   absents, conserve toute valeur existante et applique les permissions `600`.
    Puis remplir :

    - `POSTGRES_PASSWORD`, `JWT_SECRET`, `COOKIE_SECRET` — générer avec
       `openssl rand -hex 32` (une valeur différente pour chacun).
    - `ORDER_ACCESS_SECRET` et `BACKUP_ENCRYPTION_KEY` — deux autres valeurs
       distinctes générées de la même façon.
    - `STOREFRONT_DOMAIN` / `BACKEND_DOMAIN` — les noms d'hôte publics sans
       `https://`; Caddy les utilise directement.
    - `STORE_CORS` / `ADMIN_CORS` / `AUTH_CORS` — tes vraies origines HTTPS.
    - `NEXT_PUBLIC_MEDUSA_BACKEND_URL` / `NEXT_PUBLIC_BASE_URL` — tes vraies
       URLs publiques.
    - `NEXT_PUBLIC_DEFAULT_REGION` — le code pays utilisé en dernier recours
       (`ci` par défaut).
    - Les variables `S3_*` d'un bucket S3/R2 persistant (voir « Médias »).
    - Les variables `LEGAL_*` sont des valeurs de secours optionnelles. Les
       informations réelles de l'entreprise, de l'hébergeur et du médiateur
       peuvent être renseignées après le déploiement dans **Réglages du site →
       Mentions légales** de l'Admin.
    - Au moins Stripe ou Jèko doit être configuré avant le premier démarrage
       de production. Le paiement manuel n'y est jamais proposé.
    - `RESEND_API_KEY` et `RESEND_FROM_EMAIL` sont obligatoires en production;
       l'adresse d'envoi doit appartenir à un domaine vérifié dans Resend.
    - `REFERRAL_REWARD_EUR` / `REFERRAL_REWARD_XOF` — les montants métier
       validés, en unités monétaires majeures.
    - `REVALIDATE_SECRET` — une valeur partagée générée avec
       `openssl rand -hex 32`, afin que les publications Admin soient visibles
       immédiatement.
    - `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` — laisser vide pour l'instant
       (étape 5). Caddy peut exposer l'admin avant le storefront.

3. **Protéger et vérifier la configuration** avant le démarrage :

   ```bash
   chmod 600 .env
   bash scripts/vps-preflight.sh --bootstrap
   ```

   Le préflight vérifie les outils, les ressources du serveur, les domaines,
   les secrets distincts, le stockage S3, l'email, le paiement et le rendu
   Docker Compose. Le mode `bootstrap` tolère uniquement l'absence de la clé
   publiable Medusa, qui n'existe pas encore au premier démarrage.

4. **Démarrer le socle** :

   ```bash
   ./scripts/vps-deploy.sh --bootstrap
   ```

   Le script construit avant de basculer, attend les healthchecks et vérifie
   publiquement `https://<BACKEND_DOMAIN>/health`. Au premier démarrage, le
   backend applique automatiquement les migrations. En cas d'échec :

   ```bash
   docker compose logs --tail=200 backend caddy
   ```

5. **Créer ton compte admin et une clé publiable** :

   ```bash
   docker compose exec backend npx medusa user -e ton-email@exemple.com -p un-mot-de-passe-solide
   ```

   Connecte-toi ensuite sur `https://<BACKEND_DOMAIN>/app`, va dans
   **Settings > API Key Management > Publishable Keys**, crée une clé, et
   colle-la dans `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` du fichier `.env`.

   Si `MEDUSA_FF_RBAC=false`, limite-toi à des administrateurs de confiance :
   tous les comptes admin disposent d'un accès complet. Pour déléguer des
   rôles Admin/Manager, obtiens une licence Medusa, renseigne
   `MEDUSA_LICENSE_KEY`, active les deux flags RBAC puis redéploie.

   ⚠️ **Avec RBAC activé, ne relance plus jamais cette commande `medusa user`
   après l'étape 7** (une fois les rôles Admin/Manager seedés) — bug confirmé
   de cette version de Medusa : la commande efface silencieusement toutes les
   politiques RBAC personnalisées. Ajoute les comptes suivants par invitation
   depuis le dashboard (**Settings > Team > Invite**).

6. **Construire et démarrer le storefront** (maintenant que la clé existe) :

   ```bash
   bash scripts/vps-preflight.sh
   ./scripts/vps-deploy.sh
   ```

   Ce second passage valide la clé publiable, sauvegarde la base si elle tourne,
   conserve les images applicatives précédentes, déploie toute la stack et
   exécute les smoke tests publics du backend et du storefront.

7. **Seeder le catalogue Nura et, si licencié, les rôles** (une seule fois,
   dans cet ordre — fais-le juste après l'étape 5, avant de créer d'autres
   comptes admin). La release initialise automatiquement la région CI/XOF/Jèko
   avec son seed idempotent.
   Remplace d'abord les URL Unsplash de `src/scripts/product-images.ts` par
   les vrais packshots Nura; le seed bloque ces placeholders en production :

   ```bash
   docker compose exec backend npx medusa exec ./src/scripts/seed-nura.js
   docker compose exec backend npx medusa exec ./src/scripts/add-nura-collection.js
   # Uniquement avec MEDUSA_FF_RBAC=true et MEDUSA_LICENSE_KEY défini :
   docker compose exec backend npx medusa exec ./src/scripts/seed-rbac-roles.js
   ```

Le site est alors accessible sur tes deux domaines, avec HTTPS automatique
(Caddy gère les certificats Let's Encrypt tout seul).

## Paiement réel

La région Côte d'Ivoire utilise Jèko. Une région Europe peut être ajoutée avec
Stripe lorsque ce compte est disponible. Le provider manuel reste réservé au
développement. En production, le backend refuse de démarrer tant qu'aucun
provider réel n'est configuré afin d'éviter toute commande sans paiement réel.

**Important : la création et la vérification des comptes Stripe et Jèko ne
peuvent être faites que par toi.** Ces plateformes exigent tes documents
d'entreprise (immatriculation, pièce d'identité du représentant légal,
coordonnées bancaires) pour vérifier l'identité de l'entreprise — aucune IA
ne peut se substituer à cette vérification. Une fois les comptes créés et
validés, connecte-les au site avec les étapes ci-dessous.

### Stripe (Europe — cartes bancaires)

1. Crée un compte sur [stripe.com](https://stripe.com) et complète la
   vérification (documents d'entreprise, coordonnées bancaires).
2. Récupère tes clés API (`dashboard.stripe.com/apikeys`), mets-les dans
   `.env` (`STRIPE_API_KEY`, `NEXT_PUBLIC_STRIPE_KEY`).
3. Crée un webhook Stripe pointant vers
   `https://<BACKEND_DOMAIN>/hooks/payment/stripe_stripe`, copie le
   secret de signature dans `STRIPE_WEBHOOK_SECRET`, et abonne-le aux
   événements `payment_intent.amount_capturable_updated`,
   `payment_intent.succeeded`, `payment_intent.payment_failed` et
   `payment_intent.partially_funded`.
4. Redéploie : `docker compose up -d --build backend storefront`.
5. Dans l'admin, **Settings > Regions > Europe**, active le mode de
   paiement Stripe.

### Jèko (Côte d'Ivoire — Wave, Orange Money, MTN, Moov, Djamo)

1. Crée un compte sur [jeko.africa](https://jeko.africa) et complète la
   vérification (documents d'entreprise).
2. Dans le Dashboard Business (`cockpit.jeko.africa`), va dans
   **Paramètres > API & Webhooks** pour récupérer ta clé API et son
   identifiant, mets-les dans `.env` (`JEKO_API_KEY`, `JEKO_API_KEY_ID`).
3. Récupère l'identifiant de ta boutique via
   `GET https://api.jeko.africa/partner_api/stores` (avec les headers
   `X-API-KEY` / `X-API-KEY-ID`), mets-le dans `.env` (`JEKO_STORE_ID`).
4. Fais confirmer par Jèko l'URL d'API et la convention de montant, puis
   renseigne `JEKO_API_URL` et `JEKO_AMOUNT_MULTIPLIER`. Le provider actuel
   refuse toute devise autre que XOF.
5. Configure l'URL de webhook `https://<BACKEND_DOMAIN>/hooks/payment/jeko_jeko`
   dans le même écran, copie le secret webhook affiché dans `.env`
   (`JEKO_WEBHOOK_SECRET`).
6. Redéploie : `docker compose up -d --build backend`.
7. Dans l'admin, **Settings > Regions > Côte d'Ivoire**, active le mode de
   paiement Jèko.

⚠️ Jèko ne propose pas de remboursement via son API : un remboursement doit
être fait manuellement (transfert mobile money direct) et noté à part —
tenter un remboursement pour Jèko dans le dashboard Medusa affichera une
erreur explicite plutôt que de faire semblant de réussir.

## Rôles & permissions (Super Admin / Admin / Manager)

Trois profils existent dans le dashboard admin :

- **Super Admin** — accès total (créé automatiquement pour le premier
  compte admin).
- **Admin** — gère tout l'opérationnel (produits, commandes, clients,
  promotions, prix, inventaire, utilisateurs, réglages boutique), mais ne
  peut pas créer/modifier de rôles.
- **Manager** — peut consulter/créer/modifier produits, commandes, clients
  et inventaire au quotidien, mais ne peut ni supprimer, ni toucher aux
  utilisateurs, réglages boutique, clés API ou rôles.

Pour ajouter un collègue : dashboard → **Settings > Team > Invite**, puis
une fois le compte créé, assigne-lui un rôle via **Settings > Roles**.

## Emails (Resend)

Une fois Resend configuré, le site envoie automatiquement :

- le message du formulaire `/contact` (à toi, `RESEND_FROM_EMAIL`),
- la confirmation de commande (au client, après paiement),
- les notifications d'annulation, d'expédition, de livraison et de remboursement,
- le lien de réinitialisation de mot de passe,
- le lien de vérification d'email,
- la notification de nouvel inscrit à la newsletter (à toi).

1. Crée un compte sur [resend.com](https://resend.com) et vérifies-y ton
   domaine d'envoi (ex. `nura-paris.com`).
2. Récupère une clé API (`resend.com/api-keys`), mets-la dans `.env`
   (`RESEND_API_KEY`) avec une adresse `RESEND_FROM_EMAIL` sur ce domaine
   vérifié (ex. `contact@nura-paris.com`).
3. Redéploie : `docker compose up -d --build backend`.

Le mode sans Resend, où les messages sont uniquement journalisés, est réservé
au développement local. Le backend de production refuse de démarrer sans ces
deux variables.

## Recherche produit (Meilisearch)

Auto-hébergée, aucun compte tiers requis :

1. `bash scripts/init-production-env.sh` génère `MEILISEARCH_API_KEY`. Pour la remplacer
   manuellement, utilise une valeur dédiée d'au moins 32 caractères :

   ```bash
   openssl rand -hex 32
   ```

2. Démarre Meilisearch, puis crée l'index des produits avec sa clé primaire
   (sans cela, la graine échoue : Meilisearch ne peut pas inférer la clé
   primaire quand plusieurs champs se terminent par `id`) :

   ```bash
   docker compose up -d meilisearch
    docker compose exec -T meilisearch sh -c '
       wget -qO- \
          --header="Authorization: Bearer ${MEILI_MASTER_KEY}" \
          --header="Content-Type: application/json" \
          --post-data="{\"uid\":\"products\",\"primaryKey\":\"id\"}" \
          http://127.0.0.1:7700/indexes
    '
   ```

   Ensuite démarre tout :

   ```bash
   docker compose up -d --build
   ```

   Au démarrage, le backend remplit automatiquement l'index des produits et
   le maintient à jour à chaque création/modification de produit.
3. Crée une clé « search-only » (celle-ci est exposée au navigateur, elle
   ne doit jamais être la clé maître ci-dessus) :

   ```bash
   docker compose exec meilisearch curl -s -X POST http://localhost:7700/keys \
     -H "Authorization: Bearer $MEILISEARCH_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"description":"Storefront search-only key","actions":["search"],"indexes":["products"],"expiresAt":null}'
   ```

   Copie le `key` retourné dans `.env` (`NEXT_PUBLIC_MEILISEARCH_API_KEY`),
   mets `NEXT_PUBLIC_MEILISEARCH_HOST` sur
   `https://<BACKEND_DOMAIN>/meilisearch` (Caddy expose déjà ce chemin avec
   une limite de débit), puis :

   ```bash
   docker compose up -d --build storefront
   ```

Le preflight de production exige la clé maître `MEILISEARCH_API_KEY`. La clé
publique `NEXT_PUBLIC_MEILISEARCH_API_KEY` reste optionnelle : sans elle, le
site fonctionne sans barre de recherche, avec la navigation par catégories et
collections.

## Détection automatique du marché

Un visiteur en Côte d'Ivoire arrive automatiquement en XOF/Jèko, un visiteur
ailleurs reste sur le marché par défaut (EUR/Stripe) — sans que le client
choisisse quoi que ce soit. Ça se fait via une détection GeoIP faite par
Caddy lui-même (auto-hébergée, aucun service tiers appelé à chaque visite) :

1. Crée un compte gratuit sur
   [maxmind.com/en/geolite2/signup](https://www.maxmind.com/en/geolite2/signup),
   génère une clé de licence (`Manage License Keys`).
2. Mets ton `Account ID` et ta clé dans `.env`
   (`GEOIPUPDATE_ACCOUNT_ID`, `GEOIPUPDATE_LICENSE_KEY`).
3. Au premier démarrage, le healthcheck attend automatiquement la fin du
   téléchargement avant de démarrer Caddy :

   ```bash
   docker compose up -d geoipupdate
   docker compose up -d --build
   ```

   Les démarrages suivants n'ont pas besoin de cette étape séparée — la
   base reste sur le volume `geoip_data` et se rafraîchit automatiquement
   toutes les 72 h.

Si un client choisit manuellement un autre pays dans le sélecteur du site,
ce choix est mémorisé (cookie, 1 an) et prime toujours sur la détection
GeoIP au prochain passage.

Pour affiner la détection par pays plutôt que par grand marché (Europe vs
Côte d'Ivoire), ajoute d'autres blocs `@geo_*` dans le `Caddyfile` — voir le
commentaire au-dessus du bloc `@geo_ci` existant.

## Mises à jour

```bash
cd /opt/nura/medusa
git pull
bash scripts/vps-preflight.sh
./scripts/vps-deploy.sh
```

Le script ne bascule les conteneurs qu'après une construction réussie. Les
images applicatives courantes sont conservées sous le tag `previous` avant la
mise à jour. Les migrations doivent rester rétrocompatibles selon le modèle
expand-contract : le rollback applicatif ne revient pas sur le schéma SQL.

### Rollback applicatif

```bash
ROLLBACK_CONFIRM=application-only ./scripts/vps-rollback.sh
curl --fail https://<BACKEND_DOMAIN>/health
curl --fail https://<STOREFRONT_DOMAIN>/
```

Après le rollback, vérifie aussi manuellement une connexion admin et un passage
de commande en environnement de test. Si une migration destructive a été
livrée, restaure une sauvegarde validée dans une base isolée avant toute action
sur la base de production.

## Sauvegardes

Les sauvegardes sont chiffrées en AES-256 et conservées 30 jours par défaut.
Exporte la clé indiquée dans `.env` sans la passer en argument de commande :

```bash
export BACKUP_ENCRYPTION_KEY='valeur-de-.env'
./scripts/backup-postgres.sh
```

Programme cette commande chaque nuit et copie aussi le dossier `backups/` vers
un stockage hors serveur. Pour vérifier une restauration sur une base de test :

```bash
export BACKUP_ENCRYPTION_KEY='valeur-de-.env'
RESTORE_CONFIRM=medusa ./scripts/restore-postgres.sh backups/medusa-TIMESTAMP.dump.enc
```

Teste une restauration au moins une fois par trimestre.

Le dépôt fournit un timer systemd quotidien pour une installation dans
`/opt/nura/medusa` :

```bash
sudo install -d -m 700 /var/backups/nura
sudo install -d -m 700 /etc/nura
sudo install -m 600 /dev/null /etc/nura/backup-encryption-key
sudoedit /etc/nura/backup-encryption-key
sudo install -m 644 deploy/systemd/nura-backup.service /etc/systemd/system/
sudo install -m 644 deploy/systemd/nura-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now nura-backup.timer
sudo systemctl start nura-backup.service
sudo systemctl status nura-backup.service
sudo systemctl list-timers nura-backup.timer
```

Colle uniquement la valeur de `BACKUP_ENCRYPTION_KEY` dans le fichier ouvert
par `sudoedit`, sans le nom de variable ni guillemets. Systemd la présente au
script comme un credential temporaire, sans charger le `.env` complet dans
l'environnement du service. Chaque archive est déchiffrée et inspectée avec
`pg_restore --list` avant d'être acceptée, puis accompagnée d'un checksum SHA-256.

Une sauvegarde présente sur le même VPS ne protège pas d'une perte du serveur.
Ajoute une réplication chiffrée vers un bucket privé ou active les snapshots
automatiques de l'hébergeur avec une rétention indépendante.

PostgreSQL et le bucket S3/R2 sont les sources de vérité à sauvegarder. Redis
ne contient que du cache et de la coordination, Meilisearch est reconstruit
depuis PostgreSQL, et les certificats Caddy sont réémis automatiquement. Leurs
volumes accélèrent une reprise mais ne contiennent pas de données métier uniques.

## Médias persistants

Le backend exige en production un bucket compatible S3. Configure
`S3_FILE_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`,
`S3_BUCKET` et, pour un service compatible tel que R2, `S3_ENDPOINT`.

## Audit des dépendances

`npm run security:audit` bloque tout nouvel avis de sécurité élevé ou critique
dans les dépendances de production. Aucune exception n'est autorisée.

## Supervision

Les conteneurs exposent des healthchecks et limitent leurs journaux à cinq
fichiers de 10 Mo. `OTEL_EXPORTER_OTLP_ENDPOINT` reste vide tant que la pile
OpenTelemetry n'est pas mise à niveau (avis GHSA-qqmp-wf37-98f9 sur
`@opentelemetry/instrumentation-pg`). Si tu l'actives malgré tout, vers un
collecteur que tu exploites, les traces HTTP, workflows, requêtes, base et cache
sont envoyées après masquage des identifiants de requête, des adresses IP, des
paramètres d'URL, des valeurs et paramètres SQL, des messages d'exception et de
statut, du nom du rôle de base et des détails du processus hôte (utilisateur
système, ligne de commande), sur les spans, leurs événements, leurs liens et leur
ressource (`apps/backend/src/lib/otel-redaction.ts`). Les segments du chemin
d'URL sont conservés : ne place jamais de donnée personnelle dans un chemin de
route. Ajoute aussi une sonde externe sur `/health` et sur la page d'accueil.
