"use client";
import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight,
  Copy,
  Filter,
  MoreHorizontal,
  Network,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { SectionCard } from "@/components/kit/section-card";
import { RiskPill } from "@/components/kit/risk-pill";
import { ProductBatchStatusPill } from "@/components/product-quality/product-batch-status-pill";
import { CreateProductBatchDialog } from "@/components/product-quality/create-product-batch-dialog";
import { MaterialLineagePanel } from "@/components/genealogy/material-lineage-panel";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  useCancelProductBatch,
  useCloneProductBatch,
  useProductBatches,
} from "@/lib/queries";
import { relativeTime } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import type { ProductBatchStatus, ProductType, RiskLevel } from "@/lib/types";

const STATUSES: (ProductBatchStatus | "All")[] = [
  "All",
  "Pending Sampling",
  "Pending Testing",
  "Under Review",
  "Approved",
  "On Hold",
  "Retest",
  "Rejected",
];

const PRODUCT_TYPES: (ProductType | "All")[] = [
  "All",
  "Primary Aluminum Ingot",
  "Primary Aluminum Billet",
];

const RISKS: (RiskLevel | "All")[] = ["All", "Low", "Medium", "High"];

export default function ProductQualityQueuePage() {
  const [status, setStatus] = React.useState<ProductBatchStatus | "All">("All");
  const [productType, setProductType] = React.useState<ProductType | "All">("All");
  const [risk, setRisk] = React.useState<RiskLevel | "All">("All");
  const [search, setSearch] = React.useState("");

  const params = {
    status: status === "All" ? undefined : status,
    productType: productType === "All" ? undefined : productType,
    risk: risk === "All" ? undefined : risk,
    search: search.trim() || undefined,
  };

  const { data: batches, isLoading } = useProductBatches(params);
  const cancel = useCancelProductBatch();
  const clone = useCloneProductBatch();
  const [lineageBatch, setLineageBatch] = React.useState<string | null>(null);

  const counts = React.useMemo(() => {
    const out: Record<string, number> = { All: batches?.length ?? 0 };
    (batches ?? []).forEach((b) => (out[b.status] = (out[b.status] ?? 0) + 1));
    return out;
  }, [batches]);

  return (
    <AppShell
      breadcrumbs={[
        { label: "Quality Operations", href: "/product-quality" },
        { label: "Product Quality Testing" },
      ]}
    >
      <div className="space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
              Quality Operations · Step 4
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Product Quality Testing</h1>
            <p className="text-sm text-ink-muted mt-1">
              {batches?.length ?? 0} product batches in this view. Each one is a release
              decision against the customer specification — mechanical, physical,
              metallography, and visual.
            </p>
          </div>
          <CreateProductBatchDialog />
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
                {PRODUCT_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setProductType(t)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      productType === t
                        ? "bg-accent-soft text-accent border-accent/30"
                        : "bg-surface border-line text-ink-muted hover:text-ink"
                    }`}
                  >
                    {t === "All" ? "All types" : t === "Primary Aluminum Ingot" ? "Ingot" : "Billet"}
                  </button>
                ))}
                {RISKS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRisk(r)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      risk === r
                        ? "bg-accent-soft text-accent border-accent/30"
                        : "bg-surface border-line text-ink-muted hover:text-ink"
                    }`}
                  >
                    {r === "All" ? "Any risk" : r}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Product batch, customer, operator…"
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
                  <th className="text-left font-semibold py-2.5 px-4">Product batch</th>
                  <th className="text-left font-semibold py-2.5 px-4">Product type</th>
                  <th className="text-left font-semibold py-2.5 px-4">Metal batch</th>
                  <th className="text-right font-semibold py-2.5 px-4">Weight</th>
                  <th className="text-left font-semibold py-2.5 px-4">Status</th>
                  <th className="text-right font-semibold py-2.5 px-4">Compliance</th>
                  <th className="text-left font-semibold py-2.5 px-4">Risk</th>
                  <th className="text-left font-semibold py-2.5 px-4">Customer</th>
                  <th className="text-left font-semibold py-2.5 px-4">Created</th>
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
                  : (batches ?? []).map((b) => (
                      <tr
                        key={b.id}
                        className="group border-b border-line/60 hover:bg-inset/60 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <Link
                            href={`/product-quality/${b.productBatchNumber}`}
                            className="font-medium text-ink hover:text-accent transition-colors"
                          >
                            {b.productBatchNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <Badge tone="accent">{b.productType}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          {b.sourceMetalBatchNumber ? (
                            <Link
                              href={`/metal-quality/${b.sourceMetalBatchNumber}`}
                              className="font-mono text-[12px] text-ink hover:text-accent transition-colors"
                            >
                              {b.sourceMetalBatchNumber}
                            </Link>
                          ) : (
                            <span className="text-ink-subtle text-[12px]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          <div>{b.weight}</div>
                          <div className="text-[11px] text-ink-subtle">{b.uom}</div>
                        </td>
                        <td className="py-3 px-4">
                          <ProductBatchStatusPill status={b.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <ComplianceCell score={b.complianceScore ?? null} />
                        </td>
                        <td className="py-3 px-4">
                          <RiskPill level={b.riskLevel} />
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-ink">{b.customer ?? "Stock"}</div>
                          <div className="text-[11px] text-ink-subtle">
                            {b.operator ? `Operator ${b.operator}` : ""}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-ink-muted text-xs">
                          <div>{formatDate(b.createdAt)}</div>
                          <div className="text-[10px] text-ink-subtle">
                            {relativeTime(b.createdAt)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/product-quality/${b.productBatchNumber}`}>
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
                                  onClick={() => setLineageBatch(b.productBatchNumber)}
                                >
                                  <Network className="h-3.5 w-3.5" /> View lineage
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    clone.mutate(b.productBatchNumber, {
                                      onSuccess: (nb) =>
                                        toast.success("Product batch cloned", {
                                          description: `New ${nb.productBatchNumber}`,
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
                                    cancel.mutate(b.productBatchNumber, {
                                      onSuccess: () =>
                                        toast.warning("Product batch cancelled", {
                                          description: b.productBatchNumber,
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
              <div className="font-medium">No product batches match your filters</div>
              <div className="text-xs text-ink-muted mt-1">
                Try resetting filters or create a new product batch to get started.
              </div>
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatus("All");
                    setProductType("All");
                    setRisk("All");
                    setSearch("");
                  }}
                >
                  Reset filters
                </Button>
                <CreateProductBatchDialog />
              </div>
            </div>
          )}
        </SectionCard>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs text-ink-muted">
          <div className="surface-inset px-3 py-2.5 flex items-center justify-between">
            <span>Approved</span>
            <Badge tone="success">{counts["Approved"] ?? 0}</Badge>
          </div>
          <div className="surface-inset px-3 py-2.5 flex items-center justify-between">
            <span>Awaiting review / on hold</span>
            <Badge tone="warning">
              {(counts["Under Review"] ?? 0) + (counts["On Hold"] ?? 0)}
            </Badge>
          </div>
          <div className="surface-inset px-3 py-2.5 flex items-center justify-between">
            <span>Retest</span>
            <Badge tone="warning">{counts["Retest"] ?? 0}</Badge>
          </div>
          <div className="surface-inset px-3 py-2.5 flex items-center justify-between">
            <span>Rejected</span>
            <Badge tone="danger">{counts["Rejected"] ?? 0}</Badge>
          </div>
        </div>
      </div>

      <Sheet open={Boolean(lineageBatch)} onOpenChange={(o) => !o && setLineageBatch(null)}>
        <SheetContent side="right" className="w-[460px] sm:max-w-[460px]">
          <SheetHeader>
            <SheetTitle>Material lineage</SheetTitle>
            <SheetDescription>
              Direct upstream and downstream records for {lineageBatch}.
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            {lineageBatch && (
              <MaterialLineagePanel
                nodeType="product-batch"
                nodeKey={lineageBatch}
              />
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

function ComplianceCell({ score }: { score: number | null }) {
  if (score == null) {
    return <span className="text-ink-subtle text-[12px]">—</span>;
  }
  const tone: "success" | "warning" | "danger" | "info" =
    score >= 90 ? "success" : score >= 75 ? "info" : score >= 60 ? "warning" : "danger";
  return (
    <div className="inline-flex items-center gap-2 tabular-nums">
      <Badge tone={tone} className="text-[11px]">
        {score}
      </Badge>
      <div className="hidden sm:block w-14 h-1.5 rounded-full bg-inset overflow-hidden">
        <div
          className={`h-full ${
            tone === "success"
              ? "bg-success"
              : tone === "info"
              ? "bg-info"
              : tone === "warning"
              ? "bg-warning"
              : "bg-danger"
          }`}
          style={{ width: `${Math.max(4, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}
