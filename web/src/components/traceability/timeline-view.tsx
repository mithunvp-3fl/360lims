"use client";
import * as React from "react";
import { CalendarRange } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useChainEvents } from "@/lib/queries";
import type {
  GenealogyNodeType,
  QualityEvent,
  QualityEventSeverity,
} from "@/lib/types";

interface Props {
  nodeType: GenealogyNodeType;
  nodeKey: string;
}

const NODE_LABEL: Record<GenealogyNodeType, string> = {
  "raw-material": "Raw Material",
  "process-qualification": "Process Qualification",
  "metal-batch": "Metal Batch",
  "product-batch": "Product Batch",
  certificate: "Certificate",
};

/**
 * Phase 14 — alternative chronological visualization.
 * Renders the chain events as a vertical timeline grouped by day.
 */
export function TimelineView({ nodeType, nodeKey }: Props) {
  const { data, isLoading } = useChainEvents(nodeType, nodeKey);

  const grouped = React.useMemo(() => groupByDay(data?.events ?? []), [data]);

  return (
    <SectionCard
      title="Timeline"
      description="Day-by-day view of every quality event on this chain"
      icon={<CalendarRange className="h-4 w-4" />}
    >
      {isLoading ? (
        <div className="text-xs text-ink-muted">Loading timeline…</div>
      ) : grouped.length === 0 ? (
        <div className="text-xs text-ink-muted">No events recorded yet.</div>
      ) : (
        <ol className="space-y-4">
          {grouped.map(({ day, events }) => (
            <li key={day}>
              <div className="sticky top-0 z-[1] bg-surface/95 backdrop-blur-sm pb-1 mb-2 border-b border-line">
                <div className="text-[11px] uppercase tracking-wider text-ink-muted font-medium">
                  {day}
                </div>
              </div>
              <ol className="space-y-2 pl-2 border-l-2 border-line ml-1">
                {events.map((ev, i) => (
                  <TimelineDot key={`${ev.timestamp}-${i}`} event={ev} />
                ))}
              </ol>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}

function TimelineDot({ event }: { event: QualityEvent }) {
  return (
    <li className="relative pl-3">
      <span
        className={cn(
          "absolute left-[-7px] top-1.5 h-3 w-3 rounded-full border-2 border-surface",
          dotColor(event.severity),
        )}
      />
      <div className="flex items-center gap-2 flex-wrap text-[12px]">
        <span className="text-ink-muted tabular-nums">
          {formatTime(event.timestamp)}
        </span>
        <span className="font-medium">{event.title}</span>
        <Badge tone={severityBadge(event.severity)} className="text-[9px]">
          {event.category}
        </Badge>
        <Badge tone="muted" className="text-[9px]">
          {NODE_LABEL[event.nodeType]}
        </Badge>
      </div>
      <div className="text-[11px] text-ink-muted truncate">
        {event.actor}
        {event.actorRole ? ` · ${event.actorRole}` : ""}
        {" · "}
        <span className="font-mono">{event.nodeKey}</span>
      </div>
    </li>
  );
}

function groupByDay(events: QualityEvent[]): { day: string; events: QualityEvent[] }[] {
  const out: Record<string, QualityEvent[]> = {};
  for (const ev of events) {
    const day = formatDay(ev.timestamp);
    if (!out[day]) out[day] = [];
    out[day].push(ev);
  }
  return Object.entries(out)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([day, events]) => ({ day, events }));
}

function formatDay(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function dotColor(s: QualityEventSeverity): string {
  switch (s) {
    case "success":
      return "bg-success";
    case "warning":
      return "bg-warning";
    case "danger":
      return "bg-danger";
    default:
      return "bg-info";
  }
}

function severityBadge(s: QualityEventSeverity): "success" | "warning" | "danger" | "info" {
  return s;
}
