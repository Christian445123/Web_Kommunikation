import { create } from "zustand";
import type { BillingProvider, PlanTier, Subscription } from "@nythera/shared";
import { MESSAGE_CHAR_LIMITS } from "@nythera/shared";
import { billingApi } from "../api/resources.js";
import { gatewayClient } from "../ws/gatewayClient.js";
import { useAuthStore } from "./auth.js";

interface BillingState {
  plan: PlanTier;
  messageCharLimit: number;
  subscription: Subscription | null;
  load: () => Promise<void>;
  startCheckout: (provider: BillingProvider) => Promise<void>;
  cancel: () => Promise<void>;
}

export const useBillingStore = create<BillingState>((set) => ({
  plan: "free",
  messageCharLimit: MESSAGE_CHAR_LIMITS.free,
  subscription: null,

  load: async () => {
    const info = await billingApi.me();
    set(info);
  },

  startCheckout: async (provider) => {
    const { url } = await billingApi.checkout(provider);
    window.location.href = url;
  },

  cancel: async () => {
    await billingApi.cancel();
    const info = await billingApi.me();
    set(info);
  },
}));

gatewayClient.on("BILLING_UPDATE", ({ userId, plan }) => {
  const me = useAuthStore.getState().user;
  if (me && me.id === userId) {
    useBillingStore.setState({ plan, messageCharLimit: MESSAGE_CHAR_LIMITS[plan] });
  }
});
