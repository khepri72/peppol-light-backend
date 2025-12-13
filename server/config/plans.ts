export const PLANS = {
  free: {
    id: 'free',
    name: 'Gratuit',
    priceMonthly: 0,
    maxInvoicesPerMonth: 3, // 3 factures par mois
    description: '3 factures par mois pour tester Peppol Light',
    features: [
      'Score Pe PDF téléchargeable',
      'Supportppol 0-100%',
      'Rapport email standard'
    ]
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 14.9,
    maxInvoicesPerMonth: 30,
    description: 'Pour les indépendants (30 factures/mois)',
    features: [
      'Toutes fonctionnalités Gratuit',
      'Conversion UBL/XML automatique',
      'Extraction IA standard',
      'Historique 3 mois',
      'Support email 48h'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 29.9,
    maxInvoicesPerMonth: 200,
    description: 'Pour les PME (200 factures/mois)',
    features: [
      'Toutes fonctionnalités Starter',
      'Extraction IA avancée',
      'Dashboard analytique complet',
      'Envoi auto comptable + Webhooks',
      'Historique 12 mois',
      'Support prioritaire 24h',
      'Multi-utilisateurs (1-3)'
    ]
  },
  business: {
    id: 'business',
    name: 'Business',
    priceMonthly: 79.9,
    maxInvoicesPerMonth: null, // null = illimité
    description: 'Pour cabinets comptables (factures illimitées)',
    features: [
      'Toutes fonctionnalités Pro',
      'Factures ILLIMITÉES',
      'Multi-clients (10 dossiers inclus)',
      'Pack +10 dossiers : +25€/mois',
      'API Access premium : +30€/mois',
      'White-label : +50€/mois',
      'Support téléphonique dédié',
      'Account manager'
    ]
  }
} as const;

export type PlanId = keyof typeof PLANS;

export type Plan = (typeof PLANS)[PlanId];

