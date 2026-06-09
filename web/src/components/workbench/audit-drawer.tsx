"use client";
import { History, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAudit } from "@/lib/queries";
import { relativeTime } from "@/lib/utils";

export function AuditDrawer({ lot, open, onOpenChange }: { lot: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data } = useAudit(lot);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Audit trail · {lot}
          </DialogTitle>
          <DialogDescription>
            Every mutation across receipt, sample, test and result entities for this lot.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[480px] -mx-2 px-2">
          <div className="space-y-2">
            {(data ?? []).length === 0 ? (
              <div className="text-xs text-ink-muted text-center py-6">No audit entries yet.</div>
            ) : (
              (data ?? []).map((log) => (
                <div key={log.id} className="surface-inset p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge tone="outline">{log.entityType}</Badge>
                      <span className="font-medium text-ink uppercase tracking-wide text-[10px]">
                        {log.action}
                      </span>
                    </div>
                    <div className="text-ink-muted">{relativeTime(log.timestamp)}</div>
                  </div>
                  <div className="mt-1 text-ink-muted">
                    By <span className="text-ink">{log.actor}</span> · {log.actorRole}
                  </div>
                  {log.notes && <div className="mt-1 italic text-ink-muted">“{log.notes}”</div>}
                  {(log.previousValue || log.newValue) && (
                    <details className="mt-1.5 cursor-pointer text-ink-muted">
                      <summary className="text-[10px] uppercase tracking-wide hover:text-ink">
                        View change
                      </summary>
                      <pre className="mt-1.5 max-h-48 overflow-auto rounded-md bg-surface border border-line p-2 text-[10px] font-mono">
{JSON.stringify({ before: log.previousValue, after: log.newValue }, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
