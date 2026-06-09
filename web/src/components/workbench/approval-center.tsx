"use client";
import * as React from "react";
import { toast } from "sonner";
import { Check, Gavel, Loader2, PauseCircle, ShieldX } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { useApprovals, useDecide } from "@/lib/queries";
import type { ApprovalDecision, Receipt } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

export function ApprovalCenter({ receipt }: { receipt: Receipt }) {
  const { data: approvals } = useApprovals(receipt.lotNumber);
  const decide = useDecide(receipt.lotNumber);

  const [pendingDecision, setPendingDecision] = React.useState<ApprovalDecision | null>(null);
  const [reason, setReason] = React.useState("");

  const closed = receipt.status === "Approved" || receipt.status === "Rejected";

  function submit() {
    if (!pendingDecision) return;
    if (pendingDecision !== "Approved" && !reason.trim()) {
      toast.error("Reason is required for hold and reject.");
      return;
    }
    decide.mutate(
      { decision: pendingDecision, reason: reason || undefined },
      {
        onSuccess: () => {
          const map: Record<ApprovalDecision, () => void> = {
            Approved: () => toast.success("Material approved successfully", { description: receipt.lotNumber }),
            Hold: () => toast.warning("Material placed on hold", { description: receipt.lotNumber }),
            Rejected: () => toast.error("Material rejected", { description: receipt.lotNumber }),
          };
          map[pendingDecision]?.();
          setPendingDecision(null);
          setReason("");
        },
        onError: (e: unknown) =>
          toast.error("Decision could not be saved", { description: e instanceof Error ? e.message : "" }),
      },
    );
  }

  return (
    <SectionCard
      title="Approval center"
      description={
        closed
          ? `This lot was ${receipt.status.toLowerCase()}.`
          : "Approve, hold, or reject this material. Hold and reject require a reason — every decision is audited."
      }
      icon={<Gavel className="h-4 w-4" />}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <RoleGate permission="approval:approve" needs={["qa-manager"]}>
            <Button
              variant="success"
              size="lg"
              disabled={closed || decide.isPending}
              onClick={() => setPendingDecision("Approved")}
              className="justify-center"
            >
              <Check className="h-4 w-4" /> Approve
            </Button>
          </RoleGate>
          <RoleGate permission="approval:hold" needs={["qa-engineer", "qa-manager"]}>
            <Button
              variant="warning"
              size="lg"
              disabled={closed || decide.isPending}
              onClick={() => setPendingDecision("Hold")}
              className="justify-center"
            >
              <PauseCircle className="h-4 w-4" /> Hold
            </Button>
          </RoleGate>
          <RoleGate permission="approval:reject" needs={["qa-manager"]}>
            <Button
              variant="danger"
              size="lg"
              disabled={closed || decide.isPending}
              onClick={() => setPendingDecision("Rejected")}
              className="justify-center"
            >
              <ShieldX className="h-4 w-4" /> Reject
            </Button>
          </RoleGate>
        </div>

        {(approvals ?? []).length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              Decision history
            </div>
            {(approvals ?? []).map((a) => (
              <div key={a.id} className="surface-inset p-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    tone={
                      a.decision === "Approved" ? "success" : a.decision === "Hold" ? "warning" : "danger"
                    }
                  >
                    {a.decision}
                  </Badge>
                  <div className="text-[11px] text-ink-muted">{relativeTime(a.decidedAt)} · by {a.decidedBy}</div>
                </div>
                {a.reason && <div className="text-xs text-ink-muted mt-1.5">“{a.reason}”</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!pendingDecision} onOpenChange={(o) => !o && setPendingDecision(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pendingDecision === "Approved" && <Check className="h-4 w-4 text-success" />}
              {pendingDecision === "Hold" && <PauseCircle className="h-4 w-4 text-warning" />}
              {pendingDecision === "Rejected" && <ShieldX className="h-4 w-4 text-danger" />}
              Confirm {pendingDecision?.toLowerCase()}
            </DialogTitle>
            <DialogDescription>
              {pendingDecision === "Approved"
                ? "Material will be released for consumption. This action is recorded in the audit trail."
                : pendingDecision === "Hold"
                ? "Material will be quarantined pending recollection or supplier engagement."
                : "Material will be rejected and supplier notified. This is a final decision."}
            </DialogDescription>
          </DialogHeader>

          {pendingDecision !== "Approved" && (
            <div className="space-y-1.5">
              <Label>Reason *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  pendingDecision === "Hold"
                    ? "e.g. Iron content trending high — recollect sample for verification."
                    : "e.g. Iron above 1.5% threshold, exceeds spec."
                }
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingDecision(null)}>Cancel</Button>
            <Button
              variant={pendingDecision === "Approved" ? "success" : pendingDecision === "Hold" ? "warning" : "danger"}
              onClick={submit}
              disabled={decide.isPending}
            >
              {decide.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : `Confirm ${pendingDecision}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
