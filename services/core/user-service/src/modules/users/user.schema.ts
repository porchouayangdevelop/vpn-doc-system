import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

export const CreateUserWithKeycloakDto = Type.Object({
  id: Type.String(),
  username: Type.String({
    minLength: 3,
    maxLength: 30,
    description: "Username must be between 3 and 30 characters long.",
  }),
  firstName: Type.String(),
  lastName: Type.String(),

  employee_code: Type.String({
    maxLength: 50,
    minLength: 2,
    description: "Employee code must be between 2 and 50 characters long.",
  }),
  full_name: Type.String({
    maxLength: 100,
    minLength: 2,
    description: "Full name must be between 2 and 100 characters long.",
  }),
  email: Type.String({
    format: "email",
    description: "Must be a valid email address.",
  }),
  password: Type.String({
    pattern:
      "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
    format: "password",
    description:
      "Password must be at least 8 characters long and include uppercase letters, lowercase letters, numbers, and special characters.",
    minLength: 8,
    maxLength: 50,
  }),
  role: Type.Union([
    Type.Literal("maker"),
    Type.Literal("unit_head"),
    Type.Literal("branch"),
    Type.Literal("department"),
    Type.Literal("it_head"),
    Type.Literal("it_po"),
    Type.Literal("it_staff"),
    Type.Literal("admin"),
  ]),
  branch_id: Type.Optional(Type.String()),
  department_id: Type.Optional(Type.String()),
  is_active: Type.Optional(Type.Boolean()),
});

export const CreateUserSchema = Type.Object({
  employee_code: Type.String({
    maxLength: 50,
    minLength: 2,
  }),
  full_name: Type.String({
    maxLength: 100,
    minLength: 2,
  }),
  password: Type.String({
    pattern:
      "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
    format: "password",
    description:
      "Password must be at least 8 characters long and include uppercase letters, lowercase letters, numbers, and special characters.",
    minLength: 8,
    maxLength: 50,
  }),

  email: Type.String({ format: "email" }),
  role: Type.Union([
    Type.Literal("maker"),
    Type.Literal("unit_head"),
    Type.Literal("branch"),
    Type.Literal("department"),
    Type.Literal("it_head"),
    Type.Literal("it_po"),
    Type.Literal("it_staff"),
    Type.Literal("admin"),
  ]),
  branch_id: Type.String(),
  department_id: Type.Optional(Type.String()),
});

export const UpdateUserSchema = Type.Object({
  full_name: Type.Optional(Type.String({ maxLength: 100, minLength: 2 })),
  email: Type.Optional(Type.String({ format: "email" })),
  role: Type.Optional(
    Type.Union([
      Type.Literal("maker"),
      Type.Literal("unit_head"),
      Type.Literal("branch"),
      Type.Literal("department"),
      Type.Literal("it_head"),
      Type.Literal("it_po"),
      Type.Literal("it_staff"),
      Type.Literal("admin"),
    ]),
  ),
  branch_id: Type.Optional(Type.String()),
  department_id: Type.Optional(Type.String()),
  is_active: Type.Optional(Type.Boolean()),
});

export const ListUsersQuerySchema = Type.Object({
  role: Type.Optional(
    Type.Union([
      Type.Literal("maker"),
      Type.Literal("unit_head"),
      Type.Literal("branch"),
      Type.Literal("department"),
      Type.Literal("it_head"),
      Type.Literal("it_po"),
      Type.Literal("it_staff"),
      Type.Literal("admin"),
    ]),
  ),
  branch_id: Type.Optional(Type.String()),
  department_id: Type.Optional(Type.String()),
  page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 })),
  search: Type.Optional(Type.String({ maxLength: 100 })),
});

export const meSchema = Type.Object({
  userId: Type.String(),
  employeeCode: Type.String(),
  fullName: Type.String(),
  email: Type.String(),
  role: Type.String(),
  branchId: Type.String(),
  departmentId: Type.String(),
  isActive: Type.Boolean(),
  lastLoginAt: Type.Optional(Type.String()),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export const ParamsSchema = Type.Object({
  id: Type.String(),
});

export type User = Static<typeof CreateUserSchema>;
export type UpdateUser = Static<typeof UpdateUserSchema>;
export type ListUsers = Static<typeof ListUsersQuerySchema>;
export type ParamsType = Static<typeof ParamsSchema>;
