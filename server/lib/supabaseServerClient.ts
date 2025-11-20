import { createClient } from '@supabase/supabase-js';

// Variables d'environnement Supabase côté serveur
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('⚠️ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY non configurés');
  console.warn('📖 Voir SUPABASE_SETUP.md pour configurer Supabase');
}

// Client Supabase pour le backend (avec service_role key pour bypass RLS)
// Si non configuré, créer un client factice pour éviter les crashes
export const supabaseServer = (supabaseUrl && supabaseServiceRoleKey)
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Helper : récupérer un utilisateur par ID
export async function getUserById(userId: string) {
  if (!supabaseServer) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabaseServer
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(`User not found: ${error.message}`);
  }

  return data;
}

// Helper : incrémenter le quota de téléchargement
export async function incrementDownloadQuota(userId: string) {
  if (!supabaseServer) {
    throw new Error('Supabase not configured');
  }

  // Récupérer la valeur actuelle
  const user = await getUserById(userId);
  
  const { error } = await supabaseServer
    .from('users')
    .update({
      downloads_used_this_month: user.downloads_used_this_month + 1,
    })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to increment quota: ${error.message}`);
  }
}

// Helper : reset des quotas mensuels (appelé avant vérification)
export async function resetQuotaIfNeeded(userId: string) {
  if (!supabaseServer) {
    throw new Error('Supabase not configured');
  }

  const user = await getUserById(userId);
  const now = new Date();
  const quotaResetDate = new Date(user.quota_reset_date);

  // Si la date de reset est dépassée
  if (now > quotaResetDate) {
    const nextResetDate = new Date(now);
    nextResetDate.setMonth(nextResetDate.getMonth() + 1);

    const { error } = await supabaseServer
      .from('users')
      .update({
        downloads_used_this_month: 0,
        quota_reset_date: nextResetDate.toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to reset quota: ${error.message}`);
    }

    // Retourner l'utilisateur mis à jour
    return await getUserById(userId);
  }

  return user;
}

// Helper : logger un téléchargement
export async function logDownload(userId: string, invoiceId: string, plan: string) {
  if (!supabaseServer) {
    throw new Error('Supabase not configured');
  }

  const { error } = await supabaseServer
    .from('downloads_log')
    .insert({
      user_id: userId,
      invoice_id: invoiceId,
      plan_at_download: plan,
    });

  if (error) {
    throw new Error(`Failed to log download: ${error.message}`);
  }
}

// Helper : marquer une facture comme téléchargée
export async function markInvoiceAsDownloaded(invoiceId: string) {
  if (!supabaseServer) {
    throw new Error('Supabase not configured');
  }

  const { error } = await supabaseServer
    .from('invoices')
    .update({
      downloaded: true,
      downloaded_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);

  if (error) {
    throw new Error(`Failed to mark invoice as downloaded: ${error.message}`);
  }
}
