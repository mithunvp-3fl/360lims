"use client";
import { FileCheck } from "lucide-react";
import { useCompletedWork } from "@/lib/queries";
import { TaskCard } from "@/components/work/task-card";
import { WorkPageShell } from "@/components/work/work-page-shell";

export default function CompletedPage() {
  const { data: tasks, isLoading } = useCompletedWork();

  return (
    <WorkPageShell
      breadcrumbs={[{ label: "My Workspace", href: "/work/my" }, { label: "Completed" }]}
      title="Completed Work"
      description="Recently finished tasks across the platform"
      icon={<FileCheck className="h-4 w-4" />}
      count={tasks?.length}
      loading={isLoading}
      isEmpty={!tasks || tasks.length === 0}
      empty={{
        title: "No completed tasks yet",
        description: "Once tasks are marked complete, they appear here.",
        icon: <FileCheck className="h-5 w-5" />,
      }}
    >
      {tasks?.map((t) => (
        <TaskCard key={t.id} task={t} showActions={false} />
      ))}
    </WorkPageShell>
  );
}
