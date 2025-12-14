import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { stripe, isValidPlan, PlanType } from '../services/stripe';

// Get APP_PUBLIC_URL with fallback
const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL || 'https://app.peppollight.com';

// Direct mapping from plan to Stripe Price ID from environment variables
const PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  pro: process.env.STRIPE_PRICE_PRO!,
  business: process.env.STRIPE_PRICE_BUSINESS!,
} as const;

// Fallback Price IDs (temporary - for debugging env var issues)
const PRICE_IDS_FALLBACK = {
  starter: "price_1SeHjCExuJjiAL2Wk9gu6GGM",
  pro: "price_1SeHxqExuJjiAL2WC5czZER3",
  business: "price_1SeI2hExuJjiAL2WxSaDqW3z",
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

    // 2) Get price ID from environment with fallback
    const planKey = plan as PlanType;
    priceId = PRICE_IDS[planKey] || PRICE_IDS_FALLBACK[planKey];
    
    // Log environment variable presence
    console.log('[STRIPE] Environment variables check:');
    console.log('[STRIPE] STRIPE_PRICE_STARTER =', process.env.STRIPE_PRICE_STARTER ? 'SET' : 'MISSING');
    console.log('[STRIPE] STRIPE_PRICE_PRO =', process.env.STRIPE_PRICE_PRO ? 'SET' : 'MISSING');
    console.log('[STRIPE] STRIPE_PRICE_BUSINESS =', process.env.STRIPE_PRICE_BUSINESS ? 'SET' : 'MISSING');
    
    // Validate priceId before proceeding
    if (!priceId || priceId.trim() === '') {
      console.error(`❌ [STRIPE] Missing or empty priceId for plan: ${plan}`);
      console.error(`❌ [STRIPE] PRICE_IDS[${plan}] =`, PRICE_IDS[planKey]);
      console.error(`❌ [STRIPE] PRICE_IDS_FALLBACK[${plan}] =`, PRICE_IDS_FALLBACK[planKey]);
      return res.status(400).json({ 
        error: "Invalid plan - priceId not found",
        plan 
      });
    }
    
    // Log the mapping result
    const usedFallback = !PRICE_IDS[planKey];
    if (usedFallback) {
      console.warn(`⚠️ [STRIPE] Using FALLBACK priceId for plan: ${plan}`);
    }
    console.log(`[STRIPE] plan received: "${plan}"`);
    console.log(`[STRIPE] priceId mapped: "${priceId}" (${usedFallback ? 'FALLBACK' : 'ENV'})`);

    // 3) Prepare URLs
    const success_url = `${process.env.APP_PUBLIC_URL || APP_PUBLIC_URL}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${process.env.APP_PUBLIC_URL || APP_PUBLIC_URL}/pricing?checkout=cancel`;

    // Log all parameters before creating session
    console.log('[STRIPE] Creating session with:', {
      plan,
      priceId,
      APP_PUBLIC_URL: process.env.APP_PUBLIC_URL,
      success_url,
      cancel_url,
    });

    // 4) Create Stripe Checkout Session (minimal structure)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url,
      cancel_url,
      metadata: { plan },
    });

    if (!session.url) {
      console.error('❌ [STRIPE] Checkout session created but no URL returned');
      return res.status(500).json({ error: 'Failed to create checkout session' });
    }

    console.log('[STRIPE] ✅ Session created:', { id: session.id, url: session.url });

    // 5) Return the checkout URL
    return res.json({ url: session.url });

  } catch (error: any) {
    // Log detailed Stripe error information
    console.error('[STRIPE] ❌ Error details:', {
      message: error?.message,
      type: error?.type,
      code: error?.code,
      param: error?.param,
      raw: error?.raw,
    });
    
    // Return error response with Stripe details
    return res.status(400).json({ 
      error: error?.message || 'Failed to create checkout session',
      code: error?.code,
      param: error?.param,
    });
  }
}

