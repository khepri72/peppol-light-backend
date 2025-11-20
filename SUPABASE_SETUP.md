# 🚀 Configuration Supabase pour Peppol Light

Ce document explique comment configurer Supabase pour activer l'authentification Google OAuth, les quotas de téléchargement, et la coexistence avec Airtable.

## 📋 Prérequis

- Compte Supabase (gratuit sur https://supabase.com)
- Projet Supabase créé
- Accès à la console Google Cloud Platform

---

## 1️⃣ Créer les Tables Supabase

1. Aller dans **SQL Editor** du dashboard Supabase
2. Copier-coller le contenu du fichier `server/migrations/001_create_supabase_tables.sql`
3. Exécuter le script SQL
4. Vérifier que 3 tables sont créées :
   - `public.users`
   - `public.invoices`
   - `public.downloads_log`

---

## 2️⃣ Configurer Google OAuth

### A. Dans Google Cloud Console

1. Aller sur https://console.cloud.google.com
2. Créer un nouveau projet (ex: `peppol-light-prod`)
3. Activer l'API **Google+ API**
4. Aller dans **Identifiants** > **Créer des identifiants** > **ID client OAuth 2.0**
5. Configurer l'écran de consentement OAuth :
   - Type : Application externe
   - Nom : `Peppol Light`
   - Email de contact : votre email
   - Logo : votre logo (optionnel)
6. Créer les identifiants OAuth :
   - Type : Application Web
   - Nom : `Peppol Light Web`
   - URI de redirection autorisés : 
     ```
     https://[VOTRE_PROJECT_REF].supabase.co/auth/v1/callback
     ```
   - Exemple : `https://xyzabc123.supabase.co/auth/v1/callback`
7. Copier :
   - **Client ID**
   - **Client Secret**

### B. Dans Supabase Dashboard

1. Aller dans **Authentication** > **Providers**
2. Activer **Google**
3. Coller :
   - **Client ID** (de Google Cloud)
   - **Client Secret** (de Google Cloud)
4. Copier l'**Redirect URL** affichée
5. Retourner dans Google Cloud Console et ajouter cette URL dans les URIs de redirection

---

## 3️⃣ Créer les Buckets Storage

1. Aller dans **Storage** du dashboard Supabase
2. Créer 2 buckets :

### Bucket `invoices-uploaded` (fichiers uploadés par utilisateurs)
   - Public : **Non**
   - RLS : **Activé**
   - Policies :
     ```sql
     -- Utilisateur peut lire ses propres fichiers
     CREATE POLICY "Users can read own uploads" ON storage.objects
       FOR SELECT USING (bucket_id = 'invoices-uploaded' AND auth.uid()::text = (storage.foldername(name))[1]);
     
     -- Utilisateur peut uploader ses fichiers
     CREATE POLICY "Users can upload own files" ON storage.objects
       FOR INSERT WITH CHECK (bucket_id = 'invoices-uploaded' AND auth.uid()::text = (storage.foldername(name))[1]);
     ```

### Bucket `invoices-processed` (fichiers UBL générés)
   - Public : **Non**
   - RLS : **Activé**
   - Policies :
     ```sql
     -- Utilisateur peut lire ses fichiers UBL
     CREATE POLICY "Users can read own processed files" ON storage.objects
       FOR SELECT USING (bucket_id = 'invoices-processed' AND auth.uid()::text = (storage.foldername(name))[1]);
     
     -- Backend peut créer des fichiers UBL
     CREATE POLICY "Service role can create processed files" ON storage.objects
       FOR INSERT WITH CHECK (bucket_id = 'invoices-processed');
     ```

---

## 4️⃣ Configurer les Variables d'Environnement

### A. Dans Replit Secrets

Ajouter ces 4 variables dans **Secrets** (🔒 icône) :

```env
# Supabase Frontend (VITE_*)
VITE_SUPABASE_URL=https://[VOTRE_PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=[VOTRE_ANON_KEY]

# Supabase Backend
SUPABASE_URL=https://[VOTRE_PROJECT_REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[VOTRE_SERVICE_ROLE_KEY]

# Stripe (optionnel pour l'instant)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### B. Où trouver ces valeurs ?

Dans Supabase Dashboard :
1. **Project Settings** > **API**
2. Copier :
   - `Project URL` → `VITE_SUPABASE_URL` et `SUPABASE_URL`
   - `anon public` → `VITE_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **SECRET - Ne jamais exposer côté frontend !**

---

## 5️⃣ Activer le Cron Job (Reset Quotas Mensuels)

1. Aller dans **Database** > **Functions**
2. Créer une nouvelle fonction :
   ```sql
   SELECT cron.schedule(
     'reset-monthly-quotas',
     '0 0 1 * *',  -- Tous les 1er du mois à minuit
     $$
     SELECT public.reset_monthly_quotas();
     $$
   );
   ```

Ou utiliser **Edge Functions** avec un cron job pour appeler la fonction de reset.

---

## 6️⃣ Tester l'Authentification

1. Démarrer l'app : `npm run dev`
2. Aller sur `/login-google`
3. Cliquer sur **Continuer avec Google**
4. Autoriser l'app
5. Vérifier dans Supabase Dashboard > **Authentication** > **Users** :
   - Un nouvel utilisateur est créé
6. Vérifier dans **Table Editor** > **users** :
   - Une ligne est automatiquement créée avec `subscription_plan = 'free'`

---

## 7️⃣ Architecture Finale : Supabase + Airtable

### Supabase (Données transactionnelles)
- **users** : Authentification, quotas, abonnements
- **invoices** : Factures uploadées, fichiers UBL générés, statuts
- **downloads_log** : Tracking des téléchargements

### Airtable (CRM & Analytics)
- **Users** : Vue business (MRR, churn, etc.)
- **Invoices** : Dashboard Khepri
- **Leads** : Prospects landing page
- **Comptables_Partenaires** : Commissions

### Synchronisation (n8n - à venir)
```
Supabase → Webhook → n8n → Airtable
```

---

## 🔧 Dépannage

### Erreur "Invalid redirect URL"
- Vérifier que l'URL de redirection dans Google Cloud Console correspond exactement à celle de Supabase

### Erreur "User not found in public.users"
- Vérifier que le trigger `on_auth_user_created` est activé
- Vérifier les logs dans **Database** > **Logs**

### Erreur "Storage bucket not found"
- Vérifier que les buckets `invoices-uploaded` et `invoices-processed` sont créés
- Vérifier les RLS policies

### Quota ne se reset pas
- Vérifier que le cron job est configuré
- Ou appeler manuellement : `SELECT public.reset_monthly_quotas();`

---

## 📚 Ressources

- [Documentation Supabase Auth](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
