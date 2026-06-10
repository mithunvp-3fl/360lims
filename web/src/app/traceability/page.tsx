"use client";
import * as React from "react";
import Link from "next/link";
import {
  Activity,
  Award,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  FileCheck2,
  GitBranch,
  Layers,
  Loader2,
  PackageSearch,
  ScanLine,
  Search,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { SectionCard } from "@/components/kit/section-card";
import { KpiCard } from "@/components/kit/kpi-card";
import { GenealogyCard } from "@/components/genealogy/genealogy-card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useJourneyTimeline,
  useTraceabilityDashboard,
  useTraceabilitySearch,
} from "@/lib/queries";
import type {
  GenealogyNodeType,
  JourneyEvent,
  TraceabilitySearchHit,
} from "@/lib/types";

const NODE_LABEL: Record<GenealogyNodeType, string> = {
  "raw-material": "Raw Material",
  "process-qualification": "Process Qualification",
  "metal-batch": "Metal Batch",
  "product-batch": "Product Batch",
  "certificate": "Certificate",
};

const EXAMPLE_QUERIES = [
  { label: "LOT-2026-0042", type: "raw-material" as const },
  { label: "PMQ-2026-001245", type: "process-qualification" as const },
  { label: "MB-2026-001245", type: "metal-batch" as const },
];

