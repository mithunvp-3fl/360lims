"use client";
import { Check, CircleDashed, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/utils";
import type { Workflow } from "@/lib/types";

export function WorkflowTimeline({ workflow }: { workflow?: Workflow }) {
  if (!workflow) {
    return (
      <Card className="p-5">
        <div className="text-xs text-ink-muted">Loading workflow…</div>
      </Card>
    );
  }

  return (
    <Card className="p-5 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[15px] font-semibold leading-tight">Workflow progress</div>
          <div className="text-xs text-ink-muted">{workflow.moduleKey === "incoming-inspection" ? "Incoming Material Inspection" : workflow.moduleKey}</div>
        </div>
        <div className="text-xs text-ink-muted">
          {workflow.stages.filter((s) => s.status === "Completed").length} of {workflow.stages.length} complete
        </div>
      </div>

      <div className="relative">
        <div className="absolute top-3.5 left-0 right-0 h-px bg-line" />
        <div className="grid grid-flow-col auto-cols-fr">
          {workflow.stages.map((stage, i) => {
            const completed = stage.status === "Completed";
            const inProgress = stage.status === "In Progress";
            return (
              <div key={stage.key} className="relative flex flex-col items-center text-center px-1">
                <div
                  className={cn(
                    "relative z-10 h-7 w-7 rounded-full grid place-items-center text-xs font-semibold border-2 transition-colors",
                    completed && "bg-success text-white border-success",
                    inProgress && "bg-accent text-white border-accent animate-pulse",
                    !completed && !inProgress && "bg-surface text-ink-subtle border-line",
                  )}
                >
                  {completed ? <Check className="h-3.5 w-3.5" />
                    : inProgress ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <CircleDashed className="h-3.5 w-3.5" />}
                </div>
                <div
                  className={cn(
                    "mt-2 text-xs font-medium",
                    completed && "text-ink",
                    inProgress && "text-accent",
                    !completed && !inProgress && "text-ink-muted",
                  )}
                >
                  {stage.label}
                </div>
                <div className="text-[10px] text-ink-subtle mt-0.5">
                  {completed && stage.completedAt
                    ? `${relativeTime(stage.completedAt)}`
                    : inProgress
                    ? "In progress"
                    : "Pending"}
                </div>
                {completed && stage.completedBy && (
                  <div className="text-[10px] text-ink-subtle truncate max-w-[100px]">
                    by {stage.completedBy}
                  </div>
                )}
                {i < workflow.stages.length - 1 && (
                  <div
                    className={cn(
                      "absolute top-3.5 left-1/2 w-full h-0.5 -z-0",
                      completed ? "bg-success" : "bg-transparent",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
