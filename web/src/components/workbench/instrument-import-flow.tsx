"use client";
import * as React from "react";
import { toast } from "sonner";
import {
  Activity,
  AlertOctagon,
  Check,
  CircuitBoard,
  Loader2,
  Plug,
  ScanLine,
  ShieldCheck,
  Wand2,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useImportFromInstrument, useInstruments, useSamples } from "@/lib/queries";
import type { Test } from "@/lib/types";
import { cn } from "@/lib/utils";

type StageKey =
  | "connect"
  | "verify"
  | "read"
  | "parse"
  | "validate"
  | "done";

interface FlowStage {
  key: StageKey;
  label: (ctx: { sampleId: string; instrumentName: string }) => string;
  icon: React.ReactNode;
  duration: number; // ms
  progress: number; // % at completion
}

const STAGES: FlowStage[] = [
  {
    key: "connect",
    label: ({ instrumentName }) => `Connecting to ${instrumentName}...`,
    icon: <Plug className="h-4 w-4" />,
    duration: 1000,
    progress: 10,
  },
  {
    key: "verify",
    label: () => "Verifying communication...",
    icon: <ShieldCheck className="h-4 w-4" />,
    duration: 1000,
    progress: 25,
  },
  {
    key: "read",
    label: ({ sampleId }) => `Reading sample ${sampleId}...`,
    icon: <ScanLine className="h-4 w-4" />,
    duration: 1000,
    progress: 45,
  },
  {
    key: "parse",
    label: () => "Parsing instrument output...",
    icon: <CircuitBoard className="h-4 w-4" />,
    duration: 1000,
    progress: 65,
  },
  {
    key: "validate",
    label: () => "Validating result structure...",
    icon: <Activity className="h-4 w-4" />,
    duration: 1000,
    progress: 85,
  },
  {
    key: "done",
    label: () => "Import successful",
    icon: <Check className="h-4 w-4" />,
    duration: 1000,
    progress: 100,
  },
];

type FailureMode =
  | "none"
  | "instrument-offline"
  | "communication-timeout"
  | "invalid-structure"
  | "sample-not-found";

interface FailureProfile {
  failAt: StageKey;       // stage that throws
  title: string;          // dialog/toast title
  detail: string;         // long-form detail surfaced in red
}

const FAILURE_PROFILES: Record<Exclude<FailureMode, "none">, FailureProfile> = {
  "instrument-offline": {
    failAt: "connect",
    title: "Instrument offline",
    detail:
      "Heartbeat to the instrument was lost. Check power, network, and that the driver service is running.",
  },
  "communication-timeout": {
    failAt: "verify",
    title: "Communication timeout",
    detail:
      "The instrument did not respond within the protocol window. The integration retried twice before failing.",
  },
  "sample-not-found": {
    failAt: "read",
    title: "Sample not found on instrument tray",
    detail:
      "The sample ID was not recognised by the instrument. Re-load the sample or verify the carousel position.",
  },
  "invalid-structure": {
    failAt: "parse",
    title: "Invalid result structure",
    detail:
      "Parsed payload did not match the expected schema for this test code. The instrument may need a firmware update.",
  },
};

