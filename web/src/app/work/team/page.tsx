"use client";
import { Users } from "lucide-react";
import { useRole } from "@/components/role-context";
import { roleLabel } from "@/lib/roles";
import { useTeamWork } from "@/lib/queries";
import { TaskCard } from "@/components/work/task-card";
import { ApprovalTaskCard } from "@/components/work/approval-task-card";
import { WorkPageShell } from "@/components/work/work-page-shell";

export default function TeamWorkPage() {
  const { role, hydrated } = useRole();
  const { data: tasks, isLoading } = useTeamWork(role);

  return (
    <WorkPageShell
      breadcrumbs={[{ label: "My Workspace", href: "/work/my" }, { label: "Team Work" }]}
      title="Team Work"
      description={hydrated ? `Open tasks across the ${roleLabel(role)} team` : "Open tasks across your team"}
      icon={<Users className="h-4 w-4" />}
      count={tasks?.length}
      loading={isLoading || !hydrated}
      isEmpty={!tasks || tasks.length === 0}
      empty={{
        title: "Team has nothing open",
        description: "Every task assigned to this team is done.",
        icon: <Users className="h-5 w-5" />,
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
