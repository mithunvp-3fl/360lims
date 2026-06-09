import { Badge } from "@/components/ui/badge";
import { statusToAccent } from "@/lib/format";
import type { ReceiptStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusPill({ status, className }: { status: ReceiptStatus; className?: string }) {
  const accent = statusToAccent(status);
  const toneMap = {
    info: "info" as const,
    success: "success" as const,
    warning: "warning" as const,
    danger: "danger" as const,
    muted: "muted" as const,
  };
  const tone = toneMap[accent];
  return (
    <Badge tone={tone} className={cn("gap-1.5", className)}>
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
