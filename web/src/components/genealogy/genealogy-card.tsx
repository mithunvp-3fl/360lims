"use client";
import * as React from "react";
import Link from "next/link";
import { ChevronRight, GitBranch, Layers, Loader2 } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useGenealogyChain } from "@/lib/queries";
import type {
  GenealogyChain,
  GenealogyNode,
  GenealogyNodeType,
  StatusTone,
} from "@/lib/types";

const NODE_LABEL: Record<GenealogyNodeType, string> = {
  "raw-material": "Raw Material",
  "process-qualification": "Process Qualification",
  "metal-batch": "Metal Batch",
  "product-batch": "Product Batch",
  "certificate": "Certificate",
};

const TONE_DOT: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  accent: "bg-accent",
  neutral: "bg-ink-subtle",
};

const TONE_BORDER: Record<StatusTone, string> = {
  success: "border-success/40",
  warning: "border-warning/40",
  danger: "border-danger/40",
  info: "border-info/40",
  accent: "border-accent/40",
  neutral: "border-line",
};

const TONE_BADGE: Record<StatusTone, "success" | "warning" | "danger" | "info" | "accent" | "muted"> = {
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
  accent: "accent",
  neutral: "muted",
};

export interface GenealogyCardProps {
  nodeType: GenealogyNodeType;
  nodeKey: string;
  className?: string;
}

export function GenealogyCard({ nodeType, nodeKey, className }: GenealogyCardProps) {
  const { data, isLoading } = useGenealogyChain(nodeType, nodeKey);

  return (
    <SectionCard
      title="Material Lineage — Full Chain"
      description="End-to-end record relationships across the production lifecycle"
      icon={<GitBranch className="h-4 w-4" />}
      className={className}
      actions={data ? <Badge tone="muted">{data.coverage}/5 steps</Badge> : null}
    >
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading genealogy…
        </div>
      ) : !data ? (
        <div className="text-xs text-ink-muted flex items-center gap-2">
          <Layers className="h-3.5 w-3.5" /> No genealogy chain found.
        </div>
      ) : (
        <ChainStrip chain={data} />
      )}
    </SectionCard>
  );
}

function ChainStrip({ chain }: { chain: GenealogyChain }) {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <ol className="flex items-stretch gap-2 min-w-max">
        {chain.nodes.map((n, idx) => (
          <React.Fragment key={`${n.nodeType}-${n.nodeKey}`}>
            <ChainNode node={n} isCurrent={n.nodeKey === chain.currentKey} />
            {idx < chain.nodes.length - 1 && (
              <div className="flex items-center text-ink-subtle">
                <ChevronRight className="h-4 w-4" />
              </div>
            )}
          </React.Fragment>
        ))}
      </ol>
    </div>
  );
}

function ChainNode({ node, isCurrent }: { node: GenealogyNode; isCurrent: boolean }) {
  const inner = (
    <div
      className={cn(
        "rounded-lg border bg-surface px-3 py-2 min-w-[180px] max-w-[240px] transition-shadow",
        TONE_BORDER[node.statusTone],
        isCurrent && "ring-2 ring-accent ring-offset-1 ring-offset-bg",
        node.href && "hover:shadow-sm",
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-subtle font-semibold">
        <span className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[node.statusTone])} />
        {NODE_LABEL[node.nodeType]}
      </div>
      <div className="mt-1 text-sm font-semibold text-ink truncate">{node.title}</div>
      {node.subtitle && (
        <div className="text-[11px] text-ink-muted truncate">{node.subtitle}</div>
      )}
      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
        <Badge tone={TONE_BADGE[node.statusTone]} className="text-[9px]">
          {node.status}
        </Badge>
        {node.badges.slice(0, 1).map((b) => (
          <Badge key={b} tone="muted" className="text-[9px]">
            {b}
          </Badge>
        ))}
      </div>
    </div>
  );

  if (!node.href || isCurrent) return inner;
  return (
    <Link href={node.href} className="contents">
      {inner}
    </Link>
  );
}
