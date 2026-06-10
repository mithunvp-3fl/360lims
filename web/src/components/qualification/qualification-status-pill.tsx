import { Badge } from "@/components/ui/badge";
import { qualificationStatusToAccent } from "@/lib/format";
import type { QualificationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function QualificationStatusPill({
  status,
  className,
}: {
  status: QualificationStatus;
  className?: string;
}) {
  const accent = qualificationStatusToAccent(status);
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
