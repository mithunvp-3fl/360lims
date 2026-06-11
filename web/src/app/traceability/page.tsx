"use client";
import * as React from "react";
import Link from "next/link";
import {
  Activity,
  Award,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileSignature,
  GitBranch,
  History,
  Layers,
  Network,
  PackageSearch,
  Route,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { SectionCard } from "@/components/kit/section-card";
import { KpiCard } from "@/components/kit/kpi-card";
import { GenealogyCard } from "@/components/genealogy/genealogy-card";
import { LifecycleProgressPanel } from "@/components/genealogy/lifecycle-progress-panel";
import { MaterialLineagePanel } from "@/components/genealogy/material-lineage-panel";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  useJourneyTimeline,
  useTraceabilityDashboard,
} from "@/lib/queries";
import type { GenealogyNodeType } from "@/lib/types";
import { useRole } from "@/components/role-context";
import { EnhancedSearch } from "@/components/traceability/enhanced-search";
import { QualitySummaryPanel } from "@/components/traceability/quality-summary-panel";
import { RiskPanel } from "@/components/traceability/risk-panel";
import { QualityScorecardPanel } from "@/components/traceability/quality-scorecard-panel";
import { QualityEventsTab } from "@/components/traceability/quality-events-tab";
import { ApprovalsTab } from "@/components/traceability/approvals-tab";
import { ImpactAnalysisPanel } from "@/components/traceability/impact-analysis-panel";
import { TimelineView } from "@/components/traceability/timeline-view";
import { RelatedRecordsPanel } from "@/components/traceability/related-records-panel";
import { AuditHistoryTab } from "@/components/traceability/audit-history-tab";
import {
  ALL_TABS,
  defaultTabFor,
  RoleViewIndicator,
  type TraceabilityTab,
} from "@/components/traceability/role-view-filter";

const NODE_LABEL: Record<GenealogyNodeType, string> = {
  "raw-material": "Raw Material",
  "process-qualification": "Process Qualification",
  "metal-batch": "Metal Batch",
  "product-batch": "Product Batch",
  certificate: "Certificate",
};

const TAB_META: Record<
  TraceabilityTab,
  { label: string; icon: React.ReactNode }
> = {
  lifecycle: { label: "Lifecycle Progress", icon: <Route className="h-3.5 w-3.5" /> },
  lineage: { label: "Material Lineage", icon: <Network className="h-3.5 w-3.5" /> },
  events: { label: "Quality Events", icon: <Activity className="h-3.5 w-3.5" /> },
  approvals: { label: "Approvals", icon: <FileSignature className="h-3.5 w-3.5" /> },
  audit: { label: "Audit History", icon: <History className="h-3.5 w-3.5" /> },
};

