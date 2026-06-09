"use client";
import * as React from "react";
import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RoleSwitcher } from "./role-switcher";
import { NotificationBell } from "./notification-bell";
import { initials } from "@/lib/utils";

export function Topbar({ breadcrumbs }: { breadcrumbs?: Array<{ label: string; href?: string }> }) {
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
      <RoleSwitcher />
      <NotificationBell />
      <Avatar>
        <AvatarFallback>{initials("Priya Menon")}</AvatarFallback>
      </Avatar>
    </header>
  );
}
