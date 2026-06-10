"use client";
import * as React from "react";
import { ArrowRight, History, Search, ShieldCheck } from "lucide-react";
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
import { useProductAudit } from "@/lib/queries";
import { relativeTime } from "@/lib/utils";
import type { AuditLog } from "@/lib/types";

const ACTION_TONE: Record<
  string,
  "info" | "success" | "warning" | "danger" | "accent" | "muted"
> = {
  create: "success",
  update: "info",
  delete: "danger",
  import: "accent",
  "manual-entry": "info",
  "file-upload": "info",
  approve: "success",
  hold: "warning",
  reject: "danger",
  retest: "info",
  cancel: "danger",
  clone: "info",
  discard: "warning",
};

export function ProductAuditDrawer({
  productBatchNumber,
  open,
  onOpenChange,
}: {
  productBatchNumber: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { data } = useProductAudit(productBatchNumber);
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
            <SheetTitle>Audit trail · {productBatchNumber}</SheetTitle>
          </div>
          <SheetDescription>
            Every mutation across the product batch, samples, tests and results. Field-level diffs preserved.
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
        <DiffSection log={log} />
      </div>
    </div>
  );
}

function DiffSection({ log }: { log: AuditLog }) {
  const before = log.previousValue;
  const after = log.newValue;
  if (before == null && after == null) return null;
  if (!isPlainObject(before) && !isPlainObject(after)) {
    return (
      <details className="cursor-pointer text-[11px] text-ink-muted">
        <summary className="hover:text-ink uppercase tracking-wide">View change</summary>
        <pre className="mt-1.5 max-h-48 overflow-auto rounded-md bg-surface border border-line p-2 font-mono">
          {JSON.stringify({ before, after }, null, 2)}
        </pre>
      </details>
    );
  }
  return (
    <ObjectDiff
      before={(before ?? {}) as Record<string, unknown>}
      after={(after ?? {}) as Record<string, unknown>}
    />
  );
}

function ObjectDiff({
  before,
  after,
}: {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}) {
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  const changed = keys.filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
  if (changed.length === 0) return null;
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        Changes ({changed.length})
      </div>
      <div className="rounded-md border border-line overflow-hidden">
        <table className="w-full text-[11px]">
          <thead className="bg-surface text-[10px] uppercase text-ink-muted">
            <tr>
              <th className="text-left font-semibold py-1.5 px-2">Field</th>
              <th className="text-left font-semibold py-1.5 px-2">Before</th>
              <th className="text-left font-semibold py-1.5 px-2"></th>
              <th className="text-left font-semibold py-1.5 px-2">After</th>
            </tr>
          </thead>
          <tbody>
            {changed.map((k) => (
              <tr key={k} className="border-t border-line/60 bg-surface">
                <td className="py-1.5 px-2 font-medium text-ink">{k}</td>
                <td className="py-1.5 px-2 text-danger line-through max-w-[140px] truncate">
                  {formatScalar(before[k])}
                </td>
                <td className="py-1.5 px-1 text-ink-subtle">
                  <ArrowRight className="h-3 w-3" />
                </td>
                <td className="py-1.5 px-2 text-success max-w-[140px] truncate">
                  {formatScalar(after[k])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function formatScalar(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number") return v.toString();
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) return v.join(", ");
  return JSON.stringify(v);
}
