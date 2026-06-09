"use client";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
  {
    variants: {
      tone: {
        muted: "bg-inset border-line text-ink-muted",
        info: "bg-info-soft border-info/30 text-info",
        success: "bg-success-soft border-success/30 text-success",
        warning: "bg-warning-soft border-warning/30 text-warning",
        danger: "bg-danger-soft border-danger/30 text-danger",
        accent: "bg-accent-soft border-accent/30 text-accent",
        outline: "bg-surface border-line text-ink",
      },
    },
    defaultVariants: { tone: "muted" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