export function InstrumentImportFlow({
  lot,
  test,
  open,
  onOpenChange,
}: {
  lot: string;
  test: Test | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: instruments } = useInstruments();
  const { data: samples } = useSamples(lot);
  const importMut = useImportFromInstrument(lot);

  const [failureMode, setFailureMode] = React.useState<FailureMode>("none");
  const [stageIdx, setStageIdx] = React.useState(-1);
  const [running, setRunning] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<FailureProfile | null>(null);
  const cancelled = React.useRef(false);

  const instrument = React.useMemo(() => {
    if (!test?.instrumentCode) return instruments?.[0];
    return (instruments ?? []).find((i) => i.code === test.instrumentCode) ?? instruments?.[0];
  }, [instruments, test]);

  const sample = React.useMemo(() => {
    if (!test) return null;
    return (samples ?? []).find((s) => s.id === test.sampleId) ?? null;
  }, [samples, test]);

  React.useEffect(() => {
    if (!open) {
      cancelled.current = true;
      setStageIdx(-1);
      setRunning(false);
      setDone(false);
      setError(null);
      setFailureMode("none");
    } else {
      cancelled.current = false;
    }
  }, [open]);

  async function run() {
    if (!test || !instrument || !sample) return;
    setRunning(true);
    setDone(false);
    setError(null);

    const profile = failureMode !== "none" ? FAILURE_PROFILES[failureMode] : null;

    for (let i = 0; i < STAGES.length; i++) {
      if (cancelled.current) return;
      setStageIdx(i);
      await new Promise((r) => setTimeout(r, STAGES[i].duration));

      if (profile && STAGES[i].key === profile.failAt) {
        setError(profile);
        setRunning(false);
        toast.error(profile.title, { description: profile.detail });
        return;
      }
    }

    importMut.mutate(
      { testId: test.id, instrumentCode: instrument.code },
      {
        onSuccess: () => {
          setDone(true);
          setRunning(false);
          toast.success("Results imported successfully", {
            description: `${test.name} captured from ${instrument.name}.`,
          });
          setTimeout(() => onOpenChange(false), 900);
        },
        onError: (e: unknown) => {
          setRunning(false);
          setError({
            failAt: "validate",
            title: "Import failed",
            detail: e instanceof Error ? e.message : "Server rejected the result payload.",
          });
        },
      },
    );
  }

  const sampleDisplayId = sample?.sampleId ?? "SMP-…";
  const instrumentName = instrument?.name ?? "instrument";
  const currentProgress =
    error ? 0
    : stageIdx === -1 ? 0
    : importMut.isPending ? STAGES[Math.min(stageIdx, STAGES.length - 1)].progress
    : done ? 100
    : STAGES[Math.min(stageIdx, STAGES.length - 1)].progress;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-accent" />
            Import results from instrument
          </DialogTitle>
          <DialogDescription>
            {test ? (
              <>Triggering result transfer for <span className="font-medium text-ink">{test.name}</span> from{" "}
              <span className="font-medium text-ink">{instrumentName}</span> on sample{" "}
              <span className="font-mono text-ink">{sampleDisplayId}</span>.</>
            ) : (
              "Select a test row to begin."
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Pre-run controls */}
        {stageIdx === -1 && !error && (
          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-1.5">
              <Label>Simulate failure (demo)</Label>
              <Select value={failureMode} onValueChange={(v) => setFailureMode(v as FailureMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None — happy path</SelectItem>
                  <SelectItem value="instrument-offline">Instrument offline</SelectItem>
                  <SelectItem value="communication-timeout">Communication timeout</SelectItem>
                  <SelectItem value="sample-not-found">Sample not found</SelectItem>
                  <SelectItem value="invalid-structure">Invalid result structure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-[11px] text-ink-muted leading-relaxed">
              Total simulation runs ~6 seconds with explicit progress per stage. Failure modes stop the sequence at a realistic point.
            </div>
          </div>
        )}

        {/* Overall progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>Import progress</span>
            <span className="font-semibold text-ink tabular-nums">{currentProgress}%</span>
          </div>
          <Progress
            value={currentProgress}
            tone={error ? "danger" : done ? "success" : "accent"}
          />
        </div>

        {/* Stage list */}
        <div className="surface-inset p-4 space-y-2.5">
          {STAGES.map((s, i) => {
            const status: "pending" | "running" | "done" | "failed" =
              error && i >= STAGES.findIndex((st) => st.key === error.failAt) ? (i === STAGES.findIndex((st) => st.key === error.failAt) ? "failed" : "pending")
              : stageIdx === -1 ? "pending"
              : i < stageIdx ? "done"
              : i === stageIdx ? (i === STAGES.length - 1 && done ? "done" : "running")
              : "pending";

            const ctx = { sampleId: sampleDisplayId, instrumentName };
            return (
              <div key={s.key} className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-7 w-7 rounded-md grid place-items-center border shrink-0",
                    status === "done" && "bg-success-soft text-success border-success/40",
                    status === "running" && "bg-accent-soft text-accent border-accent/40",
                    status === "failed" && "bg-danger-soft text-danger border-danger/40",
                    status === "pending" && "bg-surface text-ink-subtle border-line",
                  )}
                >
                  {status === "done" ? <Check className="h-3.5 w-3.5" />
                    : status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : status === "failed" ? <AlertOctagon className="h-3.5 w-3.5" />
                    : s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm truncate",
                        status === "done" && "text-ink",
                        status === "running" && "text-ink font-medium",
                        status === "failed" && "text-danger font-medium",
                        status === "pending" && "text-ink-muted",
                      )}
                    >
                      {s.label(ctx)}
                    </span>
                    <span
                      className={cn(
                        "ml-auto text-[10px] tabular-nums shrink-0",
                        status === "done" ? "text-success"
                        : status === "running" ? "text-accent"
                        : status === "failed" ? "text-danger"
                        : "text-ink-subtle",
                      )}
                    >
                      {s.progress}%
                    </span>
                  </div>
                  {status === "running" && (
                    <div className="mt-1 h-1 rounded-full bg-inset overflow-hidden">
                      <div className="h-full w-1/2 bg-accent animate-shimmer" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Failure callout */}
        {error && (
          <div className="rounded-lg border border-danger/40 bg-danger-soft/60 p-3 text-sm space-y-1">
            <div className="flex items-center gap-2 font-semibold text-danger">
              <WifiOff className="h-4 w-4" />
              {error.title}
            </div>
            <div className="text-ink-muted text-xs leading-relaxed">{error.detail}</div>
          </div>
        )}

        {/* Footer meta */}
        <div className="flex items-center justify-between text-xs text-ink-muted">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                instrument?.status === "Online" ? "bg-success" :
                instrument?.status === "Degraded" ? "bg-warning" : "bg-danger",
              )}
            />
            {instrument ? `${instrument.vendor} · ${instrument.model} · ${instrument.serialNumber}` : "—"}
          </div>
          {instrument?.lastImportAt && (
            <div>Last import {new Date(instrument.lastImportAt).toLocaleString()}</div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5">
            {done && <Badge tone="success">Result captured</Badge>}
            {error && <Badge tone="danger">Run aborted</Badge>}
            {failureMode !== "none" && stageIdx === -1 && !error && (
              <Badge tone="warning">Failure scenario armed</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={running}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={run}
              disabled={!test || !instrument || !sample || running}
            >
              {running ? "Importing…" : done ? "Done" : error ? "Retry import" : "Start import"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
