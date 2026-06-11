"use client";
import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  Eye,
  History,
  Printer,
  RefreshCw,
  Send,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CertificateStatusPill } from "./certificate-status-pill";
import { DispatchStatusPill } from "./dispatch-status-pill";
import { CertificatePreviewDialog } from "./certificate-preview-dialog";
import { RoleGate } from "@/components/kit/role-gate";
import { certificateAssetUrls, useIssueCertificate } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import type { Certificate } from "@/lib/types";

export function CertificateHeader({
  certificate,
  onShowHistory,
}: {
  certificate: Certificate;
  onShowHistory: () => void;
}) {
  const qc = useQueryClient();
  const issue = useIssueCertificate(certificate.certificateNumber);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const assets = certificateAssetUrls(certificate.certificateNumber);

  return (
    <div className="surface-card surface-card--glass">
      <div className="relative z-10 p-5 lg:p-6 grid grid-cols-12 gap-5 items-start">
        <div className="col-span-12 lg:col-span-8 space-y-3">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <Link href="/certificates" className="hover:text-ink inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              Certificate queue
            </Link>
            <ChevronRight className="h-3 w-3 text-ink-subtle" />
            <span className="text-ink font-medium">{certificate.certificateNumber}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              {certificate.certificateNumber}
            </h1>
            <CertificateStatusPill status={certificate.status} />
            <DispatchStatusPill status={certificate.dispatchStatus} />
            <Badge tone="outline">v{certificate.version}</Badge>
            <Badge tone="outline">Certificate &amp; Dispatch</Badge>
            <Badge tone="info">{certificate.customer}</Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 pt-2">
            <Field label="Customer" value={certificate.customer} />
            <Field
              label="Product batch"
              value={certificate.productBatchNumber}
              hint="Source release"
            />
            <Field
              label="Issued"
              value={certificate.issuedAt ? formatDate(certificate.issuedAt) : "Draft"}
              hint={certificate.issuedBy ?? undefined}
            />
            <Field
              label="Created"
              value={formatDate(certificate.createdAt)}
              hint={`by ${certificate.createdBy}`}
            />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col items-stretch lg:items-end gap-2">
          <div className="flex items-center gap-2 justify-end flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const n = certificate.certificateNumber;
                qc.invalidateQueries({ queryKey: ["certificate", n] });
                qc.invalidateQueries({ queryKey: ["certificate-insights", n] });
                qc.invalidateQueries({ queryKey: ["certificate-quality-summary", n] });
                qc.invalidateQueries({ queryKey: ["certificate-events", n] });
                qc.invalidateQueries({ queryKey: ["certificate-versions", n] });
                qc.invalidateQueries({ queryKey: ["certificate-dispatch-approvals", n] });
                toast.info("Refreshed", { description: "Latest certificate state pulled." });
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={onShowHistory}>
              <History className="h-3.5 w-3.5" />
              History
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-3.5 w-3.5" />
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const w = window.open(assets.pdf, "_blank");
                if (w) {
                  w.focus();
                  setTimeout(() => {
                    try {
                      w.print();
                    } catch {
                      /* user can print manually */
                    }
                  }, 600);
                }
              }}
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const a = document.createElement("a");
                a.href = assets.pdf;
                a.download = `${certificate.certificateNumber}.pdf`;
                a.click();
              }}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
            {certificate.status === "Draft" && (
              <RoleGate permission="certificate:issue" needs={["qa-manager"]}>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={issue.isPending}
                  onClick={() =>
                    issue.mutate(undefined, {
                      onSuccess: () =>
                        toast.success("Certificate issued", {
                          description: certificate.certificateNumber,
                        }),
                    })
                  }
                >
                  <Send className="h-3.5 w-3.5" />
                  Issue
                </Button>
              </RoleGate>
            )}
          </div>
          {certificate.notes && (
            <div className="surface-inset p-3 text-xs text-ink-muted leading-relaxed max-w-md ml-auto">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle block mb-1">
                Certificate note
              </span>
              {certificate.notes}
            </div>
          )}
          {certificate.parentCertificateNumber && (
            <div className="text-[11px] text-ink-muted text-right">
              Revision of{" "}
              <Link
                href={`/certificates/${certificate.parentCertificateNumber}`}
                className="font-mono hover:text-accent"
              >
                {certificate.parentCertificateNumber}
              </Link>
              {certificate.revisionReason ? ` · ${certificate.revisionReason}` : ""}
            </div>
          )}
        </div>
      </div>

      <CertificatePreviewDialog
        certificate={certificate}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">{label}</div>
      <div className="text-sm font-medium truncate">{value}</div>
      {hint && <div className="text-[11px] text-ink-muted truncate">{hint}</div>}
    </div>
  );
}
