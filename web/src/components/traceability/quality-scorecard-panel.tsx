"use client";
import * as React from "react";
import { Award, Gauge } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useChainScorecard } from "@/lib/queries";
import type { GenealogyNodeType, ScorecardMetric } from "@/lib/types";

interface Props {
  nodeType: GenealogyNodeType;
  nodeKey: string;
  className?: string;
}

export function QualityScorecardPanel({ nodeType, nodeKey, className }: Props) {
  const { data, isLoading } = useChainScorecard(nodeType, nodeKey);

  return (
    <SectionCard
      title="Quality Scorecard"
      description="Compliance, coverage and audit health"
      icon={<Award className="h-4 w-4" />}
      className={className}
    >
      {isLoading || !data ? (
        <div className="text-xs text-ink-muted">Loading scorecard…</div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-md border border-line bg-inset px-3 py-2.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-ink-muted">
                Overall
              </div>
              <div className="text-2xl font-semibold leading-none mt-0.5">
                {data.overall}
                <span className="text-xs text-ink-muted ml-1">/100</span>
              </div>
            </div>
            <Gauge className="h-7 w-7 text-ink-subtle" />
          </div>
          <ul className="space-y-1.5">
            <MetricRow metric={data.compliance} />
            <MetricRow metric={data.traceabilityCoverage} />
            <MetricRow metric={data.approvalCoverage} />
            <MetricRow metric={data.auditCompleteness} />
            <MetricRow metric={data.taskCompletion} />
          </ul>
        </div>
      )}
    </SectionCard>
  );
}

function MetricRow({ metric }: { metric: ScorecardMetric }) {
  return (
    <li className="space-y-0.5">
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-ink">{metric.label}</span>
        <Badge tone={metric.tone} className="text-[10px]">
          {metric.score}
        </Badge>
      </div>
      <div className="h-1.5 w-full rounded-full bg-inset overflow-hidden">
        <div
          className={cn(
            "h-full transition-all",
            metric.tone === "success" && "bg-success",
            metric.tone === "warning" && "bg-warning",
            metric.tone === "danger" && "bg-danger",
            metric.tone === "info" && "bg-info",
          )}
          style={{ width: `${Math.max(2, Math.min(metric.score, 100))}%` }}
        />
      </div>
      {metric.detail && (
        <div className="text-[10px] text-ink-subtle">{metric.detail}</div>
      )}
    </li>
  );
}
