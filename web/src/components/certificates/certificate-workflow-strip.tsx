"use client";
import { Check, CircleDashed, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Certificate } from "@/lib/types";

const STAGES = [
  { key: "generate", label: "Generate" },
  { key: "customer-validation", label: "Customer Validation" },
  { key: "qa-review", label: "QA Review" },
  { key: "dispatch-approval", label: "Dispatch Approval" },
  { key: "released", label: "Released" },
] as const;

type StageStatus = "Pending" | "In Progress" | "Completed";

function computeStages(certificate: Certificate): StageStatus[] {
  const s: StageStatus[] = ["Pending", "Pending", "Pending", "Pending", "Pending"];
  // Generate
  s[0] = "Completed";
  // Customer validation = certificate.status >= Issued
  if (certificate.status === "Issued" || certificate.status === "Revised") {
    s[1] = "Completed";
  } else if (certificate.status === "Draft") {
    s[1] = "In Progress";
    return s;
  }
  // QA review based on dispatchStatus
  const ds = certificate.dispatchStatus;
  if (ds === "Pending") {
    s[2] = "In Progress";
  } else if (ds === "Ready" || ds === "Held") {
    s[2] = "Completed";
    s[3] = ds === "Held" ? "In Progress" : "In Progress";
  } else if (ds === "Approved" || ds === "Overridden") {
    s[2] = "Completed";
    s[3] = "Completed";
    s[4] = "In Progress";
  } else if (ds === "Released") {
    s[2] = "Completed";
    s[3] = "Completed";
    s[4] = "Completed";
  } else if (ds === "Rejected") {
    s[2] = "Completed";
    s[3] = "Completed";
  }
  return s;
}

export function CertificateWorkflowStrip({ certificate }: { certificate: Certificate }) {
  const stageStatuses = computeStages(certificate);
  const completed = stageStatuses.filter((s) => s === "Completed").length;

  return (
    <Card className="p-5 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[15px] font-semibold leading-tight">Workflow progress</div>
          <div className="text-xs text-ink-muted">Certificate &amp; Dispatch</div>
        </div>
        <div className="text-xs text-ink-muted">
          {completed} of {STAGES.length} complete
        </div>
      </div>

      <div className="relative">
        <div className="absolute top-3.5 left-0 right-0 h-px bg-line" />
        <div className="grid grid-flow-col auto-cols-fr">
          {STAGES.map((stage, i) => {
            const status = stageStatuses[i];
            const isCompleted = status === "Completed";
            const inProgress = status === "In Progress";
            return (
              <div key={stage.key} className="relative flex flex-col items-center text-center px-1">
                <div
                  className={cn(
                    "relative z-10 h-7 w-7 rounded-full grid place-items-center text-xs font-semibold border-2 transition-colors",
                    isCompleted && "bg-success text-white border-success",
                    inProgress && "bg-accent text-white border-accent animate-pulse",
                    !isCompleted && !inProgress && "bg-surface text-ink-subtle border-line",
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : inProgress ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CircleDashed className="h-3.5 w-3.5" />
                  )}
                </div>
                <div
                  className={cn(
                    "mt-2 text-xs font-medium",
                    isCompleted && "text-ink",
                    inProgress && "text-accent",
                    !isCompleted && !inProgress && "text-ink-muted",
                  )}
                >
                  {stage.label}
                </div>
                <div className="text-[10px] text-ink-subtle mt-0.5">
                  {status === "Completed"
                    ? "Complete"
                    : status === "In Progress"
                      ? "In progress"
                      : "Pending"}
                </div>
                {i < STAGES.length - 1 && (
                  <div
                    className={cn(
                      "absolute top-3.5 left-1/2 w-full h-0.5 -z-0",
                      isCompleted ? "bg-success" : "bg-transparent",
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
