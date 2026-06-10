"use client";
import { ChevronRight, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCertificateInsights } from "@/lib/queries";
import { certificateRecommendationToAccent } from "@/lib/format";
import type { RiskLevel } from "@/lib/types";

const RISK_TONE: Record<RiskLevel, "success" | "warning" | "danger"> = {
  Low: "success",
  Medium: "warning",
  High: "danger",
};

export function CertificateInsightsPanel({
  certificateNumber,
}: {
  certificateNumber: string;
}) {
  const { data: insights, isLoading } = useCertificateInsights(certificateNumber);

  return (
    <SectionCard
      title="Quality insights"
      description="Release Confidence based on customer fit, history, and current quality state."
      icon={<Sparkles className="h-4 w-4 text-accent" />}
      glass
      className="bg-gradient-to-br from-accent-soft/40 via-surface to-surface"
    >
      {isLoading || !insights ? (
        <div className="text-xs text-ink-muted">Calculating release confidence…</div>
      ) : (
        <div className="space-y-4 relative z-10">
          {/* Release Confidence hero */}
          <div className="rounded-lg border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  Release Confidence
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-4xl font-semibold tracking-tight tabular-nums">
                    {insights.releaseConfidence}
                  </span>
                  <span className="text-sm text-ink-muted">/ 100</span>
                </div>
                <Progress
                  value={insights.releaseConfidence}
                  className="mt-2"
                  tone={
                    insights.releaseConfidence >= 90
                      ? "success"
                      : insights.releaseConfidence >= 75
                        ? "accent"
                        : insights.releaseConfidence >= 60
                          ? "warning"
                          : "danger"
                  }
                />
              </div>
              <div className="hidden sm:flex h-10 w-10 rounded-md bg-accent-soft text-accent items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
            <div className="h-10 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={insights.releaseConfidenceTrend.map((v, i) => ({ x: i, v }))}>
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
              Confidence trend across last 12 certificates
            </div>
          </div>

          {/* Recommendation */}
          <div className="rounded-lg border border-line bg-surface p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              Recommended action
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className="text-xl font-semibold tracking-tight">
                {insights.recommendedAction}
              </span>
              <Badge tone={certificateRecommendationToAccent(insights.recommendedAction)}>
                {insights.recommendedAction === "APPROVE DISPATCH"
                  ? "Release"
                  : insights.recommendedAction === "HOLD DISPATCH"
                    ? "Hold"
                    : insights.recommendedAction === "REJECT DISPATCH"
                      ? "Reject"
                      : insights.recommendedAction === "REQUEST REVIEW"
                        ? "Review"
                        : "Awaiting data"}
              </Badge>
            </div>
            <div className="text-xs text-ink-muted mt-1.5">{insights.rationale}</div>
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
                Customer compliance
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-semibold tabular-nums">
                  {insights.customerComplianceCount}
                </span>
                <span className="text-xs text-ink-muted">
                  / {insights.customerComplianceTotal}
                </span>
              </div>
              <Progress
                value={
                  insights.customerComplianceTotal
                    ? (insights.customerComplianceCount /
                        insights.customerComplianceTotal) *
                      100
                    : 0
                }
                className="mt-2"
                tone={
                  insights.customerComplianceCount === insights.customerComplianceTotal
                    ? "success"
                    : "accent"
                }
              />
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
        </div>
      )}
    </SectionCard>
  );
}