export default function TraceabilityCenterPage() {
  const { role, hydrated } = useRole();
  const [selected, setSelected] = React.useState<{
    type: GenealogyNodeType;
    key: string;
  } | null>({ type: "raw-material", key: "LOT-2026-0042" });

  const [tab, setTab] = React.useState<TraceabilityTab>("lifecycle");

  // Land on the role-appropriate tab once the role has hydrated from
  // localStorage. After that, the user owns the tab choice.
  const initialized = React.useRef(false);
  React.useEffect(() => {
    if (hydrated && !initialized.current) {
      setTab(defaultTabFor(role));
      initialized.current = true;
    }
  }, [hydrated, role]);

  const { data: dashboard } = useTraceabilityDashboard();

  return (
    <AppShell
      breadcrumbs={[
        { label: "Quality Operations", href: "/dashboard" },
        { label: "Traceability Center" },
      ]}
    >
      <div className="space-y-5">
        <PageHeader />

        <DashboardStrip
          activeLots={dashboard?.activeLots ?? 0}
          inTesting={dashboard?.inTesting ?? 0}
          awaiting={dashboard?.awaitingApproval ?? 0}
          released={dashboard?.released ?? 0}
          certificates={dashboard?.certificatesGenerated ?? 0}
          coveragePct={dashboard?.coveragePct ?? 0}
        />

        <EnhancedSearch
          selectedKey={selected?.key}
          onPick={(type, key) => setSelected({ type, key })}
        />

        {selected && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
            <div className="xl:col-span-2 space-y-4">
              <CurrentSelectionHeader
                nodeType={selected.type}
                nodeKey={selected.key}
              />

              <Tabs
                value={tab}
                onValueChange={(v) => setTab(v as TraceabilityTab)}
                className="space-y-3"
              >
                <TabsList className="flex flex-wrap h-auto">
                  {ALL_TABS.map((t) => (
                    <TabsTrigger
                      key={t}
                      value={t}
                      className="gap-1.5"
                    >
                      {TAB_META[t].icon}
                      {TAB_META[t].label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="lifecycle" className="space-y-4">
                  <GenealogyCard
                    nodeType={selected.type}
                    nodeKey={selected.key}
                  />
                  <LifecycleProgressPanel
                    nodeType={selected.type}
                    nodeKey={selected.key}
                  />
                </TabsContent>

                <TabsContent value="lineage" className="space-y-4">
                  <MaterialLineagePanel
                    nodeType={selected.type}
                    nodeKey={selected.key}
                  />
                  <RelatedRecordsPanel
                    nodeType={selected.type}
                    nodeKey={selected.key}
                  />
                  <ImpactAnalysisPanel
                    nodeType={selected.type}
                    nodeKey={selected.key}
                  />
                </TabsContent>

                <TabsContent value="events" className="space-y-4">
                  <QualityEventsTab
                    nodeType={selected.type}
                    nodeKey={selected.key}
                  />
                  <TimelineView
                    nodeType={selected.type}
                    nodeKey={selected.key}
                  />
                </TabsContent>

                <TabsContent value="approvals" className="space-y-4">
                  <ApprovalsTab
                    nodeType={selected.type}
                    nodeKey={selected.key}
                  />
                </TabsContent>

                <TabsContent value="audit" className="space-y-4">
                  <AuditHistoryTab
                    nodeType={selected.type}
                    nodeKey={selected.key}
                  />
                </TabsContent>
              </Tabs>
            </div>

            <aside className="space-y-4 xl:sticky xl:top-4">
              <QualitySummaryPanel
                nodeType={selected.type}
                nodeKey={selected.key}
              />
              <RiskPanel
                nodeType={selected.type}
                nodeKey={selected.key}
              />
              <QualityScorecardPanel
                nodeType={selected.type}
                nodeKey={selected.key}
              />
            </aside>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function PageHeader() {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-accent-soft text-accent grid place-items-center">
          <GitBranch className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Traceability Center
          </h1>
          <p className="text-sm text-ink-muted">
            Search any lot, batch or certificate — five tabs cover lifecycle,
            lineage, events, approvals and audit.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <RoleViewIndicator />
        <Badge tone="accent">Framework · V2</Badge>
      </div>
    </div>
  );
}

function DashboardStrip({
  activeLots,
  inTesting,
  awaiting,
  released,
  certificates,
  coveragePct,
}: {
  activeLots: number;
  inTesting: number;
  awaiting: number;
  released: number;
  certificates: number;
  coveragePct: number;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <KpiCard
        label="Active Lots"
        value={activeLots}
        accent="info"
        icon={<Layers className="h-4 w-4" />}
      />
      <KpiCard
        label="In Testing"
        value={inTesting}
        accent="info"
        icon={<PackageSearch className="h-4 w-4" />}
      />
      <KpiCard
        label="Awaiting Approval"
        value={awaiting}
        accent="warning"
        icon={<Clock className="h-4 w-4" />}
      />
      <KpiCard
        label="Released"
        value={released}
        accent="success"
        icon={<CheckCircle2 className="h-4 w-4" />}
      />
      <KpiCard
        label="Certificates"
        value={certificates}
        accent="accent"
        icon={<Award className="h-4 w-4" />}
      />
      <KpiCard
        label="Coverage"
        value={`${coveragePct}%`}
        accent="success"
        icon={<FileCheck2 className="h-4 w-4" />}
        hint="Lots with chain ≥ 4 step types"
      />
    </div>
  );
}

function CurrentSelectionHeader({
  nodeType,
  nodeKey,
}: {
  nodeType: GenealogyNodeType;
  nodeKey: string;
}) {
  const { data: journey } = useJourneyTimeline(nodeType, nodeKey);
  const currentNode = journey?.steps.find((s) => s.nodeKey === nodeKey);
  return (
    <SectionCard
      title="Current Record"
      icon={<PackageSearch className="h-4 w-4" />}
      actions={
        currentNode?.href && (
          <Link
            href={currentNode.href}
            className="text-accent hover:underline text-[12px] font-medium"
          >
            Open Workbench →
          </Link>
        )
      }
    >
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="font-mono text-[13px] font-semibold">{nodeKey}</div>
        <Badge tone="accent" className="text-[10px]">
          {NODE_LABEL[nodeType]}
        </Badge>
        {journey && (
          <span className="text-[11px] text-ink-muted">
            {journey.events.length} events on this chain
          </span>
        )}
      </div>
    </SectionCard>
  );
}
