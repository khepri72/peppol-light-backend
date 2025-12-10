import { Response, NextFunction } from 'express';
import { PLANS, PlanId } from '../config/plans';
import { base, TABLES } from '../config/airtable';
import { AuthRequest } from './auth';

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
    const invoicesThisMonth = (userRecord.fields.invoicesThisMonth as number) || 0;
    const maxInvoicesOverride = userRecord.fields.maxInvoicesPerMonth as number | undefined;

    // Récupérer la config du plan
    const planConfig = PLANS[userPlan];

    // Si plan non trouvé, utiliser free par défaut
    if (!planConfig) {
      console.warn(`Plan inconnu: ${userPlan}, utilisation du plan free`);
      const freePlan = PLANS.free;
      const limit = maxInvoicesOverride ?? freePlan.maxInvoicesPerMonth;
      
      if (invoicesThisMonth >= limit) {
        return res.status(403).json({
          error: 'Quota atteint',
          message: `Vous avez atteint la limite de ${limit} factures pour le plan Gratuit.`,
          used: invoicesThisMonth,
          allowed: limit
        });
      }
      
      await base(TABLES.USERS).update(userId, {
        invoicesThisMonth: invoicesThisMonth + 1
      });
      return next();
    }

    // Déterminer le quota: utiliser maxInvoicesPerMonth d'Airtable si défini, sinon celui du plan
    const effectiveLimit = maxInvoicesOverride ?? planConfig.maxInvoicesPerMonth;

    // Si illimité (Business ou override null)
    if (effectiveLimit === null) {
      return next();
    }

    // Vérification du quota
    if (invoicesThisMonth >= effectiveLimit) {
      return res.status(403).json({
        error: 'Quota atteint',
        message: `Vous avez atteint la limite de ${effectiveLimit} factures pour le plan ${planConfig.name}.`,
        used: invoicesThisMonth,
        allowed: effectiveLimit
      });
    }

    // Incrément automatique du compteur
    await base(TABLES.USERS).update(userId, {
      invoicesThisMonth: invoicesThisMonth + 1
    });

    next();
  } catch (error) {
    console.error('Erreur quota :', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}
