import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { stripe, isValidPlan, PlanType } from '../services/stripe';
import { base, TABLES } from '../config/airtable';

// Get APP_PUBLIC_URL with fallback
const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL || 'https://app.peppollight.com';

// Direct mapping from plan to Stripe Price ID from environment variables
// Using .trim() to remove any whitespace/newlines from env vars
const PRICE_IDS = {
  starter: (process.env.STRIPE_PRICE_STARTER || '').trim(),
  pro: (process.env.STRIPE_PRICE_PRO || '').trim(),
  business: (process.env.STRIPE_PRICE_BUSINESS || '').trim(),
} as const;

/**
 * POST /api/stripe/checkout
 * Create a Stripe Checkout Session for subscription
 * 
 * Body: { "plan": "starter" | "pro" | "business" }
 * Response: { "url": "https://checkout.stripe.com/..." }
 */
export async function createCheckoutSession(req: AuthRequest, res: Response) {
  const { plan } = req.body;
  let priceId: string | undefined;
  
  try {
    // Check if Stripe is configured
    if (!stripe) {
      console.error('❌ [STRIPE] STRIPE_SECRET_KEY not configured');
      return res.status(500).json({ 
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.' 
      });
    }

    // 1) Validate plan
    if (!plan || typeof plan !== 'string') {
      return res.status(400).json({ error: 'Plan is required' });
    }

    if (!isValidPlan(plan)) {
      return res.status(400).json({ 
        error: 'Invalid plan. Must be one of: starter, pro, business' 
      });
    }

    // 2) Get price ID from environment
    const planKey = plan as PlanType;
    priceId = PRICE_IDS[planKey];
    
    // Validate priceId before proceeding
    if (!priceId || priceId.trim() === '') {
      return res.status(400).json({ 
        error: "Invalid plan - priceId not found",
        plan 
      });
    }

    // 3) Prepare URLs
    const success_url = `${process.env.APP_PUBLIC_URL || APP_PUBLIC_URL}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${process.env.APP_PUBLIC_URL || APP_PUBLIC_URL}/pricing?checkout=cancel`;

    // 4) Create Stripe Checkout Session (minimal structure)
    const sessionParams: any = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url,
      cancel_url,
      metadata: { plan },
    };

    // Add userId to metadata and client_reference_id for webhook identification
    if (req.userId) {
      sessionParams.metadata = { ...sessionParams.metadata, userId: req.userId };
      sessionParams.client_reference_id = req.userId;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      return res.status(500).json({ error: 'Failed to create checkout session' });
    }

    console.log('[STRIPE] Checkout session created:', session.id);

    // 5) Return the checkout URL
    return res.json({ url: session.url });

  } catch (error: any) {
    console.error('[STRIPE] Error:', error?.message, error?.code || '');
    
    return res.status(400).json({ 
      error: error?.message || 'Failed to create checkout session',
      code: error?.code,
      param: error?.param,
    });
  }
}

/**
 * POST /api/stripe/customer-portal
 * Create a Stripe Customer Portal session for managing subscription
 * 
 * Response: { "url": "https://billing.stripe.com/p/session/..." }
 */
export async function createCustomerPortalSession(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if Stripe is configured
    if (!stripe) {
      console.error('[STRIPE] STRIPE_SECRET_KEY not configured');
      return res.status(500).json({ 
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.' 
      });
    }

    const userId = req.userId;

    // Get user from Airtable
    let userRecord;
    try {
      userRecord = await base(TABLES.USERS).find(userId);
    } catch (error) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get Stripe Customer ID from Airtable
    const stripeCustomerId = userRecord.fields['Stripe Customer ID'] as string | undefined;

    if (!stripeCustomerId || stripeCustomerId.trim() === '') {
      return res.status(400).json({ 
        error: 'No Stripe customer',
        message: 'You do not have an active Stripe subscription. Please subscribe to a plan first.'
      });
    }

    // Create Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.APP_PUBLIC_URL || APP_PUBLIC_URL}/dashboard`,
    });

    console.log('[STRIPE] Customer portal session created:', {
      userId,
      customerId: stripeCustomerId,
      sessionId: session.id,
    });

    return res.json({ url: session.url });

  } catch (error: any) {
    console.error('[STRIPE] Customer portal error:', error?.message, error?.code || '');
    
    return res.status(400).json({ 
      error: error?.message || 'Failed to create customer portal session',
      code: error?.code,
    });
  }
}

