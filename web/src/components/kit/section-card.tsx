import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SectionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  bodyClassName?: string;
  glass?: boolean;
}

export function SectionCard({
  title,
  description,
  actions,
  icon,
  children,
  className,
  bodyClassName,
  glass,
  ...rest
}: SectionCardProps) {
  return (
    <Card glass={glass} className={cn("relative", className)} {...rest}>
      {(title || actions) && (
        <div className="relative z-10 flex items-start justify-between gap-3 p-5 pb-3">
          <div className="flex items-start gap-3">
            {icon && (
              <div className="h-8 w-8 rounded-md bg-inset border border-line grid place-items-center text-ink-muted">
                {icon}
              </div>
            )}
            <div className="space-y-0.5">
              {title && <div className="text-[15px] font-semibold leading-tight">{title}</div>}
              {description && <div className="text-xs text-ink-muted">{description}</div>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <CardContent className={cn("pt-0", bodyClassName)}>{children}</CardContent>
    </Card>
  );
}
