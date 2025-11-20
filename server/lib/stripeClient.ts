import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

if (!stripeSecretKey) {
  console.warn('⚠️ STRIPE_SECRET_KEY not configured. Stripe payments will not work.');
}

// Client Stripe (v14+)
export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-11-17.clover',
    })
  : null;

/**
 * Plans Stripe avec leurs price_id
 * À configurer dans Stripe Dashboard > Products
 */
export const STRIPE_PLANS = {
  starter: {
    priceId: process.env.STRIPE_PRICE_STARTER || 'price_starter_placeholder',
    quota: 10,
    name: 'Starter',
  },
  pro: {
    priceId: process.env.STRIPE_PRICE_PRO || 'price_pro_placeholder',
    quota: -1, // illimité
    name: 'Pro',
  },
};
