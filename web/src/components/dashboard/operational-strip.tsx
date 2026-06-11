"use client";
import * as React from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Inbox,
  Pause,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useBlockedWork,
  useEscalations,
  useMyWork,
  useNotifications,
  usePendingApprovals,
  useUpcomingWork,
  useWorkSummary,
} from "@/lib/queries";
import { useRole } from "@/components/role-context";
import { relativeTime } from "@/lib/utils";

/**
 * Phase 9 operational strip — surfaces "what needs me right now" without
 * making the user open any module. Driven entirely by /work/* + audit feed.
 */
export function OperationalStrip() {
  const { role, hydrated } = useRole();
  const { data: summary } = useWorkSummary(role);
  const { data: myWork } = useMyWork(role);
  const { data: approvals } = usePendingApprovals(role);
  const { data: escalated } = useEscalations(role);
  const { data: blocked } = useBlockedWork(role);
  const { data: upcoming } = useUpcomingWork(role);
  const { data: activity } = useNotifications();

  if (!hydrated) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-3">
      <Tile
        title="My Work"
        href="/work/my"
        icon={<Inbox className="h-4 w-4" />}
        accent="info"
        count={summary?.myWork ?? myWork?.length ?? 0}
        sub={topLines(myWork, 2)}
        empty="Inbox clear"
      />
      <Tile
        title="Pending Approvals"
        href="/work/approvals"
        icon={<CheckCircle2 className="h-4 w-4" />}
        accent="accent"
        count={summary?.pendingApprovals ?? approvals?.length ?? 0}
        sub={topLines(approvals, 2)}
        empty="Nothing waiting"
      />
      <Tile
        title="Overdue & Escalated"
        href="/work/escalations"
        icon={<AlertTriangle className="h-4 w-4" />}
        accent="danger"
        count={summary?.escalations ?? escalated?.length ?? 0}
        sub={topLines(escalated, 2)}
        empty="All within SLA"
      />
      <Tile
        title="Blocked Records"
        href="/work/my"
        icon={<Pause className="h-4 w-4" />}
        accent="warning"
        count={summary?.blocked ?? blocked?.length ?? 0}
        sub={topLines(blocked, 2)}
        empty="Nothing blocked"
      />
      <Tile
        title="Upcoming"
        href="/work/team"
        icon={<CalendarClock className="h-4 w-4" />}
        accent="muted"
        count={summary?.upcoming ?? upcoming?.length ?? 0}
        sub={topLines(upcoming, 2)}
        empty="Nothing on deck"
      />
      <Tile
        title="Recent Activity"
        href="/work/completed"
        icon={<Activity className="h-4 w-4" />}
        accent="success"
        count={summary?.completedToday ?? 0}
        sub={(activity ?? []).slice(0, 2).map((n) => `${n.title} · ${relativeTime(n.createdAt)}`)}
        empty="Quiet day"
      />
    </div>
  );
}

interface TileProps {
  title: string;
  href: string;
  icon: React.ReactNode;
  accent: "info" | "accent" | "danger" | "warning" | "success" | "muted";
  count: number;
  sub: string[];
  empty: string;
}

const ACCENT_BG: Record<TileProps["accent"], string> = {
  info: "bg-info-soft text-info",
  accent: "bg-accent-soft text-accent",
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
  muted: "bg-inset text-ink-muted",
};

const ACCENT_RING: Record<TileProps["accent"], string> = {
  info: "hover:border-info/40",
  accent: "hover:border-accent/40",
  danger: "hover:border-danger/40",
  warning: "hover:border-warning/40",
  success: "hover:border-success/40",
  muted: "hover:border-ink-subtle/40",
};

function Tile({ title, href, icon, accent, count, sub, empty }: TileProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group rounded-lg border border-line bg-surface p-3 transition-all flex flex-col gap-2 hover:shadow-card",
        ACCENT_RING[accent],
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className={cn("h-7 w-7 rounded-md grid place-items-center", ACCENT_BG[accent])}>
          {icon}
        </div>
        <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-muted">
          {title}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-semibold tabular-nums">{count}</div>
        {count === 0 && (
          <Badge tone="muted" className="text-[9px]">
            {empty}
          </Badge>
        )}
      </div>
      <div className="space-y-0.5 min-h-[28px]">
        {sub.length === 0 ? (
          <div className="text-[11px] text-ink-subtle">—</div>
        ) : (
          sub.map((s, i) => (
            <div key={i} className="text-[11px] text-ink-muted truncate">
              {s}
            </div>
          ))
        )}
      </div>
    </Link>
  );
}

function topLines(tasks: { title: string; recordKey?: string | null }[] | undefined, n: number): string[] {
  if (!tasks) return [];
  return tasks.slice(0, n).map((t) => (t.recordKey ? `${t.title} · ${t.recordKey}` : t.title));
}
