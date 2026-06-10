"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileSignature, Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateCertificate, useProductBatches } from "@/lib/queries";
import { useRole } from "@/components/role-context";
import { RoleGate } from "@/components/kit/role-gate";

export function GenerateCertificateDialog({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { can } = useRole();
  const create = useCreateCertificate();
  const { data: productBatches } = useProductBatches({ status: "Approved" });

  const approvedBatches = (productBatches ?? []).filter(
    (b) => b.status === "Approved",
  );

  const [form, setForm] = React.useState({
    productBatchNumber: "",
    customer: "",
  });

  React.useEffect(() => {
    if (open && approvedBatches.length && !form.productBatchNumber) {
      const first = approvedBatches[0];
      setForm({
        productBatchNumber: first.productBatchNumber,
        customer: first.customer ?? "",
      });
    }
  }, [open, approvedBatches, form.productBatchNumber]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.productBatchNumber || !form.customer.trim()) {
      toast.error("Product batch and customer are required.");
      return;
    }
    create.mutate(
      {
        productBatchNumber: form.productBatchNumber,
        customer: form.customer.trim(),
      },
      {
        onSuccess: (c) => {
          toast.success("Certificate generated", {
            description: `${c.certificateNumber} for ${c.customer}`,
          });
          setOpen(false);
          router.push(`/certificates/${c.certificateNumber}`);
        },
        onError: (err: unknown) =>
          toast.error("Could not generate certificate", {
            description: err instanceof Error ? err.message : "",
          }),
      },
    );
  }

  const defaultTrigger = (
    <Button onClick={() => setOpen(true)}>
      <Plus className="h-4 w-4" />
      Generate Certificate
    </Button>
  );

  return (
    <>
      {trigger ?? (
        <RoleGate
          permission="certificate:create"
          needs={["qa-engineer", "qa-manager"]}
        >
          {defaultTrigger}
        </RoleGate>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSignature className="h-4 w-4 text-accent" />
                Generate a certificate
              </DialogTitle>
              <DialogDescription>
                Compose a Certificate of Analysis (COA) for an approved product batch.
                Customer specifications are referenced for compliance.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Product batch *</Label>
                <Select
                  value={form.productBatchNumber}
                  onValueChange={(v) => {
                    const match = approvedBatches.find(
                      (b) => b.productBatchNumber === v,
                    );
                    setForm({
                      productBatchNumber: v,
                      customer: match?.customer ?? form.customer,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select approved product batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedBatches.map((b) => (
                      <SelectItem key={b.id} value={b.productBatchNumber}>
                        {b.productBatchNumber} · {b.productType}
                      </SelectItem>
                    ))}
                    {approvedBatches.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-ink-muted">
                        No approved product batches available
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Customer *</Label>
                <Input
                  value={form.customer}
                  onChange={(e) => setForm({ ...form, customer: e.target.value })}
                  placeholder="Customer name"
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
                disabled={create.isPending || !can("certificate:create")}
              >
                {create.isPending ? "Generating…" : "Generate certificate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
