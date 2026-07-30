import Stripe from "stripe";
import { env } from "../../../config/env.js";
import { BadRequest } from "../../../lib/errors.js";
import type { BillingProviderAdapter, NormalizedBillingEvent } from "./types.js";

function getClient(): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw BadRequest("Stripe is not configured on this instance");
  return new Stripe(env.STRIPE_SECRET_KEY);
}

function mapStatus(status: Stripe.Subscription.Status): NormalizedBillingEvent["status"] {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "incomplete";
  }
}

async function normalizeFromSubscription(
  stripe: Stripe,
  subscription: Stripe.Subscription,
  externalEventId: string,
): Promise<NormalizedBillingEvent> {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  let userId = subscription.metadata?.userId ?? null;

  if (!userId) {
    // Fall back to the checkout session's client_reference_id for the very first event.
    const sessions = await stripe.checkout.sessions.list({ subscription: subscription.id, limit: 1 });
    userId = sessions.data[0]?.client_reference_id ?? null;
  }

  const item = subscription.items.data[0];
  return {
    externalEventId,
    provider: "stripe",
    userId,
    providerCustomerId: customerId,
    providerSubscriptionId: subscription.id,
    status: mapStatus(subscription.status),
    currentPeriodEnd: item ? new Date(item.current_period_end * 1000) : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

export const stripeAdapter: BillingProviderAdapter = {
  async createCheckoutSession(userId, returnUrl) {
    const stripe = getClient();
    if (!env.STRIPE_PRICE_ID) throw BadRequest("Stripe price is not configured on this instance");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
      client_reference_id: userId,
      subscription_data: { metadata: { userId } },
      success_url: `${returnUrl}?provider=stripe&status=success`,
      cancel_url: `${returnUrl}?provider=stripe&status=cancelled`,
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { url: session.url };
  },

  async parseWebhook(rawBody, headers) {
    const stripe = getClient();
    if (!env.STRIPE_WEBHOOK_SECRET) throw BadRequest("Stripe webhook secret is not configured on this instance");

    const signature = headers["stripe-signature"];
    if (!signature || Array.isArray(signature)) throw BadRequest("Missing Stripe-Signature header");

    const event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);

    if (event.type === "checkout.session.completed" || event.type.startsWith("customer.subscription.")) {
      const subscriptionId =
        event.type === "checkout.session.completed"
          ? ((event.data.object as Stripe.Checkout.Session).subscription as string)
          : (event.data.object as Stripe.Subscription).id;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return normalizeFromSubscription(stripe, subscription, event.id);
    }

    return null;
  },

  async cancelSubscription(providerSubscriptionId) {
    const stripe = getClient();
    await stripe.subscriptions.cancel(providerSubscriptionId);
  },
};
