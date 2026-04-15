import { Type, type Static } from "@sinclair/typebox";

export const DepartmentSchema = Type.Object({
  id: Type.String(),
  code: Type.String(),
  name: Type.String(),
  branch_id: Type.String(),
  is_active: Type.Boolean(),
  created_at: Type.Optional(Type.String()),
  updated_at: Type.Optional(Type.String()),
});

export const DepartmentResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.Optional(Type.String()),
  message: Type.Optional(Type.String()),
  data: Type.Optional(DepartmentSchema),
});

export type Department = Static<typeof DepartmentSchema>;
export type DepartmentResponse = Static<typeof DepartmentResponseSchema>;
