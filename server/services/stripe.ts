import Stripe from 'stripe';

// Validate Stripe secret key on module load
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️ STRIPE_SECRET_KEY not set - Stripe features will be disabled');
}

// Initialize Stripe with the secret key
// Using a stable API version for consistency
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    })
  : null;

// Plan to Stripe Price ID mapping
export type PlanType = 'starter' | 'pro' | 'business';

export const PLAN_PRICE_IDS: Record<PlanType, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  business: process.env.STRIPE_PRICE_BUSINESS,
};

// Validate if a plan is valid
export function isValidPlan(plan: string): plan is PlanType {
  return ['starter', 'pro', 'business'].includes(plan);
}

// Get the price ID for a plan
export function getPriceId(plan: PlanType): string | undefined {
  return PLAN_PRICE_IDS[plan];
}

