import { Badge } from "@/components/ui/badge";
import { metalBatchStatusToAccent } from "@/lib/format";
import type { MetalBatchStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MetalBatchStatusPill({
  status,
  className,
}: {
  status: MetalBatchStatus;
  className?: string;
}) {
  const accent = metalBatchStatusToAccent(status);
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
      {status}
    </Badge>
  );
}
