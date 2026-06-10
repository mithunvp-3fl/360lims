"use client";
import { Boxes, Calendar, Factory, Pencil, Target } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { shortDate } from "@/lib/utils";
import type { MetalBatch } from "@/lib/types";

const GRADE_SPECS: Record<
  string,
  Array<{ parameter: string; min: number; target: number; max: number; unit: string }>
> = {
  P1020: [
    { parameter: "Si", min: 0.0, target: 0.06, max: 0.1, unit: "%" },
    { parameter: "Fe", min: 0.0, target: 0.14, max: 0.2, unit: "%" },
    { parameter: "Cu", min: 0.0, target: 0.02, max: 0.03, unit: "%" },
    { parameter: "Mg", min: 0.0, target: 0.01, max: 0.03, unit: "%" },
    { parameter: "Zn", min: 0.0, target: 0.01, max: 0.03, unit: "%" },
    { parameter: "Ti", min: 0.0, target: 0.01, max: 0.03, unit: "%" },
    { parameter: "Mn", min: 0.0, target: 0.01, max: 0.03, unit: "%" },
  ],
  P0610: [
    { parameter: "Si", min: 0.0, target: 0.04, max: 0.06, unit: "%" },
    { parameter: "Fe", min: 0.0, target: 0.07, max: 0.1, unit: "%" },
    { parameter: "Cu", min: 0.0, target: 0.01, max: 0.02, unit: "%" },
    { parameter: "Mg", min: 0.0, target: 0.01, max: 0.02, unit: "%" },
    { parameter: "Zn", min: 0.0, target: 0.01, max: 0.02, unit: "%" },
    { parameter: "Ti", min: 0.0, target: 0.01, max: 0.02, unit: "%" },
    { parameter: "Mn", min: 0.0, target: 0.01, max: 0.02, unit: "%" },
  ],
  "Primary Aluminum": [
    { parameter: "Si", min: 0.0, target: 0.07, max: 0.15, unit: "%" },
    { parameter: "Fe", min: 0.0, target: 0.12, max: 0.2, unit: "%" },
    { parameter: "Cu", min: 0.0, target: 0.02, max: 0.05, unit: "%" },
    { parameter: "Mg", min: 0.0, target: 0.02, max: 0.05, unit: "%" },
    { parameter: "Zn", min: 0.0, target: 0.02, max: 0.05, unit: "%" },
    { parameter: "Ti", min: 0.0, target: 0.02, max: 0.05, unit: "%" },
    { parameter: "Mn", min: 0.0, target: 0.02, max: 0.05, unit: "%" },
  ],
};

export function MetalBatchOverview({ batch }: { batch: MetalBatch }) {
  const specs = GRADE_SPECS[batch.productGrade] ?? [];
  return (
    <SectionCard
      title="Metal overview"
      description="Production context, casting target, and grade specification."
      icon={<Boxes className="h-4 w-4" />}
      actions={
        <Button variant="ghost" size="sm">
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="surface-inset p-3.5 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Grade &amp; specification
          </div>
          <div className="text-sm font-semibold">{batch.productGrade}</div>
          <div className="text-xs text-ink-muted">Primary aluminum</div>
          <div className="text-xs text-ink-muted">Test matrix:</div>
          <div className="flex flex-wrap gap-1">
            <Badge tone="accent">OES</Badge>
            <Badge tone="accent">Si</Badge>
            <Badge tone="accent">Fe</Badge>
            <Badge tone="accent">Cu</Badge>
            <Badge tone="accent">Mg</Badge>
            <Badge tone="accent">Zn</Badge>
            <Badge tone="accent">Ti</Badge>
            <Badge tone="accent">Mn</Badge>
          </div>
        </div>

        <div className="surface-inset p-3.5 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Production source
          </div>
          <div className="text-sm font-semibold flex items-center gap-1.5">
            <Factory className="h-3.5 w-3.5 text-accent" />
            {batch.potline}
          </div>
          {batch.shift && (
            <div className="text-xs text-ink-muted">
              Shift <span className="text-ink">{batch.shift}</span>
            </div>
          )}
          <div className="text-xs text-ink-muted">
            Operator <span className="text-ink">{batch.operator ?? "—"}</span>
          </div>
          <div className="text-xs text-ink-muted flex items-center gap-1.5">
            <Calendar className="h-3 w-3" /> Produced {shortDate(batch.productionDate)}
          </div>
        </div>

        <div className="surface-inset p-3.5 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Casting target
          </div>
          <div className="text-sm font-semibold flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-accent" />
            Casthouse release decision
          </div>
          <div className="text-xs text-ink-muted">
            Weight <span className="text-ink">{batch.weight} {batch.uom}</span>
          </div>
          <div className="text-xs text-ink-muted">
            Created by <span className="text-ink">{batch.createdBy}</span>
          </div>
          <div className="text-xs text-ink-muted">
            Assigned <span className="text-ink">{batch.assignedTo ?? "Unassigned"}</span>
          </div>
        </div>
      </div>

      {specs.length > 0 && (
        <div className="mt-4 rounded-lg border border-line overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-inset/60 text-[10px] uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="text-left font-semibold py-2 px-3">Element</th>
                <th className="text-right font-semibold py-2 px-3">Min</th>
                <th className="text-right font-semibold py-2 px-3">Target</th>
                <th className="text-right font-semibold py-2 px-3">Max</th>
                <th className="text-left font-semibold py-2 px-3">Unit</th>
              </tr>
            </thead>
            <tbody>
              {specs.map((s) => (
                <tr key={s.parameter} className="border-t border-line/60">
                  <td className="py-1.5 px-3 font-medium">{s.parameter}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-ink-muted">{s.min}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums">{s.target}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-ink-muted">{s.max}</td>
                  <td className="py-1.5 px-3 text-ink-muted">{s.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
