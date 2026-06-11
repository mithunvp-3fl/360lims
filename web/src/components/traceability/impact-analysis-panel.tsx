"use client";
import * as React from "react";
import Link from "next/link";
import { AlertOctagon, ArrowDownRight, Building2, FileCheck2 } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useChainImpact } from "@/lib/queries";
import type { GenealogyNodeType, ImpactItem, StatusTone } from "@/lib/types";

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

export function ImpactAnalysisPanel({ nodeType, nodeKey }: Props) {
  const { data, isLoading } = useChainImpact(nodeType, nodeKey);

  return (
    <SectionCard
      title="Impact Analysis"
      description="Every downstream record this lineage touches"
      icon={<AlertOctagon className="h-4 w-4" />}
    >
      {isLoading || !data ? (
        <div className="text-xs text-ink-muted">Computing impact…</div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-md border border-line bg-inset px-3 py-2.5 text-[12px] text-ink-muted leading-snug">
            {data.summary}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <KpiTile
              icon={<ArrowDownRight className="h-4 w-4" />}
              label="Downstream records"
              value={data.affected.length}
              tone={data.affected.length > 0 ? "warning" : "muted"}
            />
            <KpiTile
              icon={<FileCheck2 className="h-4 w-4" />}
              label="Certificates"
              value={data.affectedCertificates.length}
              tone={data.affectedCertificates.length > 0 ? "info" : "muted"}
            />
            <KpiTile
              icon={<Building2 className="h-4 w-4" />}
              label="Customers"
              value={data.affectedCustomers.length}
              tone={data.affectedCustomers.length > 0 ? "info" : "muted"}
            />
          </div>

          {data.affectedCustomers.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-ink-muted">
                Customers
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.affectedCustomers.map((c) => (
                  <Badge key={c} tone="accent" className="text-[10px]">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {data.affected.length > 0 ? (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-ink-muted mb-1.5">
                Affected records
              </div>
              <ul className="space-y-1.5">
                {data.affected.map((it, i) => (
                  <ImpactRow key={`${it.nodeType}-${it.nodeKey}-${i}`} item={it} />
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-[11px] text-ink-subtle italic">
              No downstream records — this is a terminal node.
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function ImpactRow({ item }: { item: ImpactItem }) {
  const body = (
    <div className="rounded-md border border-line bg-surface hover:bg-inset transition-colors px-3 py-2 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[12px] font-medium truncate flex items-center gap-2">
          <span>{item.title}</span>
          <Badge tone="muted" className="text-[9px]">
            {item.relationship}
          </Badge>
        </div>
        <div className="text-[11px] text-ink-muted truncate">
          {NODE_LABEL[item.nodeType]}
          {item.subtitle ? ` · ${item.subtitle}` : ""}
          {` · ${item.distance} hop${item.distance === 1 ? "" : "s"}`}
        </div>
      </div>
      <Badge tone={statusToneToBadge(item.statusTone)} className="text-[9px] shrink-0">
        {item.status}
      </Badge>
    </div>
  );

  if (item.href) {
    return (
      <li>
        <Link href={item.href}>{body}</Link>
      </li>
    );
  }
  return <li>{body}</li>;
}

function KpiTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "muted" | "info" | "warning" | "danger" | "success";
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2.5 flex items-center justify-between",
        tone === "muted" && "border-line bg-inset",
        tone === "info" && "border-info/30 bg-info-soft text-info",
        tone === "warning" && "border-warning/30 bg-warning-soft text-warning",
        tone === "danger" && "border-danger/30 bg-danger-soft text-danger",
        tone === "success" && "border-success/30 bg-success-soft text-success",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="opacity-70">{icon}</span>
        <span className="text-[11px] uppercase tracking-wider opacity-80">
          {label}
        </span>
      </div>
      <span className="text-base font-semibold">{value}</span>
    </div>
  );
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
