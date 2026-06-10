"use client";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Gauge,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useProcessInsights } from "@/lib/queries";
import type { ParameterTrend, ProcessRecommendation, RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACTION_TONE: Record<
  ProcessRecommendation,
  { tone: "success" | "info" | "warning" | "danger" | "muted"; label: string }
> = {
  RELEASE: { tone: "success", label: "Release" },
  REVIEW: { tone: "info", label: "QA review" },
  HOLD: { tone: "warning", label: "Hold for review" },
  REJECT: { tone: "danger", label: "Reject" },
  "AWAITING DATA": { tone: "muted", label: "Awaiting data" },
};

const RISK_TONE: Record<RiskLevel, "success" | "warning" | "danger"> = {
  Low: "success",
  Medium: "warning",
  High: "danger",
};

function ParameterTrendRow({ trend }: { trend: ParameterTrend }) {
  const delta = trend.delta;
  const dir = delta == null ? "flat" : delta > 0.001 ? "up" : delta < -0.001 ? "down" : "flat";
  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : ArrowRight;
  const magnitude = trend.deltaPct == null ? 0 : Math.abs(trend.deltaPct);
  const tone =
    trend.samples === 0
      ? "text-ink-subtle"
      : magnitude < 2
        ? "text-success"
        : magnitude < 6
          ? "text-warning"
          : "text-danger";
  return (
    <tr className="border-t border-line/60">
      <td className="py-1 px-2 font-medium">{trend.parameter}</td>
      <td className="py-1 px-2 text-right tabular-nums">
        {trend.current?.toFixed(2)}{" "}
        <span className="text-[10px] text-ink-subtle">{trend.unit}</span>
      </td>
      <td className="py-1 px-2 text-right tabular-nums text-ink-muted">
        {trend.previousAverage != null ? trend.previousAverage.toFixed(2) : "—"}
      </td>
      <td className={cn("py-1 px-2 text-right tabular-nums", tone)}>
        <span className="inline-flex items-center gap-0.5">
          <Icon className="h-3 w-3" />
          {delta != null ? `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}` : "—"}
        </span>
      </td>
    </tr>
  );
}

export function ProcessReadinessPanel({
  qualificationNumber,
}: {
  qualificationNumber: string;
}) {
  const { data: insights, isLoading } = useProcessInsights(qualificationNumber);

  return (
    <SectionCard
      title="Quality insights"
      description="Process readiness based on this batch's chemistry, historical stability, and spec compliance."
      icon={<Sparkles className="h-4 w-4 text-accent" />}
      glass
      className="bg-gradient-to-br from-accent-soft/40 via-surface to-surface"
    >
      {isLoading || !insights ? (
        <div className="text-xs text-ink-muted">Calculating process readiness…</div>
      ) : (
        <div className="space-y-4 relative z-10">
          {/* Process Readiness hero */}
          <div className="rounded-lg border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  Process Readiness
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-4xl font-semibold tracking-tight tabular-nums">
                    {insights.processReadiness}
                  </span>
                  <span className="text-sm text-ink-muted">/ 100</span>
                </div>
                <Progress
                  value={insights.processReadiness}
                  className="mt-2"
                  tone={
                    insights.processReadiness >= 90
                      ? "success"
                      : insights.processReadiness >= 75
                        ? "accent"
                        : insights.processReadiness >= 60
                          ? "warning"
                          : "danger"
                  }
                />
              </div>
              <div className="hidden sm:flex h-10 w-10 rounded-md bg-accent-soft text-accent items-center justify-center">
                <Gauge className="h-5 w-5" />
              </div>
            </div>
            <div className="h-10 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={insights.processReadinessTrend.map((v, i) => ({ x: i, v }))}>
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke="rgb(124 58 237)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-ink-muted">
              <TrendingUp className="h-3 w-3 text-accent" />
              Readiness trend across last 12 batches
            </div>
          </div>

          {/* Recommendation hero */}
          <div className="rounded-lg border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  Recommended action
                </div>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <span className="text-xl font-semibold tracking-tight">
                    {insights.recommendedTarget}
                  </span>
                  <Badge tone={ACTION_TONE[insights.recommendedAction]?.tone}>
                    {insights.recommendedAction}
                  </Badge>
                </div>
                <div className="text-xs text-ink-muted mt-1.5">{insights.rationale}</div>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="surface-inset p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                Risk level
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-lg font-semibold">{insights.riskLevel}</span>
                <Badge tone={RISK_TONE[insights.riskLevel]}>{insights.riskLevel}</Badge>
              </div>
            </div>
            <div className="surface-inset p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                Tests completed
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-semibold tabular-nums">
                  {insights.testsCompleted}
                </span>
                <span className="text-xs text-ink-muted">/ {insights.testsTotal}</span>
              </div>
              <Progress
                value={
                  insights.testsTotal
                    ? (insights.testsCompleted / insights.testsTotal) * 100
                    : 0
                }
                className="mt-2"
                tone={
                  insights.testsCompleted === insights.testsTotal ? "success" : "accent"
                }
              />
            </div>
          </div>

          {/* Compliance + deviations */}
          <div className="grid grid-cols-2 gap-3">
            <div className="surface-inset p-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  Spec compliance
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {insights.complianceScore}%
                </span>
              </div>
              <Progress
                value={insights.complianceScore}
                className="mt-2"
                tone={
                  insights.complianceScore >= 95
                    ? "success"
                    : insights.complianceScore >= 80
                      ? "warning"
                      : "danger"
                }
              />
            </div>
            <div className="surface-inset p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                Deviations
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums">
                {insights.deviationCount}
              </div>
              <div className="text-[11px] text-ink-muted">
                Variance + out-of-spec parameters
              </div>
            </div>
          </div>

          {/* Observations */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              Key observations
            </div>
            <ul className="space-y-1.5">
              {insights.observations.map((o, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <ChevronRight className="h-3 w-3 mt-0.5 text-accent shrink-0" />
                  <span className="text-ink-muted">{o}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Parameter trends */}
          {insights.parameterTrends.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  Parameter trends vs history
                </div>
                <span className="text-[10px] text-ink-subtle">
                  past {Math.max(...insights.parameterTrends.map((t) => t.samples), 0)} batches
                </span>
              </div>
              <div className="rounded-md border border-line overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-inset/60 text-[10px] uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="text-left font-semibold py-1.5 px-2">Param</th>
                      <th className="text-right font-semibold py-1.5 px-2">Current</th>
                      <th className="text-right font-semibold py-1.5 px-2">Prev avg</th>
                      <th className="text-right font-semibold py-1.5 px-2">Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.parameterTrends.slice(0, 8).map((t) => (
                      <ParameterTrendRow key={t.parameter} trend={t} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Historical batches */}
          {insights.historicalBatches.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                Recent batches · same material &amp; area
              </div>
              <div className="space-y-1">
                {insights.historicalBatches.slice(0, 4).map((h) => (
                  <div
                    key={h.qualificationNumber}
                    className="flex items-center justify-between gap-2 text-xs surface-inset px-2.5 py-1.5"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-ink truncate">{h.batchNumber}</div>
                      <div className="text-[10px] text-ink-subtle truncate">
                        {h.qualificationNumber}
                      </div>
                    </div>
                    <div className="text-ink-muted text-[11px] tabular-nums">
                      {h.readinessScore}/100
                    </div>
                    <Badge
                      tone={
                        h.outcome === "Released"
                          ? "success"
                          : h.outcome === "Held"
                            ? "warning"
                            : h.outcome === "Rejected"
                              ? "danger"
                              : "muted"
                      }
                    >
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
