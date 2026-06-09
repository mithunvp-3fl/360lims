"use client";
import { ChevronsUpDown, ShieldCheck } from "lucide-react";
import { useRole } from "@/components/role-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ROLES } from "@/lib/roles";

export function RoleSwitcher() {
  const { role, setRole } = useRole();
  const current = ROLES.find((r) => r.key === role);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-2.5 h-9 text-xs hover:bg-inset transition-colors">
        <ShieldCheck className="h-4 w-4 text-accent" />
        <span className="font-medium">{current?.label}</span>
        <ChevronsUpDown className="h-3 w-3 text-ink-subtle" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Switch role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ROLES.map((r) => (
          <DropdownMenuItem
            key={r.key}
            onClick={() => setRole(r.key)}
            className="flex-col items-start gap-0.5"
          >
            <div className="flex items-center gap-2 w-full">
              <span className="font-medium">{r.label}</span>
              {r.key === role && <Badge tone="accent" className="ml-auto">Active</Badge>}
            </div>
            <span className="text-[11px] text-ink-muted">{r.description}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
