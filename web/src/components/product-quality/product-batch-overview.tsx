"use client";
import { Boxes, Calendar, Factory, Pencil, Target } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { shortDate } from "@/lib/utils";
import type { ProductBatch } from "@/lib/types";

export function ProductBatchOverview({ batch }: { batch: ProductBatch }) {
  return (
    <SectionCard
      title="Product overview"
      description="Production context, customer commitment, and test matrix."
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
            Product &amp; test matrix
          </div>
          <div className="text-sm font-semibold">{batch.productType}</div>
          <div className="text-xs text-ink-muted">
            Source {batch.sourceMetalBatchNumber ?? "—"}
          </div>
          <div className="text-xs text-ink-muted">Test categories:</div>
          <div className="flex flex-wrap gap-1">
            <Badge tone="accent">Mechanical</Badge>
            <Badge tone="accent">Physical</Badge>
            <Badge tone="accent">Metallography</Badge>
            <Badge tone="accent">Visual</Badge>
          </div>
        </div>

        <div className="surface-inset p-3.5 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Production source
          </div>
          <div className="text-sm font-semibold flex items-center gap-1.5">
            <Factory className="h-3.5 w-3.5 text-accent" />
            {batch.sourceMetalBatchNumber ?? "Direct"}
          </div>
          <div className="text-xs text-ink-muted">
            Operator <span className="text-ink">{batch.operator ?? "—"}</span>
          </div>
          <div className="text-xs text-ink-muted flex items-center gap-1.5">
            <Calendar className="h-3 w-3" /> Produced {shortDate(batch.productionDate)}
          </div>
        </div>

        <div className="surface-inset p-3.5 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Customer commitment
          </div>
          <div className="text-sm font-semibold flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-accent" />
            {batch.customer ?? "Stock"}
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
    </SectionCard>
  );
}
