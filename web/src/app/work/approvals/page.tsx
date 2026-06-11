"use client";
import { CheckCircle2 } from "lucide-react";
import { useRole } from "@/components/role-context";
import { roleLabel } from "@/lib/roles";
import { usePendingApprovals } from "@/lib/queries";
import { ApprovalTaskCard } from "@/components/work/approval-task-card";
import { WorkPageShell } from "@/components/work/work-page-shell";

export default function ApprovalsPage() {
  const { role, hydrated } = useRole();
  // QA Manager / QA Engineer see role-scoped approvals; everyone else sees the
  // global queue — useful for a Stores Executive checking what's blocking them.
  const scoped = role === "qa-manager" || role === "qa-engineer";
  const { data: tasks, isLoading } = usePendingApprovals(scoped ? role : undefined);

  return (
    <WorkPageShell
      breadcrumbs={[{ label: "My Workspace", href: "/work/my" }, { label: "Approvals" }]}
      title="Pending Approvals"
      description={
        hydrated
          ? scoped
            ? `Decisions awaiting ${roleLabel(role)}`
            : "All open decisions across the platform"
          : "Decisions awaiting action"
      }
      icon={<CheckCircle2 className="h-4 w-4" />}
      count={tasks?.length}
      loading={isLoading || !hydrated}
      isEmpty={!tasks || tasks.length === 0}
      empty={{
        title: "Approval queue clear",
        description: "No decisions are waiting right now.",
        icon: <CheckCircle2 className="h-5 w-5" />,
      }}
    >
      {tasks?.map((t) => (
        <ApprovalTaskCard key={t.id} task={t} />
      ))}
    </WorkPageShell>
  );
}
