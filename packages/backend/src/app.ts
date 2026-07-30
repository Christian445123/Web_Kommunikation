import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import sensible from "@fastify/sensible";
import websocket from "@fastify/websocket";
import { env } from "./config/env.js";
import { AppError } from "./lib/errors.js";
import authPlugin from "./plugins/auth.js";
import authRoutes from "./modules/auth/routes.js";
import userRoutes from "./modules/users/routes.js";
import serverRoutes from "./modules/servers/routes.js";
import roleRoutes from "./modules/roles/routes.js";
import channelRoutes from "./modules/channels/routes.js";
import messageRoutes from "./modules/messages/routes.js";
import dmRoutes from "./modules/dms/routes.js";
import gatewayPlugin from "./gateway/router.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "development" ? "info" : "warn",
    },
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(","),
    credentials: true,
  });
  await app.register(cookie);
  await app.register(sensible);
  await app.register(websocket);
  await app.register(authPlugin);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({ error: error.message, code: error.code });
      return;
    }
    if (error.validation) {
      reply.status(400).send({ error: "Validation failed", details: error.validation });
      return;
    }
    app.log.error(error);
    reply.status(500).send({ error: "Internal server error" });
  });

  await app.register(
    async (api) => {
      await api.register(authRoutes, { prefix: "/auth" });
      await api.register(userRoutes, { prefix: "/users" });
      await api.register(serverRoutes, { prefix: "/servers" });
      await api.register(roleRoutes);
      await api.register(channelRoutes);
      await api.register(messageRoutes);
      await api.register(dmRoutes, { prefix: "/dms" });
    },
    { prefix: "/api/v1" },
  );

  await app.register(gatewayPlugin, { prefix: "/gateway" });

  return app;
}
