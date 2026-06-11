"use client";
import { Inbox } from "lucide-react";
import { useRole } from "@/components/role-context";
import { roleLabel } from "@/lib/roles";
import { useMyWork } from "@/lib/queries";
import { TaskCard } from "@/components/work/task-card";
import { ApprovalTaskCard } from "@/components/work/approval-task-card";
import { WorkPageShell } from "@/components/work/work-page-shell";

export default function MyWorkPage() {
  const { role, hydrated } = useRole();
  const { data: tasks, isLoading } = useMyWork(role);

  return (
    <WorkPageShell
      breadcrumbs={[{ label: "My Workspace", href: "/work/my" }, { label: "My Work" }]}
      title="My Work"
      description={hydrated ? `Open tasks assigned to ${roleLabel(role)}` : "Open tasks assigned to you"}
      icon={<Inbox className="h-4 w-4" />}
      count={tasks?.length}
      loading={isLoading || !hydrated}
      isEmpty={!tasks || tasks.length === 0}
      empty={{
        title: "Inbox clear",
        description: "Nothing assigned to you right now.",
        icon: <Inbox className="h-5 w-5" />,
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
