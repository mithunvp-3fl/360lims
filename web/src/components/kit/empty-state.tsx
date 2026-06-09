import * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-3 py-12 px-6 rounded-lg surface-inset",
        className,
      )}
    >
      {icon && <div className="h-10 w-10 rounded-md bg-surface border border-line grid place-items-center text-ink-muted">{icon}</div>}
      <div>
        <div className="font-medium text-ink">{title}</div>
        {description && <div className="text-xs text-ink-muted mt-1">{description}</div>}
      </div>
      {action}
    </div>
  );
}
