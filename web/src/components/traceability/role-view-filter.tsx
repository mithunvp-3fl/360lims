"use client";
import * as React from "react";
import { UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRole } from "@/components/role-context";
import type { RoleKey } from "@/lib/types";

/**
 * Phase 15 — Role-based views.
 *
 * Defines which tabs each role should land on by default and which extra
 * surface area is interesting to them. The page reads `defaultTabFor(role)`
 * and `tabsForRole(role)` to compose its tab bar.
 */
export const ALL_TABS = [
  "lifecycle",
  "lineage",
  "events",
  "approvals",
  "audit",
] as const;

export type TraceabilityTab = (typeof ALL_TABS)[number];

const ROLE_DEFAULT_TAB: Record<RoleKey, TraceabilityTab> = {
  "stores-executive": "lifecycle",       // Operator-style view
  sampler: "lifecycle",
  "lab-analyst": "events",
  "qa-engineer": "approvals",
  "qa-manager": "approvals",
  viewer: "audit",                        // Auditor-style read-only view
};

const ROLE_LABEL: Record<RoleKey, string> = {
  "stores-executive": "Operator",
  sampler: "Sampler",
  "lab-analyst": "Lab Analyst",
  "qa-engineer": "QA Engineer",
  "qa-manager": "QA Manager",
  viewer: "Auditor",
};

export function defaultTabFor(role: RoleKey): TraceabilityTab {
  return ROLE_DEFAULT_TAB[role] ?? "lifecycle";
}

export function tabsForRole(_role: RoleKey): TraceabilityTab[] {
  // Every role can see every tab — but the entry point differs. Locking tabs
  // down per role would hurt the demo more than it would help, so we just
  // adjust the default.
  return [...ALL_TABS];
}

/**
 * Compact strip that explains which view the active role lands on.
 */
export function RoleViewIndicator() {
  const { role } = useRole();
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1",
        "text-[11px] text-ink-muted",
      )}
    >
      <UserCheck className="h-3.5 w-3.5 text-accent" />
      <span>Role view</span>
      <Badge tone="accent" className="text-[9px]">
        {ROLE_LABEL[role]}
      </Badge>
      <span className="text-[10px]">
        → opens on <strong className="text-ink">{capitalize(defaultTabFor(role))}</strong>
      </span>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
