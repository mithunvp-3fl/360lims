"use client";
import * as React from "react";
import {
  Activity,
  Beaker,
  CheckCircle2,
  Cloud,
  FileSignature,
  Filter,
  Rocket,
  Truck,
} from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useChainEvents } from "@/lib/queries";
import type {
  GenealogyNodeType,
  QualityEvent,
  QualityEventCategory,
} from "@/lib/types";

const CATEGORIES: { key: QualityEventCategory; label: string; icon: React.ReactNode }[] = [
  { key: "Sampling", label: "Sampling", icon: <Beaker className="h-3 w-3" /> },
  { key: "Testing", label: "Testing", icon: <Activity className="h-3 w-3" /> },
  { key: "Import", label: "Imports", icon: <Cloud className="h-3 w-3" /> },
  { key: "Approval", label: "Approvals", icon: <FileSignature className="h-3 w-3" /> },
  { key: "Release", label: "Releases", icon: <Rocket className="h-3 w-3" /> },
  { key: "Certificate", label: "Certificates", icon: <CheckCircle2 className="h-3 w-3" /> },
  { key: "Dispatch", label: "Dispatch", icon: <Truck className="h-3 w-3" /> },
];

const NODE_LABEL: Record<GenealogyNodeType, string> = {
  "raw-material": "Raw Material",
  "process-qualification": "Process Qualification",
  "metal-batch": "Metal Batch",
  "product-batch": "Product Batch",
  certificate: "Certificate",
};

interface Props {
  nodeType: GenealogyNodeType;
  nodeKey: string;
}

export function QualityEventsTab({ nodeType, nodeKey }: Props) {
  const { data, isLoading } = useChainEvents(nodeType, nodeKey);
  const [activeCats, setActiveCats] = React.useState<Set<QualityEventCategory>>(
    new Set(),
  );

  const toggle = (cat: QualityEventCategory) => {
    setActiveCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const filtered = React.useMemo(() => {
    if (!data) return [];
    if (activeCats.size === 0) return data.events;
    return data.events.filter((e) => activeCats.has(e.category));
  }, [data, activeCats]);

  return (
    <SectionCard
      title="Quality Events"
      description="Chain-wide stream of testing, approvals, imports, releases and certificates"
      icon={<Activity className="h-4 w-4" />}
      actions={
        <div className="text-[11px] text-ink-muted flex items-center gap-1">
          <Filter className="h-3 w-3" />
          {filtered.length} of {data?.events.length ?? 0}
        </div>
      }
    >
      <div className="flex flex-wrap gap-1.5 mb-3">
        {CATEGORIES.map((c) => {
          const active = activeCats.has(c.key);
          const count =
            data?.events.filter((e) => e.category === c.key).length ?? 0;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => toggle(c.key)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] inline-flex items-center gap-1.5 transition-colors",
                active
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line bg-surface text-ink-muted hover:bg-inset",
              )}
            >
              {c.icon}
              {c.label}
              <span className="text-[10px] opacity-80">{count}</span>
            </button>
          );
        })}
        {activeCats.size > 0 && (
          <button
            type="button"
            onClick={() => setActiveCats(new Set())}
            className="text-[11px] text-ink-muted hover:text-ink underline-offset-2 hover:underline px-2"
          >
            Clear
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-xs text-ink-muted">Loading events…</div>
      ) : filtered.length === 0 ? (
        <div className="text-xs text-ink-muted">
          No events match this filter.
        </div>
      ) : (
        <ol className="space-y-2.5">
          {filtered.slice(0, 100).map((ev, i) => (
            <EventRow key={`${ev.timestamp}-${i}`} event={ev} />
          ))}
        </ol>
      )}
    </SectionCard>
  );
}

function EventRow({ event }: { event: QualityEvent }) {
  return (
    <li className="flex items-start gap-3 text-xs">
      <div className="w-32 shrink-0 text-ink-muted tabular-nums">
        {formatTimestamp(event.timestamp)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-ink">{event.title}</span>
          <Badge tone={severityToBadge(event.severity)} className="text-[9px]">
            {event.category}
          </Badge>
          <Badge tone="muted" className="text-[9px]">
            {NODE_LABEL[event.nodeType]}
          </Badge>
          <span className="text-[10px] text-ink-subtle font-mono">
            {event.nodeKey}
          </span>
        </div>
        <div className="text-ink-muted truncate">
          by {event.actor}
          {event.actorRole ? ` · ${event.actorRole}` : ""}
          {event.notes ? ` · ${event.notes}` : ""}
        </div>
      </div>
    </li>
  );
}

function severityToBadge(
  s: QualityEvent["severity"],
): "success" | "warning" | "danger" | "info" {
  return s as never;
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
