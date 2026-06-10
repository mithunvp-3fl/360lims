"use client";
import * as React from "react";
import Link from "next/link";
import {
  Check,
  CircleDashed,
  Clock,
  Hourglass,
  Octagon,
  Route,
} from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useJourneyTimeline } from "@/lib/queries";
import type { GenealogyNodeType, JourneyStep } from "@/lib/types";

export interface QualityJourneyPanelProps {
  nodeType: GenealogyNodeType;
  nodeKey: string;
  className?: string;
}

export function QualityJourneyPanel({
  nodeType,
  nodeKey,
  className,
}: QualityJourneyPanelProps) {
  const { data, isLoading } = useJourneyTimeline(nodeType, nodeKey);

  return (
    <SectionCard
      title="Quality Journey"
      description="5-step progress · supplier → certificate"
      icon={<Route className="h-4 w-4" />}
      className={className}
    >
      {isLoading || !data ? (
        <div className="text-xs text-ink-muted">Loading…</div>
      ) : (
        <ol className="space-y-2.5">
          {data.steps.map((step, idx) => (
            <StepRow key={step.key} step={step} isLast={idx === data.steps.length - 1} />
          ))}
        </ol>
      )}
    </SectionCard>
  );
}

function StepRow({ step, isLast }: { step: JourneyStep; isLast: boolean }) {
  const { icon, tone, badgeTone, label } = stepVisual(step);
  const content = (
    <div className="flex items-start gap-2.5">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "h-7 w-7 rounded-full border grid place-items-center text-[11px] font-semibold",
            tone,
          )}
        >
          {icon}
        </div>
        {!isLast && <div className="h-5 w-px bg-line mt-0.5" />}
      </div>
      <div className="flex-1 -mt-0.5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[13px] font-semibold leading-tight">
            Step {step.order} · {step.label}
          </div>
          <Badge tone={badgeTone} className="text-[9px]">
            {label}
          </Badge>
        </div>
        {step.nodeKey ? (
          <div className="text-[11px] text-ink-muted truncate">{step.nodeKey}</div>
        ) : (
          <div className="text-[11px] text-ink-subtle italic">Awaiting upstream stage</div>
        )}
      </div>
    </div>
  );

  if (step.href && step.nodeKey) {
    return (
      <li>
        <Link href={step.href} className="block hover:bg-inset rounded-md px-1.5 -mx-1.5 py-0.5">
          {content}
        </Link>
      </li>
    );
  }
  return <li>{content}</li>;
}

function stepVisual(step: JourneyStep) {
  switch (step.status) {
    case "Complete":
      return {
        icon: <Check className="h-3.5 w-3.5" />,
        tone: "border-success bg-success-soft text-success",
        badgeTone: "success" as const,
        label: "Complete",
      };
    case "In Progress":
      return {
        icon: <Hourglass className="h-3.5 w-3.5" />,
        tone: "border-info bg-info-soft text-info",
        badgeTone: "info" as const,
        label: "In Progress",
      };
    case "Blocked":
      return {
        icon: <Octagon className="h-3.5 w-3.5" />,
        tone: "border-warning bg-warning-soft text-warning",
        badgeTone: "warning" as const,
        label: "Blocked",
      };
    case "Skipped":
      return {
        icon: <CircleDashed className="h-3.5 w-3.5" />,
        tone: "border-line bg-inset text-ink-muted",
        badgeTone: "muted" as const,
        label: "Skipped",
      };
    case "Pending":
    default:
      return {
        icon: <Clock className="h-3.5 w-3.5" />,
        tone: "border-line bg-inset text-ink-subtle",
        badgeTone: "muted" as const,
        label: "Pending",
      };
  }
}
