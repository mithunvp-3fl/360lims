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
import { MetalBatchStatusPill } from "@/components/metal-quality/metal-batch-status-pill";
import { CreateMetalBatchDialog } from "@/components/metal-quality/create-metal-batch-dialog";
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
  useCancelMetalBatch,
  useCloneMetalBatch,
  useMetalBatches,
} from "@/lib/queries";
import { relativeTime } from "@/lib/utils";
import type { MetalBatchStatus, ProductGrade } from "@/lib/types";

const STATUSES: (MetalBatchStatus | "All")[] = [
  "All",
  "Pending Sampling",
  "Pending Testing",
  "Under Review",
  "Released",
  "On Hold",
  "Downgraded",
  "Rejected",
];

const GRADES: (ProductGrade | "All")[] = ["All", "P1020", "P0610", "Primary Aluminum"];

export default function MetalQualityQueuePage() {
  const [status, setStatus] = React.useState<MetalBatchStatus | "All">("All");
  const [grade, setGrade] = React.useState<ProductGrade | "All">("All");
  const [search, setSearch] = React.useState("");

  const params = {
    status: status === "All" ? undefined : status,
    product_grade: grade === "All" ? undefined : grade,
    search: search.trim() || undefined,
  };

  const { data: batches, isLoading } = useMetalBatches(params);
  const cancel = useCancelMetalBatch();
  const clone = useCloneMetalBatch();

  const counts = React.useMemo(() => {
    const out: Record<string, number> = { All: batches?.length ?? 0 };
    (batches ?? []).forEach((b) => (out[b.status] = (out[b.status] ?? 0) + 1));
    return out;
  }, [batches]);

  return (
    <AppShell
      breadcrumbs={[
        { label: "Quality Operations", href: "/metal-quality" },
        { label: "Metal Quality Control" },
      ]}
    >
      <div className="space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
              Quality Operations · Step 3
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Metal Quality Control</h1>
            <p className="text-sm text-ink-muted mt-1">
              {batches?.length ?? 0} metal batches in this view. Each one is a casting
              release decision — chemistry verified, compliance scored, ready for the
              casthouse.
            </p>
          </div>
          <CreateMetalBatchDialog />
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
                {GRADES.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGrade(g)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      grade === g
                        ? "bg-accent-soft text-accent border-accent/30"
                        : "bg-surface border-line text-ink-muted hover:text-ink"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Metal batch, potline, operator…"
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
                  <th className="text-left font-semibold py-2.5 px-4">Metal batch</th>
                  <th className="text-left font-semibold py-2.5 px-4">Grade</th>
                  <th className="text-left font-semibold py-2.5 px-4">Potline</th>
                  <th className="text-right font-semibold py-2.5 px-4">Weight</th>
                  <th className="text-left font-semibold py-2.5 px-4">Status</th>
                  <th className="text-left font-semibold py-2.5 px-4">Risk</th>
                  <th className="text-left font-semibold py-2.5 px-4">Assigned</th>
                  <th className="text-left font-semibold py-2.5 px-4">Created</th>
                  <th className="text-right font-semibold py-2.5 px-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-line/60">
                        <td colSpan={9} className="p-3">
                          <Skeleton className="h-6 w-full" />
                        </td>
                      </tr>
                    ))
                  : (batches ?? []).map((b) => (
                      <tr
                        key={b.id}
                        className="group border-b border-line/60 hover:bg-inset/60 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <Link
                            href={`/metal-quality/${b.metalBatchNumber}`}
                            className="font-medium text-ink hover:text-accent transition-colors"
                          >
                            {b.metalBatchNumber}
                          </Link>
                          {b.shift && (
                            <div className="text-[11px] text-ink-subtle">
                              Shift {b.shift}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge tone="accent">{b.productGrade}</Badge>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">{b.potline}</td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          <div>{b.weight}</div>
                          <div className="text-[11px] text-ink-subtle">{b.uom}</div>
                        </td>
                        <td className="py-3 px-4">
                          <MetalBatchStatusPill status={b.status} />
                        </td>
                        <td className="py-3 px-4">
                          <RiskPill level={b.riskLevel} />
                        </td>
                        <td className="py-3 px-4">
                          <div>{b.assignedTo ?? "Unassigned"}</div>
                          <div className="text-[11px] text-ink-subtle">
                            {b.operator ? `Operator ${b.operator}` : ""}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-ink-muted text-xs">
                          {relativeTime(b.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/metal-quality/${b.metalBatchNumber}`}>
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
                                    clone.mutate(b.metalBatchNumber, {
                                      onSuccess: (nb) =>
                                        toast.success("Metal batch cloned", {
                                          description: `New ${nb.metalBatchNumber}`,
                                        }),
                                    })
                                  }
                                >
                                  <Copy className="h-3.5 w-3.5" /> Clone batch
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  destructive
                                  onClick={() =>
                                    cancel.mutate(b.metalBatchNumber, {
                                      onSuccess: () =>
                                        toast.warning("Metal batch cancelled", {
                                          description: b.metalBatchNumber,
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
                    ))}
              </tbody>
            </table>
          </div>

          {!isLoading && (batches ?? []).length === 0 && (
            <div className="p-12 text-center">
              <div className="inline-flex h-10 w-10 rounded-md bg-accent-soft text-accent items-center justify-center mb-3">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="font-medium">No metal batches match your filters</div>
              <div className="text-xs text-ink-muted mt-1">
                Try resetting filters or create a new metal batch to get started.
              </div>
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatus("All");
                    setGrade("All");
                    setSearch("");
                  }}
                >
                  Reset filters
                </Button>
                <CreateMetalBatchDialog />
              </div>
            </div>
          )}
        </SectionCard>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs text-ink-muted">
          <div className="surface-inset px-3 py-2.5 flex items-center justify-between">
            <span>Released for casting</span>
            <Badge tone="success">{counts["Released"] ?? 0}</Badge>
          </div>
          <div className="surface-inset px-3 py-2.5 flex items-center justify-between">
            <span>Awaiting review / on hold</span>
            <Badge tone="warning">
              {(counts["Under Review"] ?? 0) + (counts["On Hold"] ?? 0)}
            </Badge>
          </div>
          <div className="surface-inset px-3 py-2.5 flex items-center justify-between">
            <span>Downgraded</span>
            <Badge tone="warning">{counts["Downgraded"] ?? 0}</Badge>
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
