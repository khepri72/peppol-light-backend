import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Check, Zap, Crown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Plan {
  id: 'free' | 'starter' | 'pro';
  name: string;
  price: string;
  priceMonthly: number;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  downloadsQuota: number | -1; // -1 = illimité
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'FREE',
    price: '0€',
    priceMonthly: 0,
    description: 'Pour tester Peppol Light',
    downloadsQuota: 1,
    features: [
      '1 téléchargement UBL / mois',
      'Upload PDF ou Excel',
      'Analyse Peppol basique',
      'Score de conformité',
      'Support email (48h)',
    ],
    cta: 'Plan actuel',
  },
  {
    id: 'starter',
    name: 'STARTER',
    price: '29€',
    priceMonthly: 29,
    description: 'Pour les petites entreprises',
    downloadsQuota: 10,
    highlighted: true,
    features: [
      '10 téléchargements UBL / mois',
      'Upload PDF ou Excel',
      'Analyse Peppol avancée',
      'Génération UBL automatique',
      'Support email prioritaire (24h)',
      'Historique 6 mois',
    ],
    cta: 'Choisir STARTER',
  },
  {
    id: 'pro',
    name: 'PRO',
    price: '99€',
    priceMonthly: 99,
    description: 'Pour les entreprises exigeantes',
    downloadsQuota: -1, // illimité
    features: [
      'Téléchargements UBL illimités',
      'Upload PDF ou Excel',
      'Analyse Peppol premium',
      'Génération UBL + validation approfondie',
      'Support prioritaire (2h)',
      'Historique illimité',
      'API REST dédiée',
      'Exports en masse',
    ],
    cta: 'Choisir PRO',
  },
];

export default function Pricing() {
  const [, setLocation] = useLocation();
  const { userProfile, loading } = useAuth();
  const { toast } = useToast();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  const handleSelectPlan = async (plan: Plan) => {
    if (!userProfile) {
      toast({
        title: 'Connexion requise',
        description: 'Vous devez être connecté pour choisir un plan',
        variant: 'destructive',
      });
      setLocation('/login-google');
      return;
    }

    // Si déjà sur ce plan
    if (userProfile.subscription_plan === plan.id) {
      toast({
        title: 'Plan actuel',
        description: `Vous êtes déjà sur le plan ${plan.name}`,
      });
      return;
    }

    // Si plan FREE
    if (plan.id === 'free') {
      toast({
        title: 'Downgrade impossible',
        description: 'Contactez le support pour rétrograder vers le plan gratuit',
      });
      return;
    }

    // TODO: Intégrer Stripe Checkout
    setProcessingPlan(plan.id);

    try {
      // Simuler un délai (à remplacer par appel API Stripe)
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: 'Stripe bientôt disponible',
        description: `Le paiement pour le plan ${plan.name} sera disponible prochainement. Contactez-nous pour activer manuellement ce plan.`,
      });

      // TODO: Appeler l'endpoint /api/billing/create-checkout-session
      // const response = await fetch('/api/billing/create-checkout-session', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${supabaseToken}`,
      //   },
      //   body: JSON.stringify({ plan: plan.id }),
      // });
      // const data = await response.json();
      // window.location.href = data.url;
    } catch (error) {
      console.error('Erreur sélection plan:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de traiter votre demande',
        variant: 'destructive',
      });
    } finally {
      setProcessingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Choisissez votre plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Conformité Peppol 2026 simplifiée. Commencez gratuitement, passez à PRO quand vous êtes prêt.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => {
            const isCurrentPlan = userProfile?.subscription_plan === plan.id;
            const isProcessing = processingPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`
                  relative bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300
                  ${plan.highlighted ? 'ring-4 ring-[#FF6B35] scale-105' : 'hover:shadow-2xl'}
                `}
                data-testid={`pricing-card-${plan.id}`}
              >
                {/* Badge "Populaire" */}
                {plan.highlighted && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-[#FF6B35] to-[#FF8C5A] text-white px-4 py-1 text-sm font-semibold rounded-bl-xl">
                    ⭐ Populaire
                  </div>
                )}

                <div className="p-8">
                  {/* Nom du plan */}
                  <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                    {plan.id === 'pro' && <Crown className="w-6 h-6 text-yellow-500" />}
                    {plan.name}
                  </h2>
                  <p className="text-gray-600 mb-6">{plan.description}</p>

                  {/* Prix */}
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                    {plan.priceMonthly > 0 && (
                      <span className="text-gray-600 ml-2">/mois</span>
                    )}
                  </div>

                  {/* Quota */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 mb-6">
                    <p className="text-sm font-semibold text-blue-900">
                      {plan.downloadsQuota === -1 ? (
                        <>✨ Téléchargements UBL illimités</>
                      ) : (
                        <>{plan.downloadsQuota} téléchargement{plan.downloadsQuota > 1 ? 's' : ''} UBL / mois</>
                      )}
                    </p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isCurrentPlan || isProcessing || loading}
                    className={`
                      w-full h-14 text-base font-semibold rounded-xl transition-all duration-300
                      ${plan.highlighted
                        ? 'bg-gradient-to-r from-[#FF6B35] to-[#FF8C5A] hover:from-[#FF6B35] hover:to-[#FF8C5A] text-white shadow-lg'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                      }
                      ${isCurrentPlan ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    data-testid={`button-select-${plan.id}`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Traitement...
                      </>
                    ) : isCurrentPlan ? (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Plan actuel
                      </>
                    ) : (
                      <>
                        {plan.highlighted && <Zap className="w-5 h-5 mr-2" />}
                        {plan.cta}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Questions fréquentes
          </h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                💳 Quels modes de paiement acceptez-vous ?
              </h4>
              <p className="text-gray-600">
                Nous acceptons les cartes bancaires via Stripe (VISA, Mastercard, American Express).
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                🔄 Puis-je changer de plan à tout moment ?
              </h4>
              <p className="text-gray-600">
                Oui, vous pouvez upgrader ou downgrader à tout moment. Le prorata est calculé automatiquement.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                📥 Que se passe-t-il si je dépasse mon quota ?
              </h4>
              <p className="text-gray-600">
                Vous ne pourrez plus télécharger de fichiers UBL jusqu'au prochain mois ou jusqu'à ce que vous passiez à un plan supérieur.
              </p>
            </div>
          </div>
        </div>

        {/* Retour dashboard */}
        <div className="text-center mt-12">
          <Button
            variant="outline"
            onClick={() => setLocation('/dashboard')}
            className="text-gray-600 hover:text-gray-900"
            data-testid="button-back-dashboard"
          >
            ← Retour au dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
