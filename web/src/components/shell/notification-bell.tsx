"use client";
import * as React from "react";
import { Bell, CheckCheck, Info, AlertTriangle, CircleCheck, OctagonAlert } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMarkAllRead, useNotifications } from "@/lib/queries";
import { relativeTime } from "@/lib/utils";
import type { NotificationSeverity } from "@/lib/types";

const iconFor: Record<NotificationSeverity, React.ReactNode> = {
  info: <Info className="h-4 w-4 text-info" />,
  success: <CircleCheck className="h-4 w-4 text-success" />,
  warning: <AlertTriangle className="h-4 w-4 text-warning" />,
  danger: <OctagonAlert className="h-4 w-4 text-danger" />,
};

export function NotificationBell() {
  const { data } = useNotifications();
  const markAll = useMarkAllRead();
  const items = data ?? [];
  const unread = items.filter((n) => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-surface hover:bg-inset transition-colors">
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-semibold grid place-items-center">
            {unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-line">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          <Button variant="ghost" size="sm" onClick={() => markAll.mutate()} disabled={unread === 0}>
            <CheckCheck className="h-3.5 w-3.5 mr-1" />
            Mark all read
          </Button>
        </div>
        <ScrollArea className="h-[360px]">
          <div className="p-1">
            {items.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink-muted">No notifications yet.</div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-2.5 rounded-sm px-2.5 py-2 hover:bg-inset cursor-default"
                >
                  <div className="mt-0.5">{iconFor[n.severity]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium truncate">{n.title}</div>
                      {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                    </div>
                    <div className="text-xs text-ink-muted truncate">{n.message}</div>
                    <div className="text-[10px] text-ink-subtle mt-0.5">{relativeTime(n.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
