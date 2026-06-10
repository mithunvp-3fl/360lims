import { Badge } from "@/components/ui/badge";
import { dispatchStatusToAccent } from "@/lib/format";
import type { DispatchStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DispatchStatusPill({
  status,
  className,
}: {
  status: DispatchStatus;
  className?: string;
}) {
  const accent = dispatchStatusToAccent(status);
  return (
    <Badge tone={accent} className={cn("gap-1.5", className)}>
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          accent === "success" && "bg-success",
          accent === "warning" && "bg-warning",
          accent === "danger" && "bg-danger",
          accent === "info" && "bg-info",
          accent === "muted" && "bg-ink-subtle",
        )}
      />
      Dispatch · {status}
    </Badge>
  );
}
