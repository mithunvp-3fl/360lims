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
import { ProductBatchStatusPill } from "./product-batch-status-pill";
import type { ProductBatch } from "@/lib/types";

export function ProductBatchHeader({
  batch,
  onShowHistory,
}: {
  batch: ProductBatch;
  onShowHistory: () => void;
}) {
  const qc = useQueryClient();
  return (
    <div className="surface-card surface-card--glass">
      <div className="relative z-10 p-5 lg:p-6 grid grid-cols-12 gap-5 items-start">
        <div className="col-span-12 lg:col-span-8 space-y-3">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <Link href="/product-quality" className="hover:text-ink inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              Product batch queue
            </Link>
            <ChevronRight className="h-3 w-3 text-ink-subtle" />
            <span className="text-ink font-medium">{batch.productBatchNumber}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              {batch.productBatchNumber}
            </h1>
            <ProductBatchStatusPill status={batch.status} />
            <RiskPill level={batch.riskLevel} />
            <Badge tone="outline">Product Quality Testing</Badge>
            <Badge tone="accent">{batch.productType}</Badge>
            {batch.customer && <Badge tone="info">{batch.customer}</Badge>}
            {batch.complianceScore != null && (
              <Badge
                tone={
                  batch.complianceScore >= 90
                    ? "success"
                    : batch.complianceScore >= 75
                    ? "info"
                    : batch.complianceScore >= 60
                    ? "warning"
                    : "danger"
                }
                className="tabular-nums"
              >
                Compliance {batch.complianceScore}/100
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 pt-2">
            <Field label="Product type" value={batch.productType} hint="Finished product" />
            <Field
              label="Weight"
              value={`${batch.weight} ${batch.uom}`}
              hint={batch.operator ? `Operator ${batch.operator}` : undefined}
            />
            <Field
              label="Source metal batch"
              value={batch.sourceMetalBatchNumber ?? "—"}
              hint={batch.customer ? `Customer ${batch.customer}` : undefined}
            />
            <Field
              label="Assigned"
              value={batch.assignedTo ?? "Unassigned"}
              hint={`Created by ${batch.createdBy}`}
            />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col items-stretch lg:items-end gap-2">
          <div className="flex items-center gap-2 justify-end flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const n = batch.productBatchNumber;
                qc.invalidateQueries({ queryKey: ["product-batch", n] });
                qc.invalidateQueries({ queryKey: ["product-batch-results", n] });
                qc.invalidateQueries({ queryKey: ["product-batch-tests", n] });
                qc.invalidateQueries({ queryKey: ["product-batch-insights", n] });
                qc.invalidateQueries({ queryKey: ["product-batch-workflow", n] });
                toast.info("Refreshed", {
                  description: "Latest results pulled from instruments.",
                });
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
          {batch.notes && (
            <div className="surface-inset p-3 text-xs text-ink-muted leading-relaxed max-w-md ml-auto">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle block mb-1">
                Production note
              </span>
              {batch.notes}
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
