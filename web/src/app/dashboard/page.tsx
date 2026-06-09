"use client";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  PackageOpen,
  Sparkles,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/shell/app-shell";
import { Card } from "@/components/ui/card";
import { SectionCard } from "@/components/kit/section-card";
import { KpiCard } from "@/components/kit/kpi-card";
import { StatusPill } from "@/components/kit/status-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDashboardSummary, useNotifications, useReceipts } from "@/lib/queries";
import { relativeTime } from "@/lib/utils";
import type { ReceiptStatus } from "@/lib/types";

const ICON_FOR_KPI: Record<string, React.ReactNode> = {
  "Open Lots": <PackageOpen className="h-4 w-4" />,
  "Awaiting Review": <ClipboardCheck className="h-4 w-4" />,
  "Approval Rate": <CheckCircle2 className="h-4 w-4" />,
  "Instruments Online": <Activity className="h-4 w-4" />,
};

const STATUS_COLORS: Record<string, string> = {
  "Pending Sampling": "rgb(100 116 139)",
  "Pending Testing": "rgb(37 99 235)",
  "Pending Review": "rgb(124 58 237)",
  Approved: "rgb(5 150 105)",
  Rejected: "rgb(220 38 38)",
  "On Hold": "rgb(217 119 6)",
};

export default function DashboardPage() {
  const { data, isLoading } = useDashboardSummary();
  const { data: receipts } = useReceipts();
  const { data: notifications } = useNotifications();

  const recent = (receipts ?? []).slice(0, 5);

  return (
    <AppShell breadcrumbs={[{ label: "Operate", href: "/dashboard" }, { label: "Dashboard" }]}>
      <div className="space-y-6">
        {/* Hero greeting */}
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
              Operations dashboard
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Good afternoon, Priya.</h1>
            <p className="text-sm text-ink-muted mt-1 max-w-xl">
              {data?.kpis.find((k) => k.label === "Awaiting Review")?.value ?? 0} lot
              {(data?.kpis.find((k) => k.label === "Awaiting Review")?.value ?? 0) === 1 ? "" : "s"}{" "}
              waiting on your review. Instrument floor is steady. Supplier health is up week-over-week.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/inspection">Open queue</Link>
            </Button>
            <Button asChild>
              <Link href="/inspection/LOT-2026-0042">
                <Sparkles className="h-4 w-4" />
                Jump into demo workbench
              </Link>
            </Button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {isLoading || !data
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[120px]" />)
            : data.kpis.map((k) => (
                <KpiCard
                  key={k.label}
                  label={k.label}
                  value={k.value}
                  unit={k.unit ?? undefined}
                  deltaPct={k.deltaPct ?? undefined}
                  accent={k.accent}
                  icon={ICON_FOR_KPI[k.label] ?? <Gauge className="h-4 w-4" />}
                />
              ))}
        </div>

        {/* Body grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Volume + Status */}
          <SectionCard
            title="Inspection throughput"
            description="Lots received per week, last 12 weeks"
            className="xl:col-span-2"
            bodyClassName="px-2 pb-2"
            actions={<Badge tone="info">Real-time</Badge>}
          >
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={(data?.weeklyVolume ?? []).map((v, i) => ({ week: `W${i + 1}`, value: v }))}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(124 58 237)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="rgb(124 58 237)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgb(226 232 240)" vertical={false} />
                  <XAxis dataKey="week" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <ReTooltip contentStyle={{ background: "white" }} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="rgb(124 58 237)"
                    strokeWidth={2}
                    fill="url(#g1)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard
            title="Status breakdown"
            description="Where every open lot currently sits"
          >
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.statusBreakdown ?? []}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={48}
                    outerRadius={70}
                    paddingAngle={3}
                    stroke="white"
                    strokeWidth={2}
                  >
                    {(data?.statusBreakdown ?? []).map((s) => (
                      <Cell key={s.status} fill={STATUS_COLORS[s.status] ?? "rgb(148 163 184)"} />
                    ))}
                  </Pie>
                  <ReTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {(data?.statusBreakdown ?? []).map((s) => (
                <div key={s.status} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: STATUS_COLORS[s.status] ?? "rgb(148 163 184)" }}
                  />
                  <span className="text-ink-muted">{s.status}</span>
                  <span className="ml-auto tabular-nums">{s.count}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Supplier performance */}
          <SectionCard
            title="Supplier performance"
            description="Approved vs held vs rejected, last 90 days"
            className="xl:col-span-2"
            bodyClassName="px-2 pb-2"
          >
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.supplierMix ?? []} barSize={20}>
                  <CartesianGrid stroke="rgb(226 232 240)" vertical={false} />
                  <XAxis dataKey="supplierName" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <ReTooltip />
                  <Bar dataKey="approved" stackId="a" fill="rgb(5 150 105)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="onHold" stackId="a" fill="rgb(217 119 6)" />
                  <Bar dataKey="rejected" stackId="a" fill="rgb(220 38 38)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          {/* Risk hotspots */}
          <SectionCard
            title="Risk hotspots"
            description="Held, rejected or high-risk lots"
            icon={<AlertTriangle className="h-4 w-4" />}
          >
            <div className="space-y-2 max-h-[260px] overflow-auto -mx-2 px-2">
              {(data?.riskHotspots ?? []).length === 0 ? (
                <div className="text-xs text-ink-muted py-6 text-center">No active risks. Nice.</div>
              ) : (
                (data?.riskHotspots ?? []).map((h) => (
                  <Link
                    key={h.lotNumber}
                    href={`/inspection/${h.lotNumber}`}
                    className="block rounded-md border border-line bg-surface hover:border-accent/40 hover:shadow-card transition-all p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm">{h.lotNumber}</div>
                      <StatusPill status={h.status as ReceiptStatus} />
                    </div>
                    <div className="text-xs text-ink-muted mt-1 truncate">{h.material} · {h.supplier}</div>
                  </Link>
                ))
              )}
            </div>
          </SectionCard>

          {/* Recent lots */}
          <SectionCard
            title="Recent receipts"
            description="Latest deliveries across all suppliers"
            className="xl:col-span-2"
            actions={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/inspection">View all</Link>
              </Button>
            }
          >
            <div className="divide-y divide-line">
              {recent.map((r) => (
                <Link
                  key={r.id}
                  href={`/inspection/${r.lotNumber}`}
                  className="flex items-center justify-between gap-3 py-2.5 hover:bg-inset -mx-2 px-2 rounded-md transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{r.lotNumber}</div>
                    <div className="text-xs text-ink-muted truncate">
                      {r.quantity} {r.uom} · Veh {r.vehicleNumber} · {r.poNumber}
                    </div>
                  </div>
                  <StatusPill status={r.status} />
                </Link>
              ))}
            </div>
          </SectionCard>

          {/* Activity */}
          <SectionCard
            title="Live activity"
            description="Latest events across the platform"
            icon={<Activity className="h-4 w-4" />}
          >
            <div className="space-y-2.5 max-h-[260px] overflow-auto">
              {(notifications ?? []).slice(0, 12).map((n) => (
                <div key={n.id} className="flex items-start gap-2.5 text-sm">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 rounded-full"
                    style={{
                      background:
                        n.severity === "success"
                          ? "rgb(5 150 105)"
                          : n.severity === "warning"
                          ? "rgb(217 119 6)"
                          : n.severity === "danger"
                          ? "rgb(220 38 38)"
                          : "rgb(37 99 235)",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{n.title}</div>
                    <div className="text-xs text-ink-muted">
                      {n.message} · <span className="text-ink-subtle">{relativeTime(n.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
