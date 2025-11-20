# 📖 Guide d'utilisation - Peppol Light v2.1

Ce guide explique le flux complet de l'application avec le système de quotas et Google OAuth.

---

## 🚀 Flux Utilisateur Complet

### 1. Inscription / Connexion

#### Option A : Connexion Google OAuth (RECOMMANDÉ)
1. Visiter `/login-google`
2. Cliquer sur **"Continuer avec Google"**
3. Autoriser l'application
4. → Redirection automatique vers `/dashboard`

**Résultat backend :**
- Supabase Auth crée l'utilisateur
- Trigger PostgreSQL crée automatiquement une ligne dans `public.users` :
  ```sql
  subscription_plan = 'free'
  downloads_quota = 1
  downloads_used_this_month = 0
  quota_reset_date = DATE + 1 mois
  ```

#### Option B : Connexion Email/Mot de passe (Legacy)
1. Visiter `/login`
2. Entrer email + mot de passe
3. → JWT stocké dans localStorage
4. → Redirection vers `/dashboard`

---

### 2. Dashboard : Upload et Analyse

1. **Upload facture** (PDF ou Excel)
   - Cliquer sur le bouton **"Uploader une facture"**
   - Sélectionner un fichier PDF ou Excel
   - → Frontend appelle `POST /api/upload/pdf`
   - → Fichier sauvegardé dans `server/uploads/`

2. **Analyse Peppol automatique**
   - → Frontend appelle `POST /api/invoices/analyze` avec le fichier
   - → Backend extrait les données (pdf-parse ou xlsx)
   - → Moteur Peppol valide 6 règles critiques :
     - Règle 1 : Numéro de facture présent
     - Règle 2 : Date d'émission valide
     - Règle 3 : Montant total cohérent
     - Règle 4 : Données fournisseur complètes
     - Règle 5 : Données client complètes
     - Règle 6 : TVA cohérente
   - → Score de conformité calculé (0-100%)
   - → Fichier UBL XML généré
   - → Enregistré dans `server/ubl-outputs/`

3. **Résultats affichés**
   - Tableau avec toutes les factures
   - Score de conformité (couleur selon score)
   - Bouton **"Télécharger UBL"** si score OK

---

### 3. Téléchargement UBL avec Quotas

#### A. Utilisateur FREE (1 téléchargement/mois)

1. Cliquer sur **"Télécharger UBL"** sur une facture prête
2. → Frontend appelle `POST /api/invoices/:id/download`
3. → Backend vérifie :
   - ✅ Quota reset si date dépassée
   - ✅ Quota disponible (1 - 0 = 1 restant)
   - ✅ Facture existe et status = 'ready'
   - ✅ Génère URL signée Supabase Storage (valide 1h)
4. → Backend incrémente `downloads_used_this_month` (0 → 1)
5. → Backend log dans `downloads_log`
6. → Frontend télécharge le fichier UBL
7. → **Quota épuisé** : 0/1 restant

**Prochain téléchargement :**
- Si même mois → ❌ Erreur 403 `quota_exceeded`
- Si mois suivant → ✅ Auto-reset à 1 disponible

#### B. Upgrade vers STARTER (10 téléchargements/mois)

1. Dans le header, voir **"0/1 téléchargements restants"** en rouge
2. Cliquer sur le bouton **"Passer à PRO"**
3. → Redirection vers `/pricing`
4. Choisir le plan **STARTER (29€/mois)**
5. → Frontend appelle `POST /api/billing/create-checkout-session`
6. → Backend crée session Stripe Checkout
7. → Redirection vers Stripe
8. → Paiement
9. → Webhook Stripe → Backend met à jour :
   ```sql
   subscription_plan = 'starter'
   downloads_quota = 10
   downloads_used_this_month = 0 (reset)
   ```
10. → Retour dashboard avec **10 téléchargements disponibles**

#### C. Upgrade vers PRO (Illimité)

- Même flux que STARTER
- Plan : **PRO (99€/mois)**
- Résultat :
  ```sql
  subscription_plan = 'pro'
  downloads_quota = -1  (illimité)
  ```
- Badge **"Téléchargements illimités"** affiché

---

### 4. Suivi des Quotas (QuotaDisplay)

Le composant `<QuotaDisplay />` dans le header affiche :

**FREE (1/mois) :**
```
┌─────────────────────────────────┐
│ 📥  1/1 téléchargements restants│
│     ce mois-ci                  │
│ ████████████████████ 100%       │
└─────────────────────────────────┘
```

**STARTER (10/mois, 7 utilisés) :**
```
┌─────────────────────────────────┐
│ 📥  3/10 téléchargements restants│
│     ce mois-ci                   │
│ ██████████████░░░░░░ 70%        │
└─────────────────────────────────┘
```

