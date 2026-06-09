"use client";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircuitBoard,
  Cpu,
  Wifi,
  WifiOff,
  Wrench,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { SectionCard } from "@/components/kit/section-card";
import { KpiCard } from "@/components/kit/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useInstruments } from "@/lib/queries";
import { relativeTime } from "@/lib/utils";
import type { Instrument, InstrumentStatus } from "@/lib/types";

const STATUS_TONE: Record<InstrumentStatus, "success" | "warning" | "danger" | "muted"> = {
  Online: "success",
  Degraded: "warning",
  Offline: "danger",
  Maintenance: "muted",
};

export default function InstrumentsPage() {
  const { data: instruments, isLoading } = useInstruments();
  const all = instruments ?? [];

  const online = all.filter((i) => i.status === "Online").length;
  const degraded = all.filter((i) => i.status === "Degraded").length;
  const offline = all.filter((i) => i.status === "Offline").length;
  const importsWeek = all.reduce((acc, i) => acc + i.importsThisWeek, 0);

  return (
    <AppShell
      breadcrumbs={[
        { label: "Configure", href: "/instruments" },
        { label: "Instrument Integrations" },
      ]}
    >
      <div className="space-y-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
            Configure
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Instrument integrations</h1>
          <p className="text-sm text-ink-muted mt-1 max-w-2xl">
            Every lab device that streams results into Quality360. Health and heartbeat are tracked so analysts can trust the data before it lands in a result.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Online" value={online} unit={`/ ${all.length}`} accent="success" icon={<Wifi className="h-4 w-4" />} />
          <KpiCard label="Degraded" value={degraded} accent="warning" icon={<AlertTriangle className="h-4 w-4" />} />
          <KpiCard label="Offline" value={offline} accent="danger" icon={<WifiOff className="h-4 w-4" />} />
          <KpiCard label="Imports this week" value={importsWeek} accent="info" icon={<Activity className="h-4 w-4" />} />
        </div>

        <SectionCard
          title="Connected instruments"
          description="All XRF, OES, Combustion and Moisture devices integrated with the platform."
          icon={<CircuitBoard className="h-4 w-4" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {all.map((i) => (
              <InstrumentCard key={i.id} instrument={i} />
            ))}
            {isLoading && all.length === 0 && (
              <Card className="h-40 animate-pulse" />
            )}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}

function InstrumentCard({ instrument }: { instrument: Instrument }) {
  return (
    <div className="surface-card surface-card--glass p-4 relative">
      <div className="relative z-10 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-md bg-accent-soft text-accent grid place-items-center">
                <Cpu className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold leading-tight">{instrument.name}</div>
                <div className="text-[11px] text-ink-muted">{instrument.code} · {instrument.type}</div>
              </div>
            </div>
          </div>
          <Badge tone={STATUS_TONE[instrument.status]} className="gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                instrument.status === "Online" ? "bg-success animate-pulse" :
                instrument.status === "Degraded" ? "bg-warning" :
                instrument.status === "Offline" ? "bg-danger" :
                "bg-ink-subtle"
              }`}
            />
            {instrument.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">Vendor</div>
            <div className="text-ink truncate">{instrument.vendor}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">Model</div>
            <div className="text-ink truncate">{instrument.model}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">Serial</div>
            <div className="text-ink font-mono truncate text-[11px]">{instrument.serialNumber}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">Location</div>
            <div className="text-ink truncate">{instrument.location ?? "—"}</div>
          </div>
        </div>

        <div className="surface-inset p-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
            Supported parameters
          </div>
          <div className="flex flex-wrap gap-1">
            {instrument.supportedParameters.map((p) => (
              <Badge key={p} tone="outline" className="text-[10px]">{p}</Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-ink-muted">
          <span>Last import {relativeTime(instrument.lastImportAt)}</span>
          <span><span className="text-ink font-semibold">{instrument.importsThisWeek}</span> this week</span>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1">
            <Activity className="h-3.5 w-3.5" />
            View activity
          </Button>
          <Button variant="ghost" size="sm">
            <Wrench className="h-3.5 w-3.5" />
            Configure
          </Button>
        </div>
      </div>
    </div>
  );
}
