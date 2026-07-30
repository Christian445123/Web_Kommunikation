import { env } from "../../../config/env.js";
import { BadRequest, Unauthorized } from "../../../lib/errors.js";
import type { BillingProviderAdapter, NormalizedBillingEvent } from "./types.js";

function requireConfig(): { clientId: string; clientSecret: string; planId: string; webhookId: string } {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET || !env.PAYPAL_PLAN_ID || !env.PAYPAL_WEBHOOK_ID) {
    throw BadRequest("PayPal is not configured on this instance");
  }
  return {
    clientId: env.PAYPAL_CLIENT_ID,
    clientSecret: env.PAYPAL_CLIENT_SECRET,
    planId: env.PAYPAL_PLAN_ID,
    webhookId: env.PAYPAL_WEBHOOK_ID,
  };
}

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(`${env.PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal OAuth failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

function mapStatus(status: string): NormalizedBillingEvent["status"] {
  switch (status) {
    case "ACTIVE":
      return "active";
    case "SUSPENDED":
      return "past_due";
    case "CANCELLED":
    case "EXPIRED":
      return "canceled";
    default:
      return "incomplete";
  }
}

interface PayPalSubscriptionResource {
  id: string;
  status: string;
  custom_id?: string;
  subscriber?: { payer_id?: string };
  billing_info?: { next_billing_time?: string };
}

export const paypalAdapter: BillingProviderAdapter = {
  async createCheckoutSession(userId, returnUrl) {
    const { clientId, clientSecret, planId } = requireConfig();
    const accessToken = await getAccessToken(clientId, clientSecret);

    const res = await fetch(`${env.PAYPAL_API_BASE}/v1/billing/subscriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: userId,
        application_context: {
          return_url: `${returnUrl}?provider=paypal&status=success`,
          cancel_url: `${returnUrl}?provider=paypal&status=cancelled`,
          user_action: "SUBSCRIBE_NOW",
        },
      }),
    });
    if (!res.ok) throw new Error(`PayPal subscription creation failed: ${res.status} ${await res.text()}`);

    const data = (await res.json()) as { links: { rel: string; href: string }[] };
    const approveLink = data.links.find((l) => l.rel === "approve");
    if (!approveLink) throw new Error("PayPal did not return an approval URL");
    return { url: approveLink.href };
  },

  async parseWebhook(rawBody, headers) {
    const { clientId, clientSecret, webhookId } = requireConfig();
    const accessToken = await getAccessToken(clientId, clientSecret);

    const webhookEvent = JSON.parse(rawBody.toString()) as {
      id: string;
      event_type: string;
      resource: PayPalSubscriptionResource;
    };

    const verifyRes = await fetch(`${env.PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        transmission_id: headers["paypal-transmission-id"],
        transmission_time: headers["paypal-transmission-time"],
        cert_url: headers["paypal-cert-url"],
        auth_algo: headers["paypal-auth-algo"],
        transmission_sig: headers["paypal-transmission-sig"],
        webhook_id: webhookId,
        webhook_event: webhookEvent,
      }),
    });
    const verification = (await verifyRes.json()) as { verification_status: string };
    if (verification.verification_status !== "SUCCESS") throw Unauthorized("Invalid PayPal webhook signature");

    const relevantEventTypes = [
      "BILLING.SUBSCRIPTION.ACTIVATED",
      "BILLING.SUBSCRIPTION.UPDATED",
      "BILLING.SUBSCRIPTION.CANCELLED",
      "BILLING.SUBSCRIPTION.SUSPENDED",
      "BILLING.SUBSCRIPTION.EXPIRED",
    ];
    if (!relevantEventTypes.includes(webhookEvent.event_type)) return null;

    const resource = webhookEvent.resource;
    return {
      externalEventId: webhookEvent.id,
      provider: "paypal",
      userId: resource.custom_id ?? null,
      providerCustomerId: resource.subscriber?.payer_id ?? "unknown",
      providerSubscriptionId: resource.id,
      status: mapStatus(resource.status),
      currentPeriodEnd: resource.billing_info?.next_billing_time ? new Date(resource.billing_info.next_billing_time) : null,
      cancelAtPeriodEnd: webhookEvent.event_type === "BILLING.SUBSCRIPTION.CANCELLED",
    };
  },

  async cancelSubscription(providerSubscriptionId) {
    const { clientId, clientSecret } = requireConfig();
    const accessToken = await getAccessToken(clientId, clientSecret);
    const res = await fetch(`${env.PAYPAL_API_BASE}/v1/billing/subscriptions/${providerSubscriptionId}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "User requested cancellation" }),
    });
    if (!res.ok && res.status !== 204) throw new Error(`PayPal cancellation failed: ${res.status}`);
  },
};
