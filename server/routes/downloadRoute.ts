import { Router } from 'express';
import { authenticateSupabase } from '../middleware/authMiddleware';
import {
  getUserById,
  resetQuotaIfNeeded,
  incrementDownloadQuota,
  logDownload,
  markInvoiceAsDownloaded,
  supabaseServer,
} from '../lib/supabaseServerClient';

const router = Router();

/**
 * POST /api/invoices/:id/download
 * Télécharger le fichier UBL d'une facture avec gestion des quotas
 */
router.post('/invoices/:id/download', authenticateSupabase, async (req, res) => {
  try {
    // ─────────────────────────────────────────────────────────
    // 0. VÉRIFIER QUE SUPABASE EST CONFIGURÉ
    // ─────────────────────────────────────────────────────────
    if (!supabaseServer) {
      return res.status(503).json({
        error: 'service_unavailable',
        message: 'Supabase n\'est pas configuré. Voir SUPABASE_SETUP.md',
      });
    }

    const invoiceId = req.params.id;
    const userId = req.user!.id;

    // ─────────────────────────────────────────────────────────
    // 1. RESET AUTOMATIQUE DES QUOTAS SI NÉCESSAIRE
    // ─────────────────────────────────────────────────────────
    const user = await resetQuotaIfNeeded(userId);

    // ─────────────────────────────────────────────────────────
    // 2. VÉRIFICATION QUOTA
    // ─────────────────────────────────────────────────────────
    const hasUnlimited = user.downloads_quota === -1;
    const hasQuota = user.downloads_used_this_month < user.downloads_quota;

    if (!hasUnlimited && !hasQuota) {
      return res.status(403).json({
        error: 'quota_exceeded',
        message: 'Limite de téléchargements atteinte pour ce mois',
        current_plan: user.subscription_plan,
        downloads_used: user.downloads_used_this_month,
        downloads_quota: user.downloads_quota,
        quota_reset_date: user.quota_reset_date,
        upgrade_url: '/pricing',
      });
    }

    // ─────────────────────────────────────────────────────────
    // 3. RÉCUPÉRATION FACTURE
    // ─────────────────────────────────────────────────────────
    const { data: invoice, error: invoiceError } = await supabaseServer
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', userId)
      .single();

    if (invoiceError || !invoice) {
      return res.status(404).json({
        error: 'invoice_not_found',
        message: 'Facture introuvable',
      });
    }

    // Vérifier que la facture est prête et a un fichier UBL
    if (invoice.status !== 'ready' || !invoice.ubl_file_url) {
      return res.status(400).json({
        error: 'invoice_not_ready',
        message: 'Le fichier UBL n\'est pas encore disponible pour cette facture',
        status: invoice.status,
      });
    }

    // ─────────────────────────────────────────────────────────
    // 4. GÉNÉRATION URL SIGNÉE (Supabase Storage)
    // ─────────────────────────────────────────────────────────
    const { data: signedUrlData, error: signedUrlError } = await supabaseServer
      .storage
      .from('invoices-processed')
      .createSignedUrl(invoice.ubl_file_url, 3600); // Valide 1h

    if (signedUrlError || !signedUrlData) {
      console.error('Erreur génération URL signée:', signedUrlError);
      return res.status(500).json({
        error: 'download_url_failed',
        message: 'Impossible de générer le lien de téléchargement',
      });
    }

    // ─────────────────────────────────────────────────────────
    // 5. INCRÉMENTATION QUOTA (si pas illimité)
    // ─────────────────────────────────────────────────────────
    if (!hasUnlimited) {
      await incrementDownloadQuota(userId);
    }

    // ─────────────────────────────────────────────────────────
    // 6. LOG DU TÉLÉCHARGEMENT
    // ─────────────────────────────────────────────────────────
    await logDownload(userId, invoiceId, user.subscription_plan);

    // ─────────────────────────────────────────────────────────
    // 7. MARQUER FACTURE COMME TÉLÉCHARGÉE
    // ─────────────────────────────────────────────────────────
    await markInvoiceAsDownloaded(invoiceId);

    // ─────────────────────────────────────────────────────────
    // 8. RÉPONSE
    // ─────────────────────────────────────────────────────────
    const downloadsRemaining = hasUnlimited
      ? 'unlimited'
      : user.downloads_quota - (user.downloads_used_this_month + 1);

    return res.status(200).json({
      success: true,
      download_url: signedUrlData.signedUrl,
      downloads_remaining: downloadsRemaining,
      quota_reset_date: user.quota_reset_date,
    });
  } catch (error) {
    console.error('Erreur endpoint download:', error);
    return res.status(500).json({
      error: 'internal_server_error',
      message: 'Une erreur est survenue lors du téléchargement',
    });
  }
});

export default router;
