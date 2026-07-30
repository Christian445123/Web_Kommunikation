import fp from "fastify-plugin";
import type { FastifyRequest, FastifyReply } from "fastify";
import { verifyAccessToken } from "../lib/jwt.js";
import { Unauthorized } from "../lib/errors.js";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
    sessionId?: string;
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
    try {
      const payload = verifyAccessToken(token);
      request.userId = payload.sub;
      request.sessionId = payload.sid;
    } catch {
      throw Unauthorized("Invalid or expired access token");
    }
  });
});
