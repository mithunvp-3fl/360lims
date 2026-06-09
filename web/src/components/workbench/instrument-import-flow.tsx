"use client";
import * as React from "react";
import { toast } from "sonner";
import {
  Activity,
  Check,
  CircuitBoard,
  Loader2,
  Plug,
  ScanLine,
  ShieldCheck,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useImportFromInstrument, useInstruments } from "@/lib/queries";
import type { Test } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FlowStage {
  key: string;
  label: string;
  icon: React.ReactNode;
  duration: number; // ms
}

const STAGES: FlowStage[] = [
  { key: "connect", label: "Connecting to instrument…", icon: <Plug className="h-4 w-4" />, duration: 800 },
  { key: "verify", label: "Verifying communication…", icon: <ShieldCheck className="h-4 w-4" />, duration: 700 },
  { key: "read", label: "Reading sample…", icon: <ScanLine className="h-4 w-4" />, duration: 900 },
  { key: "parse", label: "Parsing result file…", icon: <CircuitBoard className="h-4 w-4" />, duration: 800 },
  { key: "validate", label: "Validating result structure…", icon: <Activity className="h-4 w-4" />, duration: 700 },
  { key: "done", label: "Import successful", icon: <Check className="h-4 w-4" />, duration: 500 },
];

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
  const importMut = useImportFromInstrument(lot);
  const [stageIdx, setStageIdx] = React.useState(-1);
  const [running, setRunning] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const cancelled = React.useRef(false);

  const instrument = React.useMemo(() => {
    if (!test?.instrumentCode) return instruments?.[0];
    return (instruments ?? []).find((i) => i.code === test.instrumentCode) ?? instruments?.[0];
  }, [instruments, test]);

  React.useEffect(() => {
    if (!open) {
      cancelled.current = true;
      setStageIdx(-1);
      setRunning(false);
      setDone(false);
    } else {
      cancelled.current = false;
    }
  }, [open]);

  async function run() {
    if (!test || !instrument) return;
    setRunning(true);
    setDone(false);
    for (let i = 0; i < STAGES.length; i++) {
      if (cancelled.current) return;
      setStageIdx(i);
      await new Promise((r) => setTimeout(r, STAGES[i].duration));
    }
    importMut.mutate(
      { testId: test.id, instrumentCode: instrument.code },
      {
        onSuccess: () => {
          setDone(true);
          setRunning(false);
          toast.success("Results imported", {
            description: `${test.name} parsed from ${instrument.name}.`,
          });
          setTimeout(() => onOpenChange(false), 900);
        },
        onError: (e: unknown) => {
          setRunning(false);
          toast.error("Import failed", {
            description: e instanceof Error ? e.message : "The instrument did not respond.",
          });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-accent" />
            Import results from instrument
          </DialogTitle>
          <DialogDescription>
            {test ? (
              <>Triggering result transfer for <span className="font-medium text-ink">{test.name}</span> from{" "}
              <span className="font-medium text-ink">{instrument?.name}</span>.</>
            ) : (
              "Select a test row to begin."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="surface-inset p-4 space-y-3">
          {STAGES.map((s, i) => {
            const status =
              stageIdx === -1 ? "pending"
              : i < stageIdx ? "done"
              : i === stageIdx ? (importMut.isPending && i === STAGES.length - 1 ? "running" : i === STAGES.length - 1 && done ? "done" : "running")
              : "pending";
            return (
              <div key={s.key} className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-7 w-7 rounded-md grid place-items-center border",
                    status === "done" && "bg-success-soft text-success border-success/40",
                    status === "running" && "bg-accent-soft text-accent border-accent/40",
                    status === "pending" && "bg-surface text-ink-subtle border-line",
                  )}
                >
                  {status === "done" ? <Check className="h-3.5 w-3.5" />
                    : status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : s.icon}
                </div>
                <div className="flex-1">
                  <div
                    className={cn(
                      "text-sm",
                      status === "done" && "text-ink",
                      status === "running" && "text-ink font-medium",
                      status === "pending" && "text-ink-muted",
                    )}
                  >
                    {s.label}
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

        <div className="flex items-center justify-between text-xs text-ink-muted">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {instrument ? `${instrument.vendor} · ${instrument.model} · ${instrument.serialNumber}` : "—"}
          </div>
          {instrument?.lastImportAt && <div>Last import {new Date(instrument.lastImportAt).toLocaleString()}</div>}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={running}>
            Close
          </Button>
          <Button variant="primary" onClick={run} disabled={!test || !instrument || running}>
            {running ? "Importing…" : done ? "Done" : "Start import"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
