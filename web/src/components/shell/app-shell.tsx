"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useAuth } from "@/components/role-context";

interface AppShellProps {
  children: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function AppShell({ children, breadcrumbs }: AppShellProps) {
  const { user, hydrated } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (hydrated && !user) router.replace("/login");
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app text-ink-muted text-sm">
        Loading workspace…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-app">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar breadcrumbs={breadcrumbs} />
        <main className="flex-1 px-4 lg:px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
