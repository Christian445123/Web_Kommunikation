import type { FastifyPluginAsync } from "fastify";
import { CreateChannelInputSchema, Permission, UpdateChannelInputSchema } from "@nythera/shared";
import { createChannel, deleteChannel, getChannelOrThrow, listServerChannels, updateChannel } from "./service.js";
import { isServerMember, requireServerPermission } from "../../lib/permissionResolver.js";
import { broadcastToServer } from "../../gateway/broadcast.js";
import { NotFound, BadRequest } from "../../lib/errors.js";

const channelRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get<{ Params: { serverId: string } }>("/servers/:serverId/channels", async (request) => {
    if (!(await isServerMember(request.params.serverId, request.userId!))) throw NotFound("Server not found");
    return listServerChannels(request.params.serverId);
  });

  app.post<{ Params: { serverId: string } }>("/servers/:serverId/channels", async (request) => {
    await requireServerPermission(request.params.serverId, request.userId!, Permission.MANAGE_CHANNELS);
    const input = CreateChannelInputSchema.parse(request.body);
    const channel = await createChannel(request.params.serverId, input);
    await broadcastToServer(request.params.serverId, { op: "DISPATCH", t: "CHANNEL_CREATE", d: { channel } });
    return channel;
  });

  app.patch<{ Params: { id: string } }>("/channels/:id", async (request) => {
    const existing = await getChannelOrThrow(request.params.id);
    if (!existing.serverId) throw BadRequest("Cannot modify a DM channel");
    await requireServerPermission(existing.serverId, request.userId!, Permission.MANAGE_CHANNELS);
    const input = UpdateChannelInputSchema.parse(request.body);
    const channel = await updateChannel(request.params.id, input);
    await broadcastToServer(existing.serverId, { op: "DISPATCH", t: "CHANNEL_UPDATE", d: { channel } });
    return channel;
  });

  app.delete<{ Params: { id: string } }>("/channels/:id", async (request, reply) => {
    const existing = await getChannelOrThrow(request.params.id);
    if (!existing.serverId) throw BadRequest("Cannot delete a DM channel");
    await requireServerPermission(existing.serverId, request.userId!, Permission.MANAGE_CHANNELS);
    await deleteChannel(request.params.id);
    await broadcastToServer(existing.serverId, { op: "DISPATCH", t: "CHANNEL_DELETE", d: { serverId: existing.serverId, channelId: request.params.id } });
    reply.status(204);
    return null;
  });
};

export default channelRoutes;
