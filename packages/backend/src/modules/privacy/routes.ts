import type { FastifyPluginAsync } from "fastify";
import { exportUserData } from "./service.js";

const privacyRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/export", async (request, reply) => {
    const data = await exportUserData(request.userId!);
    reply.header("Content-Disposition", `attachment; filename="nythera-data-export.json"`);
    return data;
  });
};

export default privacyRoutes;
