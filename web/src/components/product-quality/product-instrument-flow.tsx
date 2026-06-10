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
import {
  useInstruments,
  useProductImportFromInstrument,
  useProductSamples,
} from "@/lib/queries";
import type { ProductTest } from "@/lib/types";
import { cn } from "@/lib/utils";

type StageKey = "connect" | "verify" | "read" | "parse" | "validate" | "done";

interface FlowStage {
  key: StageKey;
  label: (ctx: { sampleId: string; instrumentName: string }) => string;
  icon: React.ReactNode;
  duration: number;
  progress: number;
}

const STAGES: FlowStage[] = [
  {
    key: "connect",
    label: ({ instrumentName }) => `Connecting to ${instrumentName}...`,
    icon: <Plug className="h-4 w-4" />,
    duration: 850,
    progress: 10,
  },
  {
    key: "verify",
    label: () => "Verifying communication...",
    icon: <ShieldCheck className="h-4 w-4" />,
    duration: 800,
    progress: 25,
  },
  {
    key: "read",
    label: ({ sampleId }) => `Reading sample ${sampleId}...`,
    icon: <ScanLine className="h-4 w-4" />,
    duration: 900,
    progress: 45,
  },
  {
    key: "parse",
    label: () => "Parsing results...",
    icon: <CircuitBoard className="h-4 w-4" />,
    duration: 900,
    progress: 65,
  },
  {
    key: "validate",
    label: () => "Validating parameters...",
    icon: <Activity className="h-4 w-4" />,
    duration: 850,
    progress: 85,
  },
  {
    key: "done",
    label: () => "Import successful",
    icon: <Check className="h-4 w-4" />,
    duration: 700,
    progress: 100,
  },
];

type FailureMode = "none" | "instrument-offline" | "communication-timeout" | "invalid-structure";

const FAILURE_PROFILES: Record<
  Exclude<FailureMode, "none">,
  { failAt: StageKey; title: string; detail: string }
> = {
  "instrument-offline": {
    failAt: "connect",
    title: "Instrument offline",
    detail: "Heartbeat to the instrument was lost. Check connection.",
  },
  "communication-timeout": {
    failAt: "verify",
    title: "Communication timeout",
    detail: "Instrument did not respond within the protocol window.",
  },
  "invalid-structure": {
    failAt: "parse",
    title: "Invalid result payload",
    detail: "Parsed payload did not match expected parameter schema.",
  },
};

export function ProductInstrumentFlow({
  productBatchNumber,
  test,
  open,
  onOpenChange,
}: {
  productBatchNumber: string;
  test: ProductTest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: instruments } = useInstruments();
  const { data: samples } = useProductSamples(productBatchNumber);
  const importMut = useProductImportFromInstrument(productBatchNumber);

  const [failureMode, setFailureMode] = React.useState<FailureMode>("none");
  const [stageIdx, setStageIdx] = React.useState(-1);
  const [running, setRunning] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<{ failAt: StageKey; title: string; detail: string } | null>(null);
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
          toast.success("Results imported", {
            description: `${test.name} captured from ${instrument.name}.`,
          });
          setTimeout(() => onOpenChange(false), 800);
        },
        onError: (e: unknown) => {
          setRunning(false);
          setError({
            failAt: "validate",
            title: "Import failed",
            detail: e instanceof Error ? e.message : "Server rejected the payload.",
          });
        },
      },
    );
  }

  const sampleDisplayId = sample?.sampleId ?? "PQS-…";
  const instrumentName = instrument?.name ?? "Instrument";
  const currentProgress = error
    ? 0
    : stageIdx === -1
      ? 0
      : importMut.isPending
        ? STAGES[Math.min(stageIdx, STAGES.length - 1)].progress
        : done
          ? 100
          : STAGES[Math.min(stageIdx, STAGES.length - 1)].progress;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-accent" />
            Import Results
          </DialogTitle>
          <DialogDescription>
            {test ? (
              <>
                Triggering result transfer for <span className="font-medium text-ink">{test.name}</span>{" "}
                from <span className="font-medium text-ink">{instrumentName}</span> on sample{" "}
                <span className="font-mono text-ink">{sampleDisplayId}</span>.
              </>
            ) : (
              "Select a test row to begin."
            )}
          </DialogDescription>
        </DialogHeader>

        {stageIdx === -1 && !error && (
          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-1.5">
              <Label>Simulate failure (demo)</Label>
              <Select value={failureMode} onValueChange={(v) => setFailureMode(v as FailureMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None — happy path</SelectItem>
                  <SelectItem value="instrument-offline">Instrument offline</SelectItem>
                  <SelectItem value="communication-timeout">Communication timeout</SelectItem>
                  <SelectItem value="invalid-structure">Invalid payload</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-[11px] text-ink-muted leading-relaxed">
              Total instrument read runs ~5 seconds with explicit progress per stage.
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>Import progress</span>
            <span className="font-semibold text-ink tabular-nums">{currentProgress}%</span>
          </div>
          <Progress value={currentProgress} tone={error ? "danger" : done ? "success" : "accent"} />
        </div>

        <div className="surface-inset p-4 space-y-2.5">
          {STAGES.map((s, i) => {
            const failIdx = error ? STAGES.findIndex((st) => st.key === error.failAt) : -1;
            const status: "pending" | "running" | "done" | "failed" =
              error && i >= failIdx
                ? i === failIdx
                  ? "failed"
                  : "pending"
                : stageIdx === -1
                  ? "pending"
                  : i < stageIdx
                    ? "done"
                    : i === stageIdx
                      ? i === STAGES.length - 1 && done
                        ? "done"
                        : "running"
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
                  {status === "done" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : status === "running" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : status === "failed" ? (
                    <AlertOctagon className="h-3.5 w-3.5" />
                  ) : (
                    s.icon
                  )}
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
                        status === "done"
                          ? "text-success"
                          : status === "running"
                            ? "text-accent"
                            : status === "failed"
                              ? "text-danger"
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

        {error && (
          <div className="rounded-lg border border-danger/40 bg-danger-soft/60 p-3 text-sm space-y-1">
            <div className="flex items-center gap-2 font-semibold text-danger">
              <WifiOff className="h-4 w-4" />
              {error.title}
            </div>
            <div className="text-ink-muted text-xs leading-relaxed">{error.detail}</div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-ink-muted">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                instrument?.status === "Online"
                  ? "bg-success"
                  : instrument?.status === "Degraded"
                    ? "bg-warning"
                    : "bg-danger",
              )}
            />
            {instrument
              ? `${instrument.vendor} · ${instrument.model} · ${instrument.serialNumber}`
              : "—"}
          </div>
          {instrument?.lastImportAt && (
            <div>Last import {new Date(instrument.lastImportAt).toLocaleString()}</div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5">
            {done && <Badge tone="success">Results captured</Badge>}
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
