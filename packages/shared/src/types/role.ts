import { z } from "zod";

export const RoleSchema = z.object({
  id: z.string().uuid(),
  serverId: z.string().uuid(),
  name: z.string().min(1).max(64),
  color: z.number().int().nullable(),
  position: z.number().int(),
  permissions: z.string(), // bigint serialized as string, see @nythera/shared/permissions
  isDefault: z.boolean(),
});
export type Role = z.infer<typeof RoleSchema>;

export const CreateRoleInputSchema = z.object({
  name: z.string().min(1).max(64),
  color: z.number().int().nullable().optional(),
  permissions: z.string().optional(),
});
export type CreateRoleInput = z.infer<typeof CreateRoleInputSchema>;

export const UpdateRoleInputSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  color: z.number().int().nullable().optional(),
  position: z.number().int().optional(),
  permissions: z.string().optional(),
});
export type UpdateRoleInput = z.infer<typeof UpdateRoleInputSchema>;
