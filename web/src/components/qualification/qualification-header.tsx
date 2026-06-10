"use client";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  History,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RiskPill } from "@/components/kit/risk-pill";
import { QualificationStatusPill } from "./qualification-status-pill";
import type { Material, Qualification, Supplier } from "@/lib/types";

export function QualificationHeader({
  qualification,
  material,
  supplier,
  onShowHistory,
}: {
  qualification: Qualification;
  material?: Material;
  supplier?: Supplier;
  onShowHistory: () => void;
}) {
  const qc = useQueryClient();
  return (
    <div className="surface-card surface-card--glass">
      <div className="relative z-10 p-5 lg:p-6 grid grid-cols-12 gap-5 items-start">
        <div className="col-span-12 lg:col-span-8 space-y-3">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <Link href="/qualification" className="hover:text-ink inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              Qualification queue
            </Link>
            <ChevronRight className="h-3 w-3 text-ink-subtle" />
            <span className="text-ink font-medium">{qualification.qualificationNumber}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              {qualification.qualificationNumber}
            </h1>
            <QualificationStatusPill status={qualification.status} />
            <RiskPill level={qualification.riskLevel} />
            <Badge tone="outline">Process Material Qualification</Badge>
            <Badge tone="accent">{qualification.consumptionArea}</Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 pt-2">
            <Field label="Material" value={material?.name ?? "—"} hint={material?.category} />
            <Field label="Batch" value={qualification.batchNumber} hint={`UoM ${qualification.uom}`} />
            <Field
              label="Quantity"
              value={`${qualification.quantity} ${qualification.uom}`}
              hint={
                qualification.sourceLotNumber
                  ? `Source ${qualification.sourceLotNumber}`
                  : "Internal qualification"
              }
            />
            <Field
              label="Assigned"
              value={qualification.assignedTo ?? "Unassigned"}
              hint={supplier?.name ? `Supplier ${supplier.name}` : "Requested by " + qualification.requestedBy}
            />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col items-stretch lg:items-end gap-2">
          <div className="flex items-center gap-2 justify-end flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const n = qualification.qualificationNumber;
                qc.invalidateQueries({ queryKey: ["qualification", n] });
                qc.invalidateQueries({ queryKey: ["qualification-results", n] });
                qc.invalidateQueries({ queryKey: ["qualification-tests", n] });
                qc.invalidateQueries({ queryKey: ["qualification-insights", n] });
                qc.invalidateQueries({ queryKey: ["qualification-workflow", n] });
                toast.info("Refreshed", { description: "Latest data pulled from instruments and lab." });
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={onShowHistory}>
              <History className="h-3.5 w-3.5" />
              View history
            </Button>
            <Button variant="ghost" size="sm">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
          {qualification.notes && (
            <div className="surface-inset p-3 text-xs text-ink-muted leading-relaxed max-w-md ml-auto">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle block mb-1">
                Qualification note
              </span>
              {qualification.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">{label}</div>
      <div className="text-sm font-medium truncate">{value}</div>
      {hint && <div className="text-[11px] text-ink-muted truncate">{hint}</div>}
    </div>
  );
}
