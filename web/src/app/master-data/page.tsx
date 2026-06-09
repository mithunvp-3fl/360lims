"use client";
import * as React from "react";
import {
  Beaker,
  Boxes,
  Building2,
  Cpu,
  MapPin,
  Plus,
  Search,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInstruments, useMaterials, useSuppliers } from "@/lib/queries";
import { relativeTime } from "@/lib/utils";

export default function MasterDataPage() {
  const { data: suppliers } = useSuppliers();
  const { data: materials } = useMaterials();
  const { data: instruments } = useInstruments();
  const [search, setSearch] = React.useState("");

  const filterText = (s: string) => s.toLowerCase().includes(search.toLowerCase());

  return (
    <AppShell
      breadcrumbs={[
        { label: "Configure", href: "/master-data" },
        { label: "Master Data" },
      ]}
    >
      <div className="space-y-5">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
              Configure
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Master data</h1>
            <p className="text-sm text-ink-muted mt-1">
              Suppliers, materials, and instruments — the reference data every module depends on.
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-9 w-72"
            />
          </div>
        </div>

        <Tabs defaultValue="suppliers" className="space-y-4">
          <TabsList className="bg-surface">
            <TabsTrigger value="suppliers" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Suppliers
              <Badge tone="muted" className="ml-1">{suppliers?.length ?? 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="materials" className="gap-1.5">
              <Boxes className="h-3.5 w-3.5" /> Materials
              <Badge tone="muted" className="ml-1">{materials?.length ?? 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="instruments" className="gap-1.5">
              <Cpu className="h-3.5 w-3.5" /> Instruments
              <Badge tone="muted" className="ml-1">{instruments?.length ?? 0}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers">
            <SectionCard
              title="Suppliers"
              description="Performance, location, and risk for every accepted partner."
              actions={
                <Button variant="outline" size="sm">
                  <Plus className="h-3.5 w-3.5" /> New supplier
                </Button>
              }
              bodyClassName="p-0"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-inset/60 border-b border-line text-[11px] uppercase tracking-wide text-ink-muted">
                      <th className="text-left font-semibold py-2.5 px-4">Supplier</th>
                      <th className="text-left font-semibold py-2.5 px-4">Category</th>
                      <th className="text-left font-semibold py-2.5 px-4">Location</th>
                      <th className="text-right font-semibold py-2.5 px-4">Health</th>
                      <th className="text-left font-semibold py-2.5 px-4">Risk</th>
                      <th className="text-right font-semibold py-2.5 px-4">Deliveries</th>
                      <th className="text-left font-semibold py-2.5 px-4">Last delivery</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(suppliers ?? [])
                      .filter((s) => !search || filterText(s.name) || filterText(s.code))
                      .map((s) => (
                        <tr key={s.id} className="border-b border-line/60 hover:bg-inset/40">
                          <td className="py-3 px-4">
                            <div className="font-medium">{s.name}</div>
                            <div className="text-[11px] text-ink-subtle font-mono">{s.code}</div>
                          </td>
                          <td className="py-3 px-4 text-ink-muted">{s.category ?? "—"}</td>
                          <td className="py-3 px-4 text-ink-muted">
                            <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {s.location ?? "—"}</div>
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums">
                            <div className="font-semibold">{s.healthScore}</div>
                            <div className="text-[10px] text-ink-subtle">/ 100</div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge tone={s.riskLevel === "Low" ? "success" : s.riskLevel === "Medium" ? "warning" : "danger"}>
                              {s.riskLevel}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="text-xs">
                              <span className="text-success font-semibold">{s.acceptedDeliveries}</span>
                              <span className="text-ink-muted"> · </span>
                              <span className="text-warning">{s.onHoldDeliveries}</span>
                              <span className="text-ink-muted"> · </span>
                              <span className="text-danger">{s.rejectedDeliveries}</span>
                            </div>
                            <div className="text-[10px] text-ink-subtle">accepted / hold / rejected</div>
                          </td>
                          <td className="py-3 px-4 text-xs text-ink-muted">{relativeTime(s.lastDeliveryDate)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="materials">
            <SectionCard
              title="Materials"
              description="Specifications and required tests drive auto-assignment when samples are drawn."
              actions={
                <Button variant="outline" size="sm">
                  <Plus className="h-3.5 w-3.5" /> New material
                </Button>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(materials ?? [])
                  .filter((m) => !search || filterText(m.name) || filterText(m.code))
                  .map((m) => (
                  <div key={m.id} className="surface-inset p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold">{m.name}</div>
                        <div className="text-[11px] text-ink-subtle font-mono">{m.code} · {m.category}</div>
                      </div>
                      <Badge tone="outline">{m.uom}</Badge>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                        Required tests
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {m.requiredTests.map((t) => (
                          <Badge key={t} tone="accent" className="gap-1">
                            <Beaker className="h-3 w-3" /> {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
                        Specifications
                      </div>
                      <div className="rounded-md border border-line overflow-hidden bg-surface text-xs">
                        <table className="w-full">
                          <thead className="text-[10px] uppercase text-ink-muted">
                            <tr>
                              <th className="text-left font-semibold py-1.5 px-2">Param</th>
                              <th className="text-right font-semibold py-1.5 px-2">Min</th>
                              <th className="text-right font-semibold py-1.5 px-2">Target</th>
                              <th className="text-right font-semibold py-1.5 px-2">Max</th>
                            </tr>
                          </thead>
                          <tbody>
                            {m.specifications.map((s) => (
                              <tr key={s.parameter} className="border-t border-line/60">
                                <td className="py-1 px-2 font-medium">{s.parameter}</td>
                                <td className="py-1 px-2 text-right tabular-nums text-ink-muted">{s.minValue ?? "—"}</td>
                                <td className="py-1 px-2 text-right tabular-nums">{s.targetValue ?? "—"}</td>
                                <td className="py-1 px-2 text-right tabular-nums text-ink-muted">{s.maxValue ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="instruments">
            <SectionCard
              title="Instruments"
              description="Cross-referenced to the integrations page; this view shows registered devices."
            >
              <div className="rounded-lg border border-line overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-inset/60 text-[11px] uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="text-left font-semibold py-2.5 px-4">Instrument</th>
                      <th className="text-left font-semibold py-2.5 px-4">Type</th>
                      <th className="text-left font-semibold py-2.5 px-4">Vendor / Model</th>
                      <th className="text-left font-semibold py-2.5 px-4">Status</th>
                      <th className="text-left font-semibold py-2.5 px-4">Location</th>
                      <th className="text-right font-semibold py-2.5 px-4">Imports / week</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(instruments ?? [])
                      .filter((i) => !search || filterText(i.name) || filterText(i.code))
                      .map((i) => (
                        <tr key={i.id} className="border-t border-line/60 hover:bg-inset/40">
                          <td className="py-3 px-4">
                            <div className="font-medium">{i.name}</div>
                            <div className="text-[11px] text-ink-subtle font-mono">{i.code}</div>
                          </td>
                          <td className="py-3 px-4 text-ink-muted">{i.type}</td>
                          <td className="py-3 px-4">
                            <div>{i.vendor}</div>
                            <div className="text-[11px] text-ink-subtle">{i.model}</div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge tone={i.status === "Online" ? "success" : i.status === "Degraded" ? "warning" : i.status === "Offline" ? "danger" : "muted"}>
                              {i.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-ink-muted">{i.location ?? "—"}</td>
                          <td className="py-3 px-4 text-right tabular-nums">{i.importsThisWeek}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
