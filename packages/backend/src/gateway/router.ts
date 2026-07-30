import type { FastifyPluginAsync } from "fastify";
import type { WebSocket } from "ws";
import { ClientFrameSchema, Permission, type ServerFrame } from "@nythera/shared";
import { verifyAccessToken } from "../lib/jwt.js";
import { BOT_TOKEN_PREFIX } from "../lib/crypto.js";
import { getBotByToken } from "../lib/botAuth.js";
import { addConnection, isOnline, removeConnection } from "./connectionRegistry.js";
import { handleConnect, handleDisconnect } from "./presence.js";
import { broadcastToChannel } from "./broadcast.js";
import { getUserByIdOrThrow, mapUser } from "../modules/users/service.js";
import { listMemberServers } from "../modules/servers/service.js";
import { requireChannelPermission } from "../lib/permissionResolver.js";
import { createMessage } from "../modules/messages/service.js";

const IDENTIFY_TIMEOUT_MS = 10_000;

function send(socket: WebSocket, frame: ServerFrame): void {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(frame));
}

const gatewayPlugin: FastifyPluginAsync = async (app) => {
  app.get("/", { websocket: true }, (socket: WebSocket) => {
    let userId: string | undefined;
    let identified = false;

    const identifyTimer = setTimeout(() => {
      if (!identified) {
        send(socket, { op: "ERROR", d: { message: "IDENTIFY timeout" } });
        socket.close();
      }
    }, IDENTIFY_TIMEOUT_MS);

    socket.on("error", () => {
      // Swallow - the close handler below does connection-registry/presence cleanup.
    });

    socket.on("message", async (raw: Buffer) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        send(socket, { op: "ERROR", d: { message: "Invalid JSON" } });
        return;
      }

      const result = ClientFrameSchema.safeParse(parsed);
      if (!result.success) {
        send(socket, { op: "ERROR", d: { message: "Invalid frame" } });
        return;
      }
      const frame = result.data;

      if (frame.op === "IDENTIFY") {
        if (identified) return;
        let payloadUserId: string;

        if (frame.token.startsWith(BOT_TOKEN_PREFIX)) {
          const bot = await getBotByToken(frame.token);
          if (!bot) {
            send(socket, { op: "ERROR", d: { message: "Invalid or disabled bot token" } });
            socket.close();
            return;
          }
          payloadUserId = bot.botUserId;
        } else {
          try {
            payloadUserId = verifyAccessToken(frame.token).sub;
          } catch {
            send(socket, { op: "ERROR", d: { message: "Invalid or expired token" } });
            socket.close();
            return;
          }
        }
        clearTimeout(identifyTimer);
        identified = true;
        userId = payloadUserId;

        const wasAlreadyOnline = isOnline(userId);
        addConnection(userId, socket);
        handleConnect(userId, wasAlreadyOnline);

        const userRow = await getUserByIdOrThrow(userId);
        const servers = await listMemberServers(userId);
        send(socket, { op: "READY", d: { user: mapUser(userRow), servers } });
        return;
      }

      if (!identified || !userId) {
        send(socket, { op: "ERROR", d: { message: "Not identified" } });
        return;
      }

      if (frame.op === "HEARTBEAT") {
        send(socket, { op: "HEARTBEAT_ACK" });
        return;
      }

      if (frame.op === "MESSAGE_SEND") {
        try {
          await requireChannelPermission(frame.d.channelId, userId, Permission.SEND_MESSAGES);
          const message = await createMessage(frame.d.channelId, userId, frame.d.content, frame.d.replyToId ?? null);
          await broadcastToChannel(frame.d.channelId, {
            op: "DISPATCH",
            t: "MESSAGE_CREATE",
            d: { message, nonce: frame.d.nonce },
          });
        } catch (err) {
          send(socket, { op: "ERROR", d: { message: err instanceof Error ? err.message : "Failed to send message" } });
        }
        return;
      }

      if (frame.op === "TYPING_START") {
        try {
          await requireChannelPermission(frame.d.channelId, userId, Permission.SEND_MESSAGES);
          await broadcastToChannel(frame.d.channelId, {
            op: "DISPATCH",
            t: "TYPING_START",
            d: { channelId: frame.d.channelId, userId },
          });
        } catch {
          // Typing indicators are best-effort; permission failures are silently dropped.
        }
        return;
      }
    });

    socket.on("close", () => {
      clearTimeout(identifyTimer);
      if (!userId) return;
      removeConnection(userId, socket);
      if (!isOnline(userId)) handleDisconnect(userId);
    });
  });
};

export default gatewayPlugin;
