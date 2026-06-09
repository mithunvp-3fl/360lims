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
import { StatusPill } from "@/components/kit/status-pill";
import { RiskPill } from "@/components/kit/risk-pill";
import { CreateReceiptDialog } from "@/components/inspection/create-receipt-dialog";
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
  useCancelReceipt,
  useCloneReceipt,
  useMaterials,
  useReceipts,
  useSuppliers,
} from "@/lib/queries";
import { relativeTime } from "@/lib/utils";
import type { ReceiptStatus } from "@/lib/types";

const STATUSES: (ReceiptStatus | "All")[] = [
  "All",
  "Pending Sampling",
  "Pending Testing",
  "Pending Review",
  "Approved",
  "Rejected",
  "On Hold",
];

export default function InspectionQueuePage() {
  const [status, setStatus] = React.useState<ReceiptStatus | "All">("All");
  const [search, setSearch] = React.useState("");
  const params = {
    status: status === "All" ? undefined : status,
    search: search.trim() || undefined,
  };
  const { data: receipts, isLoading } = useReceipts(params);
  const { data: suppliers } = useSuppliers();
  const { data: materials } = useMaterials();
  const cancel = useCancelReceipt();
  const clone = useCloneReceipt();

  const counts = React.useMemo(() => {
    const out: Record<string, number> = { All: receipts?.length ?? 0 };
    (receipts ?? []).forEach((r) => (out[r.status] = (out[r.status] ?? 0) + 1));
    return out;
  }, [receipts]);

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
        { label: "Operate", href: "/dashboard" },
        { label: "Incoming Material Inspection" },
      ]}
    >
      <div className="space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
              Incoming Material Inspection
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Inspection queue</h1>
            <p className="text-sm text-ink-muted mt-1">
              {receipts?.length ?? 0} lots in this view. The workbench opens with a single click — every action you take is audited and notified.
            </p>
          </div>
          <CreateReceiptDialog />
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
                  <span className={`tabular-nums ${status === s ? "text-white/70" : "text-ink-subtle"}`}>
                    {counts[s] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          }
          actions={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Lot, vehicle, PO, supplier…"
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
                  <th className="text-left font-semibold py-2.5 px-4">Lot</th>
                  <th className="text-left font-semibold py-2.5 px-4">Supplier</th>
                  <th className="text-left font-semibold py-2.5 px-4">Material</th>
                  <th className="text-right font-semibold py-2.5 px-4">Quantity</th>
                  <th className="text-left font-semibold py-2.5 px-4">Status</th>
                  <th className="text-left font-semibold py-2.5 px-4">Risk</th>
                  <th className="text-left font-semibold py-2.5 px-4">Assigned</th>
                  <th className="text-left font-semibold py-2.5 px-4">Received</th>
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
                  : (receipts ?? []).map((r) => {
                      const supplier = supplierMap.get(r.supplierId);
                      const material = materialMap.get(r.materialId);
                      return (
                        <tr
                          key={r.id}
                          className="group border-b border-line/60 hover:bg-inset/60 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <Link
                              href={`/inspection/${r.lotNumber}`}
                              className="font-medium text-ink hover:text-accent transition-colors"
                            >
                              {r.lotNumber}
                            </Link>
                            <div className="text-[11px] text-ink-subtle">{r.poNumber}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div>{supplier?.name ?? "—"}</div>
                            <div className="text-[11px] text-ink-subtle">{supplier?.location}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div>{material?.name ?? "—"}</div>
                            <div className="text-[11px] text-ink-subtle">{material?.category}</div>
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums">
                            <div>{r.quantity}</div>
                            <div className="text-[11px] text-ink-subtle">{r.uom}</div>
                          </td>
                          <td className="py-3 px-4"><StatusPill status={r.status} /></td>
                          <td className="py-3 px-4"><RiskPill level={r.riskLevel} /></td>
                          <td className="py-3 px-4">
                            <div>{r.assignedTo ?? "Unassigned"}</div>
                            <div className="text-[11px] text-ink-subtle">Veh {r.vehicleNumber}</div>
                          </td>
                          <td className="py-3 px-4 text-ink-muted text-xs">
                            {relativeTime(r.receiptDate)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button asChild variant="ghost" size="sm">
                                <Link href={`/inspection/${r.lotNumber}`}>
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
                                      clone.mutate(r.lotNumber, {
                                        onSuccess: (rr) =>
                                          toast.success("Receipt cloned", {
                                            description: `New lot ${rr.lotNumber}`,
                                          }),
                                      })
                                    }
                                  >
                                    <Copy className="h-3.5 w-3.5" /> Clone receipt
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    destructive
                                    onClick={() =>
                                      cancel.mutate(r.lotNumber, {
                                        onSuccess: () =>
                                          toast.warning("Receipt cancelled", {
                                            description: r.lotNumber,
                                          }),
                                      })
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Cancel receipt
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

          {(!isLoading && (receipts ?? []).length === 0) && (
            <div className="p-12 text-center">
              <div className="inline-flex h-10 w-10 rounded-md bg-accent-soft text-accent items-center justify-center mb-3">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="font-medium">No receipts match your filters</div>
              <div className="text-xs text-ink-muted mt-1">
                Try resetting filters or create a new receipt to get started.
              </div>
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatus("All");
                    setSearch("");
                  }}
                >
                  Reset filters
                </Button>
                <CreateReceiptDialog />
              </div>
            </div>
          )}
        </SectionCard>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-ink-muted">
          <div className="surface-inset px-3 py-2.5 flex items-center justify-between">
            <span>Approved this week</span>
            <Badge tone="success">{counts["Approved"] ?? 0}</Badge>
          </div>
          <div className="surface-inset px-3 py-2.5 flex items-center justify-between">
            <span>Held / under review</span>
            <Badge tone="warning">{(counts["On Hold"] ?? 0) + (counts["Pending Review"] ?? 0)}</Badge>
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
