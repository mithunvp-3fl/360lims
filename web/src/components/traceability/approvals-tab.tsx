"use client";
import * as React from "react";
import { FileSignature } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { useChainApprovals } from "@/lib/queries";
import type { GenealogyNodeType } from "@/lib/types";
import { ApprovalRationaleCard } from "./approval-rationale";

interface Props {
  nodeType: GenealogyNodeType;
  nodeKey: string;
}

export function ApprovalsTab({ nodeType, nodeKey }: Props) {
  const { data, isLoading } = useChainApprovals(nodeType, nodeKey);

  return (
    <SectionCard
      title="Approvals"
      description="Every decision recorded along the chain — decision, approver, reason, evidence"
      icon={<FileSignature className="h-4 w-4" />}
      actions={
        data ? (
          <span className="text-[11px] text-ink-muted">
            {data.items.length} decision(s)
          </span>
        ) : null
      }
    >
      {isLoading ? (
        <div className="text-xs text-ink-muted">Loading approvals…</div>
      ) : !data || data.items.length === 0 ? (
        <div className="text-xs text-ink-muted">
          No approvals recorded for this chain yet.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {data.items.map((it, i) => (
            <li key={`${it.entityId}-${it.decidedAt}-${i}`}>
              <ApprovalRationaleCard item={it} />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
