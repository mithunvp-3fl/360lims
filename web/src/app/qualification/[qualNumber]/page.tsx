"use client";
import * as React from "react";
import { notFound, useParams } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { WorkflowTimeline } from "@/components/workbench/workflow-timeline";
import { QualificationHeader } from "@/components/qualification/qualification-header";
import { QualificationOverview } from "@/components/qualification/qualification-overview";
import { QualificationSampleSection } from "@/components/qualification/qualification-sample-section";
import { QualificationTestWorkspace } from "@/components/qualification/qualification-test-workspace";
import { ProcessReadinessPanel } from "@/components/qualification/process-readiness-panel";
import { QualificationApprovalCenter } from "@/components/qualification/qualification-approval-center";
import { QualificationActivityFeed } from "@/components/qualification/qualification-activity-feed";
import { QualificationAuditDrawer } from "@/components/qualification/qualification-audit-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMaterials,
  useQualification,
  useQualificationWorkflow,
  useSuppliers,
} from "@/lib/queries";

export default function QualificationWorkbenchPage() {
  const params = useParams<{ qualNumber: string }>();
  const n = decodeURIComponent(params.qualNumber);
  const { data: qualification, isLoading, error } = useQualification(n);
  const { data: workflow } = useQualificationWorkflow(n);
  const { data: suppliers } = useSuppliers();
  const { data: materials } = useMaterials();
  const [auditOpen, setAuditOpen] = React.useState(false);

  if (error && (error as { status?: number }).status === 404) notFound();

  const supplier = suppliers?.find((s) => s.id === qualification?.supplierId);
  const material = materials?.find((m) => m.id === qualification?.materialId);

  return (
    <AppShell
      breadcrumbs={[
        { label: "Quality Operations", href: "/qualification" },
        { label: "Process Material Qualification", href: "/qualification" },
        { label: n },
      ]}
    >
      {isLoading || !qualification ? (
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
          <QualificationHeader
            qualification={qualification}
            material={material}
            supplier={supplier}
            onShowHistory={() => setAuditOpen(true)}
          />
          <WorkflowTimeline workflow={workflow} />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
            <div className="xl:col-span-2 space-y-5">
              <QualificationOverview
                qualification={qualification}
                material={material}
                supplier={supplier}
              />
              <QualificationSampleSection qualificationNumber={n} />
              <QualificationTestWorkspace qualificationNumber={n} />
            </div>
            <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto xl:pr-1">
              <ProcessReadinessPanel qualificationNumber={n} />
              <QualificationApprovalCenter qualification={qualification} />
              <QualificationActivityFeed
                qualificationNumber={n}
                qualificationId={qualification.id}
              />
            </aside>
          </div>
        </div>
      )}

      <QualificationAuditDrawer
        qualificationNumber={n}
        open={auditOpen}
        onOpenChange={setAuditOpen}
      />
    </AppShell>
  );
}
