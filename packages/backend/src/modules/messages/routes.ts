import type { FastifyPluginAsync } from "fastify";
import { CreateMessageInputSchema, MessagePageQuerySchema, Permission, UpdateMessageInputSchema, hasPermission } from "@nythera/shared";
import { createMessage, deleteMessage, getMessageOrThrow, listChannelMessages, updateMessage } from "./service.js";
import { getChannelPermissions, requireChannelPermission } from "../../lib/permissionResolver.js";
import { broadcastToChannel } from "../../gateway/broadcast.js";

const messageRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get<{ Params: { id: string }; Querystring: Record<string, string> }>("/channels/:id/messages", async (request) => {
    await requireChannelPermission(request.params.id, request.userId!, Permission.VIEW_CHANNEL);
    const query = MessagePageQuerySchema.parse(request.query);
    return listChannelMessages(request.params.id, query);
  });

  app.post<{ Params: { id: string } }>("/channels/:id/messages", async (request) => {
    await requireChannelPermission(request.params.id, request.userId!, Permission.SEND_MESSAGES);
    const input = CreateMessageInputSchema.parse(request.body);
    const message = await createMessage(request.params.id, request.userId!, input.content, input.replyToId ?? null);
    await broadcastToChannel(request.params.id, { op: "DISPATCH", t: "MESSAGE_CREATE", d: { message } });
    return message;
  });

  app.patch<{ Params: { id: string } }>("/messages/:id", async (request) => {
    const input = UpdateMessageInputSchema.parse(request.body);
    const message = await updateMessage(request.params.id, request.userId!, input.content);
    await broadcastToChannel(message.channelId, { op: "DISPATCH", t: "MESSAGE_UPDATE", d: { message } });
    return message;
  });

  app.delete<{ Params: { id: string } }>("/messages/:id", async (request, reply) => {
    const existing = await getMessageOrThrow(request.params.id);
    const canManageMessages =
      existing.authorId === request.userId
        ? true
        : hasPermission(await getChannelPermissions(existing.channelId, request.userId!), Permission.MANAGE_MESSAGES);

    const { channelId } = await deleteMessage(request.params.id, request.userId!, canManageMessages);
    await broadcastToChannel(channelId, { op: "DISPATCH", t: "MESSAGE_DELETE", d: { channelId, messageId: request.params.id } });
    reply.status(204);
    return null;
  });
};

export default messageRoutes;
