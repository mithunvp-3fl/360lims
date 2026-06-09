"use client";
import * as React from "react";
import { notFound, useParams } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { WorkbenchHeader } from "@/components/workbench/workbench-header";
import { WorkflowTimeline } from "@/components/workbench/workflow-timeline";
import { MaterialOverview } from "@/components/workbench/material-overview";
import { SampleSection } from "@/components/workbench/sample-section";
import { TestResultsWorkspace } from "@/components/workbench/test-results-workspace";
import { ActivityFeed } from "@/components/workbench/activity-feed";
import { QualityInsightsPanel } from "@/components/workbench/quality-insights-panel";
import { ApprovalCenter } from "@/components/workbench/approval-center";
import { AuditDrawer } from "@/components/workbench/audit-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMaterials,
  useReceipt,
  useSuppliers,
  useWorkflow,
} from "@/lib/queries";

export default function WorkbenchPage() {
  const params = useParams<{ lotNumber: string }>();
  const lot = decodeURIComponent(params.lotNumber);
  const { data: receipt, isLoading, error } = useReceipt(lot);
  const { data: workflow } = useWorkflow(lot);
  const { data: suppliers } = useSuppliers();
  const { data: materials } = useMaterials();
  const [auditOpen, setAuditOpen] = React.useState(false);

  if (error && (error as { status?: number }).status === 404) notFound();

  const supplier = suppliers?.find((s) => s.id === receipt?.supplierId);
  const material = materials?.find((m) => m.id === receipt?.materialId);

  return (
    <AppShell
      breadcrumbs={[
        { label: "Operate", href: "/dashboard" },
        { label: "Inspection", href: "/inspection" },
        { label: lot },
      ]}
    >
      {isLoading || !receipt ? (
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
          <WorkbenchHeader
            receipt={receipt}
            supplier={supplier}
            material={material}
            onShowHistory={() => setAuditOpen(true)}
          />
          <WorkflowTimeline workflow={workflow} />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
            <div className="xl:col-span-2 space-y-5">
              <MaterialOverview receipt={receipt} supplier={supplier} material={material} />
              <SampleSection lot={lot} />
              <TestResultsWorkspace lot={lot} />
            </div>
            <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto xl:pr-1">
              <QualityInsightsPanel lot={lot} />
              <ApprovalCenter receipt={receipt} />
              <ActivityFeed lot={lot} receiptId={receipt.id} />
            </aside>
          </div>
        </div>
      )}

      <AuditDrawer lot={lot} open={auditOpen} onOpenChange={setAuditOpen} />
    </AppShell>
  );
}
