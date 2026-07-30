import type { FastifyPluginAsync } from "fastify";
import { CreateCheckoutInputSchema } from "@nythera/shared";
import { cancelSubscriptionForUser, createCheckoutSession, getBillingInfoForUser } from "./service.js";
import { env } from "../../config/env.js";

function resolvePublicUrl(request: { protocol: string; hostname: string }): string {
  return env.APP_PUBLIC_URL ?? `${request.protocol}://${request.hostname}`;
}

const billingRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/me", async (request) => getBillingInfoForUser(request.userId!));

  app.post("/checkout", async (request) => {
    const { provider } = CreateCheckoutInputSchema.parse(request.body);
    const returnUrl = `${resolvePublicUrl(request)}/billing/success`;
    return createCheckoutSession(request.userId!, provider, returnUrl);
  });

  app.post("/cancel", async (request) => {
    await cancelSubscriptionForUser(request.userId!);
    return { ok: true };
  });
};

export default billingRoutes;
