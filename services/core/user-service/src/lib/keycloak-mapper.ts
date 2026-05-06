import { KcUser } from "./keycloak-client";
import type { BankRole } from "@vpndoc/shared-types";
import { Type, type Static } from "@sinclair/typebox";

const GROUP_ROLE_MAP: Record<string, BankRole> = {
  "bank-makers": "maker",
  "bank-unit-heads": "unit_head",
  "bank-branch": "branch",
  "bank-department": "department",
  "bank-it-heads": "it_head",
  "bank-it-po": "it_po",
  "bank-it-staff": "it_staff",
  "bank-admins": "admin",
}

const VALID_ROLES: BankRole[] = [
  "admin",
  "branch",
  "department",
  "it_head",
  "it_po",
  "it_staff",
  "unit_head",
  "maker",
];

export const MappedBankProfile = Type.Object({
  role: Type.Union(VALID_ROLES.map((role) => Type.Literal(role))),
  branchId: Type.Optional(Type.String()),
  departmentId: Type.Optional(Type.String()),
  employeeCode: Type.Optional(Type.String()),
  fullName: Type.String(),
  email: Type.String({ format: "email" }),
});

export type MappedBankProfile = Static<typeof MappedBankProfile>;

export function mapKcUser(user: KcUser): MappedBankProfile {
  const PRIORITY_ROLES: BankRole[] = [
    "admin",
    "branch",
    "department",
    "it_head",
    "it_po",
    "it_staff",
    "unit_head",
    "maker",
  ];

  const foundRole = PRIORITY_ROLES.find((r) => user.realmRoles?.includes(r));
  const role: BankRole = foundRole ?? "maker";

  const attr = user.attributes ?? {};
  const get = (key: string) => attr[key]?.[0] ?? "";

  return {
    role,
    branchId: get("branch_id") ?? null,
    departmentId: get("department_id") ?? null,
    employeeCode: get("employee_code") ?? null,
    fullName: `${user.firstName} ${user.lastName}`,
    email: user.email,
  };
}
