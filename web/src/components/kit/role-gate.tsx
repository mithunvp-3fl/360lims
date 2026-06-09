"use client";
import * as React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRole } from "@/components/role-context";
import { roleLabel } from "@/lib/roles";
import type { Permission } from "@/lib/roles";
import type { RoleKey } from "@/lib/types";

interface RoleGateProps {
  permission: Permission;
  needs?: RoleKey[];
  children: React.ReactElement<{ disabled?: boolean }>;
}

export function RoleGate({ permission, needs, children }: RoleGateProps) {
  const { can, role } = useRole();
  const allowed = can(permission);
  if (allowed) return children;
  const description = needs && needs.length > 0
    ? `Requires ${needs.map(roleLabel).join(", ")}`
    : "Your current role does not have permission for this action.";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex">
          {React.cloneElement(children, { disabled: true })}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="font-medium mb-0.5">Not allowed for {roleLabel(role)}</div>
        <div>{description}</div>
      </TooltipContent>
    </Tooltip>
  );
}
