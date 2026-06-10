"use client";
import Link from "next/link";
import { Calendar, FileSignature, QrCode, ScanBarcode } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { Certificate } from "@/lib/types";
import { cn } from "@/lib/utils";

function qrFromValue(value: string): boolean[][] {
  // Simple deterministic checkerboard-ish pattern from string hash.
  const size = 17;
  const grid: boolean[][] = Array.from({ length: size }, () =>
    new Array(size).fill(false),
  );
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) & 0xffffffff;
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      h = (h * 1103515245 + 12345) & 0x7fffffff;
      grid[y][x] = ((h >>> (x % 8)) & 1) === 1;
    }
  }
  // mark corner anchors visually
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      grid[y][x] = true;
      grid[y][size - 1 - x] = true;
      grid[size - 1 - y][x] = true;
    }
  }
  return grid;
}

function barWidthsFromValue(value: string): number[] {
  const widths: number[] = [];
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    widths.push((c % 3) + 1);
  }
  return widths;
}

export function CertificateOverview({ certificate }: { certificate: Certificate }) {
  const qr = qrFromValue(certificate.qrCodeValue);
  const bars = barWidthsFromValue(certificate.barcodeValue);

  return (
    <SectionCard
      title="Certificate overview"
      description="Identification, traceability, and authenticity anchors."
      icon={<FileSignature className="h-4 w-4" />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="surface-inset p-3.5 space-y-2 lg:col-span-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Identification
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <Field
              label="Certificate number"
              value={certificate.certificateNumber}
              mono
            />
            <Field
              label="Customer"
              value={certificate.customer}
            />
            <Field
              label="Product batch"
              value={certificate.productBatchNumber}
              mono
              href={`/product-quality/${certificate.productBatchNumber}`}
            />
            <Field label="Status" value={certificate.status} />
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
              Placeholder · PKCS#7 signing wired in production
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="surface-inset p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                QR code
              </div>
              <Badge tone="accent">
                <QrCode className="h-3 w-3" /> Demo
              </Badge>
            </div>
            <div
              className="grid bg-surface border border-line rounded-md p-2 mx-auto"
              style={{
                gridTemplateColumns: `repeat(${qr.length}, minmax(0, 1fr))`,
                width: "fit-content",
              }}
            >
              {qr.flatMap((row, y) =>
                row.map((on, x) => (
                  <span
                    key={`${y}-${x}`}
                    className={cn(
                      "h-2 w-2",
                      on ? "bg-ink" : "bg-surface",
                    )}
                  />
                )),
              )}
            </div>
            <div className="text-[10px] text-ink-subtle text-center font-mono break-all">
              {certificate.qrCodeValue}
            </div>
          </div>

          <div className="surface-inset p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                Barcode
              </div>
              <Badge tone="accent">
                <ScanBarcode className="h-3 w-3" /> Demo
              </Badge>
            </div>
            <div className="bg-surface border border-line rounded-md p-2 flex items-end justify-center gap-px h-16">
              {bars.map((w, i) => (
                <span
                  key={i}
                  className="bg-ink h-full"
                  style={{ width: `${w}px` }}
                />
              ))}
            </div>
            <div className="text-[10px] text-ink-subtle text-center font-mono break-all">
              {certificate.barcodeValue}
            </div>
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
      <Link
        href={href}
        className="min-w-0 block hover:text-accent transition-colors"
      >
        {body}
      </Link>
    );
  }
  return <div className="min-w-0">{body}</div>;
}
