"use client";
import {
  Boxes,
  Calendar,
  History as HistoryIcon,
  MapPin,
  Pencil,
  Target,
} from "lucide-react";
import Link from "next/link";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { shortDate } from "@/lib/utils";
import type { Material, Qualification, Supplier } from "@/lib/types";

export function QualificationOverview({
  qualification,
  material,
  supplier,
}: {
  qualification: Qualification;
  material?: Material;
  supplier?: Supplier;
}) {
  return (
    <SectionCard
      title="Material overview"
      description="Spec, source supplier, dispatch context, and consumption target."
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
            Material
          </div>
          <div className="text-sm font-semibold">{material?.name ?? "—"}</div>
          <div className="text-xs text-ink-muted">{material?.category}</div>
          <div className="text-xs text-ink-muted">
            UoM: <span className="text-ink">{material?.uom}</span>
          </div>
          <div className="text-xs text-ink-muted">Test matrix:</div>
          <div className="flex flex-wrap gap-1">
            {(material?.requiredTests ?? []).map((t) => (
              <Badge key={t} tone="accent">
                {t}
              </Badge>
            ))}
          </div>
        </div>

        <div className="surface-inset p-3.5 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Source &amp; supplier
          </div>
          <div className="text-sm font-semibold">{supplier?.name ?? "Internal"}</div>
          {supplier?.location && (
            <div className="flex items-center gap-1.5 text-xs text-ink-muted">
              <MapPin className="h-3 w-3" /> {supplier.location}
            </div>
          )}
          {qualification.sourceLotNumber ? (
            <div className="text-xs text-ink-muted flex items-center gap-1.5">
              <HistoryIcon className="h-3 w-3" />
              Source receipt{" "}
              <Link
                href={`/inspection/${qualification.sourceLotNumber}`}
                className="text-ink hover:text-accent"
              >
                {qualification.sourceLotNumber}
              </Link>
            </div>
          ) : (
            <div className="text-xs text-ink-muted">No source lot linked.</div>
          )}
          {supplier && (
            <div className="text-xs text-ink-muted flex items-center gap-3">
              <span>
                Health <span className="text-ink font-semibold">{supplier.healthScore}</span>/100
              </span>
              <Badge
                tone={
                  supplier.riskLevel === "Low"
                    ? "success"
                    : supplier.riskLevel === "Medium"
                      ? "warning"
                      : "danger"
                }
              >
                {supplier.riskLevel} risk
              </Badge>
            </div>
          )}
        </div>

        <div className="surface-inset p-3.5 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Process target
          </div>
          <div className="text-sm font-semibold flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-accent" />
            {qualification.consumptionArea}
          </div>
          <div className="text-xs text-ink-muted">
            Batch <span className="text-ink">{qualification.batchNumber}</span>
          </div>
          <div className="text-xs text-ink-muted flex items-center gap-1.5">
            <Calendar className="h-3 w-3" /> Requested {shortDate(qualification.requestedAt)}
          </div>
          <div className="text-xs text-ink-muted">
            Quantity{" "}
            <span className="text-ink">
              {qualification.quantity} {qualification.uom}
            </span>
          </div>
          <div className="text-xs text-ink-muted">
            Requested by <span className="text-ink">{qualification.requestedBy}</span>
          </div>
        </div>
      </div>

      {material?.specifications.length ? (
        <div className="mt-4 rounded-lg border border-line overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-inset/60 text-[10px] uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="text-left font-semibold py-2 px-3">Parameter</th>
                <th className="text-right font-semibold py-2 px-3">Min</th>
                <th className="text-right font-semibold py-2 px-3">Target</th>
                <th className="text-right font-semibold py-2 px-3">Max</th>
                <th className="text-left font-semibold py-2 px-3">Unit</th>
              </tr>
            </thead>
            <tbody>
              {material.specifications.map((s) => (
                <tr key={s.parameter} className="border-t border-line/60">
                  <td className="py-1.5 px-3 font-medium">{s.parameter}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-ink-muted">
                    {s.minValue ?? "—"}
                  </td>
                  <td className="py-1.5 px-3 text-right tabular-nums">{s.targetValue ?? "—"}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-ink-muted">
                    {s.maxValue ?? "—"}
                  </td>
                  <td className="py-1.5 px-3 text-ink-muted">{s.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </SectionCard>
  );
}
