"use client";
import * as React from "react";
import Link from "next/link";
import { History, GitBranch, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/kit/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RoleGate } from "@/components/kit/role-gate";
import { useCertificateVersions, useReviseCertificate } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import type { Certificate } from "@/lib/types";

export function CertificateVersionPanel({ certificate }: { certificate: Certificate }) {
  const { data: versions } = useCertificateVersions(certificate.certificateNumber);
  const revise = useReviseCertificate(certificate.certificateNumber);
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");

  const items = versions ?? [certificate];

  function submit() {
    if (!reason.trim()) {
      toast.error("Revision reason is required.");
      return;
    }
    revise.mutate(
      { revisionReason: reason },
      {
        onSuccess: (next) => {
          toast.success("Revision created", { description: next.certificateNumber });
          setOpen(false);
          setReason("");
        },
        onError: (e: unknown) =>
          toast.error("Could not create revision", {
            description: e instanceof Error ? e.message : "",
          }),
      },
    );
  }

  return (
    <SectionCard
      title="Versions"
      description="Immutable revision history. Older versions remain visible but locked."
      icon={<History className="h-4 w-4" />}
      actions={
        <Badge tone="outline" className="text-[10px]">
          {items.length} version{items.length !== 1 ? "s" : ""}
        </Badge>
      }
    >
      <div className="space-y-2">
        {items.map((v) => {
          const isCurrent = v.certificateNumber === certificate.certificateNumber;
          return (
            <Link
              key={v.id}
              href={`/certificates/${v.certificateNumber}`}
              className={`flex items-center justify-between rounded-md border px-3 py-2 transition-colors ${
                isCurrent
                  ? "border-accent bg-accent-soft/40"
                  : "border-line hover:border-accent/40 hover:bg-inset"
              }`}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium font-mono truncate">
                  v{v.version} · {v.certificateNumber}
                </div>
                <div className="text-[11px] text-ink-muted truncate">
                  {v.revisionReason ?? "Initial issue"} · {formatDate(v.createdAt)}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge
                  tone={
                    v.status === "Issued"
                      ? "success"
                      : v.status === "Revised"
                        ? "warning"
                        : v.status === "Cancelled"
                          ? "danger"
                          : "info"
                  }
                  className="text-[10px]"
                >
                  {v.status}
                </Badge>
                {isCurrent && (
                  <Badge tone="accent" className="text-[10px]">
                    Current
                  </Badge>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <RoleGate permission="certificate:revise" needs={["qa-manager"]}>
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-3"
          onClick={() => setOpen(true)}
          disabled={certificate.status === "Cancelled"}
        >
          <GitBranch className="h-3.5 w-3.5" /> Create revision
        </Button>
      </RoleGate>

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-warning" />
              Create certificate revision
            </DialogTitle>
            <DialogDescription>
              The current certificate {certificate.certificateNumber} will be marked Revised and a new draft will be
              created.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Revision reason *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer requested updated Fe spec after re-test."
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} disabled={revise.isPending}>
              {revise.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating…
                </>
              ) : (
                "Create revision"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
