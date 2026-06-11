"use client";
import * as React from "react";
import { ListTodo, CheckCircle2, Hourglass, AlertTriangle, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/kit/section-card";
import { TaskCard } from "@/components/work/task-card";
import { useTasksForRecord } from "@/lib/queries";
import type { WorkTask, TaskType } from "@/lib/types";

export interface RelatedTasksPanelProps {
  /** A user-facing identifier — e.g. product batch number, lot number, certificate number. */
  recordKey: string | undefined;
  /** Optional module filter (e.g. "product-quality") to narrow to a single module. */
  moduleKey?: string;
  /** Panel title; defaults to "Related tasks". */
  title?: string;
  /** Short subtitle / description shown in the section header. */
  description?: string;
  /** Optional cap on the number of tasks rendered per group. */
  limitPerGroup?: number;
  /** Hide row-level action buttons (Start / Complete / Escalate) when true. */
  readonly?: boolean;
}

const OPEN_STATES: WorkTask["state"][] = ["New", "Assigned", "In Progress", "Escalated"];
const WAITING_STATES: WorkTask["state"][] = ["Waiting"];
const DONE_STATES: WorkTask["state"][] = ["Completed", "Cancelled"];

const TYPE_ORDER: TaskType[] = ["Sampling", "Testing", "Review", "Approval", "Result Entry", "Dispatch", "General"];

function sortByTypeThenCreated(a: WorkTask, b: WorkTask): number {
  const ai = TYPE_ORDER.indexOf(a.taskType);
  const bi = TYPE_ORDER.indexOf(b.taskType);
  if (ai !== bi) return ai - bi;
  return a.createdAt.localeCompare(b.createdAt);
}

/**
 * Reusable panel showing every task tied to a single record (any module).
 * Drop this into any workbench right rail — the only required prop is `recordKey`.
 */
export function RelatedTasksPanel({
  recordKey,
  moduleKey,
  title = "Related tasks",
  description = "Live work items tied to this record — sampling, testing, review and approval.",
  limitPerGroup,
  readonly = false,
}: RelatedTasksPanelProps) {
  const { data: tasks, isLoading } = useTasksForRecord(recordKey, moduleKey);

  const groups = React.useMemo(() => {
    const list = (tasks ?? []).slice().sort(sortByTypeThenCreated);
    const active = list.filter((t) => OPEN_STATES.includes(t.state));
    const waiting = list.filter((t) => WAITING_STATES.includes(t.state));
    const done = list.filter((t) => DONE_STATES.includes(t.state));
    const cap = (arr: WorkTask[]) => (limitPerGroup ? arr.slice(0, limitPerGroup) : arr);
    return {
      active: cap(active),
      waiting: cap(waiting),
      done: cap(done),
      total: list.length,
      overdue: list.filter((t) => t.isOverdue).length,
    };
  }, [tasks, limitPerGroup]);

  const headerActions = (
    <div className="flex items-center gap-1.5">
      <Badge tone="outline" className="text-[10px]">
        {groups.total} total
      </Badge>
      {groups.overdue > 0 && (
        <Badge tone="danger" className="text-[10px] inline-flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {groups.overdue} overdue
        </Badge>
      )}
    </div>
  );

  return (
    <SectionCard
      title={title}
      description={description}
      icon={<ListTodo className="h-4 w-4" />}
      actions={headerActions}
    >
      {isLoading && (
        <div className="text-[12px] text-ink-muted">Loading tasks…</div>
      )}

      {!isLoading && groups.total === 0 && (
        <div className="rounded-lg border border-dashed border-line bg-inset/40 p-4 text-center text-[12px] text-ink-muted">
          No tasks linked to this record yet.
        </div>
      )}

      {!isLoading && groups.active.length > 0 && (
        <Group
          label="Active"
          icon={<Hourglass className="h-3.5 w-3.5 text-info" />}
          count={groups.active.length}
        >
          {groups.active.map((t) => (
            <TaskCard key={t.id} task={t} showActions={!readonly} />
          ))}
        </Group>
      )}

      {!isLoading && groups.waiting.length > 0 && (
        <Group
          label="Waiting on upstream"
          icon={<Lock className="h-3.5 w-3.5 text-warning" />}
          count={groups.waiting.length}
        >
          {groups.waiting.map((t) => (
            <TaskCard key={t.id} task={t} showActions={false} />
          ))}
        </Group>
      )}

      {!isLoading && groups.done.length > 0 && (
        <Group
          label="Completed"
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-success" />}
          count={groups.done.length}
        >
          {groups.done.map((t) => (
            <TaskCard key={t.id} task={t} variant="compact" showActions={false} />
          ))}
        </Group>
      )}
    </SectionCard>
  );
}

function Group({
  label,
  icon,
  count,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
        {icon}
        <span>{label}</span>
        <span className="text-ink/40">·</span>
        <span>{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
