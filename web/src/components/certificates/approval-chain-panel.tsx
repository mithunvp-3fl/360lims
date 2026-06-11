"use client";
import { Users, FileEdit, Eye, CheckCircle2, Send, Clock } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { useCertificateDispatchApprovals } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import type { Certificate } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Stage {
  key: string;
  label: string;
  role: string;
  actor?: string | null;
  at?: string | null;
  icon: React.ReactNode;
}

export function ApprovalChainPanel({ certificate }: { certificate: Certificate }) {
  const { data: approvals } = useCertificateDispatchApprovals(certificate.certificateNumber);

  const stages: Stage[] = [
    {
      key: "generated",
      label: "Generated",
      role: "QA Engineer",
      actor: certificate.createdBy,
      at: certificate.createdAt,
      icon: <FileEdit className="h-3.5 w-3.5" />,
    },
    {
      key: "reviewed",
      label: "Reviewed",
      role: "QA Engineer",
      actor: certificate.reviewedBy,
      at: certificate.reviewedAt,
      icon: <Eye className="h-3.5 w-3.5" />,
    },
    {
      key: "approved",
      label: "Approved",
      role: "QA Manager",
      actor: certificate.dispatchApprovedBy ?? certificate.issuedBy,
      at: certificate.dispatchApprovedAt ?? certificate.issuedAt,
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    {
      key: "released",
      label: "Released",
      role: "QA Manager",
      actor: certificate.releasedBy,
      at: certificate.releasedAt,
      icon: <Send className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <SectionCard
      title="Approval chain"
      description="Generated → Reviewed → Approved → Released."
      icon={<Users className="h-4 w-4" />}
    >
      <ol className="space-y-2">
        {stages.map((s) => {
          const completed = Boolean(s.actor);
          return (
            <li
              key={s.key}
              className={cn(
                "flex items-start gap-2 rounded-md border px-3 py-2",
                completed ? "border-line bg-surface" : "border-dashed border-line bg-inset/40",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 h-6 w-6 rounded-full grid place-items-center shrink-0",
                  completed ? "bg-success-soft text-success" : "bg-inset text-ink-muted",
                )}
              >
                {completed ? s.icon : <Clock className="h-3.5 w-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{s.label}</span>
                  <Badge tone="outline" className="text-[10px]">
                    {s.role}
                  </Badge>
                </div>
                {completed ? (
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    {s.actor} · {formatDate(s.at ?? undefined)}
                  </div>
                ) : (
                  <div className="text-[11px] text-ink-subtle mt-0.5">Pending</div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {approvals && approvals.length > 0 && (
        <div className="mt-3 pt-3 border-t border-line/60">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-2">
            Dispatch decisions ({approvals.length})
          </div>
          <ul className="space-y-1.5">
            {approvals.slice(0, 5).map((a) => (
              <li key={a.id} className="text-[11px] flex items-start gap-2">
                <Badge
                  tone={
                    a.decision === "Approve" || a.decision === "Release"
                      ? "success"
                      : a.decision === "Reject"
                        ? "danger"
                        : "warning"
                  }
                  className="text-[10px]"
                >
                  {a.decision}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-ink">{a.decidedBy}</div>
                  <div className="text-ink-muted text-[10px]">
                    {formatDate(a.decidedAt)}
                    {a.reason ? ` · ${a.reason}` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}
