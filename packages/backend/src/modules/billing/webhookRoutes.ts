import type { FastifyPluginAsync } from "fastify";
import { handleWebhookEvent } from "./service.js";

/**
 * Public (no app.authenticate) - provider-signature-verified instead. Registered as a
 * sibling of the authenticated billingRoutes plugin (never nested inside it), so this raw-body
 * content-type parser never affects the JSON routes in modules/billing/routes.ts.
 */
const billingWebhookRoutes: FastifyPluginAsync = async (app) => {
  app.addContentTypeParser("application/json", { parseAs: "buffer" }, (_req, body, done) => {
    done(null, body);
  });

  app.post("/stripe", async (request, reply) => {
    await handleWebhookEvent("stripe", request.body as Buffer, request.headers);
    reply.status(200).send({ received: true });
  });

  app.post("/paypal", async (request, reply) => {
    await handleWebhookEvent("paypal", request.body as Buffer, request.headers);
    reply.status(200).send({ received: true });
  });
};

export default billingWebhookRoutes;
