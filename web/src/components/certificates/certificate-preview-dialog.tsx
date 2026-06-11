"use client";
import * as React from "react";
import { Eye, Printer, Download, FileSignature, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { certificateAssetUrls, useCertificateInsights, useCertificateQualitySummary } from "@/lib/queries";
import type { Certificate, CustomerSpec } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CertificatePreviewDialog({
  certificate,
  open,
  onOpenChange,
}: {
  certificate: Certificate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: insight } = useCertificateInsights(certificate.certificateNumber);
  const { data: summary } = useCertificateQualitySummary(certificate.certificateNumber);
  const assets = certificateAssetUrls(certificate.certificateNumber);

  const pass = certificate.customerSpecs.filter((s) => s.complianceStatus === "Pass").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-accent" />
            Certificate preview — {certificate.certificateNumber}
          </DialogTitle>
          <DialogDescription>
            Read-only preview of the COA layout. Use Download to export the PDF, or Print to send directly to the
            customer.
          </DialogDescription>
        </DialogHeader>

        {/* Mock COA layout */}
        <div className="rounded-lg border border-line bg-surface overflow-hidden" id="coa-preview-printable">
          <div className="bg-accent text-white px-5 py-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-80">Quality360 · Certificate of Analysis</div>
              <div className="text-lg font-semibold">{certificate.certificateNumber}</div>
            </div>
            <div className="text-right text-[11px] opacity-90">
              Version {certificate.version} · {certificate.status}
              <div className="text-[10px] opacity-80 mt-0.5">
                Issued {certificate.issuedAt ? formatDate(certificate.issuedAt) : "—"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 p-5">
            <div className="col-span-2 space-y-3">
              <Row label="Customer" value={certificate.customer} />
              <Row label="Product Batch" value={certificate.productBatchNumber} mono />
              <Row label="Metal Batch" value={summary?.metalBatchNumber ?? "—"} mono />
              <Row label="Qualification" value={summary?.qualificationNumber ?? "—"} mono />
              <Row label="Source Lot" value={summary?.rawMaterialLotNumber ?? "—"} mono />
              <Row label="Created by" value={`${certificate.createdBy} · ${formatDate(certificate.createdAt)}`} />
              <Row label="Issued by" value={certificate.issuedBy ?? "—"} />
              <Row label="Approved by" value={certificate.dispatchApprovedBy ?? "—"} />
              <Row label="Released by" value={certificate.releasedBy ?? "—"} />
            </div>
            <div className="space-y-3 flex flex-col items-center">
              <div className="surface-inset p-2 rounded-md">
                <img
                  src={assets.qr}
                  alt="Verification QR"
                  className="w-32 h-32"
                />
              </div>
              <div className="text-[10px] text-ink-subtle text-center font-mono break-all max-w-[150px]">
                {certificate.qrCodeValue}
              </div>
              <div className="text-[10px] text-ink-muted flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                Scan to verify
              </div>
            </div>
          </div>

          {/* Insight banner */}
          <div className="px-5 py-3 border-t border-line bg-inset/50 grid grid-cols-3 gap-4 text-xs">
            <Kpi label="Release Confidence" value={insight ? `${insight.releaseConfidence}/100` : "—"} />
            <Kpi
              label="Certificate Health"
              value={insight?.certificateHealth ? `${insight.certificateHealth.score}/100` : "—"}
            />
            <Kpi label="Customer Spec Pass" value={`${pass}/${certificate.customerSpecs.length}`} />
          </div>

          {/* Spec table */}
          <div className="px-5 py-4 border-t border-line">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-2">
              Customer specification compliance
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-ink-muted text-[10px] uppercase">
                  <th className="text-left py-1.5 px-2">Parameter</th>
                  <th className="text-right px-2">Required</th>
                  <th className="text-right px-2">Actual</th>
                  <th className="text-left px-2">Unit</th>
                  <th className="text-right px-2">Margin</th>
                  <th className="text-left px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {certificate.customerSpecs.map((s) => (
                  <SpecRow key={s.parameter} s={s} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Barcode */}
          <div className="px-5 py-4 border-t border-line flex items-center justify-between">
            <div className="space-y-1">
              <img src={assets.barcode} alt="Barcode" className="h-10" />
              <div className="text-[10px] font-mono text-ink-subtle">{certificate.barcodeValue}</div>
            </div>
            <div className="text-[10px] text-ink-muted text-right">
              <div className="flex items-center justify-end gap-1">
                <FileSignature className="h-3 w-3" />
                {certificate.digitalSignaturePlaceholder}
              </div>
              <div className="mt-1">Generated by Quality360 — Manufacturing Quality Intelligence Platform</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const w = window.open(assets.pdf, "_blank");
              if (w) {
                w.focus();
              }
            }}
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              const a = document.createElement("a");
              a.href = assets.pdf;
              a.download = `${certificate.certificateNumber}.pdf`;
              a.click();
            }}
          >
            <Download className="h-3.5 w-3.5" /> Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2 items-baseline">
      <div className="text-[10px] uppercase tracking-wider text-ink-muted">{label}</div>
      <div className={cn("col-span-2 text-sm", mono && "font-mono")}>{value}</div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-muted">{label}</div>
      <div className="text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function SpecRow({ s }: { s: CustomerSpec }) {
  const required =
    s.requiredMin != null && s.requiredMax != null
      ? `${s.requiredMin} – ${s.requiredMax}`
      : s.requiredMin != null
        ? `≥ ${s.requiredMin}`
        : s.requiredMax != null
          ? `≤ ${s.requiredMax}`
          : "—";
  const margin = s.marginPct != null ? `${s.marginPct.toFixed(0)}%` : "—";
  const tone =
    s.complianceStatus === "Pass" ? "success" : s.complianceStatus === "Warning" ? "warning" : "danger";
  return (
    <tr className="border-t border-line/40">
      <td className="py-1.5 px-2 font-medium">{s.parameter}</td>
      <td className="py-1.5 px-2 text-right tabular-nums text-ink-muted">{required}</td>
      <td className="py-1.5 px-2 text-right tabular-nums">{s.actualValue ?? "—"}</td>
      <td className="py-1.5 px-2 text-ink-muted">{s.unit}</td>
      <td className="py-1.5 px-2 text-right tabular-nums">{margin}</td>
      <td className="py-1.5 px-2">
        <Badge tone={tone as "success" | "warning" | "danger"}>{s.complianceStatus}</Badge>
      </td>
    </tr>
  );
}
