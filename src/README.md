# MonDjassa — Marketplace entre particuliers (Côte d'Ivoire)

Application web (convertible en app mobile) où particuliers et petits vendeurs créent un
compte, publient des annonces d'articles (électronique, mode, meubles, véhicules...),
et où la plateforme se rémunère via un modèle freemium + abonnements + boost, avec
activation manuelle après paiement Mobile Money (Orange/MTN/Wave). Conforme aux
valeurs halal (voir `CHARTE.md`) — pas d'immobilier (couvert par une plateforme sœur),
pas d'alimentation (périssable).

**Backend : Supabase** — Postgres + authentification + stockage de fichiers +
Edge Functions, hébergé gratuitement par Supabase. Le site (build Vite) se
déploie ensuite comme simple site statique sur Render.

## 1. Modèle économique implémenté

- **8 publications gratuites par mois** (20 pendant la promo de lancement) — un compteur
  mensuel qui ne se contourne pas en supprimant/revendant une annonce (voir `src/data/plans.js`).
- **Abonnements mensuels qui lèvent cette limite mensuelle**, remplacée par un quota d'annonces
  actives simultanées :
  - Pro -> 38 annonces actives possibles (8 + 30)
  - Premium -> 68 annonces actives possibles (8 + 60)
- **Boost payant** (remontée en tête de liste + badge "En avant") : plusieurs durées au choix.
- **Paiement hors plateforme** : l'utilisateur paie sur ton numéro Mobile Money, saisit
  la référence de transaction dans l'app, et un **admin active manuellement** l'offre
  depuis le tableau de bord (`/admin` -> onglet "Demandes en attente").

Modifie les numéros de paiement dans `src/data/plans.js` (`PAYMENT_INSTRUCTIONS`).
Modifie les prix/quotas dans le même fichier (`SUBSCRIPTION_PLANS`, `BOOST_PLANS`).

## 2. Mettre en place le backend Supabase

Voir **`SUPABASE_SETUP.md`** pour la marche à suivre complète (création du
projet, exécution du schéma SQL, notifications push, déploiement). En résumé :

1. Crée un projet sur [supabase.com](https://supabase.com) (gratuit).
2. Exécute `supabase/migrations/0001_init.sql` dans le SQL Editor du projet.
3. Récupère l'URL du projet et la clé publique (`anon key`) dans
   Project Settings → API.

## 3. Installer et lancer l'app web

```bash
npm install
cp .env.example .env
```

Renseigne `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans `.env` (étape 2).

```bash
npm run dev
```

### Créer le premier compte admin de l'app

1. Inscris-toi normalement dans l'app (`/inscription`).
2. Dans le tableau de bord Supabase → **Table Editor → profiles** → ta ligne,
   change le champ `role` de `user` à `superadmin`.
3. Reconnecte-toi dans l'app : le lien **ADMIN** apparaît dans le menu.

### Build de production

```bash
npm run build
```
Le dossier `dist/` contient le site statique, déployable sur Render (Static
Site gratuit) ou n'importe quel autre hébergeur statique — il communique avec
ton projet Supabase via l'API.

## 4. Application mobile (Capacitor — déjà configuré dans ce zip)

Capacitor est déjà installé et la plateforme **Android** déjà ajoutée (dossier
`android/`). À chaque modification du code web :

```bash
npm run build
npx cap sync android
```

Puis ouvre le projet dans Android Studio pour builder/tester sur émulateur ou téléphone :

```bash
npx cap open android
```

(Il faut avoir installé [Android Studio](https://developer.android.com/studio) au préalable.)

### iOS

Xcode ne tourne que sur Mac — mais **`.github/workflows/build-ios.yml`** permet de builder
depuis Windows/Linux : il utilise une machine macOS fournie gratuitement par GitHub Actions.

1. Sur GitHub → Settings → Secrets and variables → Actions → ajoute `VITE_SUPABASE_URL` et
   `VITE_SUPABASE_ANON_KEY` (mêmes valeurs que ton `.env` local).
2. Onglet "Actions" du dépôt → "Build iOS (Capacitor)" → "Run workflow".
3. Cette première version vérifie juste que le projet compile (pas de vraie app installable —
   il faudra ajouter un compte Apple Developer + des certificats de signature pour ça, une fois
   que tu en as un).

Si tu as accès à un Mac (le tien, loué dans le cloud type MacinCloud, ou emprunté) :

```bash
npm install @capacitor/ios
npx cap add ios
npx cap sync ios
npx cap open ios
```

### Notifications push

Voir `SUPABASE_SETUP.md`, section 6, pour la mise en place complète (Firebase
Cloud Messaging côté Android + Edge Function `supabase/functions/push-notify`
déjà fournie dans ce zip).

## 5. Structure du projet

```
src/
  data/categories.js       -> catégories de biens + champs spécifiques du formulaire dynamique
  data/plans.js              -> abonnements, boosts, quotas, coordonnées de paiement
  lib/supabase.js               -> connexion au projet Supabase + helpers URLs de fichiers
  lib/listings.js               -> CRUD annonces, favoris, messagerie, demandes
  lib/admin.js                    -> actions réservées à l'admin (validation, modération)
  contexts/AuthContext.jsx         -> session utilisateur (Supabase Auth + table profiles)
  pages/                              -> une page par écran (Publier, Annonces, Admin, etc.)
supabase/
  migrations/0001_init.sql             -> schéma complet (tables, RLS, storage, RPC)
  functions/push-notify/                 -> Edge Function pour les notifications push
SUPABASE_SETUP.md                          -> guide de mise en place détaillé
```

## 6. Ce qui reste à personnaliser

- Le vrai numéro Mobile Money dans `src/data/plans.js`
- L'URL/clé Supabase dans `.env`
- Le logo / nom si tu ne gardes pas "MonDjassa"
- Notifications par email/SMS quand une demande est validée (Supabase propose
  des Edge Functions pour ça, non incluses ici au-delà des push)

## 7. Déploiement

Voir `SUPABASE_SETUP.md`, section 7. En résumé : Supabase héberge la base de
données/auth/stockage, Render héberge uniquement le site statique buildé
(`npm run build` → dossier `dist/`) — aucun service à garder en vie en
permanence, contrairement à l'ancienne configuration PocketBase + push-relay.
