"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Search, ShieldCheck, Sparkles, UserCog } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "./notification-bell";
import { initials } from "@/lib/utils";
import { useAuth } from "@/components/role-context";
import { ROLES, roleLabel } from "@/lib/roles";

export function Topbar({ breadcrumbs }: { breadcrumbs?: Array<{ label: string; href?: string }> }) {
  const { user, role, setRole, signOut } = useAuth();
  const router = useRouter();
  const name = user?.name ?? "Demo User";

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center gap-3 border-b border-line bg-surface/80 backdrop-blur-md px-4 lg:px-6">
      <div className="flex items-center gap-1.5 text-xs text-ink-muted">
        {breadcrumbs?.map((b, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-ink-subtle">/</span>}
            {b.href ? (
              <Link href={b.href} className="hover:text-ink transition-colors">{b.label}</Link>
            ) : (
              <span className="text-ink font-medium">{b.label}</span>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="flex-1 max-w-md hidden md:flex relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle" />
        <Input
          placeholder="Search lots, suppliers, materials…"
          className="pl-9 bg-inset border-transparent focus:bg-surface focus:border-line"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-ink-subtle border border-line bg-surface rounded px-1.5 py-0.5">
          ⌘K
        </kbd>
      </div>

      <div className="flex-1 md:flex-none" />

      <Badge tone="accent" className="hidden md:inline-flex">
        <Sparkles className="h-3 w-3" />
        Quality Insights live
      </Badge>
      <NotificationBell />

      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-md border border-line bg-surface pl-2 pr-2.5 h-9 hover:bg-inset transition-colors">
          <Avatar className="h-6 w-6 text-[10px]">
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start leading-tight">
            <span className="text-xs font-medium">{name}</span>
            <span className="text-[10px] text-ink-muted">{roleLabel(role)}</span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{name}</span>
              <span className="text-[11px] text-ink-muted font-normal">{user?.email}</span>
              <span className="text-[11px] text-ink-muted font-normal">{user?.title}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-ink-subtle font-semibold">
            <span className="inline-flex items-center gap-1.5">
              <UserCog className="h-3 w-3" />
              Switch role (demo)
            </span>
          </DropdownMenuLabel>
          {ROLES.map((r) => (
            <DropdownMenuItem
              key={r.key}
              onClick={() => setRole(r.key)}
              className="flex items-center gap-2"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs">{r.label}</span>
              {r.key === role && <Badge tone="accent" className="ml-auto">Active</Badge>}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              signOut();
              router.replace("/login");
            }}
            className="text-danger flex items-center gap-2"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="text-xs">Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
