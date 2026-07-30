import { z } from "zod";

/**
 * The paid plan's *only* effect is a higher per-message character limit - no permission,
 * role, or other server-side advantage is ever gated behind payment (see project plan).
 */
export type PlanTier = "free" | "supporter";

export const MESSAGE_CHAR_LIMITS: Record<PlanTier, number> = {
  free: 4000,
  supporter: 10000,
};

// Static sanity/DoS ceiling used by shared zod schemas (which can't do an async plan lookup).
// The *actual* per-user entitlement is enforced dynamically in modules/billing/service.ts.
export const MAX_MESSAGE_LENGTH_CEILING = Math.max(...Object.values(MESSAGE_CHAR_LIMITS));

export const BillingProviderSchema = z.enum(["stripe", "paypal"]);
export type BillingProvider = z.infer<typeof BillingProviderSchema>;

export const SubscriptionStatusSchema = z.enum(["active", "past_due", "canceled", "incomplete"]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const SubscriptionSchema = z.object({
  provider: BillingProviderSchema,
  plan: z.enum(["free", "supporter"]),
  status: SubscriptionStatusSchema,
  currentPeriodEnd: z.string().datetime().nullable(),
  cancelAtPeriodEnd: z.boolean(),
});
export type Subscription = z.infer<typeof SubscriptionSchema>;

export const BillingMeResponseSchema = z.object({
  plan: z.enum(["free", "supporter"]),
  messageCharLimit: z.number().int(),
  subscription: SubscriptionSchema.nullable(),
});
export type BillingMeResponse = z.infer<typeof BillingMeResponseSchema>;

export const CreateCheckoutInputSchema = z.object({
  provider: BillingProviderSchema,
});
export type CreateCheckoutInput = z.infer<typeof CreateCheckoutInputSchema>;
