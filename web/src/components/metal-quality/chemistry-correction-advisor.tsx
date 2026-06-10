"use client";
import { ArrowRight, FlaskConical, Sparkles, Target } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { useMetalInsights } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function ChemistryCorrectionAdvisor({
  metalBatchNumber,
}: {
  metalBatchNumber: string;
}) {
  const { data: insights, isLoading } = useMetalInsights(metalBatchNumber);
  const corrections = insights?.chemistryCorrections ?? [];

  return (
    <SectionCard
      title="Chemistry correction advisor"
      description="Recommended additions to bring molten chemistry to the grade target. Rule-based — values are advisory."
      icon={<Sparkles className="h-4 w-4 text-accent" />}
      glass
      className="bg-gradient-to-br from-amber-50/40 via-surface to-surface"
    >
      {isLoading ? (
        <div className="text-xs text-ink-muted">Calculating corrections…</div>
      ) : corrections.length === 0 ? (
        <div className="surface-inset p-4 text-xs text-ink-muted leading-relaxed">
          No chemistry corrections needed — all elements are within striking distance of
          their {insights?.metalCompliance ?? "—"}/100 grade targets.
        </div>
      ) : (
        <div className="space-y-2">
          {corrections.map((c) => {
            const delta = c.delta;
            const direction = delta > 0 ? "up" : "down";
            const sevTone =
              Math.abs(delta) > 0.05
                ? "danger"
                : Math.abs(delta) > 0.02
                  ? "warning"
                  : "info";
            return (
              <div key={c.parameter} className="surface-card p-3 relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-md grid place-items-center border",
                        direction === "up"
                          ? "bg-info/10 text-info border-info/30"
                          : "bg-warning/10 text-warning border-warning/30",
                      )}
                    >
                      <FlaskConical className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{c.parameter}</div>
                      <div className="text-[11px] text-ink-muted">
                        {direction === "up" ? "Add to lift" : "Dilute to bring down"} ·{" "}
                        Δ {delta > 0 ? "+" : ""}
                        {delta.toFixed(3)}
                        {c.unit}
                      </div>
                    </div>
                  </div>
                  <Badge tone={sevTone}>
                    {Math.abs(delta) > 0.05
                      ? "Major gap"
                      : Math.abs(delta) > 0.02
                        ? "Moderate"
                        : "Minor"}
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="surface-inset p-2 rounded-md">
                    <div className="text-[10px] uppercase tracking-wide text-ink-muted">
                      Current
                    </div>
                    <div className="text-sm font-semibold tabular-nums mt-0.5">
                      {c.currentValue.toFixed(3)}
                      <span className="text-[10px] text-ink-muted ml-0.5">{c.unit}</span>
                    </div>
                  </div>
                  <div className="surface-inset p-2 rounded-md">
                    <div className="text-[10px] uppercase tracking-wide text-ink-muted">
                      Target
                    </div>
                    <div className="text-sm font-semibold tabular-nums mt-0.5 text-accent">
                      <Target className="h-3 w-3 inline mr-0.5 -mt-0.5" />
                      {c.targetValue.toFixed(3)}
                      <span className="text-[10px] text-ink-muted ml-0.5">{c.unit}</span>
                    </div>
                  </div>
                  <div className="surface-inset p-2 rounded-md">
                    <div className="text-[10px] uppercase tracking-wide text-ink-muted">
                      Expected after
                    </div>
                    <div className="text-sm font-semibold tabular-nums mt-0.5 text-success">
                      {c.expectedAfter.toFixed(3)}
                      <span className="text-[10px] text-ink-muted ml-0.5">{c.unit}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2 text-xs surface-inset px-3 py-2 rounded-md">
                  <span className="text-ink-muted">Add</span>
                  <span className="font-semibold tabular-nums">{c.additionKg} kg</span>
                  <ArrowRight className="h-3 w-3 text-ink-subtle" />
                  <span className="text-ink-muted">{c.additionMaterial}</span>
                </div>

                <div className="mt-2 text-[11px] text-ink-muted leading-relaxed">
                  {c.rationale}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
