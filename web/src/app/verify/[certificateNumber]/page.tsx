"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { certificateAssetUrls, useVerifyCertificate } from "@/lib/queries";
import { formatDate } from "@/lib/format";

export default function VerifyCertificatePage() {
  const params = useParams<{ certificateNumber: string }>();
  const n = decodeURIComponent(params.certificateNumber);
  const { data, isLoading, error } = useVerifyCertificate(n);
  const assets = certificateAssetUrls(n);

  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-xs text-ink-muted">
            <ShieldCheck className="h-4 w-4 text-accent" />
            Quality360 · Certificate Verification
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">Verify Certificate</h1>
          <p className="text-sm text-ink-muted">
            Public read-only attestation backed by the Quality360 audit chain.
          </p>
        </div>

        <div className="rounded-xl border border-line bg-surface shadow-card overflow-hidden">
          {isLoading && (
            <div className="p-10 text-center text-ink-muted text-sm flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying…
            </div>
          )}
          {error && (
            <div className="p-10 text-center">
              <XCircle className="h-10 w-10 mx-auto text-danger" />
              <div className="text-base font-semibold mt-3">Certificate not found</div>
              <div className="text-sm text-ink-muted mt-1">
                {n} could not be verified. It may have been revoked or never existed.
              </div>
            </div>
          )}
          {data && (
            <>
              <div
                className={`px-6 py-5 ${
                  data.authentic ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
                }`}
              >
                <div className="flex items-center gap-3">
                  {data.authentic ? (
                    <CheckCircle2 className="h-8 w-8" />
                  ) : (
                    <ShieldAlert className="h-8 w-8" />
                  )}
                  <div>
                    <div className="text-lg font-semibold">
                      {data.authentic ? "Verified Authentic" : "Draft Certificate"}
                    </div>
                    <div className="text-xs opacity-80">
                      {data.authentic
                        ? `Issued ${data.issuedAt ? formatDate(data.issuedAt) : "—"} · Version ${data.version}`
                        : "This certificate has not yet been issued."}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-3 text-sm">
                  <Row label="Certificate Number" value={data.certificateNumber} mono />
                  <Row label="Customer" value={data.customer} />
                  <Row label="Status" value={`${data.status} · ${data.dispatchStatus}`} />
                  <Row label="Product Batch" value={data.productBatchNumber} mono />
                  <Row label="Metal Batch" value={data.metalBatchNumber ?? "—"} mono />
                  <Row label="Qualification" value={data.qualificationNumber ?? "—"} mono />
                  <Row label="Source Lot" value={data.rawMaterialLotNumber ?? "—"} mono />
                  <Row label="Issued" value={data.issuedAt ? formatDate(data.issuedAt) : "—"} />
                  <Row label="Issued by" value={data.issuedBy ?? "—"} />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="surface-inset p-2 rounded-md">
                    <img src={assets.qr} alt="QR" className="w-32 h-32" />
                  </div>
                  <div className="text-[10px] text-ink-subtle text-center">Verification QR</div>
                </div>
              </div>

              <div className="px-6 pb-6 grid grid-cols-2 gap-4">
                <div className="surface-inset p-3">
                  <div className="text-[10px] uppercase tracking-wider text-ink-muted">
                    Customer compliance
                  </div>
                  <div className="text-lg font-semibold tabular-nums mt-1">
                    {data.customerComplianceCount} / {data.customerComplianceTotal}
                  </div>
                  <Progress
                    value={
                      data.customerComplianceTotal
                        ? (data.customerComplianceCount / data.customerComplianceTotal) * 100
                        : 0
                    }
                    tone="success"
                    className="mt-2"
                  />
                </div>
                <div className="surface-inset p-3 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-ink-muted">
                      Release Confidence
                    </div>
                    <div className="text-lg font-semibold tabular-nums mt-1">
                      {data.releaseConfidence ?? "—"}/100
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-ink-muted">
                      Certificate Health
                    </div>
                    <div className="text-lg font-semibold tabular-nums mt-1">
                      {data.certificateHealth ?? "—"}/100
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6 flex items-center justify-between text-[11px] text-ink-muted border-t border-line/60 pt-4">
                <span>Verified at {formatDate(data.verifiedAt)}</span>
                <div className="flex items-center gap-2">
                  <Badge tone="outline">v{data.version}</Badge>
                  <Link
                    href={`/certificates/${data.certificateNumber}`}
                    className="hover:text-accent"
                  >
                    Open workbench →
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="text-center text-[10px] text-ink-subtle">
          Quality360 — Manufacturing Quality Intelligence Platform
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2 items-baseline border-b border-line/40 pb-1.5">
      <div className="text-[10px] uppercase tracking-wider text-ink-muted">{label}</div>
      <div className={`col-span-2 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
