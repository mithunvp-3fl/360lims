import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: number | string;
  unit?: string;
  deltaPct?: number;
  accent?: "info" | "success" | "warning" | "danger" | "accent";
  hint?: string;
  icon?: React.ReactNode;
}

const accentRing: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  accent: "bg-accent-soft text-accent",
};

export function KpiCard({ label, value, unit, deltaPct, accent = "info", hint, icon }: KpiCardProps) {
  const positive = (deltaPct ?? 0) >= 0;
  return (
    <Card glass className="p-5 relative">
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-semibold tabular-nums tracking-tight">{value}</span>
            {unit && <span className="text-sm text-ink-muted">{unit}</span>}
          </div>
          {hint && <div className="text-xs text-ink-muted">{hint}</div>}
        </div>
        <div className={cn("h-9 w-9 rounded-md grid place-items-center", accentRing[accent])}>
          {icon}
        </div>
      </div>
      {typeof deltaPct === "number" && (
        <div className="relative z-10 mt-4 inline-flex items-center gap-1 text-xs font-medium">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
              positive ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
            )}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(deltaPct).toFixed(1)}%
          </span>
          <span className="text-ink-muted">vs last week</span>
        </div>
      )}
    </Card>
  );
}
