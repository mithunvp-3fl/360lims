"use client";
import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  Compass,
  ShieldAlert,
} from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useChainSummary } from "@/lib/queries";
import type { GenealogyNodeType, StatusTone } from "@/lib/types";

interface Props {
  nodeType: GenealogyNodeType;
  nodeKey: string;
  className?: string;
}

export function QualitySummaryPanel({ nodeType, nodeKey, className }: Props) {
  const { data, isLoading } = useChainSummary(nodeType, nodeKey);

  return (
    <SectionCard
      title="Quality Summary"
      description="Live status of this lineage"
      icon={<Compass className="h-4 w-4" />}
      className={className}
    >
      {isLoading || !data ? (
        <div className="text-xs text-ink-muted">Loading summary…</div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-md border border-line bg-inset px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-ink-muted">
              Overall status
            </div>
            <div className="mt-0.5 flex items-center justify-between">
              <div className="text-[15px] font-semibold leading-tight">
                {data.overallStatus}
              </div>
              <Badge tone={toneToBadge(data.overallStatusTone)} className="text-[10px]">
                {data.riskLevel} risk
              </Badge>
            </div>
          </div>

          <ul className="space-y-1.5">
            <Row
              icon={<ClipboardList className="h-3.5 w-3.5" />}
              label="Pending tasks"
              value={data.pendingTasks}
              tone={data.pendingTasks > 0 ? "warning" : "muted"}
            />
            <Row
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              label="Pending approvals"
              value={data.pendingApprovals}
              tone={data.pendingApprovals > 0 ? "warning" : "muted"}
            />
            <Row
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Overdue items"
              value={data.overdueItems}
              tone={data.overdueItems > 0 ? "danger" : "muted"}
            />
            <Row
              icon={<ShieldAlert className="h-3.5 w-3.5" />}
              label="Open deviations"
              value={data.openDeviations}
              tone={data.openDeviations > 0 ? "danger" : "muted"}
            />
            <Row
              icon={<Compass className="h-3.5 w-3.5" />}
              label="Chain coverage"
              value={`${data.chainCoverage} / 5`}
              tone={data.chainCoverage >= 4 ? "success" : "info"}
            />
          </ul>

          {data.notes.length > 0 && (
            <div className="rounded-md border border-warning/30 bg-warning-soft px-2.5 py-2 space-y-1">
              {data.notes.map((n, i) => (
                <div key={i} className="text-[11px] text-warning flex items-start gap-1.5">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>{n}</span>
                </div>
              ))}
            </div>
          )}

          {data.lastEventAt && (
            <div className="text-[10px] text-ink-subtle">
              Last activity: {new Date(data.lastEventAt).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function Row({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: "muted" | "warning" | "danger" | "info" | "success";
}) {
  return (
    <li className="flex items-center justify-between gap-2 text-[12px]">
      <span className="flex items-center gap-1.5 text-ink-muted">
        {icon}
        {label}
      </span>
      <Badge tone={tone} className="text-[10px]">
        {value}
      </Badge>
    </li>
  );
}

function toneToBadge(
  t: StatusTone,
): "success" | "warning" | "danger" | "info" | "accent" | "muted" {
  switch (t) {
    case "success":
    case "warning":
    case "danger":
    case "info":
    case "accent":
      return t;
    default:
      return "muted";
  }
}
