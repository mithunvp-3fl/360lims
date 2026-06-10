"use client";
import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight,
  Copy,
  Filter,
  MoreHorizontal,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { SectionCard } from "@/components/kit/section-card";
import { RiskPill } from "@/components/kit/risk-pill";
import { QualificationStatusPill } from "@/components/qualification/qualification-status-pill";
import { CreateQualificationDialog } from "@/components/qualification/create-qualification-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useCancelQualification,
  useCloneQualification,
  useMaterials,
  useQualifications,
  useSuppliers,
} from "@/lib/queries";
import { relativeTime } from "@/lib/utils";
import type { ConsumptionArea, QualificationStatus } from "@/lib/types";

const STATUSES: (QualificationStatus | "All")[] = [
  "All",
  "Pending Sampling",
  "Pending Testing",
  "Under Review",
  "Released",
  "On Hold",
  "Rejected",
];

const AREAS: (ConsumptionArea | "All")[] = ["All", "Carbon Plant", "Potline", "Casthouse", "R&D"];

export default function QualificationQueuePage() {
  const [status, setStatus] = React.useState<QualificationStatus | "All">("All");
  const [area, setArea] = React.useState<ConsumptionArea | "All">("All");
  const [search, setSearch] = React.useState("");

  const params = {
    status: status === "All" ? undefined : status,
    consumption_area: area === "All" ? undefined : area,
    search: search.trim() || undefined,
  };

  const { data: qualifications, isLoading } = useQualifications(params);
  const { data: suppliers } = useSuppliers();
  const { data: materials } = useMaterials();
  const cancel = useCancelQualification();
  const clone = useCloneQualification();

  const counts = React.useMemo(() => {
    const out: Record<string, number> = { All: qualifications?.length ?? 0 };
    (qualifications ?? []).forEach((q) => (out[q.status] = (out[q.status] ?? 0) + 1));
    return out;
  }, [qualifications]);

  const supplierMap = React.useMemo(
    () => new Map((suppliers ?? []).map((s) => [s.id, s])),
    [suppliers],
  );
  const materialMap = React.useMemo(
    () => new Map((materials ?? []).map((m) => [m.id, m])),
    [materials],
  );

  return (
    <AppShell
      breadcrumbs={[
        { label: "Quality Operations", href: "/qualification" },
        { label: "Process Material Qualification" },
      ]}
    >
      <div className="space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
              Quality Operations · Step 2
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Process Material Qualification</h1>
            <p className="text-sm text-ink-muted mt-1">
              {qualifications?.length ?? 0} qualifications in this view. Each one decides whether
              production can consume this batch — Carbon Plant, Potline, Casthouse, or R&amp;D.
            </p>
          </div>
          <CreateQualificationDialog />
        </div>

        <SectionCard
          bodyClassName="p-0"
          className="overflow-hidden"
          title={
            <div className="flex items-center gap-2 flex-wrap">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    status === s
                      ? "bg-ink text-white border-ink"
                      : "bg-surface border-line text-ink-muted hover:text-ink"
                  }`}
                >
                  {s}
                  <span
                    className={`tabular-nums ${
                      status === s ? "text-white/70" : "text-ink-subtle"
                    }`}
                  >
                    {counts[s] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          }
          actions={
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1.5">
                {AREAS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setArea(a)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      area === a
                        ? "bg-accent-soft text-accent border-accent/30"
                        : "bg-surface border-line text-ink-muted hover:text-ink"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Qualification, batch, material…"
                  className="pl-9 w-72"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Button variant="outline" size="md">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-inset/60 text-[11px] uppercase tracking-wide text-ink-muted">
                  <th className="text-left font-semibold py-2.5 px-4">Qualification</th>
                  <th className="text-left font-semibold py-2.5 px-4">Material</th>
                  <th className="text-left font-semibold py-2.5 px-4">Batch</th>
                  <th className="text-left font-semibold py-2.5 px-4">Area</th>
                  <th className="text-right font-semibold py-2.5 px-4">Quantity</th>
                  <th className="text-left font-semibold py-2.5 px-4">Status</th>
                  <th className="text-left font-semibold py-2.5 px-4">Risk</th>
                  <th className="text-left font-semibold py-2.5 px-4">Assigned</th>
                  <th className="text-left font-semibold py-2.5 px-4">Requested</th>
                  <th className="text-right font-semibold py-2.5 px-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-line/60">
                        <td colSpan={10} className="p-3">
                          <Skeleton className="h-6 w-full" />
                        </td>
                      </tr>
                    ))
                  : (qualifications ?? []).map((q) => {
                      const supplier = q.supplierId ? supplierMap.get(q.supplierId) : undefined;
                      const material = materialMap.get(q.materialId);
                      return (
                        <tr
                          key={q.id}
                          className="group border-b border-line/60 hover:bg-inset/60 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <Link
                              href={`/qualification/${q.qualificationNumber}`}
                              className="font-medium text-ink hover:text-accent transition-colors"
                            >
                              {q.qualificationNumber}
                            </Link>
                            {q.sourceLotNumber && (
                              <div className="text-[11px] text-ink-subtle">
                                from {q.sourceLotNumber}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div>{material?.name ?? "—"}</div>
                            <div className="text-[11px] text-ink-subtle">{material?.category}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs">{q.batchNumber}</td>
                          <td className="py-3 px-4">
                            <Badge tone="accent">{q.consumptionArea}</Badge>
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums">
                            <div>{q.quantity}</div>
                            <div className="text-[11px] text-ink-subtle">{q.uom}</div>
                          </td>
                          <td className="py-3 px-4">
                            <QualificationStatusPill status={q.status} />
                          </td>
                          <td className="py-3 px-4">
                            <RiskPill level={q.riskLevel} />
                          </td>
                          <td className="py-3 px-4">
                            <div>{q.assignedTo ?? "Unassigned"}</div>
                            <div className="text-[11px] text-ink-subtle">
                              {supplier?.name ?? "Internal"}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-ink-muted text-xs">
                            {relativeTime(q.requestedAt)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button asChild variant="ghost" size="sm">
                                <Link href={`/qualification/${q.qualificationNumber}`}>
                                  Open
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      clone.mutate(q.qualificationNumber, {
                                        onSuccess: (qq) =>
                                          toast.success("Qualification cloned", {
                                            description: `New ${qq.qualificationNumber}`,
                                          }),
                                      })
                                    }
                                  >
                                    <Copy className="h-3.5 w-3.5" /> Clone qualification
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    destructive
                                    onClick={() =>
                                      cancel.mutate(q.qualificationNumber, {
                                        onSuccess: () =>
                                          toast.warning("Qualification cancelled", {
                                            description: q.qualificationNumber,
                                          }),
                                      })
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Cancel
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          {!isLoading && (qualifications ?? []).length === 0 && (
            <div className="p-12 text-center">
              <div className="inline-flex h-10 w-10 rounded-md bg-accent-soft text-accent items-center justify-center mb-3">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="font-medium">No qualifications match your filters</div>
              <div className="text-xs text-ink-muted mt-1">
                Try resetting filters or create a new qualification to get started.
              </div>
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatus("All");
                    setArea("All");
                    setSearch("");
                  }}
                >
                  Reset filters
                </Button>
                <CreateQualificationDialog />
              </div>
            </div>
          )}
        </SectionCard>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-ink-muted">
          <div className="surface-inset px-3 py-2.5 flex items-center justify-between">
            <span>Released this week</span>
            <Badge tone="success">{counts["Released"] ?? 0}</Badge>
          </div>
          <div className="surface-inset px-3 py-2.5 flex items-center justify-between">
            <span>Awaiting review / on hold</span>
            <Badge tone="warning">
              {(counts["Under Review"] ?? 0) + (counts["On Hold"] ?? 0)}
            </Badge>
          </div>
          <div className="surface-inset px-3 py-2.5 flex items-center justify-between">
            <span>Rejected</span>
            <Badge tone="danger">{counts["Rejected"] ?? 0}</Badge>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
