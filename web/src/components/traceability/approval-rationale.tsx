"use client";
import * as React from "react";
import Link from "next/link";
import { CheckCircle2, FileSignature, AlertOctagon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ApprovalRationale } from "@/lib/types";

const NODE_LABEL = {
  "raw-material": "Raw Material",
  "process-qualification": "Process Qualification",
  "metal-batch": "Metal Batch",
  "product-batch": "Product Batch",
  certificate: "Certificate",
} as const;

/**
 * Phase 8 — reusable Approval Rationale card.
 *
 * Surfaces who decided what, when, why, and what supporting evidence backs it.
 * Used by the Approvals tab and the Audit history view.
 */
export function ApprovalRationaleCard({
  item,
  showNode = true,
  className,
}: {
  item: ApprovalRationale;
  showNode?: boolean;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "rounded-md border border-line bg-surface px-3 py-3 space-y-2",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <div
            className={cn(
              "h-7 w-7 rounded-md grid place-items-center shrink-0",
              item.decisionTone === "success" && "bg-success-soft text-success",
              item.decisionTone === "warning" && "bg-warning-soft text-warning",
              item.decisionTone === "danger" && "bg-danger-soft text-danger",
              item.decisionTone === "info" && "bg-info-soft text-info",
            )}
          >
            {decisionIcon(item.decisionTone)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-semibold leading-tight">
                {item.decision}
              </span>
              {showNode && (
                <Badge tone="muted" className="text-[9px]">
                  {NODE_LABEL[item.nodeType]}
                </Badge>
              )}
              <span className="text-[10px] text-ink-subtle font-mono">
                {item.nodeKey}
              </span>
            </div>
            <div className="text-[11px] text-ink-muted mt-0.5">
              by <span className="font-medium">{item.approver}</span>
              {item.approverRole ? ` · ${item.approverRole}` : ""}
              {" · "}
              {new Date(item.decidedAt).toLocaleString()}
            </div>
          </div>
        </div>
        {item.href && (
          <Link
            href={item.href}
            className="text-[11px] text-accent hover:underline font-medium shrink-0"
          >
            Workbench →
          </Link>
        )}
      </header>

      {item.reason && (
        <div className="rounded-md border border-line bg-inset px-2.5 py-1.5">
          <div className="text-[10px] uppercase tracking-wider text-ink-muted mb-0.5">
            Reason
          </div>
          <div className="text-[12px] text-ink leading-snug">{item.reason}</div>
        </div>
      )}

      {item.supportingEvidence.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-muted mb-1">
            Supporting evidence
          </div>
          <ul className="flex flex-wrap gap-1">
            {item.supportingEvidence.map((ev, i) => (
              <li key={i}>
                <Badge tone="outline" className="text-[10px] font-mono">
                  {ev}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

function decisionIcon(tone: ApprovalRationale["decisionTone"]) {
  if (tone === "success") return <CheckCircle2 className="h-4 w-4" />;
  if (tone === "danger") return <AlertOctagon className="h-4 w-4" />;
  return <FileSignature className="h-4 w-4" />;
}
