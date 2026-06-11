"use client";
import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Hourglass,
  Pause,
  Play,
  ShieldQuestion,
  Tag,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCompleteTask, useEscalateTask, useStartTask } from "@/lib/queries";
import type { TaskPriority, TaskState, WorkTask } from "@/lib/types";

export interface TaskCardProps {
  task: WorkTask;
  variant?: "default" | "approval" | "compact";
  showActions?: boolean;
  rightSlot?: React.ReactNode;
}

const STATE_BADGE: Record<TaskState, { tone: "muted" | "info" | "warning" | "success" | "danger"; label: string }> = {
  New: { tone: "muted", label: "New" },
  Assigned: { tone: "info", label: "Assigned" },
  "In Progress": { tone: "info", label: "In Progress" },
  Waiting: { tone: "warning", label: "Waiting" },
  Completed: { tone: "success", label: "Completed" },
  Cancelled: { tone: "muted", label: "Cancelled" },
  Escalated: { tone: "danger", label: "Escalated" },
};

const PRIORITY_BADGE: Record<TaskPriority, { tone: "muted" | "info" | "warning" | "danger"; label: string }> = {
  Low: { tone: "muted", label: "Low" },
  Medium: { tone: "info", label: "Medium" },
  High: { tone: "warning", label: "High" },
  Critical: { tone: "danger", label: "Critical" },
};

export function TaskCard({
  task,
  variant = "default",
  showActions = true,
  rightSlot,
}: TaskCardProps) {
  const start = useStartTask();
  const complete = useCompleteTask();
  const escalate = useEscalateTask();

  const stateInfo = STATE_BADGE[task.state];
  const priInfo = PRIORITY_BADGE[task.priority];

  const isApproval = variant === "approval" || task.taskType === "Approval";
  const canStart = task.state === "Assigned" || task.state === "New";
  const canComplete = task.state === "In Progress" || task.state === "Assigned";

  return (
    <div
      className={cn(
        "rounded-lg border bg-surface p-4 transition-colors hover:bg-inset/40",
        task.isOverdue
          ? "border-danger/40"
          : task.isWarning
          ? "border-warning/40"
          : "border-line",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone={priInfo.tone} className="text-[9px]">
              {priInfo.label}
            </Badge>
            <Badge tone={stateInfo.tone} className="text-[9px]">
              {stateInfo.label}
            </Badge>
            {task.isOverdue && (
              <Badge tone="danger" className="text-[9px] inline-flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Overdue
              </Badge>
            )}
            {task.isWarning && !task.isOverdue && (
              <Badge tone="warning" className="text-[9px] inline-flex items-center gap-1">
                <Hourglass className="h-3 w-3" />
                Near SLA
              </Badge>
            )}
            {task.recordKey && (
              <Badge tone="outline" className="text-[9px] inline-flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {task.recordKey}
              </Badge>
            )}
          </div>
          <div className="mt-1.5 text-[14px] font-semibold leading-tight">{task.title}</div>
          {task.description && (
            <div className="mt-0.5 text-[12px] text-ink-muted line-clamp-2">{task.description}</div>
          )}
          <div className="mt-2 flex items-center gap-3 text-[11px] text-ink-muted flex-wrap">
            {task.assignedTo && (
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                {task.assignedTo}
              </span>
            )}
            {task.assignedRole && (
              <span className="inline-flex items-center gap-1">
                <ShieldQuestion className="h-3 w-3" />
                {task.assignedRole}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Created {relativeTime(task.createdAt)}
            </span>
            {task.dueAt && (
              <span className="inline-flex items-center gap-1">
                <Hourglass className="h-3 w-3" />
                Due {relativeTime(task.dueAt)}
              </span>
            )}
          </div>
          {task.nextAction && (
            <div className="mt-2 text-[12px] text-ink inline-flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5 text-accent" />
              <span className="font-medium">{task.nextAction}</span>
            </div>
          )}
        </div>
        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>

      {showActions && task.state !== "Completed" && task.state !== "Cancelled" && (
        <div className="mt-3 pt-3 border-t border-line flex items-center gap-2 flex-wrap">
          {task.href && (
            <Button asChild size="sm" variant="default">
              <Link href={task.href}>
                Open workbench
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
          {!isApproval && canStart && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => start.mutate(task.id)}
              disabled={start.isPending}
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Start
            </Button>
          )}
          {!isApproval && canComplete && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => complete.mutate(task.id)}
              disabled={complete.isPending}
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Mark complete
            </Button>
          )}
          {task.state !== "Escalated" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => escalate.mutate({ taskId: task.id })}
              disabled={escalate.isPending}
              className="text-ink-muted"
            >
              <Pause className="mr-1.5 h-3.5 w-3.5" />
              Escalate
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function relativeTime(iso: string): string {
  try {
    const t = new Date(iso).getTime();
    const now = Date.now();
    const diffMins = Math.round((now - t) / 60000);
    if (Math.abs(diffMins) < 1) return "just now";
    const past = diffMins > 0;
    const mins = Math.abs(diffMins);
    if (mins < 60) return past ? `${mins}m ago` : `in ${mins}m`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return past ? `${hrs}h ago` : `in ${hrs}h`;
    const days = Math.round(hrs / 24);
    return past ? `${days}d ago` : `in ${days}d`;
  } catch {
    return iso;
  }
}
