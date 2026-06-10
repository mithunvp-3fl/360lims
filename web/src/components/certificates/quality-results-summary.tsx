"use client";
import Link from "next/link";
import { ChevronRight, Layers } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCertificateQualitySummary } from "@/lib/queries";

export function QualityResultsSummary({
  certificateNumber,
}: {
  certificateNumber: string;
}) {
  const { data, isLoading } = useCertificateQualitySummary(certificateNumber);

  return (
    <SectionCard
      title="Quality results summary"
      description="Aggregated compliance across the full quality lifecycle."
      icon={<Layers className="h-4 w-4" />}
    >
      {isLoading || !data ? (
        <div className="text-xs text-ink-muted">Loading quality summary…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.steps.map((s, idx) => {
            const compliance = s.compliance ?? null;
            const Tag = s.href ? Link : "div";
            return (
              <Tag
                key={`${s.label}-${idx}`}
                href={s.href ?? "#"}
                className="surface-inset p-3.5 space-y-2 hover:shadow-card transition-shadow block"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
                      Step {idx + 1}
                    </div>
                    <div className="text-sm font-semibold truncate">{s.label}</div>
                  </div>
                  <Badge tone={s.status === "Approved" || s.status === "Released" ? "success" : s.status === "On Hold" ? "warning" : s.status === "Rejected" ? "danger" : "muted"}>
                    {s.status ?? "—"}
                  </Badge>
                </div>
                {s.nodeKey && (
                  <div className="text-[11px] text-ink-muted font-mono truncate">
                    {s.nodeKey}
                  </div>
                )}
                {compliance != null && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-ink-muted">
                      <span>Compliance</span>
                      <span className="font-semibold text-ink tabular-nums">
                        {compliance}/100
                      </span>
                    </div>
                    <Progress
                      value={compliance}
                      tone={
                        compliance >= 90
                          ? "success"
                          : compliance >= 75
                            ? "accent"
                            : compliance >= 60
                              ? "warning"
                              : "danger"
                      }
                    />
                  </div>
                )}
                {s.href && (
                  <div className="text-[11px] text-accent inline-flex items-center gap-0.5">
                    Open <ChevronRight className="h-3 w-3" />
                  </div>
                )}
              </Tag>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
