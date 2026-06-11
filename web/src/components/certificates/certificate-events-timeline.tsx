"use client";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Info,
  OctagonAlert,
} from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { useCertificateEvents } from "@/lib/queries";
import { shortDate, relativeTime } from "@/lib/utils";
import type { CertificateEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICON_FOR: Record<CertificateEvent["severity"], React.ReactNode> = {
  info: <Info className="h-3.5 w-3.5 text-info" />,
  success: <CheckCircle2 className="h-3.5 w-3.5 text-success" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-warning" />,
  danger: <OctagonAlert className="h-3.5 w-3.5 text-danger" />,
};

const DOT: Record<CertificateEvent["severity"], string> = {
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export function CertificateEventsTimeline({
  certificateNumber,
}: {
  certificateNumber: string;
}) {
  const { data: events } = useCertificateEvents(certificateNumber);
  const items = (events ?? []).slice().reverse();

  return (
    <SectionCard
      title="Quality events timeline"
      description="Chronological audit + task + dispatch activity for this certificate."
      icon={<Activity className="h-4 w-4" />}
      actions={
        <Badge tone="outline" className="text-[10px]">
          {items.length} events
        </Badge>
      }
    >
      {items.length === 0 ? (
        <div className="text-xs text-ink-muted py-6 text-center">No events captured yet.</div>
      ) : (
        <ol className="relative max-h-[420px] overflow-y-auto pr-2">
          {items.map((e, i) => (
            <li key={`${e.timestamp}-${i}`} className="relative">
              {i < items.length - 1 && (
                <span className="absolute left-[11px] top-7 bottom-0 w-px bg-line" />
              )}
              <div className="flex items-start gap-2.5 py-2">
                <div className="mt-0.5 h-5 w-5 rounded-full bg-surface border border-line grid place-items-center shrink-0 z-10">
                  {ICON_FOR[e.severity]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", DOT[e.severity])} />
                    <span className="text-sm font-medium truncate">{e.label}</span>
                  </div>
                  <div className="text-[11px] text-ink-muted ml-3.5 flex items-center gap-2 flex-wrap">
                    <span>{e.actor}</span>
                    {e.actorRole && (
                      <>
                        <ChevronRight className="h-2.5 w-2.5 text-ink-subtle" />
                        <span>{e.actorRole}</span>
                      </>
                    )}
                  </div>
                  {e.notes && <div className="text-[11px] text-ink-muted ml-3.5 mt-0.5">{e.notes}</div>}
                  <div className="text-[10px] text-ink-subtle ml-3.5 mt-0.5 flex items-center gap-1.5">
                    <Clock className="h-2.5 w-2.5" />
                    <span title={e.timestamp}>{shortDate(e.timestamp)}</span>
                    <span className="text-ink-subtle">·</span>
                    <span>{relativeTime(e.timestamp)}</span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}
