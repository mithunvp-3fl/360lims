"use client";
import { AlertTriangle, CheckCircle2, ClipboardCheck, XCircle } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import type { CustomerSpec, MarginStatus, ResultStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CustomerSpecValidation({
  customer,
  specs,
}: {
  customer: string;
  specs: CustomerSpec[];
}) {
  const pass = specs.filter((s) => s.complianceStatus === "Pass").length;
  const warn = specs.filter((s) => s.complianceStatus === "Warning").length;
  const fail = specs.filter((s) => s.complianceStatus === "Fail").length;
  const tight = specs.filter((s) => s.marginStatus === "Tight").length;
  const breach = specs.filter((s) => s.marginStatus === "Breach").length;

  return (
    <SectionCard
      title="Customer spec validation"
      description={`Required spec for ${customer} compared against actual product readings — required, actual, and margin to nearest bound.`}
      icon={<ClipboardCheck className="h-4 w-4" />}
      actions={
        <div className="flex items-center gap-1.5">
          <Badge tone="success">{pass} pass</Badge>
          {warn > 0 && <Badge tone="warning">{warn} warn</Badge>}
          {fail > 0 && <Badge tone="danger">{fail} fail</Badge>}
          {tight > 0 && <Badge tone="outline">{tight} tight margin</Badge>}
          {breach > 0 && <Badge tone="danger">{breach} breach</Badge>}
        </div>
      }
    >
      {specs.length === 0 ? (
        <div className="text-xs text-ink-muted">No customer specifications captured.</div>
      ) : (
        <div className="rounded-lg border border-line overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-inset/60 text-[11px] uppercase tracking-wide text-ink-muted">
                <th className="text-left font-semibold py-2.5 px-3">Parameter</th>
                <th className="text-right font-semibold py-2.5 px-3">Required</th>
                <th className="text-right font-semibold py-2.5 px-3">Actual</th>
                <th className="text-left font-semibold py-2.5 px-3">Unit</th>
                <th className="text-left font-semibold py-2.5 px-3">Margin</th>
                <th className="text-left font-semibold py-2.5 px-3">Compliance</th>
              </tr>
            </thead>
            <tbody>
              {specs.map((s) => (
                <tr key={s.parameter} className="border-t border-line/60">
                  <td className="py-2 px-3 font-medium">{s.parameter}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-ink-muted text-xs">
                    {formatRequired(s)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {s.actualValue != null ? s.actualValue : "—"}
                  </td>
                  <td className="py-2 px-3 text-ink-muted text-xs">{s.unit}</td>
                  <td className="py-2 px-3">
                    <MarginCell spec={s} />
                  </td>
                  <td className="py-2 px-3">
                    <ComplianceBadge status={s.complianceStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function formatRequired(s: CustomerSpec): string {
  if (s.requiredMin != null && s.requiredMax != null) {
    return `${s.requiredMin} – ${s.requiredMax}`;
  }
  if (s.requiredMin != null) return `≥ ${s.requiredMin}`;
  if (s.requiredMax != null) return `≤ ${s.requiredMax}`;
  if (s.requiredTarget != null) return `target ${s.requiredTarget}`;
  return "—";
}

const MARGIN_TONE: Record<MarginStatus, "success" | "warning" | "danger" | "muted"> = {
  Safe: "success",
  Tight: "warning",
  Breach: "danger",
  "N/A": "muted",
};

function MarginCell({ spec }: { spec: CustomerSpec }) {
  const pct = spec.marginPct;
  const fill = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  const tone = MARGIN_TONE[spec.marginStatus];
  const barTone =
    tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : tone === "danger" ? "bg-danger" : "bg-ink/30";
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="flex-1 h-1.5 rounded-full bg-inset overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", barTone)}
          style={{ width: `${fill}%` }}
        />
      </div>
      <span className="text-[11px] tabular-nums text-ink-muted w-14 text-right">
        {pct == null ? "—" : `${pct.toFixed(0)}%`}
      </span>
      <Badge tone={tone} className="text-[10px]">
        {spec.marginStatus}
      </Badge>
    </div>
  );
}

function ComplianceBadge({ status }: { status: ResultStatus }) {
  if (status === "Pass") {
    return (
      <Badge tone="success">
        <CheckCircle2 className="h-3 w-3" /> Pass
      </Badge>
    );
  }
  if (status === "Warning") {
    return (
      <Badge tone="warning">
        <AlertTriangle className="h-3 w-3" /> Warn
      </Badge>
    );
  }
  if (status === "Fail") {
    return (
      <Badge tone="danger">
        <XCircle className="h-3 w-3" /> Fail
      </Badge>
    );
  }
  return <Badge tone="muted">Pending</Badge>;
}
