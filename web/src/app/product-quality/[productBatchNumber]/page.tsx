"use client";
import * as React from "react";
import { notFound, useParams } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { WorkflowTimeline } from "@/components/workbench/workflow-timeline";
import { ProductBatchHeader } from "@/components/product-quality/product-batch-header";
import { ProductBatchOverview } from "@/components/product-quality/product-batch-overview";
import { ProductSampleSection } from "@/components/product-quality/product-sample-section";
import { ProductTestWorkspace } from "@/components/product-quality/product-test-workspace";
import { ProductInsightsPanel } from "@/components/product-quality/product-insights-panel";
import { ProductApprovalCenter } from "@/components/product-quality/product-approval-center";
import { ProductActivityFeed } from "@/components/product-quality/product-activity-feed";
import { ProductAuditDrawer } from "@/components/product-quality/product-audit-drawer";
import { GenealogyCard } from "@/components/genealogy/genealogy-card";
import { LifecycleProgressPanel } from "@/components/genealogy/lifecycle-progress-panel";
import { MaterialLineagePanel } from "@/components/genealogy/material-lineage-panel";
import { RelatedTasksPanel } from "@/components/work/related-tasks-panel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useProductBatch,
  useProductBatchWorkflow,
} from "@/lib/queries";

export default function ProductQualityWorkbenchPage() {
  const params = useParams<{ productBatchNumber: string }>();
  const n = decodeURIComponent(params.productBatchNumber);
  const { data: batch, isLoading, error } = useProductBatch(n);
  const { data: workflow } = useProductBatchWorkflow(n);
  const [auditOpen, setAuditOpen] = React.useState(false);

  if (error && (error as { status?: number }).status === 404) notFound();

  return (
    <AppShell
      breadcrumbs={[
        { label: "Quality Operations", href: "/product-quality" },
        { label: "Product Quality Testing", href: "/product-quality" },
        { label: n },
      ]}
    >
      {isLoading || !batch ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-96 col-span-2" />
            <Skeleton className="h-96" />
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <ProductBatchHeader batch={batch} onShowHistory={() => setAuditOpen(true)} />
          <WorkflowTimeline workflow={workflow} />
          <GenealogyCard nodeType="product-batch" nodeKey={n} />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
            <div className="xl:col-span-2 space-y-5">
              <ProductBatchOverview batch={batch} />
              <ProductSampleSection productBatchNumber={n} />
              <ProductTestWorkspace productBatchNumber={n} />
            </div>
            <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto xl:pr-1">
              <ProductInsightsPanel productBatchNumber={n} />
              <LifecycleProgressPanel nodeType="product-batch" nodeKey={n} />
              <MaterialLineagePanel nodeType="product-batch" nodeKey={n} />
              <RelatedTasksPanel
                recordKey={n}
                moduleKey="product-quality"
                description="Sampling, testing, review and approval tasks for this product batch."
              />
              <ProductApprovalCenter batch={batch} />
              <ProductActivityFeed
                productBatchNumber={n}
                productBatchId={batch.id}
              />
            </aside>
          </div>
        </div>
      )}

      <ProductAuditDrawer
        productBatchNumber={n}
        open={auditOpen}
        onOpenChange={setAuditOpen}
      />
    </AppShell>
  );
}
