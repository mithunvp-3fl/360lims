"use client";
import * as React from "react";
import { toast } from "sonner";
import {
  Check,
  Gavel,
  Loader2,
  PauseCircle,
  RotateCcw,
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
import {
  useDecideProductBatch,
  useProductApprovals,
} from "@/lib/queries";
import type {
  ProductBatch,
  ProductDecision,
} from "@/lib/types";
import { relativeTime } from "@/lib/utils";

export function ProductApprovalCenter({ batch }: { batch: ProductBatch }) {
  const { data: approvals } = useProductApprovals(batch.productBatchNumber);
  const decide = useDecideProductBatch(batch.productBatchNumber);

  const [pendingDecision, setPendingDecision] = React.useState<ProductDecision | null>(null);
  const [reason, setReason] = React.useState("");

  const closed =
    batch.status === "Approved" ||
    batch.status === "Rejected" ||
    batch.status === "Cancelled";

  function submit() {
    if (!pendingDecision) return;
    if (pendingDecision !== "Approve" && !reason.trim()) {
      toast.error("Reason is required for hold, reject, and retest.");
      return;
    }
    decide.mutate(
      {
        decision: pendingDecision,
        reason: reason || undefined,
      },
      {
        onSuccess: () => {
          const map: Record<ProductDecision, () => void> = {
            Approve: () =>
              toast.success("Product approved", {
                description: batch.productBatchNumber,
              }),
            Hold: () =>
              toast.warning("Product batch placed on hold", {
                description: batch.productBatchNumber,
              }),
            Reject: () =>
              toast.error("Product batch rejected", {
                description: batch.productBatchNumber,
              }),
            Retest: () =>
              toast.info("Retest queued", {
                description: batch.productBatchNumber,
              }),
          };
          map[pendingDecision]?.();
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
      title="Approval center"
      description={
        closed
          ? `This product batch was ${batch.status.toLowerCase()}.`
          : "Approve, hold, reject or retest. Reason required for hold, reject and retest."
      }
      icon={<Gavel className="h-4 w-4" />}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <RoleGate permission="product-batch:approve" needs={["qa-manager"]}>
            <Button
              variant="success"
              size="lg"
              disabled={closed || decide.isPending}
              onClick={() => setPendingDecision("Approve")}
              className="justify-center"
            >
              <Send className="h-4 w-4" /> Approve Product
            </Button>
          </RoleGate>
          <RoleGate permission="product-batch:hold" needs={["qa-engineer", "qa-manager"]}>
            <Button
              variant="warning"
              size="lg"
              disabled={closed || decide.isPending}
              onClick={() => setPendingDecision("Hold")}
              className="justify-center"
            >
              <PauseCircle className="h-4 w-4" /> Hold Product
            </Button>
          </RoleGate>
          <RoleGate permission="product-batch:retest" needs={["qa-manager"]}>
            <Button
              variant="warning"
              size="lg"
              disabled={closed || decide.isPending}
              onClick={() => setPendingDecision("Retest")}
              className="justify-center"
            >
              <RotateCcw className="h-4 w-4" /> Retest Product
            </Button>
          </RoleGate>
          <RoleGate permission="product-batch:reject" needs={["qa-manager"]}>
            <Button
              variant="danger"
              size="lg"
              disabled={closed || decide.isPending}
              onClick={() => setPendingDecision("Reject")}
              className="justify-center"
            >
              <ShieldX className="h-4 w-4" /> Reject Product
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
                      a.decision === "Approve"
                        ? "success"
                        : a.decision === "Hold"
                          ? "warning"
                          : a.decision === "Retest"
                            ? "info"
                            : "danger"
                    }
                  >
                    {a.decision}
                  </Badge>
                  <div className="text-[11px] text-ink-muted">
                    {relativeTime(a.decidedAt)} · by {a.decidedBy}
                  </div>
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
              {pendingDecision === "Approve" && <Check className="h-4 w-4 text-success" />}
              {pendingDecision === "Hold" && <PauseCircle className="h-4 w-4 text-warning" />}
              {pendingDecision === "Retest" && <RotateCcw className="h-4 w-4 text-info" />}
              {pendingDecision === "Reject" && <ShieldX className="h-4 w-4 text-danger" />}
              Confirm {pendingDecision?.toLowerCase()}
            </DialogTitle>
            <DialogDescription>
              {pendingDecision === "Approve"
                ? "Product batch will be approved and queued for certificate generation."
                : pendingDecision === "Hold"
                  ? "Product batch will be held pending corrective action or re-testing."
                  : pendingDecision === "Retest"
                    ? "All tests will be marked for retest. The product remains in testing."
                    : "Product batch will be rejected — typically scrapped or returned for re-processing."}
            </DialogDescription>
          </DialogHeader>

          {pendingDecision !== "Approve" && (
            <div className="space-y-1.5">
              <Label>Reason *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  pendingDecision === "Hold"
                    ? "e.g. Tensile near lower limit — verify."
                    : pendingDecision === "Retest"
                      ? "e.g. Anomalous reading — re-test on second sample."
                      : "e.g. Hardness 88 HB — below spec."
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
                pendingDecision === "Approve"
                  ? "success"
                  : pendingDecision === "Hold" || pendingDecision === "Retest"
                    ? "warning"
                    : "danger"
              }
              onClick={submit}
              disabled={decide.isPending}
            >
              {decide.isPending ? (
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
