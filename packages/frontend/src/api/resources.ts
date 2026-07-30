import type {
  Channel,
  CreateChannelInput,
  CreateRoleInput,
  CreateServerInput,
  Invite,
  LoginInput,
  Message,
  RegisterInput,
  Role,
  Server,
  ServerMember,
  UpdateMeInput,
  UpdateRoleInput,
  UpdateServerInput,
  User,
} from "@nythera/shared";
import { apiFetch, setAccessToken } from "./client.js";

export async function register(input: RegisterInput): Promise<{ user: User; accessToken: string }> {
  const result = await apiFetch<{ user: User; accessToken: string }>("/auth/register", { method: "POST", body: input });
  setAccessToken(result.accessToken);
  return result;
}

export async function login(input: LoginInput): Promise<{ user: User; accessToken: string }> {
  const result = await apiFetch<{ user: User; accessToken: string }>("/auth/login", { method: "POST", body: input });
  setAccessToken(result.accessToken);
  return result;
}

export async function logout(): Promise<void> {
  await apiFetch("/auth/logout", { method: "POST" });
  setAccessToken(null);
}

export const usersApi = {
  me: () => apiFetch<User>("/users/me"),
  get: (id: string) => apiFetch<User>(`/users/${id}`),
  updateMe: (input: UpdateMeInput) => apiFetch<User>("/users/me", { method: "PATCH", body: input }),
  eraseMe: (password: string) => apiFetch<void>("/users/me", { method: "DELETE", body: { password } }),
};

export const serversApi = {
  list: () => apiFetch<Server[]>("/servers"),
  create: (input: CreateServerInput) => apiFetch<Server>("/servers", { method: "POST", body: input }),
  get: (id: string) => apiFetch<Server>(`/servers/${id}`),
  update: (id: string, input: UpdateServerInput) => apiFetch<Server>(`/servers/${id}`, { method: "PATCH", body: input }),
  join: (code: string) => apiFetch<Server>("/servers/join", { method: "POST", body: { code } }),
  createInvite: (id: string) => apiFetch<Invite>(`/servers/${id}/invites`, { method: "POST" }),
  members: (id: string) => apiFetch<ServerMember[]>(`/servers/${id}/members`),
  roles: (id: string) => apiFetch<Role[]>(`/servers/${id}/roles`),
};

export const rolesApi = {
  create: (serverId: string, input: CreateRoleInput) => apiFetch<Role>(`/servers/${serverId}/roles`, { method: "POST", body: input }),
  update: (serverId: string, roleId: string, input: UpdateRoleInput) =>
    apiFetch<Role>(`/servers/${serverId}/roles/${roleId}`, { method: "PATCH", body: input }),
  delete: (serverId: string, roleId: string) => apiFetch<void>(`/servers/${serverId}/roles/${roleId}`, { method: "DELETE" }),
};

export const channelsApi = {
  list: (serverId: string) => apiFetch<Channel[]>(`/servers/${serverId}/channels`),
  create: (serverId: string, input: CreateChannelInput) =>
    apiFetch<Channel>(`/servers/${serverId}/channels`, { method: "POST", body: input }),
};

export const messagesApi = {
  list: (channelId: string, before?: string) =>
    apiFetch<Message[]>(`/channels/${channelId}/messages${before ? `?before=${before}` : ""}`),
};

export const dmsApi = {
  list: () => apiFetch<Channel[]>("/dms"),
  getOrCreate: (userId: string) => apiFetch<Channel>("/dms", { method: "POST", body: { userId } }),
};

export const privacyApi = {
  exportData: () => apiFetch<Record<string, unknown>>("/privacy/export"),
};
