import type { FastifyPluginAsync } from "fastify";
import { CreateBotApplicationInputSchema, InviteBotInputSchema } from "@nythera/shared";
import { createApplication, getMyApplicationOrThrow, inviteBotToServer, listMyApplications, regenerateToken } from "./service.js";
import { Forbidden } from "../../lib/errors.js";

const botRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", async (request) => {
    // Only human developers manage applications - a bot token cannot create/manage bots.
    if (request.actorType === "bot") throw Forbidden("Bots cannot manage developer applications");
  });

  app.get("/applications", async (request) => listMyApplications(request.userId!));

  app.post("/applications", async (request) => {
    const input = CreateBotApplicationInputSchema.parse(request.body);
    return createApplication(request.userId!, input);
  });

  app.get<{ Params: { id: string } }>("/applications/:id", async (request) => getMyApplicationOrThrow(request.params.id, request.userId!));

  app.post<{ Params: { id: string } }>("/applications/:id/token/regenerate", async (request) => {
    await getMyApplicationOrThrow(request.params.id, request.userId!);
    const token = await regenerateToken(request.params.id, request.userId!);
    return { token };
  });

  app.post<{ Params: { id: string } }>("/applications/:id/invite", async (request) => {
    await getMyApplicationOrThrow(request.params.id, request.userId!);
    const input = InviteBotInputSchema.parse(request.body);
    await inviteBotToServer(request.params.id, input.serverId, input.permissions, request.userId!);
    return { ok: true };
  });
};

export default botRoutes;
