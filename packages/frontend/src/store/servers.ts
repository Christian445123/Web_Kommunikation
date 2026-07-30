import { create } from "zustand";
import type { CreateRoleInput, Role, Server, ServerMember, UpdateRoleInput, UpdateServerInput } from "@nythera/shared";
import { rolesApi, serversApi } from "../api/resources.js";
import { gatewayClient } from "../ws/gatewayClient.js";
import { useAuthStore } from "./auth.js";

interface ServersState {
  servers: Server[];
  activeServerId: string | null;
  membersByServer: Record<string, ServerMember[]>;
  rolesByServer: Record<string, Role[]>;
  load: () => Promise<void>;
  setActiveServer: (id: string | null) => void;
  loadMembersAndRoles: (serverId: string) => Promise<void>;
  createServer: (name: string) => Promise<Server>;
  joinServer: (code: string) => Promise<Server>;
  updateServer: (serverId: string, input: UpdateServerInput) => Promise<Server>;
  createRole: (serverId: string, input: CreateRoleInput) => Promise<Role>;
  updateRole: (serverId: string, roleId: string, input: UpdateRoleInput) => Promise<Role>;
  deleteRole: (serverId: string, roleId: string) => Promise<void>;
}

export const useServersStore = create<ServersState>((set) => ({
  servers: [],
  activeServerId: null,
  membersByServer: {},
  rolesByServer: {},

  load: async () => {
    const servers = await serversApi.list();
    set({ servers });
  },

  setActiveServer: (id) => set({ activeServerId: id }),

  loadMembersAndRoles: async (serverId) => {
    const [members, roles] = await Promise.all([serversApi.members(serverId), serversApi.roles(serverId)]);
    set((state) => ({
      membersByServer: { ...state.membersByServer, [serverId]: members },
      rolesByServer: { ...state.rolesByServer, [serverId]: roles },
    }));
  },

  createServer: async (name) => {
    const server = await serversApi.create({ name });
    set((state) => ({ servers: [...state.servers, server] }));
    return server;
  },

  joinServer: async (code) => {
    const server = await serversApi.join(code);
    set((state) => (state.servers.some((s) => s.id === server.id) ? state : { servers: [...state.servers, server] }));
    return server;
  },

  updateServer: async (serverId, input) => {
    const server = await serversApi.update(serverId, input);
    set((state) => ({ servers: state.servers.map((s) => (s.id === server.id ? server : s)) }));
    return server;
  },

  createRole: async (serverId, input) => {
    const role = await rolesApi.create(serverId, input);
    set((state) => {
      const existing = state.rolesByServer[serverId] ?? [];
      if (existing.some((r) => r.id === role.id)) return state;
      return { rolesByServer: { ...state.rolesByServer, [serverId]: [...existing, role] } };
    });
    return role;
  },

  updateRole: async (serverId, roleId, input) => {
    const role = await rolesApi.update(serverId, roleId, input);
    set((state) => ({
      rolesByServer: { ...state.rolesByServer, [serverId]: (state.rolesByServer[serverId] ?? []).map((r) => (r.id === role.id ? role : r)) },
    }));
    return role;
  },

  deleteRole: async (serverId, roleId) => {
    await rolesApi.delete(serverId, roleId);
    set((state) => ({
      rolesByServer: { ...state.rolesByServer, [serverId]: (state.rolesByServer[serverId] ?? []).filter((r) => r.id !== roleId) },
    }));
  },
}));

gatewayClient.onReady(({ servers }) => {
  useServersStore.setState({ servers });
});

gatewayClient.on("SERVER_UPDATE", ({ server }) => {
  useServersStore.setState((state) => ({
    servers: state.servers.map((s) => (s.id === server.id ? server : s)),
  }));
});

gatewayClient.on("SERVER_MEMBER_ADD", ({ serverId, member }) => {
  useServersStore.setState((state) => {
    if (!state.membersByServer[serverId]) return state;
    return { membersByServer: { ...state.membersByServer, [serverId]: [...state.membersByServer[serverId]!, member] } };
  });
});

gatewayClient.on("SERVER_MEMBER_UPDATE", ({ serverId, member }) => {
  useServersStore.setState((state) => {
    if (!state.membersByServer[serverId]) return state;
    return {
      membersByServer: {
        ...state.membersByServer,
        [serverId]: state.membersByServer[serverId]!.map((m) => (m.userId === member.userId ? member : m)),
      },
    };
  });
});

gatewayClient.on("SERVER_MEMBER_REMOVE", ({ serverId, userId }) => {
  const me = useAuthStore.getState().user?.id;
  if (userId === me) {
    useServersStore.setState((state) => ({ servers: state.servers.filter((s) => s.id !== serverId) }));
    return;
  }
  useServersStore.setState((state) => {
    if (!state.membersByServer[serverId]) return state;
    return { membersByServer: { ...state.membersByServer, [serverId]: state.membersByServer[serverId]!.filter((m) => m.userId !== userId) } };
  });
});

gatewayClient.on("ROLE_CREATE", ({ serverId, role }) => {
  useServersStore.setState((state) => {
    const existing = state.rolesByServer[serverId] ?? [];
    if (existing.some((r) => r.id === role.id)) return state;
    return { rolesByServer: { ...state.rolesByServer, [serverId]: [...existing, role] } };
  });
});

gatewayClient.on("ROLE_UPDATE", ({ serverId, role }) => {
  useServersStore.setState((state) => ({
    rolesByServer: { ...state.rolesByServer, [serverId]: (state.rolesByServer[serverId] ?? []).map((r) => (r.id === role.id ? role : r)) },
  }));
});

gatewayClient.on("ROLE_DELETE", ({ serverId, roleId }) => {
  useServersStore.setState((state) => ({
    rolesByServer: { ...state.rolesByServer, [serverId]: (state.rolesByServer[serverId] ?? []).filter((r) => r.id !== roleId) },
  }));
});
