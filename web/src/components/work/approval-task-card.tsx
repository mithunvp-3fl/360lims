"use client";
import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Pause,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useDecideApproval } from "@/lib/queries";
import type { TaskPriority, WorkTask, WorkflowApprovalDecision } from "@/lib/types";

const PRIORITY_BADGE: Record<TaskPriority, { tone: "muted" | "info" | "warning" | "danger"; label: string }> = {
  Low: { tone: "muted", label: "Low" },
  Medium: { tone: "info", label: "Medium" },
  High: { tone: "warning", label: "High" },
  Critical: { tone: "danger", label: "Critical" },
};

export function ApprovalTaskCard({ task }: { task: WorkTask }) {
  const [reason, setReason] = React.useState("");
  const decide = useDecideApproval();
  const priInfo = PRIORITY_BADGE[task.priority];

  function submit(decision: WorkflowApprovalDecision) {
    decide.mutate({ taskId: task.id, decision, reason: reason || undefined }, {
      onSuccess: () => setReason(""),
    });
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-surface p-4",
        task.isOverdue ? "border-danger/40" : "border-line",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone="accent" className="text-[9px] inline-flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" />
              Approval
            </Badge>
            <Badge tone={priInfo.tone} className="text-[9px]">
              {priInfo.label}
            </Badge>
            {task.isOverdue && (
              <Badge tone="danger" className="text-[9px] inline-flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Overdue
              </Badge>
            )}
            {task.recordKey && (
              <Badge tone="outline" className="text-[9px]">
                {task.recordKey}
              </Badge>
            )}
          </div>
          <div className="mt-1.5 text-[14px] font-semibold leading-tight">{task.title}</div>
          {task.description && (
            <div className="mt-0.5 text-[12px] text-ink-muted">{task.description}</div>
          )}
          {task.assignedTo && (
            <div className="mt-1.5 text-[11px] text-ink-muted">Assigned to {task.assignedTo}</div>
          )}
        </div>
        {task.href && (
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href={task.href}>
              Open
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-line space-y-2">
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason or notes (optional)"
          className="text-xs min-h-[60px]"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="success"
            onClick={() => submit("Approve")}
            disabled={decide.isPending}
          >
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="warning"
            onClick={() => submit("Hold")}
            disabled={decide.isPending}
          >
            <Pause className="mr-1.5 h-3.5 w-3.5" />
            Hold
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => submit("Reject")}
            disabled={decide.isPending}
          >
            <XCircle className="mr-1.5 h-3.5 w-3.5" />
            Reject
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => submit("Override")}
            disabled={decide.isPending}
            className="text-ink-muted"
          >
            Override
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => submit("Escalate")}
            disabled={decide.isPending}
            className="text-ink-muted"
          >
            Escalate
          </Button>
        </div>
      </div>
    </div>
  );
}
