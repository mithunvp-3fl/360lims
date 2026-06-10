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
import { useCreateProductBatch, useMetalBatches } from "@/lib/queries";
import { useRole } from "@/components/role-context";
import { RoleGate } from "@/components/kit/role-gate";
import type { ProductType } from "@/lib/types";

const PRODUCT_TYPES: ProductType[] = [
  "Primary Aluminum Ingot",
  "Primary Aluminum Billet",
];

export function CreateProductBatchDialog({
  trigger,
  onCreated,
}: {
  trigger?: React.ReactNode;
  onCreated?: (productBatchNumber: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { can } = useRole();
  const create = useCreateProductBatch();
  const { data: metalBatches } = useMetalBatches({ status: "Released" });

  const approvedMetalBatches = (metalBatches ?? []).filter(
    (m) => m.status === "Released",
  );

  const [form, setForm] = React.useState({
    productType: "Primary Aluminum Ingot" as ProductType,
    sourceMetalBatchNumber: "",
    weight: "25.0",
    customer: "",
    operator: "",
    notes: "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.weight) {
      toast.error("Weight is required.");
      return;
    }
    create.mutate(
      {
        productType: form.productType,
        weight: parseFloat(form.weight),
        sourceMetalBatchNumber: form.sourceMetalBatchNumber || undefined,
        customer: form.customer || undefined,
        operator: form.operator || undefined,
        notes: form.notes || undefined,
      },
      {
        onSuccess: (b) => {
          toast.success("Product batch created successfully", {
            description: `${b.productBatchNumber} — ${b.productType}`,
          });
          setOpen(false);
          onCreated?.(b.productBatchNumber);
          router.push(`/product-quality/${b.productBatchNumber}`);
        },
        onError: (err: unknown) =>
          toast.error("Could not create product batch", {
            description: err instanceof Error ? err.message : "",
          }),
      },
    );
  }

  const defaultTrigger = (
    <Button onClick={() => setOpen(true)}>
      <Plus className="h-4 w-4" />
      New Product Batch
    </Button>
  );

  return (
    <>
      {trigger ?? (
        <RoleGate permission="product-batch:create" needs={["stores-executive", "qa-manager"]}>
          {defaultTrigger}
        </RoleGate>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Create a product batch</DialogTitle>
              <DialogDescription>
                Register a finished product batch from the casthouse. A workflow opens and the
                batch is queued for sampling and product testing.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Product type *</Label>
                <Select
                  value={form.productType}
                  onValueChange={(v) => setForm({ ...form, productType: v as ProductType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Source metal batch</Label>
                <Select
                  value={form.sourceMetalBatchNumber}
                  onValueChange={(v) =>
                    setForm({ ...form, sourceMetalBatchNumber: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select released metal batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedMetalBatches.map((m) => (
                      <SelectItem key={m.id} value={m.metalBatchNumber}>
                        {m.metalBatchNumber} · {m.productGrade}
                      </SelectItem>
                    ))}
                    {approvedMetalBatches.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-ink-muted">
                        No released metal batches available
                      </div>
                    )}
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
                <Label>Customer</Label>
                <Input
                  value={form.customer}
                  onChange={(e) => setForm({ ...form, customer: e.target.value })}
                  placeholder="Customer name (optional)"
                />
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label>Operator</Label>
                <Input
                  value={form.operator}
                  onChange={(e) => setForm({ ...form, operator: e.target.value })}
                  placeholder="Production operator name"
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
                disabled={create.isPending || !can("product-batch:create")}
              >
                {create.isPending ? "Creating…" : "Create product batch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
