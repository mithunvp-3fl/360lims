"use client";
import Link from "next/link";
import { ChevronDown, GitBranch, Loader2 } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useGenealogyChain } from "@/lib/queries";
import type { GenealogyNode, GenealogyNodeType, StatusTone } from "@/lib/types";

const NODE_LABEL: Record<GenealogyNodeType, string> = {
  "raw-material": "Raw Material",
  "process-qualification": "Process Qualification",
  "metal-batch": "Metal Batch",
  "product-batch": "Product Batch",
  certificate: "Certificate",
};

const TONE_DOT: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  accent: "bg-accent",
  neutral: "bg-ink-subtle",
};

const TONE_BADGE: Record<
  StatusTone,
  "success" | "warning" | "danger" | "info" | "accent" | "muted"
> = {
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
  accent: "accent",
  neutral: "muted",
};

export function GenealogyExpandedView({
  certificateNumber,
}: {
  certificateNumber: string;
}) {
  const { data, isLoading } = useGenealogyChain("certificate", certificateNumber);

  return (
    <SectionCard
      title="Quality genealogy"
      description="Full 5-step lineage anchoring this certificate to its raw material."
      icon={<GitBranch className="h-4 w-4" />}
      actions={data ? <Badge tone="muted">{data.coverage}/5 steps</Badge> : null}
    >
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading genealogy…
        </div>
      ) : !data ? (
        <div className="text-xs text-ink-muted">No genealogy chain found.</div>
      ) : (
        <ol className="space-y-0">
          {data.nodes.map((n, idx) => (
            <NodeRow
              key={`${n.nodeType}-${n.nodeKey}`}
              node={n}
              isCurrent={n.nodeKey === data.currentKey}
              isLast={idx === data.nodes.length - 1}
            />
          ))}
        </ol>
      )}
    </SectionCard>
  );
}

function NodeRow({
  node,
  isCurrent,
  isLast,
}: {
  node: GenealogyNode;
  isCurrent: boolean;
  isLast: boolean;
}) {
  const inner = (
    <div
      className={cn(
        "rounded-lg border bg-surface p-3 transition-shadow",
        isCurrent
          ? "border-accent ring-2 ring-accent/30"
          : "border-line hover:shadow-sm",
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[node.statusTone])} />
        <span className="text-[10px] uppercase tracking-wider text-ink-subtle font-semibold">
          {NODE_LABEL[node.nodeType]}
        </span>
        {isCurrent && (
          <Badge tone="accent" className="ml-auto">
            Current
          </Badge>
        )}
      </div>
      <div className="mt-1 text-sm font-semibold text-ink truncate">{node.title}</div>
      {node.subtitle && (
        <div className="text-[11px] text-ink-muted truncate">{node.subtitle}</div>
      )}
      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
        <Badge tone={TONE_BADGE[node.statusTone]} className="text-[9px]">
          {node.status}
        </Badge>
        {node.badges.slice(0, 2).map((b) => (
          <Badge key={b} tone="muted" className="text-[9px]">
            {b}
          </Badge>
        ))}
      </div>
    </div>
  );

  return (
    <li className="relative">
      {node.href && !isCurrent ? (
        <Link href={node.href} className="block">
          {inner}
        </Link>
      ) : (
        inner
      )}
      {!isLast && (
        <div className="flex justify-center py-1.5 text-ink-subtle">
          <ChevronDown className="h-4 w-4" />
        </div>
      )}
    </li>
  );
}
