import { Router } from 'express';
import { authenticateSupabase } from '../middleware/authMiddleware';
import { stripe, STRIPE_PLANS } from '../lib/stripeClient';

const router = Router();

/**
 * POST /api/billing/create-checkout-session
 * Créer une session Stripe Checkout pour upgrader vers un plan payant
 * 
 * TODO: Implémenter réellement avec Stripe
 */
router.post('/billing/create-checkout-session', authenticateSupabase, async (req, res) => {
  try {
    // Vérifier que Stripe est configuré
    if (!stripe) {
      return res.status(503).json({
        error: 'stripe_not_configured',
        message: 'Stripe n\'est pas encore configuré. Contactez le support.',
      });
    }

    const { plan } = req.body; // 'starter' | 'pro'
    const userId = req.user!.id;
    const userEmail = req.user!.email;

    // Validation
    if (!plan || !['starter', 'pro'].includes(plan)) {
      return res.status(400).json({
        error: 'invalid_plan',
        message: 'Plan invalide. Choisissez "starter" ou "pro".',
      });
    }

    // Récupérer le price_id du plan
    const planConfig = STRIPE_PLANS[plan as 'starter' | 'pro'];

    // TODO: Créer réellement la session Stripe Checkout
    // const session = await stripe.checkout.sessions.create({
    //   customer_email: userEmail,
    //   client_reference_id: userId,
    //   line_items: [
    //     {
    //       price: planConfig.priceId,
    //       quantity: 1,
    //     },
    //   ],
    //   mode: 'subscription',
    //   success_url: `${process.env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    //   cancel_url: `${process.env.FRONTEND_URL}/pricing`,
    //   metadata: {
    //     user_id: userId,
    //     plan: plan,
    //   },
    // });

    // Retourner l'URL de redirection Stripe
    return res.status(200).json({
      url: '/pricing', // TODO: remplacer par session.url
      message: 'Stripe Checkout bientôt disponible',
      plan: planConfig.name,
    });
  } catch (error) {
    console.error('Erreur création session Stripe:', error);
    return res.status(500).json({
      error: 'checkout_failed',
      message: 'Impossible de créer la session de paiement',
    });
  }
});

/**
 * POST /api/webhooks/stripe
 * Webhook Stripe pour gérer les événements subscription
 * 
 * TODO: Implémenter la logique complète
 */
router.post('/webhooks/stripe', async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];

    if (!stripe || !sig) {
      return res.status(400).send('Webhook signature missing');
    }

    // TODO: Vérifier la signature du webhook
    // const event = stripe.webhooks.constructEvent(
    //   req.body,
    //   sig,
    //   process.env.STRIPE_WEBHOOK_SECRET!
    // );

    // TODO: Gérer les événements
    // switch (event.type) {
    //   case 'checkout.session.completed':
    //     // Activer l'abonnement de l'utilisateur
    //     const session = event.data.object;
    //     await activateSubscription(session);
    //     break;
    //   
    //   case 'customer.subscription.updated':
    //     // Mettre à jour le plan de l'utilisateur
    //     const subscription = event.data.object;
    //     await updateUserPlan(subscription);
    //     break;
    //   
    //   case 'customer.subscription.deleted':
    //     // Rétrograder vers FREE
    //     await downgradeToFree(subscription.customer);
    //     break;
    // }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Erreur webhook Stripe:', error);
    return res.status(400).send(`Webhook Error: ${error}`);
  }
});

export default router;
