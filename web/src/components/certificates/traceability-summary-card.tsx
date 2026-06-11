"use client";
import Link from "next/link";
import { GitFork, ArrowDown } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { useCertificateQualitySummary } from "@/lib/queries";
import { cn } from "@/lib/utils";

interface Row {
  label: string;
  value: string | null | undefined;
  href: string | null;
  status?: string | null;
  compliance?: number | null;
}

export function TraceabilitySummaryCard({ certificateNumber }: { certificateNumber: string }) {
  const { data } = useCertificateQualitySummary(certificateNumber);

  const rows: Row[] = [
    {
      label: "Supplier Lot",
      value: data?.rawMaterialLotNumber,
      href: data?.rawMaterialLotNumber ? `/inspection/${data.rawMaterialLotNumber}` : null,
      status: data?.steps?.[0]?.status ?? null,
    },
    {
      label: "Qualification",
      value: data?.qualificationNumber,
      href: data?.qualificationNumber ? `/qualification/${data.qualificationNumber}` : null,
      status: data?.steps?.[1]?.status ?? null,
    },
    {
      label: "Metal Batch",
      value: data?.metalBatchNumber,
      href: data?.metalBatchNumber ? `/metal-quality/${data.metalBatchNumber}` : null,
      status: data?.steps?.[2]?.status ?? null,
    },
    {
      label: "Product Batch",
      value: data?.productBatchNumber,
      href: data?.productBatchNumber ? `/product-quality/${data.productBatchNumber}` : null,
      status: data?.steps?.[3]?.status ?? null,
      compliance: data?.steps?.[3]?.compliance ?? null,
    },
    {
      label: "Certificate",
      value: data?.certificateNumber,
      href: data?.certificateNumber ? `/certificates/${data.certificateNumber}` : null,
      status: data?.steps?.[4]?.status ?? null,
    },
  ];

  return (
    <SectionCard
      title="Traceability summary"
      description="Compact view of the 5-step quality chain backing this certificate."
      icon={<GitFork className="h-4 w-4" />}
    >
      <ol className="space-y-1.5">
        {rows.map((r, idx) => {
          const has = Boolean(r.value);
          const Wrap = has && r.href ? Link : "div";
          return (
            <li key={r.label}>
              <Wrap
                href={r.href ?? "#"}
                className={cn(
                  "flex items-center gap-3 rounded-md border px-3 py-2 transition-colors",
                  has ? "border-line hover:border-accent/40 hover:bg-inset" : "border-dashed border-line bg-inset/40",
                )}
              >
                <div className="h-6 w-6 rounded-full bg-inset border border-line grid place-items-center text-[10px] font-semibold tabular-nums text-ink-muted shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-ink-muted">{r.label}</div>
                  <div className="text-sm font-medium font-mono truncate">{r.value ?? "—"}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {r.compliance != null && (
                    <Badge tone="accent" className="text-[10px] tabular-nums">
                      {r.compliance}/100
                    </Badge>
                  )}
                  {r.status && (
                    <Badge
                      tone={
                        r.status === "Approved" || r.status === "Released" || r.status === "Issued"
                          ? "success"
                          : r.status === "On Hold"
                            ? "warning"
                            : r.status === "Rejected" || r.status === "Cancelled"
                              ? "danger"
                              : "muted"
                      }
                      className="text-[10px]"
                    >
                      {r.status}
                    </Badge>
                  )}
                </div>
              </Wrap>
              {idx < rows.length - 1 && (
                <div className="flex justify-start pl-3.5 text-ink-subtle">
                  <ArrowDown className="h-3 w-3" />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );
}
