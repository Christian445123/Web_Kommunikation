import { create } from "zustand";
import type { Message } from "@nythera/shared";
import { messagesApi } from "../api/resources.js";
import { gatewayClient } from "../ws/gatewayClient.js";

const TYPING_TTL_MS = 6_000;
const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

interface MessagesState {
  messagesByChannel: Record<string, Message[]>;
  typingByChannel: Record<string, string[]>;
  loadHistory: (channelId: string) => Promise<void>;
  sendMessage: (channelId: string, content: string) => void;
  notifyTyping: (channelId: string) => void;
}

export const useMessagesStore = create<MessagesState>((set) => ({
  messagesByChannel: {},
  typingByChannel: {},

  loadHistory: async (channelId) => {
    const page = await messagesApi.list(channelId); // newest-first
    set((state) => ({ messagesByChannel: { ...state.messagesByChannel, [channelId]: [...page].reverse() } }));
  },

  sendMessage: (channelId, content) => {
    gatewayClient.sendFrame({ op: "MESSAGE_SEND", d: { channelId, content } });
  },

  notifyTyping: (channelId) => {
    gatewayClient.sendFrame({ op: "TYPING_START", d: { channelId } });
  },
}));

gatewayClient.on("MESSAGE_CREATE", ({ message }) => {
  useMessagesStore.setState((state) => {
    const existing = state.messagesByChannel[message.channelId] ?? [];
    if (existing.some((m) => m.id === message.id)) return state;
    return { messagesByChannel: { ...state.messagesByChannel, [message.channelId]: [...existing, message] } };
  });
});

gatewayClient.on("MESSAGE_UPDATE", ({ message }) => {
  useMessagesStore.setState((state) => {
    const existing = state.messagesByChannel[message.channelId];
    if (!existing) return state;
    return { messagesByChannel: { ...state.messagesByChannel, [message.channelId]: existing.map((m) => (m.id === message.id ? message : m)) } };
  });
});

gatewayClient.on("MESSAGE_DELETE", ({ channelId, messageId }) => {
  useMessagesStore.setState((state) => {
    const existing = state.messagesByChannel[channelId];
    if (!existing) return state;
    return { messagesByChannel: { ...state.messagesByChannel, [channelId]: existing.filter((m) => m.id !== messageId) } };
  });
});

gatewayClient.on("TYPING_START", ({ channelId, userId }) => {
  useMessagesStore.setState((state) => {
    const current = state.typingByChannel[channelId] ?? [];
    return { typingByChannel: { ...state.typingByChannel, [channelId]: current.includes(userId) ? current : [...current, userId] } };
  });

  const key = `${channelId}:${userId}`;
  const existingTimer = typingTimers.get(key);
  if (existingTimer) clearTimeout(existingTimer);
  typingTimers.set(
    key,
    setTimeout(() => {
      typingTimers.delete(key);
      useMessagesStore.setState((state) => {
        const current = state.typingByChannel[channelId];
        if (!current) return state;
        return { typingByChannel: { ...state.typingByChannel, [channelId]: current.filter((id) => id !== userId) } };
      });
    }, TYPING_TTL_MS),
  );
});
