"use client";
import * as React from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useManualEntry } from "@/lib/queries";
import type { Test } from "@/lib/types";

const REASONS = [
  "Instrument Offline",
  "Integration Unavailable",
  "External Lab",
  "Emergency Entry",
  "Other",
];

export function ManualEntryDialog({
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
  const mutate = useManualEntry(lot);
  const [reason, setReason] = React.useState(REASONS[0]);
  const [values, setValues] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open && test) {
      const next: Record<string, string> = {};
      for (const p of test.parameters) next[p] = "";
      setValues(next);
      setReason(REASONS[0]);
    }
  }, [open, test]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!test) return;
    const parsed = Object.entries(values).map(([parameter, raw]) => {
      const n = parseFloat(raw);
      if (Number.isNaN(n)) throw new Error(`Invalid value for ${parameter}`);
      return { parameter, value: n, unit: "%" };
    });
    try {
      const body = { testId: test.id, reason, values: parsed };
      mutate.mutate(body, {
        onSuccess: () => {
          toast.info("Manual entry saved", { description: `${test.name} (${reason})` });
          onOpenChange(false);
        },
        onError: (e: unknown) =>
          toast.error("Could not save", { description: e instanceof Error ? e.message : "" }),
      });
    } catch (err) {
      toast.error("Invalid input", { description: err instanceof Error ? err.message : "" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-accent" />
              Manual result entry
            </DialogTitle>
            <DialogDescription>
              Capture results outside of an instrument. A reason is mandatory and will be audited.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Reason *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="surface-inset p-3 space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Parameters · {test?.name}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {test?.parameters.map((p) => (
                  <div key={p} className="space-y-1">
                    <Label>{p}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={values[p] ?? ""}
                      onChange={(e) => setValues({ ...values, [p]: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={mutate.isPending}>
              {mutate.isPending ? "Saving…" : "Save entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
