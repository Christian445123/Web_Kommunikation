import type { BillingProvider, SubscriptionStatus } from "@nythera/shared";

export interface NormalizedBillingEvent {
  externalEventId: string;
  provider: BillingProvider;
  /** Resolved from checkout metadata (client_reference_id / custom_id) - null if unresolvable. */
  userId: string | null;
  providerCustomerId: string;
  providerSubscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface BillingProviderAdapter {
  createCheckoutSession(userId: string, returnUrl: string): Promise<{ url: string }>;
  /** Returns null for a verified-but-irrelevant event type - callers must treat that as a
   *  successful no-op (return 2xx), not an error, or the provider will keep retrying forever. */
  parseWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): Promise<NormalizedBillingEvent | null>;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
}
