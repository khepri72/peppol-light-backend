import { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripe } from '../services/stripe';
import { base, TABLES } from '../config/airtable';
import { PLANS, PlanId } from '../config/plans';
import { buildSafeFilterFormula } from '../utils/airtableHelpers';

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events to sync subscription status
 * 
 * Events handled:
 * - checkout.session.completed: Activate subscription after successful checkout
 * - customer.subscription.updated: Update subscription status/changes
 * - customer.subscription.deleted: Cancel subscription
 * 
 * SETUP IN STRIPE DASHBOARD (TEST MODE):
 * 1. Go to Stripe Dashboard > Developers > Webhooks
 * 2. Click "Add endpoint"
 * 3. Endpoint URL: https://your-domain.com/api/stripe/webhook
 * 4. Select events to listen to:
 *    - checkout.session.completed
 *    - customer.subscription.updated
 *    - customer.subscription.deleted
 * 5. Copy the "Signing secret" (starts with whsec_...)
 * 6. Set STRIPE_WEBHOOK_SECRET environment variable with this secret
 */
export async function handleWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[STRIPE WEBHOOK] STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  if (!stripe) {
    console.error('[STRIPE WEBHOOK] Stripe not initialized');
    return res.status(500).json({ error: 'Stripe not initialized' });
  }

  // Get raw body for signature verification
  // Note: rawBody is captured by express.json() verify callback (see server/index.ts)
  const rawBody = (req as any).rawBody;

  if (!rawBody) {
    console.error('[STRIPE WEBHOOK] Raw body not available');
    return res.status(400).json({ error: 'Raw body required for signature verification' });
  }

  // Ensure rawBody is a Buffer (Stripe requires Buffer or string)
  const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(bodyBuffer, sig as string, webhookSecret);
  } catch (err: any) {
    console.error('[STRIPE WEBHOOK] Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  try {
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`[STRIPE WEBHOOK] Unhandled event type: ${event.type}`);
    }

    // Return 200 quickly to acknowledge receipt
    return res.json({ received: true });
  } catch (error: any) {
    console.error('[STRIPE WEBHOOK] Error processing event:', error);
    // Still return 200 to avoid retries, but log the error
    return res.status(200).json({ received: true, error: error.message });
  }
}

/**
 * Handle checkout.session.completed event
 * Activate subscription after successful checkout
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const metadata = session.metadata || {};

  // Get plan from metadata
  const planFromMetadata = metadata.plan as string;
  if (!planFromMetadata) {
    console.error('[STRIPE WEBHOOK] No plan in checkout session metadata');
    return;
  }

  // Map Stripe plan to app plan
  const userPlan = mapStripePlanToAppPlan(planFromMetadata);
  if (!userPlan) {
    console.error('[STRIPE WEBHOOK] Invalid plan:', planFromMetadata);
    return;
  }

  // Find user by userId in metadata or by customer email
  let userId: string | null = null;

  if (metadata.userId) {
    userId = metadata.userId;
  } else if (session.customer_email) {
    // Fallback: find user by email
    const users = await base(TABLES.USERS)
      .select({
        filterByFormula: buildSafeFilterFormula('email', session.customer_email),
        maxRecords: 1,
      })
      .firstPage();

    if (users.length > 0) {
      userId = users[0].id;
    }
  }

  if (!userId) {
    console.error('[STRIPE WEBHOOK] Cannot find user for checkout session:', session.id);
    return;
  }

  // Get subscription details if subscription ID exists
  let subscription: Stripe.Subscription | null = null;
  if (subscriptionId) {
    try {
      subscription = await stripe!.subscriptions.retrieve(subscriptionId);
    } catch (err) {
      console.error('[STRIPE WEBHOOK] Error retrieving subscription:', err);
    }
  }

  const subscriptionStatus = subscription?.status || 'active';
  const currentPeriodEnd = subscription?.current_period_end 
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  // Update user in Airtable
  await base(TABLES.USERS).update(userId, {
    userPlan,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    subscriptionStatus,
    currentPeriodEnd,
    // Update max invoices per month based on plan
    maxInvoicesPerMonth: PLANS[userPlan].maxInvoicesPerMonth,
  });

  console.log(`[STRIPE WEBHOOK] Activated subscription for user ${userId}: ${userPlan}`);
}

/**
 * Handle customer.subscription.updated event
 * Update subscription status when it changes
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const status = subscription.status;

  // Find user by stripeCustomerId
  const users = await base(TABLES.USERS)
    .select({
      filterByFormula: buildSafeFilterFormula('stripeCustomerId', customerId),
      maxRecords: 1,
    })
    .firstPage();

  if (users.length === 0) {
    console.error('[STRIPE WEBHOOK] User not found for customer:', customerId);
    return;
  }

  const userId = users[0].id;
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  // Determine plan from subscription price
  const priceId = subscription.items.data[0]?.price?.id;
  const planFromPrice = mapPriceIdToPlan(priceId);

  const updateData: any = {
    stripeSubscriptionId: subscriptionId,
    subscriptionStatus: status,
    currentPeriodEnd,
  };

  // Update plan if it changed (and if we can determine it)
  if (planFromPrice) {
    updateData.userPlan = planFromPrice;
    updateData.maxInvoicesPerMonth = PLANS[planFromPrice].maxInvoicesPerMonth;
  }

  // If subscription is canceled or past_due, reset to free plan
  if (status === 'canceled' || status === 'past_due' || status === 'unpaid') {
    updateData.userPlan = 'free';
    updateData.maxInvoicesPerMonth = PLANS.free.maxInvoicesPerMonth;
  }

  await base(TABLES.USERS).update(userId, updateData);

  console.log(`[STRIPE WEBHOOK] Updated subscription for user ${userId}: ${status}`);
}

/**
 * Handle customer.subscription.deleted event
 * Cancel subscription and reset to free plan
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by stripeCustomerId
  const users = await base(TABLES.USERS)
    .select({
      filterByFormula: buildSafeFilterFormula('stripeCustomerId', customerId),
      maxRecords: 1,
    })
    .firstPage();

  if (users.length === 0) {
    console.error('[STRIPE WEBHOOK] User not found for customer:', customerId);
    return;
  }

  const userId = users[0].id;

  // Reset to free plan
  await base(TABLES.USERS).update(userId, {
    userPlan: 'free',
    subscriptionStatus: 'canceled',
    maxInvoicesPerMonth: PLANS.free.maxInvoicesPerMonth,
    // Keep stripeCustomerId and stripeSubscriptionId for reference
  });

  console.log(`[STRIPE WEBHOOK] Canceled subscription for user ${userId}`);
}

/**
 * Map Stripe plan name to app plan ID
 */
function mapStripePlanToAppPlan(stripePlan: string): PlanId | null {
  const normalized = stripePlan.toLowerCase();
  if (normalized === 'starter' || normalized === 'pro' || normalized === 'business') {
    return normalized as PlanId;
  }
  return null;
}

/**
 * Map Stripe price ID to app plan ID
 * This requires matching price IDs from environment variables
 */
function mapPriceIdToPlan(priceId?: string): PlanId | null {
  if (!priceId) return null;

  const priceIds = {
    starter: (process.env.STRIPE_PRICE_STARTER || '').trim(),
    pro: (process.env.STRIPE_PRICE_PRO || '').trim(),
    business: (process.env.STRIPE_PRICE_BUSINESS || '').trim(),
  };

  for (const [plan, id] of Object.entries(priceIds)) {
    if (id === priceId) {
      return plan as PlanId;
    }
  }

  return null;
}

