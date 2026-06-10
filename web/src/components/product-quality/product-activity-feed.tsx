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

const STATUS_LABEL: Record<NotificationSeverity, string> = {
  info: "Information",
  success: "Success",
  warning: "Warning",
  danger: "Error",
};

const DOT_TONE: Record<NotificationSeverity, string> = {
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export function ProductActivityFeed({
  productBatchNumber,
  productBatchId,
}: {
  productBatchNumber: string;
  productBatchId?: string;
}) {
  const { data } = useNotifications();
  const [selected, setSelected] = React.useState<AppNotification | null>(null);

  const items = (data ?? []).filter((n) => {
    const meta = (n.meta ?? {}) as Record<string, unknown>;
    return (
      (productBatchId && n.entityId === productBatchId) ||
      meta.productBatchNumber === productBatchNumber ||
      (n.entityType?.startsWith("product-") ?? false) ||
      n.message.toLowerCase().includes(productBatchNumber.toLowerCase()) ||
      n.title.toLowerCase().includes(productBatchNumber.toLowerCase())
    );
  });

  return (
    <SectionCard
      title="Activity feed"
      description="Live product batch events. Click any entry for details."
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
            No events yet for this product batch.
          </div>
        ) : (
          <ol className="relative space-y-0">
            {items.map((n, i) => {
              const inferredSource = inferSource(n);
              return (
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
                        <span>·</span>
                        <span className="truncate">{inferredSource}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-ink-subtle opacity-0 group-hover:opacity-100 mt-1.5" />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <ActivityDetailSheet notification={selected} onClose={() => setSelected(null)} />
    </SectionCard>
  );
}

function inferSource(n: AppNotification): string {
  const meta = (n.meta ?? {}) as Record<string, unknown>;
  if (meta.instrument) return String(meta.instrument);
  if (meta.fileName) return `Upload · ${meta.fileName}`;
  if (n.entityType === "product-batch") return "Production Engineer";
  if (n.entityType === "product-sample") return "Lab Analyst";
  if (n.entityType === "product-result") return "Lab Analyst";
  return "System";
}

function ActivityDetailSheet({
  notification,
  onClose,
}: {
  notification: AppNotification | null;
  onClose: () => void;
}) {
  const meta = notification?.meta ?? {};
  return (
    <Sheet open={!!notification} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" size="md">
        <SheetHeader>
          <div className="flex items-center gap-2">
            {notification && ICON_FOR[notification.severity]}
            <Badge
              tone={
                notification?.severity === "success"
                  ? "success"
                  : notification?.severity === "warning"
                    ? "warning"
                    : notification?.severity === "danger"
                      ? "danger"
                      : "info"
              }
            >
              {notification ? STATUS_LABEL[notification.severity] : ""}
            </Badge>
          </div>
          <SheetTitle>{notification?.title}</SheetTitle>
          <SheetDescription>{notification?.message}</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="space-y-4">
            <DetailGrid
              rows={[
                ["Timestamp", notification ? new Date(notification.createdAt).toLocaleString() : "—"],
                ["Source", notification ? inferSource(notification) : "—"],
                ["Entity", notification?.entityType ?? "—"],
                ["Entity ID", notification?.entityId ?? "—"],
              ]}
            />

            {Object.keys(meta).length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  Source context
                </div>
                <DetailGrid
                  rows={Object.entries(meta).map(([k, v]) => [humanise(k), formatMetaValue(v)])}
                />
              </div>
            )}

            {notification && (
              <div className="surface-inset p-3 text-[11px] text-ink-muted">
                <Activity className="h-3 w-3 inline mr-1" />
                {relativeTime(notification.createdAt)}
              </div>
            )}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function DetailGrid({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="grid grid-cols-1 gap-px bg-line rounded-md overflow-hidden border border-line">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[140px_1fr] bg-surface gap-2 px-3 py-2">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted self-center">
            {k}
          </dt>
          <dd className="text-sm text-ink min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function humanise(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/Id\b/g, "ID");
}

function formatMetaValue(v: unknown): React.ReactNode {
  if (v == null) return "—";
  if (typeof v === "number") return v.toLocaleString();
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return <code className="text-[11px]">{JSON.stringify(v)}</code>;
  return String(v);
}
