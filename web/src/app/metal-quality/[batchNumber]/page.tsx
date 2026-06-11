"use client";
import * as React from "react";
import { notFound, useParams } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { WorkflowTimeline } from "@/components/workbench/workflow-timeline";
import { MetalBatchHeader } from "@/components/metal-quality/metal-batch-header";
import { MetalBatchOverview } from "@/components/metal-quality/metal-batch-overview";
import { MetalSampleSection } from "@/components/metal-quality/metal-sample-section";
import { MetalChemistryWorkspace } from "@/components/metal-quality/metal-chemistry-workspace";
import { MetalInsightsPanel } from "@/components/metal-quality/metal-insights-panel";
import { ChemistryCorrectionAdvisor } from "@/components/metal-quality/chemistry-correction-advisor";
import { MetalApprovalCenter } from "@/components/metal-quality/metal-approval-center";
import { MetalActivityFeed } from "@/components/metal-quality/metal-activity-feed";
import { MetalAuditDrawer } from "@/components/metal-quality/metal-audit-drawer";
import { GenealogyCard } from "@/components/genealogy/genealogy-card";
import { LifecycleProgressPanel } from "@/components/genealogy/lifecycle-progress-panel";
import { MaterialLineagePanel } from "@/components/genealogy/material-lineage-panel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMetalBatch,
  useMetalBatchWorkflow,
} from "@/lib/queries";

export default function MetalQualityWorkbenchPage() {
  const params = useParams<{ batchNumber: string }>();
  const n = decodeURIComponent(params.batchNumber);
  const { data: batch, isLoading, error } = useMetalBatch(n);
  const { data: workflow } = useMetalBatchWorkflow(n);
  const [auditOpen, setAuditOpen] = React.useState(false);

  if (error && (error as { status?: number }).status === 404) notFound();

  return (
    <AppShell
      breadcrumbs={[
        { label: "Quality Operations", href: "/metal-quality" },
        { label: "Metal Quality Control", href: "/metal-quality" },
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
          <MetalBatchHeader batch={batch} onShowHistory={() => setAuditOpen(true)} />
          <WorkflowTimeline workflow={workflow} />
          <GenealogyCard nodeType="metal-batch" nodeKey={n} />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
            <div className="xl:col-span-2 space-y-5">
              <MetalBatchOverview batch={batch} />
              <MetalSampleSection metalBatchNumber={n} />
              <MetalChemistryWorkspace metalBatchNumber={n} />
              <ChemistryCorrectionAdvisor metalBatchNumber={n} />
            </div>
            <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto xl:pr-1">
              <MetalInsightsPanel metalBatchNumber={n} />
              <LifecycleProgressPanel nodeType="metal-batch" nodeKey={n} />
              <MaterialLineagePanel nodeType="metal-batch" nodeKey={n} />
              <MetalApprovalCenter batch={batch} />
              <MetalActivityFeed
                metalBatchNumber={n}
                metalBatchId={batch.id}
              />
            </aside>
          </div>
        </div>
      )}

      <MetalAuditDrawer
        metalBatchNumber={n}
        open={auditOpen}
        onOpenChange={setAuditOpen}
      />
    </AppShell>
  );
}
