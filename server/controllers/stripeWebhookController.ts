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
    // Log event received
    const eventData = event.data.object as any;
    const customerId = eventData.customer || eventData.customer_details?.email || 'N/A';
    const subscriptionId = eventData.id || eventData.subscription || 'N/A';
    const sessionId = eventData.id && event.type === 'checkout.session.completed' ? eventData.id : 'N/A';
    
    console.log(`[STRIPE WEBHOOK] Event received: ${event.type}`, {
      customerId: typeof customerId === 'string' ? customerId : customerId?.id || 'N/A',
      subscriptionId: typeof subscriptionId === 'string' ? subscriptionId : subscriptionId?.id || 'N/A',
      sessionId,
    });

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

  // Get userId from metadata or client_reference_id
  let userId: string | null = metadata.userId || session.client_reference_id || null;

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

  // If userId not found, try to find user by email
  if (!userId) {
    const customerEmail = session.customer_email || 
                         (session.customer_details as any)?.email || 
                         (session.customer_details as Stripe.Checkout.Session.CustomerDetails)?.email;
    if (customerEmail) {
      const users = await base(TABLES.USERS)
        .select({
          filterByFormula: buildSafeFilterFormula('email', customerEmail),
          maxRecords: 1,
        })
        .firstPage();

      if (users.length > 0) {
        userId = users[0].id;
        console.log(`[STRIPE WEBHOOK] Found user by email: ${userId}`);
      }
    }
  }

  if (!userId) {
    console.error('[STRIPE WEBHOOK] Cannot find user for checkout session:', {
      sessionId: session.id,
      metadata,
      clientReferenceId: session.client_reference_id,
      customerEmail: session.customer_email,
    });
    return;
  }

  console.log(`[STRIPE WEBHOOK] Updating user ${userId} with plan ${userPlan}`);

  // Update user in Airtable with correct field names
  try {
    await base(TABLES.USERS).update(userId, {
      userPlan,
      'Stripe Customer ID': customerId,
      'Stripe Subscription ID': subscriptionId || '',
      // Update max invoices per month based on plan
      maxInvoicesPerMonth: PLANS[userPlan].maxInvoicesPerMonth,
    });

    console.log(`[STRIPE WEBHOOK] Successfully activated subscription for user ${userId}: ${userPlan}`);
  } catch (error: any) {
    console.error(`[STRIPE WEBHOOK] Failed to update user ${userId}:`, error.message);
    throw error;
  }
}

/**
 * Handle customer.subscription.updated event
 * Update subscription status when it changes
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const status = subscription.status;

  console.log(`[STRIPE WEBHOOK] Processing subscription.updated for customer: ${customerId}, status: ${status}`);

  // Find user by "Stripe Customer ID" field (exact name in Airtable)
  const users = await base(TABLES.USERS)
    .select({
      filterByFormula: buildSafeFilterFormula('Stripe Customer ID', customerId),
      maxRecords: 1,
    })
    .firstPage();

  if (users.length === 0) {
    console.error('[STRIPE WEBHOOK] User not found for customer:', customerId);
    return;
  }

  const userId = users[0].id;
  console.log(`[STRIPE WEBHOOK] Found user ${userId} for customer ${customerId}`);

  // Determine plan from subscription price
  const priceId = subscription.items.data[0]?.price?.id;
  const planFromPrice = mapPriceIdToPlan(priceId);

  const updateData: any = {
    'Stripe Subscription ID': subscriptionId,
  };

  // Update plan based on subscription status
  if (status === 'active' || status === 'trialing') {
    // Keep current plan or update if we can determine it from price
    if (planFromPrice) {
      updateData.userPlan = planFromPrice;
      updateData.maxInvoicesPerMonth = PLANS[planFromPrice].maxInvoicesPerMonth;
    }
  } else if (status === 'canceled' || status === 'past_due' || status === 'unpaid') {
    // Reset to free plan if subscription is canceled/unpaid
    updateData.userPlan = 'free';
    updateData.maxInvoicesPerMonth = PLANS.free.maxInvoicesPerMonth;
  }

  try {
    await base(TABLES.USERS).update(userId, updateData);
    console.log(`[STRIPE WEBHOOK] Successfully updated subscription for user ${userId}: ${status}`);
  } catch (error: any) {
    console.error(`[STRIPE WEBHOOK] Failed to update user ${userId}:`, error.message);
    throw error;
  }
}

/**
 * Handle customer.subscription.deleted event
 * Cancel subscription and reset to free plan
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;

  console.log(`[STRIPE WEBHOOK] Processing subscription.deleted for customer: ${customerId}`);

  // Find user by "Stripe Customer ID" field (exact name in Airtable)
  const users = await base(TABLES.USERS)
    .select({
      filterByFormula: buildSafeFilterFormula('Stripe Customer ID', customerId),
      maxRecords: 1,
    })
    .firstPage();

  if (users.length === 0) {
    console.error('[STRIPE WEBHOOK] User not found for customer:', customerId);
    return;
  }

  const userId = users[0].id;
  console.log(`[STRIPE WEBHOOK] Found user ${userId} for customer ${customerId}`);

  // Reset to free plan
  try {
    await base(TABLES.USERS).update(userId, {
      userPlan: 'free',
      'Stripe Subscription ID': subscriptionId || '',
      maxInvoicesPerMonth: PLANS.free.maxInvoicesPerMonth,
      // Keep "Stripe Customer ID" for reference (not updating it)
    });

    console.log(`[STRIPE WEBHOOK] Successfully canceled subscription for user ${userId}`);
  } catch (error: any) {
    console.error(`[STRIPE WEBHOOK] Failed to update user ${userId}:`, error.message);
    throw error;
  }
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

