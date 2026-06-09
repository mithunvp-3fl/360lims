"use client";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider } from "@/components/role-context";
import { NotificationStream } from "@/components/notification-stream";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 10_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <RoleProvider>
        <TooltipProvider delayDuration={250}>
          <NotificationStream />
          {children}
          <Toaster
            theme="light"
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              classNames: {
                toast: "border border-line bg-surface text-ink shadow-card",
                title: "text-ink font-semibold",
                description: "text-ink-muted text-xs",
              },
            }}
          />
        </TooltipProvider>
      </RoleProvider>
    </QueryClientProvider>
  );
}
