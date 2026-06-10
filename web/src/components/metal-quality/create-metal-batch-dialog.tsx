"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateMetalBatch } from "@/lib/queries";
import { useRole } from "@/components/role-context";
import { RoleGate } from "@/components/kit/role-gate";
import type { ProductGrade } from "@/lib/types";

const GRADES: ProductGrade[] = ["P1020", "P0610", "Primary Aluminum"];
const POTLINES = ["PL-01", "PL-02", "PL-03", "PL-04"];
const SHIFTS = ["A", "B", "C"];

export function CreateMetalBatchDialog({
  trigger,
  onCreated,
}: {
  trigger?: React.ReactNode;
  onCreated?: (metalBatchNumber: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { can } = useRole();
  const create = useCreateMetalBatch();

  const [form, setForm] = React.useState({
    productGrade: "P1020" as ProductGrade,
    potline: "PL-03",
    weight: "32.0",
    shift: "A",
    operator: "",
    notes: "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.potline || !form.weight) {
      toast.error("Potline and weight are required.");
      return;
    }
    create.mutate(
      {
        productGrade: form.productGrade,
        potline: form.potline,
        weight: parseFloat(form.weight),
        shift: form.shift || undefined,
        operator: form.operator || undefined,
        notes: form.notes || undefined,
      },
      {
        onSuccess: (b) => {
          toast.success("Metal batch created successfully", {
            description: `${b.metalBatchNumber} — ${b.productGrade} on ${b.potline}`,
          });
          setOpen(false);
          onCreated?.(b.metalBatchNumber);
          router.push(`/metal-quality/${b.metalBatchNumber}`);
        },
        onError: (err: unknown) =>
          toast.error("Could not create metal batch", {
            description: err instanceof Error ? err.message : "",
          }),
      },
    );
  }

  const defaultTrigger = (
    <Button onClick={() => setOpen(true)}>
      <Plus className="h-4 w-4" />
      New Metal Batch
    </Button>
  );

  return (
    <>
      {trigger ?? (
        <RoleGate permission="metal-batch:create" needs={["stores-executive", "qa-manager"]}>
          {defaultTrigger}
        </RoleGate>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Create a metal batch</DialogTitle>
              <DialogDescription>
                Register a molten aluminum batch from the potline. A workflow opens and the
                batch is queued for chemistry sampling and casting release decision.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Product grade *</Label>
                <Select
                  value={form.productGrade}
                  onValueChange={(v) => setForm({ ...form, productGrade: v as ProductGrade })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Potline *</Label>
                <Select
                  value={form.potline}
                  onValueChange={(v) => setForm({ ...form, potline: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POTLINES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Weight (MT) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Shift</Label>
                <Select
                  value={form.shift}
                  onValueChange={(v) => setForm({ ...form, shift: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIFTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        Shift {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label>Operator</Label>
                <Input
                  value={form.operator}
                  onChange={(e) => setForm({ ...form, operator: e.target.value })}
                  placeholder="Casthouse operator name"
                />
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional context (production notes, special handling, etc.)"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={create.isPending || !can("metal-batch:create")}
              >
                {create.isPending ? "Creating…" : "Create metal batch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
