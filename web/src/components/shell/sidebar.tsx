"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Boxes,
  ClipboardList,
  FlaskRound,
  Gauge,
  LineChart,
  Microscope,
  Settings,
  Workflow as WorkflowIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const sections: Array<{
  label: string;
  items: Array<{ label: string; href: string; icon: React.ReactNode; badge?: string; soon?: boolean }>;
}> = [
  {
    label: "Operate",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <Gauge className="h-4 w-4" /> },
      { label: "Inspection Queue", href: "/inspection", icon: <ClipboardList className="h-4 w-4" /> },
      { label: "Inspection Workbench", href: "/inspection/LOT-2026-0042", icon: <Microscope className="h-4 w-4" />, badge: "Demo" },
    ],
  },
  {
    label: "Quality Operations",
    items: [
      { label: "Process Material Qualification", href: "/qualification", icon: <FlaskRound className="h-4 w-4" /> },
      { label: "Qualification Workbench", href: "/qualification/PMQ-2026-001245", icon: <WorkflowIcon className="h-4 w-4" />, badge: "Demo" },
    ],
  },
  {
    label: "Configure",
    items: [
      { label: "Instrument Integrations", href: "/instruments", icon: <Activity className="h-4 w-4" /> },
      { label: "Master Data", href: "/master-data", icon: <Boxes className="h-4 w-4" /> },
    ],
  },
  {
    label: "Future modules",
    items: [
      { label: "Reports & Analytics", href: "#", icon: <BarChart3 className="h-4 w-4" />, soon: true },
      { label: "Heat Chemistry", href: "#", icon: <LineChart className="h-4 w-4" />, soon: true },
      { label: "Settings", href: "#", icon: <Settings className="h-4 w-4" />, soon: true },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col gap-1 border-r border-line bg-surface/60 backdrop-blur-md">
      <div className="flex h-14 items-center gap-2.5 px-5 border-b border-line">
        <div className="relative h-8 w-8 rounded-md bg-gradient-to-br from-accent to-info grid place-items-center text-white font-bold text-sm">
          <span className="relative">Q</span>
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">Quality360</div>
          <div className="text-[10px] text-ink-muted uppercase tracking-wider">Quality Intelligence</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {sections.map((s) => (
          <div key={s.label} className="space-y-1">
            <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
              {s.label}
            </div>
            {s.items.map((it) => {
              const active = !it.soon && (pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href)));
              return (
                <Link
                  key={it.label}
                  href={it.soon ? "#" : it.href}
                  aria-disabled={it.soon}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                    it.soon
                      ? "text-ink-subtle cursor-not-allowed"
                      : active
                      ? "bg-accent-soft text-accent font-medium"
                      : "text-ink-muted hover:bg-inset hover:text-ink",
                  )}
                >
                  <span className={cn(active && "text-accent")}>{it.icon}</span>
                  <span className="flex-1">{it.label}</span>
                  {it.badge && <Badge tone="accent">{it.badge}</Badge>}
                  {it.soon && <Badge tone="muted" className="text-[9px]">Soon</Badge>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="m-3 surface-inset p-3 text-xs text-ink-muted leading-relaxed">
        <div className="font-semibold text-ink mb-1">Module: Incoming Inspection</div>
        Phase 1 build. Heat Chemistry, Casting, MTC &amp; Dispatch reuse the same workbench framework.
      </div>
    </aside>
  );
}
