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
  DialogTrigger,
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
  useCreateReceipt,
  useMaterials,
  useSuppliers,
} from "@/lib/queries";
import { useRole } from "@/components/role-context";
import { RoleGate } from "@/components/kit/role-gate";

export function CreateReceiptDialog({
  trigger,
  onCreated,
}: {
  trigger?: React.ReactNode;
  onCreated?: (lotNumber: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { can } = useRole();
  const { data: suppliers } = useSuppliers();
  const { data: materials } = useMaterials();
  const create = useCreateReceipt();

  const [form, setForm] = React.useState({
    supplierId: "",
    materialId: "",
    quantity: "24.0",
    uom: "MT",
    vehicleNumber: "",
    poNumber: "",
    notes: "",
  });

  React.useEffect(() => {
    if (open && suppliers?.length && !form.supplierId) {
      setForm((f) => ({ ...f, supplierId: suppliers[0].id }));
    }
    if (open && materials?.length && !form.materialId) {
      setForm((f) => ({ ...f, materialId: materials[0].id }));
    }
  }, [open, suppliers, materials, form.supplierId, form.materialId]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.supplierId || !form.materialId || !form.vehicleNumber || !form.poNumber) {
      toast.error("Please fill all required fields.");
      return;
    }
    create.mutate(
      {
        supplierId: form.supplierId,
        materialId: form.materialId,
        quantity: parseFloat(form.quantity),
        uom: form.uom,
        vehicleNumber: form.vehicleNumber,
        poNumber: form.poNumber,
        notes: form.notes,
      },
      {
        onSuccess: (receipt) => {
          setOpen(false);
          onCreated?.(receipt.lotNumber);
          router.push(`/inspection/${receipt.lotNumber}`);
        },
        onError: (e: unknown) => {
          const msg = e instanceof Error ? e.message : "Unable to create receipt";
          toast.error("Could not create receipt", { description: msg });
        },
      },
    );
  }

  const defaultTrigger = (
    <Button>
      <Plus className="h-4 w-4" />
      New Receipt
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <RoleGate permission="receipt:create" needs={["stores-executive", "qa-manager"]}>
            {defaultTrigger}
          </RoleGate>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Create a new receipt</DialogTitle>
            <DialogDescription>
              Record an incoming raw-material lot. A workflow will be opened and the lot will be queued for sampling.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Supplier *</Label>
              <Select value={form.supplierId} onValueChange={(v) => setForm({ ...form, supplierId: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {(suppliers ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Material *</Label>
              <Select value={form.materialId} onValueChange={(v) => setForm({ ...form, materialId: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {(materials ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MT">MT</SelectItem>
                  <SelectItem value="KG">KG</SelectItem>
                  <SelectItem value="L">L</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>Vehicle Number *</Label>
              <Input value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} placeholder="HR-55-AB-0000" />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>PO Number *</Label>
              <Input value={form.poNumber} onChange={(e) => setForm({ ...form, poNumber: e.target.value })} placeholder="PO-2026-NNN" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional context (weighbridge ticket, seal numbers, etc.)" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={create.isPending || !can("receipt:create")}>
              {create.isPending ? "Creating…" : "Create receipt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
