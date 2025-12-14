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

    // 3) Build metadata
    const metadata: Record<string, string> = { plan };
    
    // Add user info if authenticated
    if (req.userId) {
      metadata.userId = req.userId;
    }

    // Try to get user email from Airtable if authenticated
    let customerEmail: string | undefined;
    
    if (req.userId) {
      try {
        const { base, TABLES } = await import('../config/airtable');
        const userRecord = await base(TABLES.USERS).find(req.userId);
        const email = userRecord.fields['Email'] as string;
        if (email) {
          customerEmail = email;
          metadata.email = email;
        }
      } catch (err) {
        console.warn('⚠️ [STRIPE] Could not fetch user email:', err);
        // Continue without email - not critical
      }
    }

    // 4) Prepare Stripe Checkout Session parameters
    const mode = 'subscription';
    const success_url = `${APP_PUBLIC_URL}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${APP_PUBLIC_URL}/pricing?checkout=cancel`;

    // Log all parameters before calling Stripe
    console.log('[STRIPE] plan =', plan);
    console.log('[STRIPE] priceId =', priceId);
    console.log('[STRIPE] mode =', mode);
    console.log('[STRIPE] success_url =', success_url);
    console.log('[STRIPE] cancel_url =', cancel_url);

    const sessionParams: any = {
      mode,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url,
      cancel_url,
      metadata,
    };

    // Add customer email if available
    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    console.log('[STRIPE] Creating Stripe checkout session with params:', {
      mode: sessionParams.mode,
      price: sessionParams.line_items[0].price,
      quantity: sessionParams.line_items[0].quantity,
      success_url: sessionParams.success_url,
      cancel_url: sessionParams.cancel_url,
      has_customer_email: !!sessionParams.customer_email,
      metadata: sessionParams.metadata,
    });

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      console.error('❌ [STRIPE] Checkout session created but no URL returned');
      return res.status(500).json({ error: 'Failed to create checkout session' });
    }

    console.log(`✅ [STRIPE] Checkout session created successfully`);
    console.log(`✅ [STRIPE] session.id = ${session.id}`);
    console.log(`✅ [STRIPE] session.url = ${session.url}`);

    // 5) Return the checkout URL
    return res.json({ url: session.url });

  } catch (error: any) {
    // Log detailed Stripe error information
    console.error('[STRIPE] ERROR type:', error?.type);
    console.error('[STRIPE] ERROR message:', error?.message);
    console.error('[STRIPE] ERROR param:', error?.param);
    console.error('[STRIPE] ERROR code:', error?.code);
    console.error('[STRIPE] ERROR raw:', error?.raw);
    console.error('[STRIPE] ERROR context - plan:', plan);
    console.error('[STRIPE] ERROR context - priceId:', priceId || 'undefined');
    
    // Handle Stripe-specific errors
    if (error?.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        error: 'Invalid Stripe request',
        details: error?.message || 'unknown',
        code: error?.code,
        param: error?.param,
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
}

