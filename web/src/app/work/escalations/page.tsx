"use client";
import { AlertTriangle } from "lucide-react";
import { useEscalations } from "@/lib/queries";
import { TaskCard } from "@/components/work/task-card";
import { ApprovalTaskCard } from "@/components/work/approval-task-card";
import { WorkPageShell } from "@/components/work/work-page-shell";

export default function EscalationsPage() {
  const { data: tasks, isLoading } = useEscalations();

  return (
    <WorkPageShell
      breadcrumbs={[{ label: "My Workspace", href: "/work/my" }, { label: "Escalations" }]}
      title="Escalations"
      description="Tasks past their SLA escalation threshold"
      icon={<AlertTriangle className="h-4 w-4" />}
      count={tasks?.length}
      loading={isLoading}
      isEmpty={!tasks || tasks.length === 0}
      empty={{
        title: "Nothing escalated",
        description: "Every task is still within SLA. Nice.",
        icon: <AlertTriangle className="h-5 w-5" />,
      }}
    >
      {tasks?.map((t) =>
        t.taskType === "Approval" ? (
          <ApprovalTaskCard key={t.id} task={t} />
        ) : (
          <TaskCard key={t.id} task={t} />
        ),
      )}
    </WorkPageShell>
  );
}
