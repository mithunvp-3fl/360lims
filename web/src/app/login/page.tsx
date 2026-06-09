"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  FlaskConical,
  Gauge,
  Loader2,
  Mail,
  Lock,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/role-context";
import { useLogin, usePersonas } from "@/lib/queries";
import { roleLabel } from "@/lib/roles";
import { initials } from "@/lib/utils";
import type { AuthUser } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const { user, setUser, hydrated } = useAuth();
  const { data: personas } = usePersonas();
  const login = useLogin();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  React.useEffect(() => {
    if (hydrated && user) router.replace("/dashboard");
  }, [hydrated, user, router]);

  const signIn = (target: { email: string; password?: string }) => {
    login.mutate(
      { email: target.email, password: target.password ?? "demo" },
      {
        onSuccess: ({ user: signedIn }) => {
          setUser(signedIn);
          toast.success(`Welcome, ${signedIn.name.split(" ")[0]}`, {
            description: `Signed in as ${roleLabel(signedIn.role)}.`,
          });
          router.replace("/dashboard");
        },
        onError: () => {
          toast.error("Could not sign in", {
            description: "The demo backend is unreachable. Try again or pick a persona below.",
          });
        },
      },
    );
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    signIn({ email, password });
  };

  return (
    <div className="min-h-screen flex bg-app">
      {/* Left rail — product story */}
      <aside className="hidden lg:flex lg:w-[42%] xl:w-[44%] relative overflow-hidden flex-col justify-between p-10 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-900" />
        <div className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.18) 0, transparent 40%)",
          }} />
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }} />

        <div className="relative z-10 flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight">Quality360</div>
            <div className="text-[11px] text-white/70">Manufacturing Quality Intelligence</div>
          </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-md">
          <h1 className="text-4xl font-semibold tracking-tight leading-tight">
            From truck to production — one source of truth.
          </h1>
          <p className="text-white/80 leading-relaxed">
            Quality360 turns every incoming lot into a guided workflow: receipt, sample,
            test, validate, review, release. Intelligence lives alongside the work, not in a separate report.
          </p>
          <div className="grid grid-cols-1 gap-3">
            <StoryRow icon={<FlaskConical className="h-4 w-4" />} title="Instrument-grade results"
              body="XRF, OES, Moisture, C/S — imported with provenance, validated against spec." />
            <StoryRow icon={<Gauge className="h-4 w-4" />} title="Supplier intelligence"
              body="Health scores and historical comparisons surface where it matters." />
            <StoryRow icon={<CheckCircle2 className="h-4 w-4" />} title="Auditable decisions"
              body="Every approval, hold and override is captured with rationale." />
          </div>
        </div>

        <div className="relative z-10 text-[11px] text-white/60">
          Quality360 · Phase 1 demo build · Aluminum scrap inspection workflow
        </div>
      </aside>

      {/* Right rail — sign in */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-7">
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              Sign in
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Welcome back to Quality360</h2>
            <p className="text-sm text-ink-muted">
              Use your work email. This is a demo build — any password works.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={!email || login.isPending}
            >
              {login.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-line" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-app px-2 text-ink-subtle">Or jump in as</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {(personas ?? []).map((p) => (
              <PersonaChip
                key={p.email}
                persona={p}
                onClick={() => signIn({ email: p.email })}
                disabled={login.isPending}
              />
            ))}
            {!personas && (
              <div className="text-xs text-ink-muted text-center py-2">
                Loading demo personas…
              </div>
            )}
          </div>

          <p className="text-[11px] text-ink-subtle text-center">
            By signing in you accept this is a non-production demo. No real authentication is performed.
          </p>
        </div>
      </main>
    </div>
  );
}

function StoryRow({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 p-3">
      <div className="h-8 w-8 rounded-md bg-white/15 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="space-y-0.5">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-white/75 leading-relaxed">{body}</div>
      </div>
    </div>
  );
}

function PersonaChip({
  persona,
  onClick,
  disabled,
}: {
  persona: AuthUser;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group w-full text-left rounded-lg border border-line bg-surface hover:border-accent/40 hover:shadow-card transition-all p-3 flex items-center gap-3 disabled:opacity-60"
    >
      <Avatar className="h-9 w-9">
        <AvatarFallback>{initials(persona.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{persona.name}</span>
          <Badge tone="accent" className="text-[10px]">{roleLabel(persona.role)}</Badge>
        </div>
        <div className="text-[11px] text-ink-muted truncate">{persona.title} · {persona.email}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-ink-subtle group-hover:text-accent transition-colors shrink-0" />
    </button>
  );
}
