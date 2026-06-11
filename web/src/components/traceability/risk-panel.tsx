"use client";
import * as React from "react";
import { ShieldAlert, ChevronRight } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useChainRisk } from "@/lib/queries";
import type { GenealogyNodeType, RiskFinding } from "@/lib/types";

interface Props {
  nodeType: GenealogyNodeType;
  nodeKey: string;
  className?: string;
}

export function RiskPanel({ nodeType, nodeKey, className }: Props) {
  const { data, isLoading } = useChainRisk(nodeType, nodeKey);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  return (
    <SectionCard
      title="Risk Panel"
      description="Open deviations, overrides, and overdue work"
      icon={<ShieldAlert className="h-4 w-4" />}
      className={className}
    >
      {isLoading || !data ? (
        <div className="text-xs text-ink-muted">Loading risk profile…</div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between rounded-md border border-line bg-inset px-3 py-2">
            <span className="text-[11px] uppercase tracking-wider text-ink-muted">
              Chain risk
            </span>
            <Badge tone={riskTone(data.riskLevel)} className="text-[10px]">
              {data.riskLevel}
            </Badge>
          </div>

          <ul className="space-y-1.5">
            {data.findings.map((f) => (
              <FindingRow
                key={f.label}
                finding={f}
                expanded={expanded === f.label}
                onToggle={() =>
                  setExpanded((cur) => (cur === f.label ? null : f.label))
                }
              />
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}

function FindingRow({
  finding,
  expanded,
  onToggle,
}: {
  finding: RiskFinding;
  expanded: boolean;
  onToggle: () => void;
}) {
  const sev = finding.severity;
  return (
    <li className="rounded-md border border-line bg-surface">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-2 hover:bg-inset transition-colors"
        disabled={finding.items.length === 0}
      >
        <div className="flex items-center gap-1.5 text-[12px] text-ink">
          <ChevronRight
            className={cn(
              "h-3 w-3 transition-transform",
              expanded && "rotate-90",
              finding.items.length === 0 && "opacity-30",
            )}
          />
          <span className="font-medium">{finding.label}</span>
        </div>
        <Badge tone={severityTone(sev, finding.count)} className="text-[10px]">
          {finding.count}
        </Badge>
      </button>
      {expanded && (
        <div className="px-3 pb-2 space-y-1">
          {finding.detail && (
            <div className="text-[11px] text-ink-muted">{finding.detail}</div>
          )}
          {finding.items.length > 0 && (
            <ul className="space-y-0.5 text-[11px] text-ink-muted">
              {finding.items.map((it, i) => (
                <li key={i} className="font-mono truncate">
                  · {it}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

function riskTone(level: string): "success" | "warning" | "danger" {
  if (level === "High") return "danger";
  if (level === "Medium") return "warning";
  return "success";
}

function severityTone(
  sev: "info" | "warning" | "danger",
  count: number,
): "muted" | "info" | "warning" | "danger" | "success" {
  if (count === 0) return "muted";
  if (sev === "danger") return "danger";
  if (sev === "warning") return "warning";
  return "info";
}
