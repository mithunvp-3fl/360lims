"use client";
import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  History,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/kit/status-pill";
import { RiskPill } from "@/components/kit/risk-pill";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Material, Receipt, Supplier } from "@/lib/types";

interface WorkbenchHeaderProps {
  receipt: Receipt;
  supplier?: Supplier;
  material?: Material;
  onShowHistory: () => void;
}

export function WorkbenchHeader({ receipt, supplier, material, onShowHistory }: WorkbenchHeaderProps) {
  const qc = useQueryClient();
  return (
    <div className="surface-card surface-card--glass">
      <div className="relative z-10 p-5 lg:p-6 grid grid-cols-12 gap-5 items-start">
        <div className="col-span-12 lg:col-span-8 space-y-3">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <Link href="/inspection" className="hover:text-ink inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              Inspection queue
            </Link>
            <ChevronRight className="h-3 w-3 text-ink-subtle" />
            <span className="text-ink font-medium">{receipt.lotNumber}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">{receipt.lotNumber}</h1>
            <StatusPill status={receipt.status} />
            <RiskPill level={receipt.riskLevel} />
            <Badge tone="outline">Incoming Material Inspection</Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 pt-2">
            <Field label="Supplier" value={supplier?.name ?? "—"} hint={supplier?.location} />
            <Field label="Material" value={material?.name ?? "—"} hint={material?.category} />
            <Field
              label="Quantity"
              value={`${receipt.quantity} ${receipt.uom}`}
              hint={`Vehicle ${receipt.vehicleNumber}`}
            />
            <Field
              label="Assigned"
              value={receipt.assignedTo ?? "Unassigned"}
              hint={`PO ${receipt.poNumber}`}
            />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col items-stretch lg:items-end gap-2">
          <div className="flex items-center gap-2 justify-end flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                qc.invalidateQueries({ queryKey: ["receipt", receipt.lotNumber] });
                qc.invalidateQueries({ queryKey: ["results", receipt.lotNumber] });
                qc.invalidateQueries({ queryKey: ["tests", receipt.lotNumber] });
                qc.invalidateQueries({ queryKey: ["insights", receipt.lotNumber] });
                qc.invalidateQueries({ queryKey: ["workflow", receipt.lotNumber] });
                toast.info("Refreshed", { description: "Latest data pulled from instruments and inspectors." });
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
          {receipt.notes && (
            <div className="surface-inset p-3 text-xs text-ink-muted leading-relaxed max-w-md ml-auto">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle block mb-1">
                Receipt note
              </span>
              {receipt.notes}
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