**PRO (Illimité) :**
```
┌─────────────────────────────────┐
│ ∞  Téléchargements illimités    │
└─────────────────────────────────┘
```

---

## 🔄 Reset Automatique des Quotas

### Option 1 : Cron Job Supabase
```sql
-- S'exécute le 1er de chaque mois à minuit
SELECT cron.schedule(
  'reset-monthly-quotas',
  '0 0 1 * *',
  $$ SELECT public.reset_monthly_quotas(); $$
);
```

### Option 2 : Reset à la demande (dans le code)
```typescript
// server/lib/supabaseServerClient.ts
export async function resetQuotaIfNeeded(userId: string) {
  const user = await getUserById(userId);
  const now = new Date();
  
  if (now > new Date(user.quota_reset_date)) {
    // Reset automatique
    await supabaseServer
      .from('users')
      .update({
        downloads_used_this_month: 0,
        quota_reset_date: new Date(now.setMonth(now.getMonth() + 1))
      })
      .eq('id', userId);
  }
}
```

---

## 📊 Analytics et Tracking

### Logs des téléchargements (`downloads_log`)

Chaque téléchargement enregistre :
```sql
{
  id: uuid,
  user_id: uuid,
  invoice_id: uuid,
  plan_at_download: 'free' | 'starter' | 'pro',
  downloaded_at: timestamp
}
```

**Cas d'usage :**
- Calculer le taux de conversion FREE → STARTER
- Identifier les power users (beaucoup de downloads)
- Détecter les abus (même facture téléchargée 10 fois)

---

## 🛡️ Sécurité

### 1. Row Level Security (RLS) Supabase

**Table `users` :**
```sql
-- Utilisateur peut lire son propre profil
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Utilisateur peut mettre à jour son profil
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);
```

**Table `invoices` :**
```sql
-- Utilisateur peut voir ses factures
CREATE POLICY "Users can view own invoices" ON invoices
  FOR SELECT USING (auth.uid() = user_id);

-- Utilisateur peut créer ses factures
CREATE POLICY "Users can create own invoices" ON invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

**Storage Buckets :**
```sql
-- Bucket invoices-uploaded : lecture/écriture par utilisateur
-- Bucket invoices-processed : lecture seule (fichiers UBL)
```

### 2. Authentification JWT

**Frontend :**
```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// Envoyer dans headers
headers: {
  'Authorization': `Bearer ${token}`
}
```

**Backend (SÉCURISÉ) :**
```typescript
// Middleware authenticateSupabase vérifie le token via Supabase Auth API
// Cela garantit que la signature JWT est valide et non forgée
const { data: { user }, error } = await supabaseServer.auth.getUser(token);

if (error || !user) {
  return res.status(401).json({ error: 'invalid_token' });
}

req.user = { id: user.id, email: user.email };
```

**Sécurité :**
- ✅ Vérification de signature JWT avec clé publique Supabase
- ✅ Protection contre les tokens forgés (attaque par JWT décodé)
- ✅ Vérification de l'expiration du token
- ✅ Guards pour services non configurés (503 Service Unavailable)

---

## 🔧 Configuration Requise

### Variables d'environnement

```env
# Supabase (Frontend)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...

# Supabase (Backend)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Stripe (Production)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Airtable (Legacy - coexiste)
AIRTABLE_API_KEY=key...
AIRTABLE_BASE_ID=app...
```

---

## 📈 Roadmap

### Phase 1 : MVP (ACTUEL)
- ✅ Google OAuth
- ✅ Quotas téléchargement
- ✅ 3 plans (FREE/STARTER/PRO)
- 🚧 Stripe Checkout (stubs créés)

### Phase 2 : Stripe Production
- Créer les produits dans Stripe Dashboard
- Implémenter `/api/billing/create-checkout-session`
- Gérer les webhooks Stripe
- Tester les upgrades/downgrades

### Phase 3 : Synchronisation Airtable
- n8n workflow : Supabase → Airtable
- Trigger sur `users` INSERT → Airtable CRM
- Trigger sur `invoices` INSERT → Airtable Analytics

### Phase 4 : Analytics Avancés
- Dashboard admin : MRR, churn, LTV
- Notifications Slack : nouveau signup PRO
- Export CSV des factures

---

## 🐛 Debug & Logs

### Logs Backend
```bash
# Voir les logs du serveur
tail -f /tmp/logs/start_application_*.log
```

### Logs Supabase
1. Dashboard Supabase > **Database** > **Logs**
2. Filtrer par :
   - `auth.users` : logs d'authentification
   - `public.users` : logs trigger création utilisateur

### Tester manuellement un reset de quota
```sql
-- Dans Supabase SQL Editor
SELECT public.reset_monthly_quotas();
```

---

## 💬 Support

- Email : contact@peppollight.be
- Documentation : `/SUPABASE_SETUP.md`
- Statut : https://status.supabase.com
