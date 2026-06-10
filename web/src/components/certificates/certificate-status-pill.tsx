import { Badge } from "@/components/ui/badge";
import { certificateStatusToAccent } from "@/lib/format";
import type { CertificateStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CertificateStatusPill({
  status,
  className,
}: {
  status: CertificateStatus;
  className?: string;
}) {
  const accent = certificateStatusToAccent(status);
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
