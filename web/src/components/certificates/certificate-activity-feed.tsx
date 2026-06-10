"use client";
import * as React from "react";
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  CircleCheck,
  Clock,
  Info,
  OctagonAlert,
  Radio,
} from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useNotifications } from "@/lib/queries";
import { relativeTime, shortDate } from "@/lib/utils";
import type { AppNotification, NotificationSeverity } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICON_FOR: Record<NotificationSeverity, React.ReactNode> = {
  info: <Info className="h-3.5 w-3.5 text-info" />,
  success: <CircleCheck className="h-3.5 w-3.5 text-success" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-warning" />,
  danger: <OctagonAlert className="h-3.5 w-3.5 text-danger" />,
};

const DOT_TONE: Record<NotificationSeverity, string> = {
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export function CertificateActivityFeed({
  certificateNumber,
  certificateId,
}: {
  certificateNumber: string;
  certificateId?: string;
}) {
  const { data } = useNotifications();
  const [selected, setSelected] = React.useState<AppNotification | null>(null);

  const items = (data ?? []).filter((n) => {
    const meta = (n.meta ?? {}) as Record<string, unknown>;
    return (
      (certificateId && n.entityId === certificateId) ||
      meta.certificateNumber === certificateNumber ||
      n.entityType === "certificate" ||
      n.entityType === "dispatch" ||
      n.message.toLowerCase().includes(certificateNumber.toLowerCase()) ||
      n.title.toLowerCase().includes(certificateNumber.toLowerCase())
    );
  });

  return (
    <SectionCard
      title="Activity feed"
      description="Live certificate and dispatch events."
      icon={<Radio className="h-4 w-4" />}
      actions={
        <Badge tone="success" className="gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          Live
        </Badge>
      }
    >
      <div className="relative max-h-[360px] overflow-y-auto -mx-2 px-2">
        {items.length === 0 ? (
          <div className="text-xs text-ink-muted py-6 text-center">
            No events yet for this certificate.
          </div>
        ) : (
          <ol className="relative space-y-0">
            {items.map((n, i) => (
              <li key={n.id} className="relative">
                {i < items.length - 1 && (
                  <span className="absolute left-[10px] top-7 bottom-0 w-px bg-line" />
                )}
                <button
                  type="button"
                  onClick={() => setSelected(n)}
                  className="group w-full flex items-start gap-2.5 py-2 px-2 -mx-2 rounded-md hover:bg-inset transition-colors text-left"
                >
                  <div className="mt-0.5 h-5 w-5 rounded-full bg-surface border border-line grid place-items-center shrink-0 z-10">
                    {ICON_FOR[n.severity]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full shrink-0",
                          DOT_TONE[n.severity],
                        )}
                      />
                      <span className="text-sm font-medium leading-tight truncate">
                        {n.title}
                      </span>
                    </div>
                    <div className="text-xs text-ink-muted line-clamp-1 ml-3.5">
                      {n.message}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-ink-subtle mt-0.5 ml-3.5">
                      <Clock className="h-2.5 w-2.5" />
                      <span>{shortDate(n.createdAt)}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-ink-subtle opacity-0 group-hover:opacity-100 mt-1.5" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" size="md">
          <SheetHeader>
            <SheetTitle>{selected?.title}</SheetTitle>
            <SheetDescription>{selected?.message}</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <div className="surface-inset p-3 text-[11px] text-ink-muted">
              <Activity className="h-3 w-3 inline mr-1" />
              {selected ? relativeTime(selected.createdAt) : ""}
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </SectionCard>
  );
}
