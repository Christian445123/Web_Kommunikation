import { create } from "zustand";
import type { BotApplication, CreateBotApplicationInput } from "@nythera/shared";
import { botsApi } from "../api/resources.js";

interface BotsState {
  applications: BotApplication[];
  load: () => Promise<void>;
  create: (input: CreateBotApplicationInput) => Promise<{ application: BotApplication; token: string }>;
  regenerateToken: (id: string) => Promise<string>;
  invite: (id: string, serverId: string, permissions: string) => Promise<void>;
}

export const useBotsStore = create<BotsState>((set) => ({
  applications: [],

  load: async () => {
    const applications = await botsApi.list();
    set({ applications });
  },

  create: async (input) => {
    const result = await botsApi.create(input);
    set((state) => ({ applications: [...state.applications, result.application] }));
    return result;
  },

  regenerateToken: async (id) => {
    const { token } = await botsApi.regenerateToken(id);
    return token;
  },

  invite: async (id, serverId, permissions) => {
    await botsApi.invite(id, serverId, permissions);
  },
}));
