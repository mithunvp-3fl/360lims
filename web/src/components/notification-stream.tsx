"use client";
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { AppNotification } from "@/lib/types";

/**
 * Polls /notifications every 4s. When new entries appear (id-wise),
 * surface them as toasts. The Notification Center reads from the
 * same cached query.
 *
 * In production this would be Server-Sent Events.
 */
export function NotificationStream() {
  const qc = useQueryClient();
  const seen = React.useRef<Set<string>>(new Set());
  const initialised = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const items = await api.get<AppNotification[]>("/notifications?limit=30");
        qc.setQueryData(["notifications"], items);
        if (!initialised.current) {
          items.forEach((n) => seen.current.add(n.id));
          initialised.current = true;
        } else {
          for (const n of items) {
            if (seen.current.has(n.id)) continue;
            seen.current.add(n.id);
            const fn = n.severity === "danger" ? toast.error
              : n.severity === "warning" ? toast.warning
              : n.severity === "success" ? toast.success
              : toast;
            fn(n.title, { description: n.message });
          }
        }
      } catch {
        /* swallow — backend likely not running yet */
      }
      if (!cancelled) setTimeout(tick, 4000);
    }
    tick();
    return () => {
      cancelled = true;
    };
  }, [qc]);

  return null;
}
