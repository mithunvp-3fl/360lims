import type { Role, RoleKey } from "./types";

export const ROLES: Role[] = [
  { key: "stores-executive", label: "Stores Executive",
    description: "Create / edit receipts." },
  { key: "sampler", label: "Sampler",
    description: "Create / recollect samples." },
  { key: "lab-analyst", label: "Lab Analyst",
    description: "Enter, import and upload results." },
  { key: "qa-engineer", label: "QA Engineer",
    description: "Review results and recommend action." },
  { key: "qa-manager", label: "QA Manager",
    description: "Approve, hold, reject and override." },
  { key: "viewer", label: "Viewer",
    description: "Read-only access." },
];

export type Permission =
  | "receipt:create"
  | "receipt:edit"
  | "sample:create"
  | "sample:recollect"
  | "result:enter"
  | "result:import"
  | "result:upload"
  | "approval:hold"
  | "approval:recommend"
  | "approval:approve"
  | "approval:reject"
  | "approval:override"
  // Phase 2 — Process Material Qualification
  | "qualification:create"
  | "qualification:edit"
  | "qualification:release"
  | "qualification:hold"
  | "qualification:reject";

const MATRIX: Record<RoleKey, Permission[]> = {
  "stores-executive": ["receipt:create", "receipt:edit"],
  sampler: ["sample:create", "sample:recollect"],
  "lab-analyst": [
    "result:enter", "result:import", "result:upload",
  ],
  "qa-engineer": [
    "approval:hold", "approval:recommend",
    "qualification:create", "qualification:edit", "qualification:hold",
  ],
  "qa-manager": [
    "receipt:create", "receipt:edit",
    "sample:create", "sample:recollect",
    "result:enter", "result:import", "result:upload",
    "approval:hold", "approval:recommend",
    "approval:approve", "approval:reject", "approval:override",
    "qualification:create", "qualification:edit",
    "qualification:release", "qualification:hold", "qualification:reject",
  ],
  viewer: [],
};

export function can(role: RoleKey, permission: Permission): boolean {
  return MATRIX[role]?.includes(permission) ?? false;
}

export function roleLabel(role: RoleKey): string {
  return ROLES.find((r) => r.key === role)?.label ?? role;
}
