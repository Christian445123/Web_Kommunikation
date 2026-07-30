import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { getOrCreateDm, listMyDms } from "./service.js";
import { sendToUsers } from "../../gateway/broadcast.js";

const CreateDmInputSchema = z.object({ userId: z.string().uuid() });

const dmRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (request) => listMyDms(request.userId!));

  app.post("/", async (request) => {
    const { userId: otherUserId } = CreateDmInputSchema.parse(request.body);
    const channel = await getOrCreateDm(request.userId!, otherUserId);
    sendToUsers([request.userId!, otherUserId], { op: "DISPATCH", t: "CHANNEL_CREATE", d: { channel } });
    return channel;
  });
};

export default dmRoutes;
