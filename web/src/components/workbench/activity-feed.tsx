"use client";
import { Activity, AlertTriangle, CircleCheck, Info, OctagonAlert, Radio } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/lib/queries";
import { relativeTime } from "@/lib/utils";
import type { NotificationSeverity } from "@/lib/types";

const iconFor: Record<NotificationSeverity, React.ReactNode> = {
  info: <Info className="h-3.5 w-3.5 text-info" />,
  success: <CircleCheck className="h-3.5 w-3.5 text-success" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-warning" />,
  danger: <OctagonAlert className="h-3.5 w-3.5 text-danger" />,
};

export function ActivityFeed({ lot, receiptId }: { lot: string; receiptId?: string }) {
  const { data } = useNotifications();
  const items = (data ?? []).filter((n) => {
    if (!receiptId) return true;
    return (
      n.entityId === receiptId ||
      n.message.toLowerCase().includes(lot.toLowerCase()) ||
      n.title.toLowerCase().includes(lot.toLowerCase())
    );
  });
  return (
    <SectionCard
      title="Instrument activity feed"
      description="Live events for this lot."
      icon={<Radio className="h-4 w-4" />}
      actions={<Badge tone="success" className="gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />Live</Badge>}
    >
      <div className="relative max-h-[360px] overflow-y-auto -mx-2 px-2">
        {items.length === 0 ? (
          <div className="text-xs text-ink-muted py-6 text-center">No events yet for this lot.</div>
        ) : (
          <ol className="relative space-y-2.5">
            {items.map((n) => (
              <li key={n.id} className="relative flex items-start gap-2.5 py-1.5">
                <div className="mt-0.5 h-5 w-5 rounded-full bg-surface border border-line grid place-items-center shrink-0">
                  {iconFor[n.severity]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-tight">{n.title}</div>
                  <div className="text-xs text-ink-muted">{n.message}</div>
                  <div className="text-[10px] text-ink-subtle mt-0.5">{relativeTime(n.createdAt)}</div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </SectionCard>
  );
}
