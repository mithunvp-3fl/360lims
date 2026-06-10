"use client";
import * as React from "react";
import { toast } from "sonner";
import { Check, Gavel, Loader2, PauseCircle, Send, ShieldX } from "lucide-react";
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
  useDecideQualification,
  useQualificationApprovals,
} from "@/lib/queries";
import type { Qualification, QualificationDecision } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

export function QualificationApprovalCenter({
  qualification,
}: {
  qualification: Qualification;
}) {
  const { data: approvals } = useQualificationApprovals(qualification.qualificationNumber);
  const decide = useDecideQualification(qualification.qualificationNumber);

  const [pendingDecision, setPendingDecision] = React.useState<QualificationDecision | null>(null);
  const [reason, setReason] = React.useState("");

  const closed =
    qualification.status === "Released" ||
    qualification.status === "Rejected" ||
    qualification.status === "Cancelled";

  function submit() {
    if (!pendingDecision) return;
    if (pendingDecision !== "Release" && !reason.trim()) {
      toast.error("Reason is required for hold and reject.");
      return;
    }
    decide.mutate(
      { decision: pendingDecision, reason: reason || undefined },
      {
        onSuccess: () => {
          const map: Record<QualificationDecision, () => void> = {
            Release: () =>
              toast.success("Material released successfully", {
                description: `${qualification.qualificationNumber} → ${qualification.consumptionArea}`,
              }),
            Hold: () =>
              toast.warning("Material placed on hold", {
                description: qualification.qualificationNumber,
              }),
            Reject: () =>
              toast.error("Material rejected for process use", {
                description: qualification.qualificationNumber,
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
          ? `This qualification was ${qualification.status.toLowerCase()}.`
          : "Release, hold, or reject this material for process consumption. Hold and reject require a reason."
      }
      icon={<Gavel className="h-4 w-4" />}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <RoleGate permission="qualification:release" needs={["qa-manager"]}>
            <Button
              variant="success"
              size="lg"
              disabled={closed || decide.isPending}
              onClick={() => setPendingDecision("Release")}
              className="justify-center"
            >
              <Send className="h-4 w-4" /> Release
            </Button>
          </RoleGate>
          <RoleGate permission="qualification:hold" needs={["qa-engineer", "qa-manager"]}>
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
          <RoleGate permission="qualification:reject" needs={["qa-manager"]}>
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
              {pendingDecision === "Release" && <Check className="h-4 w-4 text-success" />}
              {pendingDecision === "Hold" && <PauseCircle className="h-4 w-4 text-warning" />}
              {pendingDecision === "Reject" && <ShieldX className="h-4 w-4 text-danger" />}
              Confirm {pendingDecision?.toLowerCase()}
            </DialogTitle>
            <DialogDescription>
              {pendingDecision === "Release"
                ? `Material will be released to ${qualification.consumptionArea} for production consumption. Audited.`
                : pendingDecision === "Hold"
                  ? "Material will be quarantined pending recollection or supplier engagement."
                  : "Material will be rejected for process use and the source supplier notified."}
            </DialogDescription>
          </DialogHeader>

          {pendingDecision !== "Release" && (
            <div className="space-y-1.5">
              <Label>Reason *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  pendingDecision === "Hold"
                    ? "e.g. Sulphur trending high — recollect for verification."
                    : "e.g. Sulphur above 3% threshold — exceeds Carbon Plant spec."
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
                  : pendingDecision === "Hold"
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
