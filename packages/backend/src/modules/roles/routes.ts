import type { FastifyPluginAsync } from "fastify";
import { CreateRoleInputSchema, Permission, UpdateRoleInputSchema } from "@nythera/shared";
import { createRole, deleteRole, listRoles, updateRole } from "./service.js";
import { isServerMember, requireServerPermission } from "../../lib/permissionResolver.js";
import { broadcastToServer } from "../../gateway/broadcast.js";
import { NotFound } from "../../lib/errors.js";

const roleRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get<{ Params: { serverId: string } }>("/servers/:serverId/roles", async (request) => {
    if (!(await isServerMember(request.params.serverId, request.userId!))) throw NotFound("Server not found");
    return listRoles(request.params.serverId);
  });

  app.post<{ Params: { serverId: string } }>("/servers/:serverId/roles", async (request) => {
    await requireServerPermission(request.params.serverId, request.userId!, Permission.MANAGE_ROLES);
    const input = CreateRoleInputSchema.parse(request.body);
    const role = await createRole(request.params.serverId, input);
    await broadcastToServer(request.params.serverId, { op: "DISPATCH", t: "ROLE_CREATE", d: { serverId: request.params.serverId, role } });
    return role;
  });

  app.patch<{ Params: { serverId: string; roleId: string } }>("/servers/:serverId/roles/:roleId", async (request) => {
    await requireServerPermission(request.params.serverId, request.userId!, Permission.MANAGE_ROLES);
    const input = UpdateRoleInputSchema.parse(request.body);
    const role = await updateRole(request.params.serverId, request.params.roleId, input);
    await broadcastToServer(request.params.serverId, { op: "DISPATCH", t: "ROLE_UPDATE", d: { serverId: request.params.serverId, role } });
    return role;
  });

  app.delete<{ Params: { serverId: string; roleId: string } }>("/servers/:serverId/roles/:roleId", async (request, reply) => {
    await requireServerPermission(request.params.serverId, request.userId!, Permission.MANAGE_ROLES);
    await deleteRole(request.params.serverId, request.params.roleId);
    await broadcastToServer(request.params.serverId, {
      op: "DISPATCH",
      t: "ROLE_DELETE",
      d: { serverId: request.params.serverId, roleId: request.params.roleId },
    });
    reply.status(204);
    return null;
  });
};

export default roleRoutes;
