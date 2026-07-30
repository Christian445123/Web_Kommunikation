import { create } from "zustand";
import type { LoginInput, RegisterInput, User } from "@nythera/shared";
import { login as apiLogin, logout as apiLogout, register as apiRegister, usersApi } from "../api/resources.js";
import { setUnauthenticatedHandler } from "../api/client.js";
import { gatewayClient } from "../ws/gatewayClient.js";

interface AuthState {
  user: User | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
  error: string | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "idle",
  error: null,

  login: async (input) => {
    set({ status: "loading", error: null });
    try {
      const { user } = await apiLogin(input);
      set({ user, status: "authenticated" });
      gatewayClient.connect();
    } catch (err) {
      set({ status: "unauthenticated", error: err instanceof Error ? err.message : "Login failed" });
      throw err;
    }
  },

  register: async (input) => {
    set({ status: "loading", error: null });
    try {
      const { user } = await apiRegister(input);
      set({ user, status: "authenticated" });
      gatewayClient.connect();
    } catch (err) {
      set({ status: "unauthenticated", error: err instanceof Error ? err.message : "Registration failed" });
      throw err;
    }
  },

  logout: async () => {
    await apiLogout();
    gatewayClient.disconnect();
    set({ user: null, status: "unauthenticated" });
  },

  // Runs once on app load: relies on apiFetch's transparent 401 -> refresh-cookie flow.
  bootstrap: async () => {
    set({ status: "loading" });
    try {
      const user = await usersApi.me();
      set({ user, status: "authenticated" });
      gatewayClient.connect();
    } catch {
      set({ user: null, status: "unauthenticated" });
    }
  },
}));

setUnauthenticatedHandler(() => {
  useAuthStore.setState({ user: null, status: "unauthenticated" });
  gatewayClient.disconnect();
});