export default function TraceabilityCenterPage() {
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<{
    type: GenealogyNodeType;
    key: string;
  } | null>({ type: "raw-material", key: "LOT-2026-0042" });

  const { data: dashboard } = useTraceabilityDashboard();
  const { data: hits, isLoading: searching } = useTraceabilitySearch(query);

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

        <SectionCard
          title="Search across the genealogy"
          description="Lot, batch, certificate, customer order, sample, vehicle, PO — pick a hit to see its full chain."
          icon={<ScanLine className="h-4 w-4" />}
          actions={
            <div className="flex items-center gap-2 text-[11px] text-ink-muted">
              <span>Try:</span>
              {EXAMPLE_QUERIES.map((e) => (
                <button
                  key={e.label}
                  type="button"
                  onClick={() => {
                    setQuery(e.label);
                    setSelected({ type: e.type, key: e.label });
                  }}
                  className="rounded-full bg-inset border border-line px-2 py-0.5 font-mono text-[10px] text-ink hover:bg-surface"
                >
                  {e.label}
                </button>
              ))}
            </div>
          }
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="LOT-2026-0042, PMQ-2026-001245, MB-2026-001245, PO-2026-118 …"
              className="pl-9"
            />
          </div>

          {query.trim().length > 0 && (
            <div className="mt-3 max-h-72 overflow-y-auto rounded-md border border-line bg-surface">
              {searching ? (
                <div className="px-3 py-2 text-xs text-ink-muted flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
                </div>
              ) : !hits || hits.length === 0 ? (
                <div className="px-3 py-2 text-xs text-ink-muted">No matches.</div>
              ) : (
                <ul className="divide-y divide-line">
                  {hits.map((h) => (
                    <SearchHitRow
                      key={`${h.nodeType}-${h.nodeKey}`}
                      hit={h}
                      active={selected?.key === h.nodeKey}
                      onPick={() => setSelected({ type: h.nodeType, key: h.nodeKey })}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </SectionCard>

        {selected && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
            <div className="xl:col-span-2 space-y-5">
              <GenealogyCard nodeType={selected.type} nodeKey={selected.key} />
              <TraceabilityTimelineCard
                nodeType={selected.type}
                nodeKey={selected.key}
              />
            </div>
            <aside className="space-y-5">
              <CurrentSelectionCard nodeType={selected.type} nodeKey={selected.key} />
              <HowItWorksCard />
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
          <h1 className="text-xl font-semibold tracking-tight">Traceability Center</h1>
          <p className="text-sm text-ink-muted">
            Search any lot, batch, or certificate — view the complete quality journey forward and
            backward.
          </p>
        </div>
      </div>
      <Badge tone="accent">Framework · Phase 4</Badge>
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
        hint="Lots with chain ≥ 2 steps"
      />
    </div>
  );
}

function SearchHitRow({
  hit,
  active,
  onPick,
}: {
  hit: TraceabilitySearchHit;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        className={cn(
          "w-full text-left px-3 py-2 flex items-center justify-between gap-3 hover:bg-inset",
          active && "bg-inset",
        )}
      >
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{hit.title}</div>
          <div className="text-[11px] text-ink-muted truncate">
            {NODE_LABEL[hit.nodeType]}
            {hit.subtitle ? ` · ${hit.subtitle}` : ""}
          </div>
        </div>
        <Badge tone="muted" className="text-[10px]">
          {hit.status}
        </Badge>
      </button>
    </li>
  );
}

function CurrentSelectionCard({
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
      title="Current Selection"
      icon={<PackageSearch className="h-4 w-4" />}
    >
      <div className="space-y-2 text-sm">
        <Row label="Node">
          <span className="font-mono text-[12px]">{nodeKey}</span>
        </Row>
        <Row label="Type">
          <Badge tone="accent" className="text-[10px]">
            {NODE_LABEL[nodeType]}
          </Badge>
        </Row>
        {currentNode?.href && (
          <Row label="Open">
            <Link
              href={currentNode.href}
              className="text-accent hover:underline text-xs font-medium"
            >
              Workbench →
            </Link>
          </Row>
        )}
        <Row label="Events">
          <span className="text-xs text-ink-muted">{journey?.events.length ?? 0} recorded</span>
        </Row>
      </div>
    </SectionCard>
  );
}

function HowItWorksCard() {
  return (
    <SectionCard
      title="How traceability works"
      icon={<BookOpenCheck className="h-4 w-4" />}
    >
      <ol className="space-y-1.5 text-xs text-ink-muted leading-relaxed">
        <li>
          1. Every quality decision (sample, test, approval) registers an audit event against the
          underlying entity.
        </li>
        <li>
          2. Each entity links upstream and downstream — receipts to qualifications, qualifications
          to metal batches.
        </li>
        <li>
          3. The Genealogy Card and Quality Journey panel render the chain on every workbench so
          users always know where they are.
        </li>
        <li>
          4. Future Step 4 (Product Testing) and Step 5 (Certificate) plug in without changing the
          framework.
        </li>
      </ol>
    </SectionCard>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] uppercase tracking-wider text-ink-subtle">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

function TraceabilityTimelineCard({
  nodeType,
  nodeKey,
}: {
  nodeType: GenealogyNodeType;
  nodeKey: string;
}) {
  const { data, isLoading } = useJourneyTimeline(nodeType, nodeKey);
  return (
    <SectionCard
      title="Quality Event Timeline"
      description="Every test, sample, approval and decision across the chain"
      icon={<Activity className="h-4 w-4" />}
    >
      {isLoading || !data ? (
        <div className="text-xs text-ink-muted">Loading timeline…</div>
      ) : data.events.length === 0 ? (
        <div className="text-xs text-ink-muted">No events recorded for this chain yet.</div>
      ) : (
        <ol className="space-y-2.5">
          {data.events.slice(-40).reverse().map((e, idx) => (
            <EventRow key={`${e.timestamp}-${idx}`} event={e} />
          ))}
        </ol>
      )}
    </SectionCard>
  );
}

function EventRow({ event }: { event: JourneyEvent }) {
  return (
    <li className="flex items-start gap-3 text-xs">
      <div className="w-32 shrink-0 text-ink-muted tabular-nums">
        {formatTimestamp(event.timestamp)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-ink">
          {event.action} <span className="text-ink-muted font-normal">· {event.entityType}</span>
        </div>
        <div className="text-ink-muted truncate">
          by {event.actor}
          {event.actorRole ? ` · ${event.actorRole}` : ""}
          {event.nodeKey ? ` · ${event.nodeKey}` : ""}
        </div>
      </div>
    </li>
  );
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
