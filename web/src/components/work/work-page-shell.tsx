"use client";
import * as React from "react";
import { AppShell } from "@/components/shell/app-shell";
import { SectionCard } from "@/components/kit/section-card";
import { EmptyState } from "@/components/kit/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface WorkPageShellProps {
  title: string;
  description?: string;
  icon: React.ReactNode;
  count?: number;
  loading: boolean;
  empty: { title: string; description?: string; icon?: React.ReactNode };
  isEmpty: boolean;
  children: React.ReactNode;
  breadcrumbs: Array<{ label: string; href?: string }>;
  headerSlot?: React.ReactNode;
}

export function WorkPageShell({
  title,
  description,
  icon,
  count,
  loading,
  empty,
  isEmpty,
  children,
  breadcrumbs,
  headerSlot,
}: WorkPageShellProps) {
  return (
    <AppShell breadcrumbs={breadcrumbs}>
      <div className="space-y-5">
        <SectionCard
          title={
            <span className="inline-flex items-center gap-2">
              {title}
              {count != null && (
                <Badge tone="muted" className="text-[10px]">
                  {count}
                </Badge>
              )}
            </span>
          }
          description={description}
          icon={icon}
          actions={headerSlot}
        >
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : isEmpty ? (
            <EmptyState
              icon={empty.icon}
              title={empty.title}
              description={empty.description}
            />
          ) : (
            <div className="space-y-3">{children}</div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
