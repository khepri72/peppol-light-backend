import { Response, NextFunction } from 'express';
import { PLANS, PlanId } from '../config/plans';
import { base, TABLES } from '../config/airtable';
import { AuthRequest } from './auth';

/**
 * Get the first day of the current month in UTC
 */
function getFirstDayOfMonthUTC(): Date {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
}

/**
 * Count invoices created by user since the start of the current month (UTC)
 * Uses actual count from Airtable invoices table
 */
async function countInvoicesThisMonth(userId: string): Promise<number> {
  const firstDayOfMonth = getFirstDayOfMonthUTC();

  // Get all invoices (we need to filter by user and date in code)
  // Note: Airtable linked record fields return arrays, so we filter in code
  const records = await base(TABLES.INVOICES)
    .select({
      // No filter here - we'll filter by user and date in code
    })
    .all();

  // Filter records where:
  // 1. User array includes the current userId
  // 2. Created At is >= first day of current month
  const userInvoices = records.filter(record => {
    const userIds = record.fields['User'] as string[] | undefined;
    if (!userIds || !userIds.includes(userId)) {
      return false;
    }

    // Get created time from various possible sources
    const createdAt = (record as any)._rawJson?.createdTime ||
                      (record as any).createdTime ||
                      (record.fields['Created At'] as string);

    if (!createdAt) {
      // If no createdAt, exclude it from count (shouldn't happen with Created Time field)
      return false;
    }

    // Parse the date and compare
    const createdDate = new Date(createdAt);
    return createdDate >= firstDayOfMonth;
  });

  return userInvoices.length;
}

/**
 * Middleware to enforce monthly invoice quota by plan
 * Checks the actual count of invoices in the current month from Airtable
 */
export async function checkQuota(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Utilisateur non authentifié' });
    }

    const userId = req.userId;

    // Récupérer l'utilisateur dans Airtable
    let userRecord;
    try {
      userRecord = await base(TABLES.USERS).find(userId);
    } catch (error) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    // Champs Airtable RÉELS
    const userPlan = (userRecord.fields.userPlan as PlanId) || 'free';
    const maxInvoicesPerMonth = userRecord.fields.maxInvoicesPerMonth as number | undefined;

    // Récupérer la config du plan
    const planConfig = PLANS[userPlan];

    // Si plan non trouvé, utiliser free par défaut
    if (!planConfig) {
      console.warn(`[QUOTA] Plan inconnu: ${userPlan}, utilisation du plan free`);
      const freePlan = PLANS.free;
      const limit = maxInvoicesPerMonth ?? freePlan.maxInvoicesPerMonth;
      
      // Compter les factures du mois courant
      const used = await countInvoicesThisMonth(userId);
      
      if (limit !== null && used >= limit) {
        console.log(`[QUOTA] Blocked: userId=${userId}, used=${used}, limit=${limit}, plan=${userPlan}`);
        return res.status(403).json({
          error: 'Quota exceeded',
          code: 'QUOTA_EXCEEDED',
          limit: limit,
          used: used,
          plan: userPlan
        });
      }
      
      console.log(`[QUOTA] OK: userId=${userId}, used=${used}, limit=${limit}, plan=${userPlan}`);
      return next();
    }

    // Déterminer le quota: utiliser maxInvoicesPerMonth d'Airtable si défini, sinon celui du plan
    const effectiveLimit = maxInvoicesPerMonth ?? planConfig.maxInvoicesPerMonth;

    // Si illimité (Business ou override null)
    if (effectiveLimit === null) {
      console.log(`[QUOTA] Unlimited: userId=${userId}, plan=${userPlan}`);
      return next();
    }

    // Compter les factures du mois courant depuis Airtable
    const used = await countInvoicesThisMonth(userId);

    // Vérification du quota
    if (used >= effectiveLimit) {
      console.log(`[QUOTA] Blocked: userId=${userId}, used=${used}, limit=${effectiveLimit}, plan=${userPlan}`);
      return res.status(403).json({
        error: 'Quota exceeded',
        code: 'QUOTA_EXCEEDED',
        limit: effectiveLimit,
        used: used,
        plan: userPlan
      });
    }

    console.log(`[QUOTA] OK: userId=${userId}, used=${used}, limit=${effectiveLimit}, plan=${userPlan}`);
    next();
  } catch (error) {
    console.error('[QUOTA] Erreur quota :', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}
