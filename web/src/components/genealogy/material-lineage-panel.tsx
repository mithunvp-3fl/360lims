"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Network } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useMaterialLineage } from "@/lib/queries";
import type {
  GenealogyNode,
  GenealogyNodeType,
  LineageEdge,
  RelationshipType,
} from "@/lib/types";

export interface MaterialLineagePanelProps {
  nodeType: GenealogyNodeType;
  nodeKey: string;
  className?: string;
}

export function MaterialLineagePanel({
  nodeType,
  nodeKey,
  className,
}: MaterialLineagePanelProps) {
  const { data, isLoading } = useMaterialLineage(nodeType, nodeKey);

  return (
    <SectionCard
      title="Material Lineage"
      description="Direct parents, this record, and what it produces"
      icon={<Network className="h-4 w-4" />}
      className={className}
    >
      {isLoading || !data ? (
        <div className="text-xs text-ink-muted">Loading…</div>
      ) : (
        <div className="space-y-3.5">
          <LineageGroup
            label="Parents"
            icon={<ArrowUp className="h-3 w-3" />}
            empty="No upstream record"
            edges={data.parents}
          />
          <CurrentRow node={data.current} />
          <LineageGroup
            label="Children"
            icon={<ArrowDown className="h-3 w-3" />}
            empty="No downstream record yet"
            edges={data.children}
          />
        </div>
      )}
    </SectionCard>
  );
}

function LineageGroup({
  label,
  icon,
  empty,
  edges,
}: {
  label: string;
  icon: React.ReactNode;
  empty: string;
  edges: LineageEdge[];
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-ink-muted mb-1.5">
        {icon}
        {label}
      </div>
      {edges.length === 0 ? (
        <div className="text-[11px] text-ink-subtle italic px-1">{empty}</div>
      ) : (
        <ul className="space-y-1.5">
          {edges.map((edge, idx) => (
            <LineageRow key={`${edge.node.nodeType}-${edge.node.nodeKey}-${idx}`} edge={edge} />
          ))}
        </ul>
      )}
    </div>
  );
}

function LineageRow({ edge }: { edge: LineageEdge }) {
  const tone = relationshipTone(edge.relationshipType);
  const body = (
    <div className="flex items-start justify-between gap-2 rounded-md border border-line bg-surface px-2.5 py-2 hover:bg-inset transition-colors">
      <div className="min-w-0">
        <div className="text-[13px] font-medium leading-tight truncate">{edge.node.title}</div>
        {edge.node.subtitle && (
          <div className="text-[11px] text-ink-muted truncate">{edge.node.subtitle}</div>
        )}
      </div>
      <Badge tone={tone} className="text-[9px] shrink-0">
        {edge.relationshipType}
      </Badge>
    </div>
  );
  if (edge.node.href) {
    return (
      <li>
        <Link href={edge.node.href} className="block">
          {body}
        </Link>
      </li>
    );
  }
  return <li>{body}</li>;
}

function CurrentRow({ node }: { node: GenealogyNode }) {
  return (
    <div className="rounded-md border border-accent bg-accent-soft px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-accent font-semibold mb-0.5">
            This record
          </div>
          <div className="text-[13px] font-semibold leading-tight truncate">{node.title}</div>
          {node.subtitle && (
            <div className="text-[11px] text-ink-muted truncate">{node.subtitle}</div>
          )}
        </div>
        <Badge tone={statusToneToBadge(node.statusTone)} className="text-[9px] shrink-0">
          {node.status}
        </Badge>
      </div>
    </div>
  );
}

function relationshipTone(
  rt: RelationshipType,
): "success" | "info" | "warning" | "accent" | "muted" {
  switch (rt) {
    case "Direct":
      return "info";
    case "Representative":
      return "accent";
    case "Derived":
      return "success";
    case "Consumed By":
      return "warning";
    case "Produced By":
      return "success";
    default:
      return "muted";
  }
}

function statusToneToBadge(
  tone: string,
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
