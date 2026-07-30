import type { FastifyPluginAsync } from "fastify";
import { UpdateMeInputSchema } from "@nythera/shared";
import { getUserByIdOrThrow, mapUser, updateMe } from "./service.js";

const userRoutes: FastifyPluginAsync = async (app) => {
  app.get("/me", { preHandler: app.authenticate }, async (request) => {
    const row = await getUserByIdOrThrow(request.userId!);
    return mapUser(row);
  });

  app.patch("/me", { preHandler: app.authenticate }, async (request) => {
    const input = UpdateMeInputSchema.parse(request.body);
    return updateMe(request.userId!, input);
  });

  app.get<{ Params: { id: string } }>("/:id", { preHandler: app.authenticate }, async (request) => {
    const row = await getUserByIdOrThrow(request.params.id);
    return mapUser(row);
  });
};

export default userRoutes;
