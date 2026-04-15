import type { AuthentikUser, AuthentikGroup } from "./authentik-client";
import type { BankRole } from "@vpndoc/shared-types";

 const GROUP_ROLE_MAP: Record<string, BankRole> = {
  "bank-makers": "maker",
  "bank-unit-heads": "unit_head",
  "bank-branch": "branch",
  "bank-department": "department",
  "bank-it-heads": "it_head",
  "bank-it-po": "it_po",
  "bank-it-staff": "it_staff",
  "bank-admins": "admin",
};

export interface MappedBankProfile {
  role: BankRole;
  branchId: string;
  departmentId: string | null;
  employeeCode: string;
}

// ── Extract role ຈາກ groups ──────────────────────────────
export function extractRoleFromGroups(groups: AuthentikGroup[]): BankRole {
  const PRIORITIES: BankRole[] = [
    "admin",
    "it_head",
    "it_po",
    "it_staff",
    "branch",
    "department",
    "unit_head",
    "maker",
  ];

  const foundRoles = new Set<BankRole>();

  for (const group of groups) {
    const role = GROUP_ROLE_MAP[group.name.toLocaleLowerCase()];
    if (role) foundRoles.add(role);

    const attrRole =
      group.attributes[process.env.AUTHENTIK_ROLE_ATTR ?? "bank-role"];
    if (attrRole && typeof attrRole === "string") {
      foundRoles.add(attrRole as BankRole);
    }
  }
  for (const role of PRIORITIES) {
    if (foundRoles.has(role)) return role;
  }

  return "maker";
}

// ── Map Authentik user → bank profile ────────────────────
export function mapAuthentikToBankProfile(
  user: AuthentikUser,
): MappedBankProfile {
  const attrs = user.attributes;

  const roleFromGroups = extractRoleFromGroups(user.groups_obj ?? []);
  const roleFromAttr = attrs[process.env.AUTHENTIK_ROLE_ATTR ?? "bank-role"];

  const role: BankRole =
    roleFromGroups !== "maker"
      ? roleFromGroups
      : typeof roleFromAttr === "string"
        ? (roleFromAttr as BankRole)
        : "maker";

  return {
    role,
    branchId: String(
      attrs[process.env.AUTHENTIK_BRANCH_ATTR ?? "branch_id"] ?? "",
    ),
    departmentId: attrs[process.env.AUTHENTIK_DEPT_ATTR ?? "department_id"]
      ? String(attrs[process.env.AUTHENTIK_DEPT_ATTR ?? "department_id"])
      : null,
    employeeCode: String(
      attrs[process.env.AUTHENTIK_EMP_CODE_ATTR ?? "employee_code"] ?? "",
    ),
  };
}


