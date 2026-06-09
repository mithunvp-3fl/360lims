"use client";
import Link from "next/link";
import { ArrowRight, Inbox, Sparkles } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { StatusPill } from "@/components/kit/status-pill";
import { EmptyState } from "@/components/kit/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/role-context";
import { useRoleQueue } from "@/lib/queries";
import { relativeTime } from "@/lib/utils";

export function RoleQueueCard() {
  const { role } = useAuth();
  const { data, isLoading } = useRoleQueue(role);

  return (
    <SectionCard
      className="xl:col-span-3"
      icon={<Inbox className="h-4 w-4" />}
      title={data?.headline ?? "Your queue"}
      description={data?.description ?? "Items needing your attention based on your role."}
      actions={
        data && (
          <Badge tone={data.items.length > 0 ? "accent" : "muted"}>
            {data.items.length} {data.items.length === 1 ? "item" : "items"}
          </Badge>
        )
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px]" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-4 w-4" />}
          title="You're all caught up"
          description="Nothing in your queue right now. Check back as new lots move through the workflow."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
          {data.items.map((item) => (
            <Link
              key={item.lotNumber}
              href={`/inspection/${item.lotNumber}`}
              className="group rounded-lg border border-line bg-surface hover:border-accent/40 hover:shadow-card transition-all p-3 flex flex-col gap-2 min-w-0"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-mono text-xs font-semibold truncate">{item.lotNumber}</div>
                <StatusPill status={item.status} />
              </div>
              <div className="text-[11px] text-ink-muted truncate">
                {item.material} · {item.supplier}
              </div>
              <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] font-medium text-accent inline-flex items-center gap-1">
                  {item.callout}
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
                <span className="text-[10px] text-ink-subtle">{relativeTime(item.receiptDate)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
