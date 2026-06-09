"use client";
import {
  Brain,
  ChevronRight,
  Gauge,
  Sparkles,
  ThumbsUp,
  TrendingUp,
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useInsights } from "@/lib/queries";
import type { RecommendedAction, RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACTION_TONE: Record<RecommendedAction, { tone: "success" | "warning" | "danger" | "muted"; label: string }> = {
  APPROVE: { tone: "success", label: "Approve" },
  HOLD: { tone: "warning", label: "Hold for review" },
  REJECT: { tone: "danger", label: "Reject lot" },
  "AWAITING DATA": { tone: "muted", label: "Awaiting data" },
};

const RISK_TONE: Record<RiskLevel, "success" | "warning" | "danger"> = {
  Low: "success",
  Medium: "warning",
  High: "danger",
};

export function QualityInsightsPanel({ lot }: { lot: string }) {
  const { data: insights, isLoading } = useInsights(lot);

  return (
    <SectionCard
      title="Quality insights"
      description="Recommendation based on this lot's chemistry, supplier history, and spec compliance."
      icon={<Sparkles className="h-4 w-4 text-accent" />}
      glass
      className="bg-gradient-to-br from-accent-soft/40 via-surface to-surface"
    >
      {isLoading || !insights ? (
        <div className="text-xs text-ink-muted">Calculating recommendation…</div>
      ) : (
        <div className="space-y-4 relative z-10">
          {/* Recommendation hero */}
          <div className="rounded-lg border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  Recommended action
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-2xl font-semibold tracking-tight">
                    {ACTION_TONE[insights.recommendedAction]?.label}
                  </span>
                  <Badge tone={ACTION_TONE[insights.recommendedAction]?.tone}>
                    {insights.recommendedAction}
                  </Badge>
                </div>
                <div className="text-xs text-ink-muted mt-1.5">{insights.rationale}</div>
              </div>
              <div className="hidden sm:flex h-10 w-10 rounded-md bg-accent-soft text-accent items-center justify-center">
                <Brain className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="surface-inset p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Risk level</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-lg font-semibold">{insights.riskLevel}</span>
                <Badge tone={RISK_TONE[insights.riskLevel]}>{insights.riskLevel}</Badge>
              </div>
            </div>
            <div className="surface-inset p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Tests completed</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-semibold tabular-nums">{insights.testsCompleted}</span>
                <span className="text-xs text-ink-muted">/ {insights.testsTotal}</span>
              </div>
              <Progress
                value={insights.testsTotal ? (insights.testsCompleted / insights.testsTotal) * 100 : 0}
                className="mt-2"
                tone={insights.testsCompleted === insights.testsTotal ? "success" : "accent"}
              />
            </div>
          </div>

          {/* Supplier health */}
          <div className="surface-inset p-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Supplier health</div>
              <Badge tone={insights.supplierHealth >= 85 ? "success" : insights.supplierHealth >= 70 ? "warning" : "danger"}>
                {insights.supplierHealth} / 100
              </Badge>
            </div>
            <div className="h-10 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={insights.supplierHealthTrend.map((v, i) => ({ x: i, v }))}>
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke="rgb(5 150 105)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-ink-muted">
              <TrendingUp className="h-3 w-3 text-success" />
              12-week trend
            </div>
          </div>

          {/* Compliance gauge */}
          <div className="surface-inset p-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Spec compliance</div>
              <span className="text-sm font-semibold tabular-nums">{insights.complianceScore}%</span>
            </div>
            <Progress
              value={insights.complianceScore}
              className="mt-2"
              tone={insights.complianceScore >= 95 ? "success" : insights.complianceScore >= 80 ? "warning" : "danger"}
            />
          </div>

          {/* Observations */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Key observations</div>
            <ul className="space-y-1.5">
              {insights.observations.map((o, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <ChevronRight className="h-3 w-3 mt-0.5 text-accent shrink-0" />
                  <span className="text-ink-muted">{o}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Historical */}
          {insights.historicalDeliveries.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                Recent deliveries from this supplier
              </div>
              <div className="space-y-1">
                {insights.historicalDeliveries.slice(0, 4).map((h) => (
                  <div
                    key={h.lotNumber}
                    className="flex items-center justify-between text-xs surface-inset px-2.5 py-1.5"
                  >
                    <span className="font-mono text-ink">{h.lotNumber}</span>
                    <span className="text-ink-muted">{new Date(h.receiptDate).toLocaleDateString()}</span>
                    <Badge tone={h.outcome === "Approved" ? "success" : h.outcome === "Held" ? "warning" : h.outcome === "Rejected" ? "danger" : "muted"}>
                      {h.outcome}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}
