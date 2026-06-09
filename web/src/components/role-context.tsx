"use client";
import * as React from "react";
import { ROLES, type Permission, can as canCheck } from "@/lib/roles";
import type { AuthUser, RoleKey } from "@/lib/types";

interface Ctx {
  user: AuthUser | null;
  role: RoleKey;
  setUser: (user: AuthUser) => void;
  setRole: (role: RoleKey) => void;
  signOut: () => void;
  can: (permission: Permission) => boolean;
  hydrated: boolean;
}

const RoleCtx = React.createContext<Ctx | null>(null);
const USER_KEY = "q360.user";
const LEGACY_ROLE_KEY = "q360.role";

const FALLBACK_NAMES: Record<RoleKey, string> = {
  "qa-manager": "Priya Menon",
  "qa-engineer": "Ravi Iyer",
  "lab-analyst": "Arjun Patel",
  sampler: "Sneha Iyer",
  "stores-executive": "Meera Shah",
  viewer: "Demo Viewer",
};

const FALLBACK_TITLES: Record<RoleKey, string> = {
  "qa-manager": "Head of Quality Assurance",
  "qa-engineer": "Quality Engineer",
  "lab-analyst": "Senior Lab Analyst",
  sampler: "Sampling Supervisor",
  "stores-executive": "Stores Executive",
  viewer: "Read-only access",
};

function makeUser(role: RoleKey): AuthUser {
  return {
    name: FALLBACK_NAMES[role],
    email: `${role}@q360.demo`,
    role,
    title: FALLBACK_TITLES[role],
  };
}

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = React.useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(USER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AuthUser;
        if (parsed && ROLES.some((r) => r.key === parsed.role)) {
          setUserState(parsed);
        }
      } else {
        // migrate legacy q360.role → fabricate a user
        const legacy = window.localStorage.getItem(LEGACY_ROLE_KEY) as RoleKey | null;
        if (legacy && ROLES.some((r) => r.key === legacy)) {
          const migrated = makeUser(legacy);
          window.localStorage.setItem(USER_KEY, JSON.stringify(migrated));
          setUserState(migrated);
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const setUser = React.useCallback((next: AuthUser) => {
    setUserState(next);
    try {
      window.localStorage.setItem(USER_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const setRole = React.useCallback((next: RoleKey) => {
    setUserState((prev) => {
      const updated = prev
        ? { ...prev, role: next }
        : makeUser(next);
      try {
        window.localStorage.setItem(USER_KEY, JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      return updated;
    });
  }, []);

  const signOut = React.useCallback(() => {
    setUserState(null);
    try {
      window.localStorage.removeItem(USER_KEY);
      window.localStorage.removeItem(LEGACY_ROLE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const role: RoleKey = user?.role ?? "viewer";
  const can = React.useCallback(
    (permission: Permission) => canCheck(role, permission),
    [role],
  );

  return (
    <RoleCtx.Provider value={{ user, role, setUser, setRole, signOut, can, hydrated }}>
      {children}
    </RoleCtx.Provider>
  );
}

export function useRole() {
  const ctx = React.useContext(RoleCtx);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}

export const useAuth = useRole;
