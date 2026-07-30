import { create } from "zustand";
import type { Channel, CreateChannelInput } from "@nythera/shared";
import { channelsApi, dmsApi } from "../api/resources.js";
import { gatewayClient } from "../ws/gatewayClient.js";

interface ChannelsState {
  channelsByServer: Record<string, Channel[]>;
  dms: Channel[];
  activeChannelId: string | null;
  loadServerChannels: (serverId: string) => Promise<void>;
  loadDms: () => Promise<void>;
  setActiveChannel: (id: string | null) => void;
  createChannel: (serverId: string, input: CreateChannelInput) => Promise<Channel>;
  openDm: (userId: string) => Promise<Channel>;
}

export const useChannelsStore = create<ChannelsState>((set) => ({
  channelsByServer: {},
  dms: [],
  activeChannelId: null,

  loadServerChannels: async (serverId) => {
    const channels = await channelsApi.list(serverId);
    set((state) => ({ channelsByServer: { ...state.channelsByServer, [serverId]: channels } }));
  },

  loadDms: async () => {
    const dms = await dmsApi.list();
    set({ dms });
  },

  setActiveChannel: (id) => set({ activeChannelId: id }),

  createChannel: async (serverId, input) => {
    const channel = await channelsApi.create(serverId, input);
    set((state) => ({ channelsByServer: { ...state.channelsByServer, [serverId]: [...(state.channelsByServer[serverId] ?? []), channel] } }));
    return channel;
  },

  openDm: async (userId) => {
    const channel = await dmsApi.getOrCreate(userId);
    set((state) => (state.dms.some((c) => c.id === channel.id) ? state : { dms: [...state.dms, channel] }));
    return channel;
  },
}));

gatewayClient.on("CHANNEL_CREATE", ({ channel }) => {
  useChannelsStore.setState((state) => {
    if (channel.serverId) {
      const existing = state.channelsByServer[channel.serverId] ?? [];
      if (existing.some((c) => c.id === channel.id)) return state;
      return { channelsByServer: { ...state.channelsByServer, [channel.serverId]: [...existing, channel] } };
    }
    if (state.dms.some((c) => c.id === channel.id)) return state;
    return { dms: [...state.dms, channel] };
  });
});

gatewayClient.on("CHANNEL_UPDATE", ({ channel }) => {
  useChannelsStore.setState((state) => {
    if (!channel.serverId) return state;
    const existing = state.channelsByServer[channel.serverId];
    if (!existing) return state;
    return { channelsByServer: { ...state.channelsByServer, [channel.serverId]: existing.map((c) => (c.id === channel.id ? channel : c)) } };
  });
});

gatewayClient.on("CHANNEL_DELETE", ({ serverId, channelId }) => {
  useChannelsStore.setState((state) => {
    if (!serverId) return state;
    const existing = state.channelsByServer[serverId];
    if (!existing) return state;
    return {
      channelsByServer: { ...state.channelsByServer, [serverId]: existing.filter((c) => c.id !== channelId) },
      activeChannelId: state.activeChannelId === channelId ? null : state.activeChannelId,
    };
  });
});
