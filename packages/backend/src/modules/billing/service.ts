import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { MESSAGE_CHAR_LIMITS, type BillingProvider, type PlanTier, type Subscription } from "@nythera/shared";
import { db } from "../../db/client.js";
import { billingWebhookEvents, subscriptions } from "../../db/schema/index.js";
import { BadRequest } from "../../lib/errors.js";
import { sendToUser } from "../../gateway/broadcast.js";
import { stripeAdapter } from "./providers/stripe.js";
import { paypalAdapter } from "./providers/paypal.js";
import type { BillingProviderAdapter } from "./providers/types.js";

const adapters: Record<BillingProvider, BillingProviderAdapter> = {
  stripe: stripeAdapter,
  paypal: paypalAdapter,
};

type SubscriptionRow = typeof subscriptions.$inferSelect;

function mapSubscription(row: SubscriptionRow): Subscription {
  return {
    provider: row.provider,
    plan: row.plan,
    status: row.status,
    currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
  };
}

async function getSubscriptionRow(userId: string): Promise<SubscriptionRow | undefined> {
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return row;
}

/**
 * The one function in the whole app that reads a user's plan. Only called from here and
 * from modules/messages/service.ts + the gateway's MESSAGE_SEND handler - nothing else ever
 * consults billing state, by construction (see project plan's anti-pay-to-win constraint).
 */
export async function getUserPlan(userId: string): Promise<PlanTier> {
  const row = await getSubscriptionRow(userId);
  if (!row) return "free";
  if (row.status !== "active") return "free";
  if (row.currentPeriodEnd && row.currentPeriodEnd.getTime() < Date.now()) return "free";
  return row.plan;
}

export function getMessageCharLimit(plan: PlanTier): number {
  return MESSAGE_CHAR_LIMITS[plan];
}

export async function getBillingInfoForUser(userId: string): Promise<{ plan: PlanTier; messageCharLimit: number; subscription: Subscription | null }> {
  const plan = await getUserPlan(userId);
  const row = await getSubscriptionRow(userId);
  return { plan, messageCharLimit: getMessageCharLimit(plan), subscription: row ? mapSubscription(row) : null };
}

export async function createCheckoutSession(userId: string, provider: BillingProvider, returnUrl: string): Promise<{ url: string }> {
  return adapters[provider].createCheckoutSession(userId, returnUrl);
}

export async function cancelSubscriptionForUser(userId: string): Promise<void> {
  const row = await getSubscriptionRow(userId);
  if (!row) throw BadRequest("No active subscription to cancel");
  await adapters[row.provider].cancelSubscription(row.providerSubscriptionId);
  await db.update(subscriptions).set({ cancelAtPeriodEnd: true, updatedAt: new Date() }).where(eq(subscriptions.userId, userId));
}

export async function handleWebhookEvent(
  provider: BillingProvider,
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>,
): Promise<void> {
  const event = await adapters[provider].parseWebhook(rawBody, headers);
  if (!event) return; // Verified but irrelevant event type - treat as a successful no-op.

  // Idempotency: webhooks are retried by both providers. A duplicate (provider, externalEventId)
  // insert conflict means this event was already processed - treat as a no-op success.
  try {
    await db.insert(billingWebhookEvents).values({
      id: randomUUID(),
      provider,
      externalEventId: event.externalEventId,
      payload: event as unknown as Record<string, unknown>,
      processedAt: new Date(),
    });
  } catch {
    return;
  }

  if (!event.userId) return; // Unresolvable event (shouldn't normally happen) - already logged via the webhook payload row.

  await db
    .insert(subscriptions)
    .values({
      id: randomUUID(),
      userId: event.userId,
      provider: event.provider,
      providerCustomerId: event.providerCustomerId,
      providerSubscriptionId: event.providerSubscriptionId,
      plan: "supporter",
      status: event.status,
      currentPeriodEnd: event.currentPeriodEnd,
      cancelAtPeriodEnd: event.cancelAtPeriodEnd,
    })
    .onDuplicateKeyUpdate({
      set: {
        provider: event.provider,
        providerCustomerId: event.providerCustomerId,
        providerSubscriptionId: event.providerSubscriptionId,
        status: event.status,
        currentPeriodEnd: event.currentPeriodEnd,
        cancelAtPeriodEnd: event.cancelAtPeriodEnd,
        updatedAt: new Date(),
      },
    });

  const plan = await getUserPlan(event.userId);
  sendToUser(event.userId, { op: "DISPATCH", t: "BILLING_UPDATE", d: { userId: event.userId, plan } });
}
