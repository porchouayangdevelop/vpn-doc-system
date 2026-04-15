import { Type, type Static } from "@sinclair/typebox";

export const BranchSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  code: Type.String(),
  is_active: Type.Boolean(),
  created_at: Type.Optional(Type.String()),
  updated_at: Type.Optional(Type.String()),
});

export const BranchResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.Optional(Type.String()),
  message: Type.Optional(Type.String()),
  data: Type.Optional(BranchSchema),
});

export type Branch = Static<typeof BranchSchema>;
export type BranchResponse = Static<typeof BranchResponseSchema>;
