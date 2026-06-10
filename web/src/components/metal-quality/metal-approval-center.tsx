"use client";
import * as React from "react";
import { toast } from "sonner";
import { ArrowDownNarrowWide, Check, Gavel, Loader2, PauseCircle, Send, ShieldX } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  useDecideMetalBatch,
  useMetalApprovals,
} from "@/lib/queries";
import type {
  MetalBatch,
  MetalBatchDecision,
  ProductGrade,
} from "@/lib/types";
import { relativeTime } from "@/lib/utils";

const DOWNGRADE_TARGETS: Record<ProductGrade, ProductGrade[]> = {
  P0610: ["P1020", "Primary Aluminum"],
  P1020: ["Primary Aluminum"],
  "Primary Aluminum": [],
};

export function MetalApprovalCenter({ batch }: { batch: MetalBatch }) {
  const { data: approvals } = useMetalApprovals(batch.metalBatchNumber);
  const decide = useDecideMetalBatch(batch.metalBatchNumber);

  const [pendingDecision, setPendingDecision] = React.useState<MetalBatchDecision | null>(null);
  const [reason, setReason] = React.useState("");
  const [targetGrade, setTargetGrade] = React.useState<ProductGrade | "">("");

  const closed =
    batch.status === "Released" ||
    batch.status === "Rejected" ||
    batch.status === "Downgraded" ||
    batch.status === "Cancelled";

  const downgradeOptions = DOWNGRADE_TARGETS[batch.productGrade] ?? [];

  React.useEffect(() => {
    if (pendingDecision === "Downgrade" && downgradeOptions.length && !targetGrade) {
      setTargetGrade(downgradeOptions[0]);
    }
    if (pendingDecision !== "Downgrade") {
      setTargetGrade("");
    }
  }, [pendingDecision, downgradeOptions, targetGrade]);

  function submit() {
    if (!pendingDecision) return;
    if (pendingDecision !== "Release" && !reason.trim()) {
      toast.error("Reason is required for hold, reject, and downgrade.");
      return;
    }
    if (pendingDecision === "Downgrade" && !targetGrade) {
      toast.error("Target grade is required for downgrade.");
      return;
    }
    decide.mutate(
      {
        decision: pendingDecision,
        reason: reason || undefined,
        targetGrade: pendingDecision === "Downgrade" ? (targetGrade as ProductGrade) : undefined,
      },
      {
        onSuccess: () => {
          const map: Record<MetalBatchDecision, () => void> = {
            Release: () =>
              toast.success("Casting release approved", {
                description: `${batch.metalBatchNumber} → ${batch.potline}`,
              }),
            Hold: () =>
              toast.warning("Metal batch placed on hold", {
                description: batch.metalBatchNumber,
              }),
            Reject: () =>
              toast.error("Metal batch rejected", {
                description: batch.metalBatchNumber,
              }),
            Downgrade: () =>
              toast.warning("Grade downgraded", {
                description: `${batch.metalBatchNumber} → ${targetGrade}`,
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
          ? `This metal batch was ${batch.status.toLowerCase()}.`
          : "Release for casting, hold, downgrade or reject. Reason required for hold, downgrade and reject."
      }
      icon={<Gavel className="h-4 w-4" />}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <RoleGate permission="metal-batch:release" needs={["qa-manager"]}>
            <Button
              variant="success"
              size="lg"
              disabled={closed || decide.isPending}
              onClick={() => setPendingDecision("Release")}
              className="justify-center"
            >
              <Send className="h-4 w-4" /> Release for Casting
            </Button>
          </RoleGate>
          <RoleGate permission="metal-batch:hold" needs={["qa-engineer", "qa-manager"]}>
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
          <RoleGate permission="metal-batch:downgrade" needs={["qa-manager"]}>
            <Button
              variant="warning"
              size="lg"
              disabled={closed || decide.isPending || downgradeOptions.length === 0}
              onClick={() => setPendingDecision("Downgrade")}
              className="justify-center"
            >
              <ArrowDownNarrowWide className="h-4 w-4" /> Downgrade Grade
            </Button>
          </RoleGate>
          <RoleGate permission="metal-batch:reject" needs={["qa-manager"]}>
            <Button
              variant="danger"
              size="lg"
              disabled={closed || decide.isPending}
              onClick={() => setPendingDecision("Reject")}
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
                      a.decision === "Release"
                        ? "success"
                        : a.decision === "Hold"
                          ? "warning"
                          : a.decision === "Downgrade"
                            ? "warning"
                            : "danger"
                    }
                  >
                    {a.decision}
                    {a.targetGrade ? ` → ${a.targetGrade}` : ""}
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
              {pendingDecision === "Release" && <Check className="h-4 w-4 text-success" />}
              {pendingDecision === "Hold" && <PauseCircle className="h-4 w-4 text-warning" />}
              {pendingDecision === "Downgrade" && <ArrowDownNarrowWide className="h-4 w-4 text-warning" />}
              {pendingDecision === "Reject" && <ShieldX className="h-4 w-4 text-danger" />}
              Confirm {pendingDecision?.toLowerCase()}
            </DialogTitle>
            <DialogDescription>
              {pendingDecision === "Release"
                ? `Metal batch will be released to ${batch.potline} casting operations. Audited.`
                : pendingDecision === "Hold"
                  ? "Metal batch will be held pending chemistry correction or recollection."
                  : pendingDecision === "Downgrade"
                    ? "Metal batch will be downgraded to a less demanding product grade."
                    : "Metal batch will be rejected — typically returned to potline for re-melting."}
            </DialogDescription>
          </DialogHeader>

          {pendingDecision === "Downgrade" && (
            <div className="space-y-1.5">
              <Label>Target grade *</Label>
              <Select value={targetGrade} onValueChange={(v) => setTargetGrade(v as ProductGrade)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target grade" />
                </SelectTrigger>
                <SelectContent>
                  {downgradeOptions.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {pendingDecision !== "Release" && (
            <div className="space-y-1.5">
              <Label>Reason *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  pendingDecision === "Hold"
                    ? "e.g. Fe near upper limit — recheck before casting."
                    : pendingDecision === "Downgrade"
                      ? "e.g. Si trending above P1020 spec — downgrade for billets."
                      : "e.g. Fe 0.32% — exceeds spec for grade."
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
                pendingDecision === "Release"
                  ? "success"
                  : pendingDecision === "Hold" || pendingDecision === "Downgrade"
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
