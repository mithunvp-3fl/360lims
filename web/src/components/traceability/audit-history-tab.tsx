"use client";
import * as React from "react";
import { History } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { useChainEvents } from "@/lib/queries";
import type { GenealogyNodeType, QualityEvent } from "@/lib/types";

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
 * Audit history is the unfiltered audit log for the chain. We reuse the
 * chain-events stream, dropping the categorization chips: this is the
 * forensic view auditors expect.
 */
export function AuditHistoryTab({ nodeType, nodeKey }: Props) {
  const { data, isLoading } = useChainEvents(nodeType, nodeKey);

  return (
    <SectionCard
      title="Audit History"
      description="Immutable record of every change recorded against this chain"
      icon={<History className="h-4 w-4" />}
      actions={
        data ? (
          <span className="text-[11px] text-ink-muted">
            {data.events.length} log entries
          </span>
        ) : null
      }
    >
      {isLoading ? (
        <div className="text-xs text-ink-muted">Loading audit log…</div>
      ) : !data || data.events.length === 0 ? (
        <div className="text-xs text-ink-muted">
          No audit entries recorded for this chain yet.
        </div>
      ) : (
        <ol className="divide-y divide-line border border-line rounded-md bg-surface">
          {data.events.map((ev, i) => (
            <AuditRow key={`${ev.timestamp}-${i}`} event={ev} />
          ))}
        </ol>
      )}
    </SectionCard>
  );
}

function AuditRow({ event }: { event: QualityEvent }) {
  return (
    <li className="px-3 py-2 flex items-start gap-3 hover:bg-inset/40 text-[12px]">
      <div className="w-36 shrink-0 text-ink-muted tabular-nums text-[11px]">
        {formatTimestamp(event.timestamp)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{event.title}</span>
          <Badge tone="muted" className="text-[9px]">
            {NODE_LABEL[event.nodeType]}
          </Badge>
          <span className="text-[10px] text-ink-subtle font-mono truncate">
            {event.entityType}/{event.entityId.slice(0, 8)}
          </span>
        </div>
        <div className="text-ink-muted truncate">
          {event.actor}
          {event.actorRole ? ` · ${event.actorRole}` : ""}
          {" · "}
          <span className="font-mono">{event.nodeKey}</span>
          {event.notes ? ` · ${event.notes}` : ""}
        </div>
      </div>
    </li>
  );
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}
