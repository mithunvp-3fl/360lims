"use client";
import * as React from "react";
import { History, Search, ShieldCheck } from "lucide-react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCertificateAudit } from "@/lib/queries";
import { relativeTime } from "@/lib/utils";
import type { AuditLog } from "@/lib/types";

const ACTION_TONE: Record<
  string,
  "info" | "success" | "warning" | "danger" | "accent" | "muted"
> = {
  create: "success",
  update: "info",
  issue: "success",
  cancel: "danger",
  approve: "success",
  hold: "warning",
  reject: "danger",
  override: "warning",
  release: "success",
  review: "info",
};

export function CertificateAuditDrawer({
  certificateNumber,
  open,
  onOpenChange,
}: {
  certificateNumber: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { data } = useCertificateAudit(certificateNumber);
  const [search, setSearch] = React.useState("");

  const filtered = (data ?? []).filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.entityType.toLowerCase().includes(q) ||
      log.actor.toLowerCase().includes(q) ||
      (log.notes ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="xl" className="!max-w-[640px]">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-accent" />
            <SheetTitle>Audit trail · {certificateNumber}</SheetTitle>
          </div>
          <SheetDescription>
            Every mutation across the certificate and dispatch lifecycle.
          </SheetDescription>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle" />
            <Input
              placeholder="Search actor, action, entity…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8"
            />
          </div>
        </SheetHeader>
        <SheetBody>
          {filtered.length === 0 ? (
            <div className="text-xs text-ink-muted text-center py-8">
              {data?.length === 0 ? "No audit entries yet." : "No entries match your search."}
            </div>
          ) : (
            <ol className="relative space-y-0">
              {filtered.map((log, i) => (
                <li key={log.id} className="relative">
                  {i < filtered.length - 1 && (
                    <span className="absolute left-[15px] top-9 bottom-0 w-px bg-line" />
                  )}
                  <AuditCard log={log} />
                </li>
              ))}
            </ol>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function AuditCard({ log }: { log: AuditLog }) {
  const tone = ACTION_TONE[log.action] ?? "muted";
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="mt-0.5 h-8 w-8 rounded-md bg-surface border border-line grid place-items-center shrink-0 z-10">
        <ShieldCheck className="h-3.5 w-3.5 text-accent" />
      </div>
      <div className="flex-1 min-w-0 surface-inset p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone="outline" className="font-mono">
            {log.entityType}
          </Badge>
          <Badge tone={tone}>{log.action.replace(/-/g, " ")}</Badge>
          <div className="ml-auto text-[11px] text-ink-muted">{relativeTime(log.timestamp)}</div>
        </div>
        <div className="text-xs text-ink-muted">
          By <span className="text-ink font-medium">{log.actor}</span>
          <span className="text-ink-subtle"> · {log.actorRole}</span>
          <span className="text-ink-subtle"> · {new Date(log.timestamp).toLocaleString()}</span>
        </div>
        {log.notes && (
          <div className="text-xs italic text-ink-muted border-l-2 border-line pl-2">
            “{log.notes}”
          </div>
        )}
      </div>
    </div>
  );
}
