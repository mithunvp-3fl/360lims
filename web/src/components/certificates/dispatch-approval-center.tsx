"use client";
import * as React from "react";
import { toast } from "sonner";
import {
  Check,
  Eye,
  Gavel,
  Loader2,
  PauseCircle,
  Send,
  ShieldX,
} from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RoleGate } from "@/components/kit/role-gate";
import { useDispatchCertificate } from "@/lib/queries";
import type { Certificate, DispatchDecision } from "@/lib/types";

export function DispatchApprovalCenter({ certificate }: { certificate: Certificate }) {
  const dispatch = useDispatchCertificate(certificate.certificateNumber);

  type Pending = DispatchDecision | "Review";
  const [pendingDecision, setPendingDecision] = React.useState<Pending | null>(null);
  const [reason, setReason] = React.useState("");

  const closed =
    certificate.dispatchStatus === "Released" ||
    certificate.dispatchStatus === "Rejected" ||
    certificate.status === "Cancelled";

  function submit() {
    if (!pendingDecision) return;
    if (pendingDecision !== "Approve" && pendingDecision !== "Release" && !reason.trim()) {
      toast.error("Reason is required for hold, reject, and review.");
      return;
    }
    const decision: DispatchDecision =
      pendingDecision === "Review" ? "Hold" : pendingDecision;
    dispatch.mutate(
      { decision, reason: reason || undefined },
      {
        onSuccess: () => {
          if (pendingDecision === "Approve") {
            toast.success("Dispatch approved", {
              description: certificate.certificateNumber,
            });
          } else if (pendingDecision === "Hold") {
            toast.warning("Dispatch placed on hold", {
              description: certificate.certificateNumber,
            });
          } else if (pendingDecision === "Reject") {
            toast.error("Dispatch rejected", {
              description: certificate.certificateNumber,
            });
          } else if (pendingDecision === "Override") {
            toast.warning("Dispatch overridden", {
              description: certificate.certificateNumber,
            });
          } else if (pendingDecision === "Release") {
            toast.success("Dispatch released", {
              description: certificate.certificateNumber,
            });
          } else if (pendingDecision === "Review") {
            toast.info("Review requested", {
              description: certificate.certificateNumber,
            });
          }
          setPendingDecision(null);
          setReason("");
        },
        onError: (e: unknown) =>
          toast.error("Decision could not be saved", {
            description: e instanceof Error ? e.message : "",
          }),
      },
    );
  }

  return (
    <SectionCard
      title="Dispatch approval"
      description={
        closed
          ? `This dispatch was ${certificate.dispatchStatus.toLowerCase()}.`
          : "Approve, hold, reject, or request review. Override available for QA Manager."
      }
      icon={<Gavel className="h-4 w-4" />}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <RoleGate
            permission="certificate:dispatch-approve"
            needs={["qa-manager"]}
          >
            <Button
              variant="success"
              size="lg"
              disabled={closed || dispatch.isPending}
              onClick={() => setPendingDecision("Approve")}
              className="justify-center"
            >
              <Send className="h-4 w-4" /> Approve Dispatch
            </Button>
          </RoleGate>
          <RoleGate
            permission="certificate:dispatch-hold"
            needs={["qa-engineer", "qa-manager"]}
          >
            <Button
              variant="warning"
              size="lg"
              disabled={closed || dispatch.isPending}
              onClick={() => setPendingDecision("Hold")}
              className="justify-center"
            >
              <PauseCircle className="h-4 w-4" /> Hold Dispatch
            </Button>
          </RoleGate>
          <RoleGate
            permission="certificate:dispatch-reject"
            needs={["qa-manager"]}
          >
            <Button
              variant="danger"
              size="lg"
              disabled={closed || dispatch.isPending}
              onClick={() => setPendingDecision("Reject")}
              className="justify-center"
            >
              <ShieldX className="h-4 w-4" /> Reject Dispatch
            </Button>
          </RoleGate>
          <RoleGate
            permission="certificate:dispatch-hold"
            needs={["qa-engineer", "qa-manager"]}
          >
            <Button
              variant="outline"
              size="lg"
              disabled={closed || dispatch.isPending}
              onClick={() => setPendingDecision("Review")}
              className="justify-center"
            >
              <Eye className="h-4 w-4" /> Request Review
            </Button>
          </RoleGate>
        </div>

        <RoleGate permission="certificate:override" needs={["qa-manager"]}>
          <Button
            variant="ghost"
            size="sm"
            disabled={closed || dispatch.isPending}
            onClick={() => setPendingDecision("Override")}
            className="w-full"
          >
            Override decision (QA Manager only)
          </Button>
        </RoleGate>

        <div className="surface-inset p-3 text-[11px] text-ink-muted">
          <span className="font-semibold text-ink">Status</span> ·
          <Badge tone="outline" className="ml-1.5">
            {certificate.dispatchStatus}
          </Badge>
        </div>
      </div>

      <Dialog
        open={!!pendingDecision}
        onOpenChange={(o) => !o && setPendingDecision(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pendingDecision === "Approve" && <Check className="h-4 w-4 text-success" />}
              {pendingDecision === "Hold" && <PauseCircle className="h-4 w-4 text-warning" />}
              {pendingDecision === "Reject" && <ShieldX className="h-4 w-4 text-danger" />}
              {pendingDecision === "Override" && (
                <ShieldX className="h-4 w-4 text-warning" />
              )}
              {pendingDecision === "Release" && <Send className="h-4 w-4 text-success" />}
              {pendingDecision === "Review" && <Eye className="h-4 w-4 text-info" />}
              Confirm{" "}
              {pendingDecision === "Review" ? "request review" : pendingDecision?.toLowerCase()}
            </DialogTitle>
            <DialogDescription>
              {pendingDecision === "Approve"
                ? "Dispatch will be approved and the certificate released to the customer."
                : pendingDecision === "Hold"
                  ? "Dispatch will be held pending further verification."
                  : pendingDecision === "Reject"
                    ? "Dispatch will be rejected — the certificate is blocked."
                    : pendingDecision === "Override"
                      ? "Override the dispatch decision. Reason mandatory and audited."
                      : pendingDecision === "Release"
                        ? "Mark the dispatch as released to the customer."
                        : "Send the certificate back to QA for review. Reason required."}
            </DialogDescription>
          </DialogHeader>

          {pendingDecision !== "Approve" && pendingDecision !== "Release" && (
            <div className="space-y-1.5">
              <Label>Reason *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  pendingDecision === "Hold"
                    ? "e.g. Customer requires re-verification of Fe spec."
                    : pendingDecision === "Reject"
                      ? "e.g. Mg out of customer-required spec."
                      : pendingDecision === "Review"
                        ? "e.g. Compliance ambiguity — QA to verify."
                        : "e.g. Override required for customer commitment."
                }
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingDecision(null)}>
              Cancel
            </Button>
            <Button
              variant={
                pendingDecision === "Approve" || pendingDecision === "Release"
                  ? "success"
                  : pendingDecision === "Reject"
                    ? "danger"
                    : "warning"
              }
              onClick={submit}
              disabled={dispatch.isPending}
            >
              {dispatch.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                `Confirm ${pendingDecision}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
