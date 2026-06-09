"use client";
import * as React from "react";
import { ROLES, type Permission, can as canCheck } from "@/lib/roles";
import type { RoleKey } from "@/lib/types";

interface Ctx {
  role: RoleKey;
  setRole: (role: RoleKey) => void;
  can: (permission: Permission) => boolean;
}

const RoleCtx = React.createContext<Ctx | null>(null);
const STORAGE_KEY = "q360.role";

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = React.useState<RoleKey>("qa-manager");

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as RoleKey | null;
      if (stored && ROLES.some((r) => r.key === stored)) setRoleState(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const setRole = React.useCallback((next: RoleKey) => {
    setRoleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const can = React.useCallback(
    (permission: Permission) => canCheck(role, permission),
    [role],
  );

  return <RoleCtx.Provider value={{ role, setRole, can }}>{children}</RoleCtx.Provider>;
}

export function useRole() {
  const ctx = React.useContext(RoleCtx);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
