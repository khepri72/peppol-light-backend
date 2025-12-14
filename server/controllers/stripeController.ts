import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { stripe, isValidPlan, getPriceId, PlanType } from '../services/stripe';

// Get APP_PUBLIC_URL with fallback
const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL || 'https://app.peppollight.com';

/**
 * POST /api/stripe/checkout
 * Create a Stripe Checkout Session for subscription
 * 
 * Body: { "plan": "starter" | "pro" | "business" }
 * Response: { "url": "https://checkout.stripe.com/..." }
 */
export async function createCheckoutSession(req: AuthRequest, res: Response) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      console.error('❌ [STRIPE] STRIPE_SECRET_KEY not configured');
      return res.status(500).json({ 
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.' 
      });
    }

    const { plan } = req.body;

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
    const priceId = getPriceId(plan as PlanType);
    
    if (!priceId) {
      console.error(`❌ [STRIPE] Missing STRIPE_PRICE_${plan.toUpperCase()} env var`);
      return res.status(500).json({ 
        error: `Price ID for plan "${plan}" is not configured. Please set STRIPE_PRICE_${plan.toUpperCase()} environment variable.` 
      });
    }

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

    console.log(`📦 [STRIPE] Creating checkout session for plan: ${plan}, priceId: ${priceId}`);

    // 4) Create Stripe Checkout Session
    const sessionParams: any = {
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${APP_PUBLIC_URL}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_PUBLIC_URL}/pricing?checkout=cancel`,
      metadata,
    };

    // Add customer email if available
    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      console.error('❌ [STRIPE] Checkout session created but no URL returned');
      return res.status(500).json({ error: 'Failed to create checkout session' });
    }

    console.log(`✅ [STRIPE] Checkout session created: ${session.id}`);

    // 5) Return the checkout URL
    return res.json({ url: session.url });

  } catch (error: any) {
    console.error('❌ [STRIPE] Error creating checkout session:', error);
    
    // Handle Stripe-specific errors
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        error: 'Invalid Stripe request',
        details: error.message 
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

