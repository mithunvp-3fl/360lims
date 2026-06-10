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
import {
  useCreateQualification,
  useMaterials,
  useSuppliers,
} from "@/lib/queries";
import { useRole } from "@/components/role-context";
import { RoleGate } from "@/components/kit/role-gate";
import type { ConsumptionArea } from "@/lib/types";

const AREAS: ConsumptionArea[] = ["Carbon Plant", "Potline", "Casthouse", "R&D"];

// Only materials catalogued for process qualification (see PRD §12).
const QUALIFIABLE_MATERIALS = new Set([
  "MAT-CCOK", "MAT-CTPI", "MAT-CRYO", "MAT-ALF3",
  "MAT-BATH", "MAT-CADD", "MAT-PCOK",
]);

export function CreateQualificationDialog({
  trigger,
  onCreated,
}: {
  trigger?: React.ReactNode;
  onCreated?: (qualificationNumber: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { can } = useRole();
  const { data: suppliers } = useSuppliers();
  const { data: materials } = useMaterials();
  const create = useCreateQualification();

  const eligibleMaterials = React.useMemo(
    () => (materials ?? []).filter((m) => QUALIFIABLE_MATERIALS.has(m.code)),
    [materials],
  );

  const [form, setForm] = React.useState({
    materialId: "",
    batchNumber: "",
    consumptionArea: "Carbon Plant" as ConsumptionArea,
    quantity: "20.0",
    uom: "MT",
    supplierId: "",
    sourceLotNumber: "",
    notes: "",
  });

  React.useEffect(() => {
    if (open && eligibleMaterials.length && !form.materialId) {
      setForm((f) => ({ ...f, materialId: eligibleMaterials[0].id }));
    }
  }, [open, eligibleMaterials, form.materialId]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.materialId || !form.batchNumber) {
      toast.error("Material and batch number are required.");
      return;
    }
    create.mutate(
      {
        materialId: form.materialId,
        batchNumber: form.batchNumber,
        consumptionArea: form.consumptionArea,
        quantity: parseFloat(form.quantity),
        uom: form.uom,
        supplierId: form.supplierId || undefined,
        sourceLotNumber: form.sourceLotNumber || undefined,
        notes: form.notes || undefined,
      },
      {
        onSuccess: (q) => {
          toast.success("Qualification created successfully", {
            description: `${q.qualificationNumber} for ${q.batchNumber}`,
          });
          setOpen(false);
          onCreated?.(q.qualificationNumber);
          router.push(`/qualification/${q.qualificationNumber}`);
        },
        onError: (e: unknown) =>
          toast.error("Could not create qualification", {
            description: e instanceof Error ? e.message : "",
          }),
      },
    );
  }

  const defaultTrigger = (
    <Button onClick={() => setOpen(true)}>
      <Plus className="h-4 w-4" />
      New Qualification
    </Button>
  );

  return (
    <>
      {trigger ?? (
        <RoleGate permission="qualification:create" needs={["qa-engineer", "qa-manager"]}>
          {defaultTrigger}
        </RoleGate>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Create a process qualification</DialogTitle>
              <DialogDescription>
                Initiate a qualification request for production consumption. A workflow opens and the
                batch is queued for sampling.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label>Material *</Label>
                <Select
                  value={form.materialId}
                  onValueChange={(v) => setForm({ ...form, materialId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleMaterials.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label>Consumption area *</Label>
                <Select
                  value={form.consumptionArea}
                  onValueChange={(v) =>
                    setForm({ ...form, consumptionArea: v as ConsumptionArea })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AREAS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label>Batch number *</Label>
                <Input
                  value={form.batchNumber}
                  onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
                  placeholder="CC-2026-NNN"
                  required
                />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label>Source lot (optional)</Label>
                <Input
                  value={form.sourceLotNumber}
                  onChange={(e) => setForm({ ...form, sourceLotNumber: e.target.value })}
                  placeholder="LOT-2026-NNNN"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>UoM</Label>
                <Select value={form.uom} onValueChange={(v) => setForm({ ...form, uom: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MT">MT</SelectItem>
                    <SelectItem value="KG">KG</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label>Source supplier (optional)</Label>
                <Select
                  value={form.supplierId}
                  onValueChange={(v) => setForm({ ...form, supplierId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {(suppliers ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional context (source receipt, special handling, etc.)"
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
                disabled={create.isPending || !can("qualification:create")}
              >
                {create.isPending ? "Creating…" : "Create qualification"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
