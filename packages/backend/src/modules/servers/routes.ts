import type { FastifyPluginAsync } from "fastify";
import { CreateServerInputSchema, Permission, UpdateServerInputSchema } from "@nythera/shared";
import {
  createInvite,
  createServer,
  deleteServer,
  getServerOrThrow,
  joinViaInvite,
  kickMember,
  listMemberServers,
  listMembers,
  mapServer,
  updateMember,
  updateServer,
} from "./service.js";
import { isServerMember, requireServerPermission } from "../../lib/permissionResolver.js";
import { Forbidden, NotFound } from "../../lib/errors.js";
import { broadcastToServer } from "../../gateway/broadcast.js";
import { z } from "zod";

const JoinInputSchema = z.object({ code: z.string().min(1) });
const UpdateMemberInputSchema = z.object({
  nickname: z.string().max(64).nullable().optional(),
  roleIds: z.array(z.string().uuid()).optional(),
});

async function assertMember(serverId: string, userId: string) {
  if (!(await isServerMember(serverId, userId))) throw NotFound("Server not found");
}

const serverRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (request) => listMemberServers(request.userId!));

  app.post("/", async (request) => {
    const input = CreateServerInputSchema.parse(request.body);
    return createServer(request.userId!, input);
  });

  app.post("/join", async (request) => {
    const { code } = JoinInputSchema.parse(request.body);
    const server = await joinViaInvite(code, request.userId!);
    await broadcastToServer(server.id, {
      op: "DISPATCH",
      t: "SERVER_MEMBER_ADD",
      d: { serverId: server.id, member: (await listMembers(server.id)).find((m) => m.userId === request.userId!)! },
    });
    return server;
  });

  app.get<{ Params: { id: string } }>("/:id", async (request) => {
    await assertMember(request.params.id, request.userId!);
    return mapServer(await getServerOrThrow(request.params.id));
  });

  app.patch<{ Params: { id: string } }>("/:id", async (request) => {
    await requireServerPermission(request.params.id, request.userId!, Permission.MANAGE_SERVER);
    const input = UpdateServerInputSchema.parse(request.body);
    const server = await updateServer(request.params.id, input);
    await broadcastToServer(server.id, { op: "DISPATCH", t: "SERVER_UPDATE", d: { server } });
    return server;
  });

  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    await deleteServer(request.params.id, request.userId!);
    reply.status(204);
    return null;
  });

  app.post<{ Params: { id: string } }>("/:id/invites", async (request) => {
    await requireServerPermission(request.params.id, request.userId!, Permission.CREATE_INVITE);
    return createInvite(request.params.id, request.userId!);
  });

  app.get<{ Params: { id: string } }>("/:id/members", async (request) => {
    await assertMember(request.params.id, request.userId!);
    return listMembers(request.params.id);
  });

  app.patch<{ Params: { id: string; userId: string } }>("/:id/members/:userId", async (request) => {
    if (request.params.userId !== request.userId) {
      // Editing another member's nickname/roles requires management rights;
      // users may only rename themselves without extra permission.
      if (request.body && (request.body as { roleIds?: unknown }).roleIds !== undefined) {
        await requireServerPermission(request.params.id, request.userId!, Permission.MANAGE_ROLES);
      } else {
        throw Forbidden("Cannot edit another member's nickname");
      }
    }
    const input = UpdateMemberInputSchema.parse(request.body);
    const member = await updateMember(request.params.id, request.params.userId, input);
    await broadcastToServer(request.params.id, { op: "DISPATCH", t: "SERVER_MEMBER_UPDATE", d: { serverId: request.params.id, member } });
    return member;
  });

  app.delete<{ Params: { id: string; userId: string } }>("/:id/members/:userId", async (request, reply) => {
    await requireServerPermission(request.params.id, request.userId!, Permission.KICK_MEMBERS);
    await kickMember(request.params.id, request.params.userId);
    await broadcastToServer(request.params.id, {
      op: "DISPATCH",
      t: "SERVER_MEMBER_REMOVE",
      d: { serverId: request.params.id, userId: request.params.userId },
    });
    reply.status(204);
    return null;
  });
};

export default serverRoutes;
