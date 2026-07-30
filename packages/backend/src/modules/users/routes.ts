import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { UpdateMeInputSchema } from "@nythera/shared";
import { getUserByIdOrThrow, mapUser, updateMe } from "./service.js";
import { presenceAudienceIds, sendToUsers } from "../../gateway/broadcast.js";
import { eraseAccount } from "../privacy/service.js";

const EraseAccountInputSchema = z.object({ password: z.string().min(1) });

const userRoutes: FastifyPluginAsync = async (app) => {
  app.get("/me", { preHandler: app.authenticate }, async (request) => {
    const row = await getUserByIdOrThrow(request.userId!);
    return mapUser(row);
  });

  app.patch("/me", { preHandler: app.authenticate }, async (request) => {
    const input = UpdateMeInputSchema.parse(request.body);
    const user = await updateMe(request.userId!, input);
    const audience = await presenceAudienceIds(request.userId!);
    sendToUsers(audience, { op: "DISPATCH", t: "USER_UPDATE", d: { user } });
    return user;
  });

  app.get<{ Params: { id: string } }>("/:id", { preHandler: app.authenticate }, async (request) => {
    const row = await getUserByIdOrThrow(request.params.id);
    return mapUser(row);
  });

  app.delete("/me", { preHandler: app.authenticate }, async (request, reply) => {
    const { password } = EraseAccountInputSchema.parse(request.body);
    const userId = request.userId!;
    await eraseAccount(userId, password);
    const anonymized = await getUserByIdOrThrow(userId);
    const audience = await presenceAudienceIds(userId);
    sendToUsers(audience, { op: "DISPATCH", t: "USER_UPDATE", d: { user: mapUser(anonymized) } });
    reply.status(204);
    return null;
  });
};

export default userRoutes;
