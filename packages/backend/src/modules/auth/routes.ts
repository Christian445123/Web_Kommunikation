import type { FastifyPluginAsync } from "fastify";
import { RegisterInputSchema, LoginInputSchema } from "@nythera/shared";
import { register, login, refresh, logoutByRefreshToken } from "./service.js";
import { parseDurationMs } from "../../lib/duration.js";
import { env } from "../../config/env.js";
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH } from "../../lib/constants.js";
import { Unauthorized } from "../../lib/errors.js";
import type { FastifyReply } from "fastify";

function setRefreshCookie(reply: FastifyReply, token: string) {
  reply.setCookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: REFRESH_COOKIE_PATH,
    maxAge: parseDurationMs(env.JWT_REFRESH_TTL) / 1000,
  });
}

function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
}

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/register", async (request, reply) => {
    const input = RegisterInputSchema.parse(request.body);
    const result = await register(input, request.headers["user-agent"], request.ip);
    setRefreshCookie(reply, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  });

  app.post("/login", async (request, reply) => {
    const input = LoginInputSchema.parse(request.body);
    const result = await login(input, request.headers["user-agent"]);
    setRefreshCookie(reply, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  });

  app.post("/refresh", async (request, reply) => {
    const token = request.cookies[REFRESH_COOKIE_NAME];
    if (!token) throw Unauthorized("Missing refresh token");
    const result = await refresh(token);
    setRefreshCookie(reply, result.refreshToken);
    return { accessToken: result.accessToken };
  });

  app.post("/logout", async (request, reply) => {
    const token = request.cookies[REFRESH_COOKIE_NAME];
    if (token) await logoutByRefreshToken(token);
    clearRefreshCookie(reply);
    return { ok: true };
  });
};

export default authRoutes;
