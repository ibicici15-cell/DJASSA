# Mise en place Supabase (remplace PocketBase)

Ce projet utilise maintenant [Supabase](https://supabase.com) comme backend
(base de données Postgres + authentification + stockage de fichiers + Edge
Functions), à la place de PocketBase. Tout le comportement de l'app reste
identique côté utilisateur.

## 1. Créer le projet Supabase

1. Crée un compte sur [supabase.com](https://supabase.com) (le plan gratuit
   suffit largement pour démarrer).
2. Crée un nouveau projet. Note bien le mot de passe de la base — tu n'en
   auras pas besoin pour l'app, mais garde-le de côté.
3. Une fois le projet prêt, va dans **Project Settings → API** et récupère :
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

## 2. Exécuter le schéma SQL

Dans le tableau de bord Supabase → **SQL Editor** → nouvelle requête → colle
tout le contenu de `supabase/migrations/0001_init.sql` → **Run**.

Ce script crée :
- les 8 tables (`profiles`, `listings`, `favorites`, `subscriptionRequests`,
  `boostRequests`, `conversations`, `messages`, `reviews`) avec leurs policies
  de sécurité (Row Level Security) — équivalent des "API Rules" PocketBase ;
- les 2 buckets de stockage (`listings-photos`, `avatars`) avec leurs policies ;
- le trigger qui crée automatiquement une ligne `profiles` à l'inscription ;
- les fonctions `get_email_for_phone` (connexion par téléphone) et
  `admin_delete_user` (suppression de compte côté admin).

Si tu préfères la CLI Supabase : `supabase link` puis `supabase db push`.

## 3. Configurer l'authentification

**Settings → Authentication → Providers → Email :**
- Pour retrouver le comportement PocketBase (connecté immédiatement après
  l'inscription, sans email à confirmer), désactive **"Confirm email"**.
  Si tu la laisses activée, l'utilisateur devra cliquer un lien de
  confirmation avant sa première connexion (Signup.jsx affichera alors le
  message "Vérifiez votre email").

**Settings → Authentication → URL Configuration :**
- Ajoute l'URL de ton app (ex: `https://ton-site.onrender.com` et
  `http://localhost:5173` pour le dev) dans **Redirect URLs**, pour que le
  lien de réinitialisation de mot de passe fonctionne (page
  `/reinitialiser-mot-de-passe`).

## 4. Créer le premier compte superadmin

Inscris-toi normalement depuis l'app, puis dans **Table Editor → profiles**,
modifie la ligne correspondante : passe `role` à `superadmin`. C'est ce compte
qui pourra ensuite promouvoir d'autres comptes en `admin` depuis le panneau
`/admin` de l'app.

## 5. Variables d'environnement du frontend

Copie `.env.example` en `.env` et renseigne les deux valeurs récupérées à
l'étape 1 :

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Sur Render, renseigne les mêmes variables dans les "Environment Variables" du
service (Static Site).

## 6. Notifications push (Edge Function + Database Webhooks)

Remplace à la fois `pb_hooks/` et l'ancien service `push-relay/` — plus besoin
de faire tourner un service Node séparé, tout est géré par Supabase.

### a. Déployer la fonction

```bash
npm install -g supabase
supabase login
supabase link --project-ref TON_PROJECT_REF
supabase functions deploy push-notify
```

### b. Configurer le secret Firebase

1. Firebase Console → ⚙️ Paramètres du projet → **Comptes de service** →
   "Générer une nouvelle clé privée" → télécharge le JSON.
2. Définis-le comme secret (colle le contenu du fichier JSON tel quel) :
   ```bash
   supabase secrets set FCM_SERVICE_ACCOUNT='{"type":"service_account",...}'
   ```

### c. Créer les 3 Database Webhooks

Dans le tableau de bord Supabase → **Database → Webhooks → Create a new hook**,
crée-en 3, tous pointant vers l'URL de la fonction déployée
(`https://TON_PROJECT_REF.supabase.co/functions/v1/push-notify`), méthode
POST, en-tête `Authorization: Bearer TA_SERVICE_ROLE_KEY` :

| Nom             | Table                   | Événements |
|-----------------|-------------------------|------------|
| push-messages   | `messages`               | Insert     |
| push-sub        | `subscriptionRequests`   | Update     |
| push-boost      | `boostRequests`          | Update     |

### d. Côté Android (inchangé)

Ajoute toujours `google-services.json` (Firebase Console → Paramètres du
projet → Général → tes apps → Android) dans `android/app/google-services.json`.

## 7. Déploiement sur Render

Contrairement à PocketBase, Supabase héberge lui-même la base de données,
l'authentification et le stockage — Render n'a donc plus qu'à servir le site
statique buildé par Vite :

1. Nouveau **Static Site** sur Render, connecté à ton dépôt Git.
2. Build command : `npm install && npm run build`
3. Publish directory : `dist`
4. Ajoute les variables d'environnement `VITE_SUPABASE_URL` et
   `VITE_SUPABASE_ANON_KEY` (étape 5 ci-dessus).
5. Un Static Site Render est gratuit et ne nécessite aucun service Node à
   garder en vie (contrairement à PocketBase + push-relay, qui devaient
   tourner en permanence).

## Différences à connaître par rapport à PocketBase

- **Vignettes photo** : PocketBase générait des miniatures à la volée
  (`?thumb=200x0`). Le plan gratuit Supabase ne le fait pas ; les images
  affichées sont donc en taille réelle (déjà compressées côté client avant
  l'envoi, voir `src/lib/imageCompression.js`, donc l'impact reste léger).
- **Suppression de compte** : passe désormais par la fonction RPC
  `admin_delete_user` (Supabase sépare l'authentification des autres
  données, contrairement à PocketBase où la collection `users` faisait les deux).
- **Lecture des profils** : la table `profiles` est en lecture publique
  (comme l'était la règle "View" de PocketBase) — nom et téléphone d'un
  vendeur restent visibles par tous sur sa page publique, c'est voulu.
