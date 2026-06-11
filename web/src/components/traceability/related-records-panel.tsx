"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, GitFork, Layers } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useChainRelated } from "@/lib/queries";
import type { GenealogyNodeType, RelatedRecord, StatusTone } from "@/lib/types";

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

/**
 * Phase 11 — Related Records.
 *
 * Surfaces siblings (peers sharing a parent) in addition to direct parents
 * and children, so multi-customer certificates and multi-qualification lots
 * become visible to demo SMEs.
 */
export function RelatedRecordsPanel({ nodeType, nodeKey }: Props) {
  const { data, isLoading } = useChainRelated(nodeType, nodeKey);

  return (
    <SectionCard
      title="Related Records"
      description="Parents, siblings and children connected to this record"
      icon={<GitFork className="h-4 w-4" />}
    >
      {isLoading || !data ? (
        <div className="text-xs text-ink-muted">Loading related records…</div>
      ) : (
        <div className="space-y-4">
          <Group
            label="Parents"
            icon={<ArrowUp className="h-3.5 w-3.5" />}
            empty="No upstream record"
            items={data.parents}
          />
          <Group
            label="Siblings"
            icon={<Layers className="h-3.5 w-3.5" />}
            empty="No sibling records share the same parent"
            items={data.siblings}
          />
          <Group
            label="Children"
            icon={<ArrowDown className="h-3.5 w-3.5" />}
            empty="No downstream record yet"
            items={data.children}
          />
        </div>
      )}
    </SectionCard>
  );
}

function Group({
  label,
  icon,
  empty,
  items,
}: {
  label: string;
  icon: React.ReactNode;
  empty: string;
  items: RelatedRecord[];
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5 text-[11px] uppercase tracking-wider text-ink-muted">
        {icon}
        {label} <span className="text-ink-subtle">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <div className="text-[11px] italic text-ink-subtle px-1">{empty}</div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((r, i) => (
            <RelatedRow key={`${r.nodeType}-${r.nodeKey}-${i}`} record={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RelatedRow({ record }: { record: RelatedRecord }) {
  const body = (
    <div className="rounded-md border border-line bg-surface hover:bg-inset transition-colors px-3 py-2 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[12px] font-medium truncate">{record.title}</div>
        <div className="text-[11px] text-ink-muted truncate">
          {NODE_LABEL[record.nodeType]}
          {record.subtitle ? ` · ${record.subtitle}` : ""}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Badge tone="muted" className="text-[9px]">
          {record.relation}
        </Badge>
        <Badge tone={statusToneToBadge(record.statusTone)} className="text-[9px]">
          {record.status}
        </Badge>
      </div>
    </div>
  );
  if (record.href) {
    return (
      <li>
        <Link href={record.href}>{body}</Link>
      </li>
    );
  }
  return <li>{body}</li>;
}

function statusToneToBadge(
  tone: StatusTone,
): "success" | "warning" | "danger" | "info" | "accent" | "muted" {
  switch (tone) {
    case "success":
    case "warning":
    case "danger":
    case "info":
    case "accent":
      return tone;
    default:
      return "muted";
  }
}
