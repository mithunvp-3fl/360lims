"use client";
import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight,
  Filter,
  MoreHorizontal,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { SectionCard } from "@/components/kit/section-card";
import { CertificateStatusPill } from "@/components/certificates/certificate-status-pill";
import { DispatchStatusPill } from "@/components/certificates/dispatch-status-pill";
import { GenerateCertificateDialog } from "@/components/certificates/generate-certificate-dialog";
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
  useCancelCertificate,
  useCertificates,
} from "@/lib/queries";
import { relativeTime } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import type {
  CertificateStatus,
  DispatchStatus,
} from "@/lib/types";

const STATUSES: (CertificateStatus | "All")[] = [
  "All",
  "Draft",
  "Issued",
  "Revised",
  "Cancelled",
];

const DISPATCHES: (DispatchStatus | "All")[] = [
  "All",
  "Pending",
  "Ready",
  "Approved",
  "Held",
  "Released",
  "Rejected",
  "Overridden",
];

export default function CertificatesQueuePage() {
  const [status, setStatus] = React.useState<CertificateStatus | "All">("All");
  const [dispatchStatus, setDispatchStatus] = React.useState<DispatchStatus | "All">("All");
  const [customer, setCustomer] = React.useState("");
  const [search, setSearch] = React.useState("");

  const params = {
    status: status === "All" ? undefined : status,
    dispatchStatus: dispatchStatus === "All" ? undefined : dispatchStatus,
    customer: customer.trim() || undefined,
    search: search.trim() || undefined,
  };

  const { data: certificates, isLoading } = useCertificates(params);

  // Per-certificate cancel mutation needs the cert number; build a wrapper.
  function CancelMenuItem({ n }: { n: string }) {
    const cancel = useCancelCertificate(n);
    return (
      <DropdownMenuItem
        destructive
        onClick={() =>
          cancel.mutate(undefined, {
            onSuccess: () =>
              toast.warning("Certificate cancelled", { description: n }),
          })
        }
      >
        <Trash2 className="h-3.5 w-3.5" /> Cancel
      </DropdownMenuItem>
    );
  }

  const counts = React.useMemo(() => {
    const out: Record<string, number> = { All: certificates?.length ?? 0 };
    (certificates ?? []).forEach((c) => (out[c.status] = (out[c.status] ?? 0) + 1));
    return out;
  }, [certificates]);

  return (
    <AppShell
      breadcrumbs={[
        { label: "Quality Operations", href: "/certificates" },
        { label: "Certificate & Dispatch" },
      ]}
    >
      <div className="space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
              Quality Operations · Step 5
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Certificate &amp; Dispatch</h1>
            <p className="text-sm text-ink-muted mt-1">
              {certificates?.length ?? 0} certificates in this view. Each one is a
              dispatch authorisation — customer specs verified, traceability locked,
              ready to ship.
            </p>
          </div>
          <GenerateCertificateDialog />
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
                {DISPATCHES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDispatchStatus(d)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      dispatchStatus === d
                        ? "bg-accent-soft text-accent border-accent/30"
                        : "bg-surface border-line text-ink-muted hover:text-ink"
                    }`}
                  >
                    {d === "All" ? "Any dispatch" : d}
                  </button>
                ))}
              </div>
              <Input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Customer…"
                className="w-44"
              />
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Certificate, product batch…"
                  className="pl-9 w-64"
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
                  <th className="text-left font-semibold py-2.5 px-4">Certificate</th>
                  <th className="text-left font-semibold py-2.5 px-4">Product batch</th>
                  <th className="text-left font-semibold py-2.5 px-4">Customer</th>
                  <th className="text-left font-semibold py-2.5 px-4">Status</th>
                  <th className="text-left font-semibold py-2.5 px-4">Dispatch</th>
                  <th className="text-left font-semibold py-2.5 px-4">Created</th>
                  <th className="text-right font-semibold py-2.5 px-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-line/60">
                        <td colSpan={7} className="p-3">
                          <Skeleton className="h-6 w-full" />
                        </td>
                      </tr>
                    ))
                  : (certificates ?? []).map((c) => (
                      <tr
                        key={c.id}
                        className="group border-b border-line/60 hover:bg-inset/60 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <Link
                            href={`/certificates/${c.certificateNumber}`}
                            className="font-medium text-ink hover:text-accent transition-colors"
                          >
                            {c.certificateNumber}
                          </Link>
                          <div className="text-[11px] text-ink-subtle">
                            by {c.createdBy}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">
                          <Link
                            href={`/product-quality/${c.productBatchNumber}`}
                            className="hover:text-accent"
                          >
                            {c.productBatchNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-4">{c.customer}</td>
                        <td className="py-3 px-4">
                          <CertificateStatusPill status={c.status} />
                        </td>
                        <td className="py-3 px-4">
                          <DispatchStatusPill status={c.dispatchStatus} />
                        </td>
                        <td className="py-3 px-4 text-ink-muted text-xs">
                          <div>{formatDate(c.createdAt)}</div>
                          <div className="text-[10px] text-ink-subtle">
                            {relativeTime(c.createdAt)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/certificates/${c.certificateNumber}`}>
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
                                <DropdownMenuSeparator />
                                <CancelMenuItem n={c.certificateNumber} />
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {!isLoading && (certificates ?? []).length === 0 && (
            <div className="p-12 text-center">
              <div className="inline-flex h-10 w-10 rounded-md bg-accent-soft text-accent items-center justify-center mb-3">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="font-medium">No certificates match your filters</div>
              <div className="text-xs text-ink-muted mt-1">
                Try resetting filters or generate a certificate for an approved product batch.
              </div>
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatus("All");
                    setDispatchStatus("All");
                    setCustomer("");
                    setSearch("");
                  }}
                >
                  Reset filters
                </Button>
                <GenerateCertificateDialog />
              </div>
            </div>
          )}
        </SectionCard>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs text-ink-muted">
          <div className="surface-inset px-3 py-2.5 flex items-center justify-between">
            <span>Issued</span>
            <Badge tone="success">{counts["Issued"] ?? 0}</Badge>
          </div>
          <div className="surface-inset px-3 py-2.5 flex items-center justify-between">
            <span>Draft</span>
            <Badge tone="info">{counts["Draft"] ?? 0}</Badge>
          </div>
          <div className="surface-inset px-3 py-2.5 flex items-center justify-between">
            <span>Revised</span>
            <Badge tone="warning">{counts["Revised"] ?? 0}</Badge>
          </div>
          <div className="surface-inset px-3 py-2.5 flex items-center justify-between">
            <span>Cancelled</span>
            <Badge tone="danger">{counts["Cancelled"] ?? 0}</Badge>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
