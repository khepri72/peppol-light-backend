-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION SUPABASE : Tables users, invoices, downloads_log
-- ═══════════════════════════════════════════════════════════════════
-- À exécuter dans le SQL Editor de Supabase Dashboard

-- ───────────────────────────────────────────────────────────────────
-- 1. TABLE USERS (Supabase Auth + infos transactionnelles)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'starter', 'pro')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  downloads_used_this_month INTEGER DEFAULT 0 CHECK (downloads_used_this_month >= 0),
  downloads_quota INTEGER DEFAULT 1, -- 1 pour free, 10 pour starter, -1 pour pro (illimité)
  quota_reset_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription_plan ON public.users(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_users_quota_reset ON public.users(quota_reset_date);

-- Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy : utilisateur peut lire uniquement SA ligne
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy : utilisateur peut modifier uniquement SA ligne
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy : créer son profil lors du premier login (via trigger ou fonction)
CREATE POLICY "Users can insert own data" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ───────────────────────────────────────────────────────────────────
-- 2. TABLE INVOICES (factures uploadées + analysées)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pdf_url TEXT NOT NULL,
  ubl_file_url TEXT, -- URL du fichier UBL généré (dans Supabase Storage)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzed', 'ready', 'error')),
  score INTEGER CHECK (score >= 0 AND score <= 100),
  extracted_data JSONB, -- Données extraites du PDF/Excel
  errors JSONB, -- Liste des erreurs de conformité Peppol
  downloaded BOOLEAN DEFAULT FALSE,
  downloaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Policy : utilisateur peut lire uniquement SES factures
CREATE POLICY "Users can read own invoices" ON public.invoices
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy : utilisateur peut insérer SES factures
CREATE POLICY "Users can insert own invoices" ON public.invoices
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy : utilisateur peut modifier SES factures
CREATE POLICY "Users can update own invoices" ON public.invoices
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy : utilisateur peut supprimer SES factures
CREATE POLICY "Users can delete own invoices" ON public.invoices
  FOR DELETE
  USING (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────────────
-- 3. TABLE DOWNLOADS_LOG (tracking téléchargements UBL)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.downloads_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  plan_at_download TEXT NOT NULL, -- Plan actif au moment du téléchargement
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour analytics
CREATE INDEX IF NOT EXISTS idx_downloads_log_user_id ON public.downloads_log(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_log_invoice_id ON public.downloads_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_downloads_log_downloaded_at ON public.downloads_log(downloaded_at DESC);

-- Row Level Security (RLS)
ALTER TABLE public.downloads_log ENABLE ROW LEVEL SECURITY;

-- Policy : utilisateur peut lire uniquement SON historique
CREATE POLICY "Users can read own download logs" ON public.downloads_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────────────
-- 4. FONCTION : Créer automatiquement un user dans public.users
--    après inscription via Supabase Auth
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Trigger : exécuter la fonction après chaque nouveau user dans auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ───────────────────────────────────────────────────────────────────
-- 5. FONCTION : Reset automatique des quotas mensuels
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reset_monthly_quotas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reset uniquement les users dont la date de reset est dépassée
  UPDATE public.users
  SET 
    downloads_used_this_month = 0,
    quota_reset_date = NOW() + INTERVAL '1 month'
  WHERE quota_reset_date < NOW();
END;
$$;

-- Note : Cette fonction peut être appelée via un cron job Supabase
-- ou dans le code backend avant chaque téléchargement

-- ═══════════════════════════════════════════════════════════════════
-- FIN DE LA MIGRATION
-- ═══════════════════════════════════════════════════════════════════

-- CONFIGURATION REQUISE DANS SUPABASE DASHBOARD :
-- 
-- 1. Authentication > Providers > Google OAuth
--    - Activer Google OAuth
--    - Configurer Client ID et Client Secret
--
-- 2. Storage > Buckets
--    - Créer bucket "invoices-uploaded" (private)
--    - Créer bucket "invoices-processed" (private)
--    - RLS policies pour accès utilisateur
--
-- 3. Edge Functions (optionnel)
--    - Cron job quotidien pour reset_monthly_quotas()
