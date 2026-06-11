"use client";
import * as React from "react";
import { notFound, useParams } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { CertificateHeader } from "@/components/certificates/certificate-header";
import { CertificateWorkflowStrip } from "@/components/certificates/certificate-workflow-strip";
import { CertificateOverview } from "@/components/certificates/certificate-overview";
import { CustomerSpecValidation } from "@/components/certificates/customer-spec-validation";
import { QualityResultsSummary } from "@/components/certificates/quality-results-summary";
import { GenealogyExpandedView } from "@/components/certificates/genealogy-expanded-view";
import { CertificateInsightsPanel } from "@/components/certificates/certificate-insights-panel";
import { DispatchApprovalCenter } from "@/components/certificates/dispatch-approval-center";
import { CertificateActivityFeed } from "@/components/certificates/certificate-activity-feed";
import { CertificateAuditDrawer } from "@/components/certificates/certificate-audit-drawer";
import { CertificateVersionPanel } from "@/components/certificates/certificate-version-panel";
import { ApprovalChainPanel } from "@/components/certificates/approval-chain-panel";
import { CertificateEventsTimeline } from "@/components/certificates/certificate-events-timeline";
import { TraceabilitySummaryCard } from "@/components/certificates/traceability-summary-card";
import { GenealogyCard } from "@/components/genealogy/genealogy-card";
import { LifecycleProgressPanel } from "@/components/genealogy/lifecycle-progress-panel";
import { MaterialLineagePanel } from "@/components/genealogy/material-lineage-panel";
import { RelatedTasksPanel } from "@/components/work/related-tasks-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useCertificate } from "@/lib/queries";

export default function CertificateWorkbenchPage() {
  const params = useParams<{ certificateNumber: string }>();
  const n = decodeURIComponent(params.certificateNumber);
  const { data: certificate, isLoading, error } = useCertificate(n);
  const [auditOpen, setAuditOpen] = React.useState(false);

  if (error && (error as { status?: number }).status === 404) notFound();

  return (
    <AppShell
      breadcrumbs={[
        { label: "Quality Operations", href: "/certificates" },
        { label: "Certificate & Dispatch", href: "/certificates" },
        { label: n },
      ]}
    >
      {isLoading || !certificate ? (
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
          <CertificateHeader
            certificate={certificate}
            onShowHistory={() => setAuditOpen(true)}
          />
          <CertificateWorkflowStrip certificate={certificate} />
          <GenealogyCard nodeType="certificate" nodeKey={n} />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
            <div className="xl:col-span-2 space-y-5">
              <CertificateOverview certificate={certificate} />
              <CustomerSpecValidation
                customer={certificate.customer}
                specs={certificate.customerSpecs}
              />
              <TraceabilitySummaryCard certificateNumber={n} />
              <QualityResultsSummary certificateNumber={n} />
              <CertificateEventsTimeline certificateNumber={n} />
              <GenealogyExpandedView certificateNumber={n} />
            </div>
            <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto xl:pr-1">
              <CertificateInsightsPanel certificateNumber={n} />
              <ApprovalChainPanel certificate={certificate} />
              <CertificateVersionPanel certificate={certificate} />
              <RelatedTasksPanel
                recordKey={n}
                moduleKey="certificates"
                title="Certificate tasks"
                description="Review → Approve Certificate → Approve Dispatch → Release."
              />
              <LifecycleProgressPanel nodeType="certificate" nodeKey={n} />
              <MaterialLineagePanel nodeType="certificate" nodeKey={n} />
              <DispatchApprovalCenter certificate={certificate} />
              <CertificateActivityFeed
                certificateNumber={n}
                certificateId={certificate.id}
              />
            </aside>
          </div>
        </div>
      )}

      <CertificateAuditDrawer
        certificateNumber={n}
        open={auditOpen}
        onOpenChange={setAuditOpen}
      />
    </AppShell>
  );
}
