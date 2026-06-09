"use client";
import { Boxes, MapPin, Pencil, Truck, Calendar, History as HistoryIcon } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { shortDate } from "@/lib/utils";
import type { Material, Receipt, Supplier } from "@/lib/types";

export function MaterialOverview({
  receipt,
  supplier,
  material,
}: {
  receipt: Receipt;
  supplier?: Supplier;
  material?: Material;
}) {
  return (
    <SectionCard
      title="Material overview"
      description="Specifications, supplier context, and dispatch info."
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
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Material</div>
          <div className="text-sm font-semibold">{material?.name}</div>
          <div className="text-xs text-ink-muted">{material?.category}</div>
          <div className="text-xs text-ink-muted">UoM: <span className="text-ink">{material?.uom}</span></div>
          <div className="text-xs text-ink-muted">Required tests:</div>
          <div className="flex flex-wrap gap-1">
            {(material?.requiredTests ?? []).map((t) => (
              <Badge key={t} tone="accent">{t}</Badge>
            ))}
          </div>
        </div>

        <div className="surface-inset p-3.5 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Supplier</div>
          <div className="text-sm font-semibold">{supplier?.name}</div>
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <MapPin className="h-3 w-3" /> {supplier?.location}
          </div>
          <div className="flex items-center gap-3 text-xs text-ink-muted">
            <span>Health <span className="text-ink font-semibold">{supplier?.healthScore}</span>/100</span>
            <Badge tone={supplier?.riskLevel === "Low" ? "success" : supplier?.riskLevel === "Medium" ? "warning" : "danger"}>
              {supplier?.riskLevel} risk
            </Badge>
          </div>
          <div className="text-xs text-ink-muted flex items-center gap-1.5">
            <HistoryIcon className="h-3 w-3" />
            <span className="text-ink">{supplier?.acceptedDeliveries}</span> accepted · <span className="text-danger">{supplier?.rejectedDeliveries}</span> rejected
          </div>
        </div>

        <div className="surface-inset p-3.5 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Dispatch</div>
          <div className="text-sm font-semibold">{receipt.quantity} {receipt.uom}</div>
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Truck className="h-3 w-3" /> Vehicle <span className="text-ink ml-1">{receipt.vehicleNumber}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Calendar className="h-3 w-3" /> Received {shortDate(receipt.receiptDate)}
          </div>
          <div className="text-xs text-ink-muted">PO <span className="text-ink">{receipt.poNumber}</span></div>
        </div>
      </div>

      {/* Spec table */}
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
                  <td className="py-1.5 px-3 text-right tabular-nums text-ink-muted">{s.minValue ?? "—"}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums">{s.targetValue ?? "—"}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-ink-muted">{s.maxValue ?? "—"}</td>
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
