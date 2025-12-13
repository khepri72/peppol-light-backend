import { Response, NextFunction } from 'express';
import { base, TABLES } from '../config/airtable';
import { AuthRequest } from './auth';

type Feature = 'ubl-download';

/**
 * Middleware pour vérifier si le plan utilisateur autorise une fonctionnalité
 * 
 * Plans: free, starter, pro, business
 * 
 * Fonctionnalités bloquées pour FREE:
 * - ubl-download: téléchargement/génération UBL
 */
export function checkPlanFeature(feature: Feature) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      // Charger l'utilisateur depuis Airtable
      let userRecord;
      try {
        userRecord = await base(TABLES.USERS).find(userId);
      } catch (error) {
        console.error('[checkPlanFeature] User not found:', userId);
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      const userPlan = String(userRecord.fields['userPlan'] || 'free').toLowerCase();

      // Vérifier les permissions selon la fonctionnalité
      let isAllowed = false;

      switch (feature) {
        case 'ubl-download':
          // Autorisé pour starter, pro, business (pas free)
          isAllowed = userPlan !== 'free';
          break;
        default:
          isAllowed = true;
      }

      if (!isAllowed) {
        console.log('[PLAN BLOCK]', { userId, userPlan, feature });
        return res.status(403).json({
          code: 'UPGRADE_REQUIRED',
          message: 'La génération/téléchargement UBL nécessite un abonnement Starter ou supérieur.',
          currentPlan: userPlan,
          upgradeUrl: '/pricing'
        });
      }

      next();
    } catch (error) {
      console.error('[checkPlanFeature] Error:', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
}

