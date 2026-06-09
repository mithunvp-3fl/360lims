"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle",
        "focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors",
        "min-h-[80px]",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
