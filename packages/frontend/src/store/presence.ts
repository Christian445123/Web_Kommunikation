import { create } from "zustand";
import type { PresenceStatus } from "@nythera/shared";
import { gatewayClient } from "../ws/gatewayClient.js";

interface PresenceState {
  statusByUser: Record<string, PresenceStatus>;
}

export const usePresenceStore = create<PresenceState>(() => ({
  statusByUser: {},
}));

gatewayClient.on("PRESENCE_UPDATE", ({ userId, status }) => {
  usePresenceStore.setState((state) => ({ statusByUser: { ...state.statusByUser, [userId]: status } }));
});
