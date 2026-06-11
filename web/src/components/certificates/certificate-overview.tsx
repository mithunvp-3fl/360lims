"use client";
import Link from "next/link";
import { Calendar, FileSignature } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { formatDate } from "@/lib/format";
import type { Certificate } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CertificateOverview({ certificate }: { certificate: Certificate }) {
  return (
    <SectionCard
      title="Certificate overview"
      description="Identification, traceability, and authenticity anchors."
      icon={<FileSignature className="h-4 w-4" />}
    >
      <div className="surface-inset p-3.5 space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Identification
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
          <Field
            label="Certificate number"
            value={certificate.certificateNumber}
            mono
          />
          <Field label="Customer" value={certificate.customer} />
          <Field
            label="Product batch"
            value={certificate.productBatchNumber}
            mono
            href={`/product-quality/${certificate.productBatchNumber}`}
          />
          <Field label="Status" value={`${certificate.status} · v${certificate.version}`} />
          <Field
            label="Issued"
            value={certificate.issuedAt ? formatDate(certificate.issuedAt) : "—"}
            hint={certificate.issuedBy ?? undefined}
          />
          <Field
            label="Created"
            value={formatDate(certificate.createdAt)}
            hint={`by ${certificate.createdBy}`}
          />
        </div>

        <div className="pt-3 border-t border-line/60">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
            Digital signature
          </div>
          <div className="surface-card p-3 font-mono text-[11px] text-ink-muted break-all">
            {certificate.digitalSignaturePlaceholder}
          </div>
          <div className="text-[10px] text-ink-subtle mt-1 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {certificate.status === "Issued"
              ? "Signed at issuance · PKCS#7 attestation in production"
              : "Awaiting issuance · signature applied on issue"}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function Field({
  label,
  value,
  hint,
  href,
  mono,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  mono?: boolean;
}) {
  const body = (
    <>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
        {label}
      </div>
      <div className={cn("text-sm font-medium truncate", mono && "font-mono")}>
        {value}
      </div>
      {hint && <div className="text-[11px] text-ink-muted truncate">{hint}</div>}
    </>
  );
  if (href) {
    return (
      <Link href={href} className="min-w-0 block hover:text-accent transition-colors">
        {body}
      </Link>
    );
  }
  return <div className="min-w-0">{body}</div>;
}
