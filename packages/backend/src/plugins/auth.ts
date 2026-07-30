import fp from "fastify-plugin";
import type { FastifyRequest, FastifyReply } from "fastify";
import { verifyAccessToken } from "../lib/jwt.js";
import { BOT_TOKEN_PREFIX } from "../lib/crypto.js";
import { getBotByToken } from "../lib/botAuth.js";
import { Unauthorized } from "../lib/errors.js";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
    sessionId?: string;
    actorType?: "user" | "bot";
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

export default fp(async (fastify) => {
  fastify.decorate("authenticate", async (request: FastifyRequest, _reply: FastifyReply) => {
    const token = extractBearerToken(request);
    if (!token) throw Unauthorized("Missing access token");

    // Dispatch on token shape, not on header/scheme - both kinds arrive as `Bearer <token>`.
    if (token.startsWith(BOT_TOKEN_PREFIX)) {
      const bot = await getBotByToken(token);
      if (!bot) throw Unauthorized("Invalid or disabled bot token");
      request.userId = bot.botUserId;
      request.actorType = "bot";
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      request.userId = payload.sub;
      request.sessionId = payload.sid;
      request.actorType = "user";
    } catch {
      throw Unauthorized("Invalid or expired access token");
    }
  });
});
