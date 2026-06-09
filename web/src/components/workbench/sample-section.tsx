"use client";
import { toast } from "sonner";
import { FlaskConical, Loader2, RefreshCcw, TestTube2, UserCircle2 } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { EmptyState } from "@/components/kit/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/kit/role-gate";
import { useCreateSample, useRecollectSample, useSamples } from "@/lib/queries";
import { relativeTime, shortDate } from "@/lib/utils";
import type { Sample } from "@/lib/types";

export function SampleSection({ lot }: { lot: string }) {
  const { data: samples } = useSamples(lot);
  const create = useCreateSample(lot);
  const recollect = useRecollectSample(lot);

  return (
    <SectionCard
      title="Sample management"
      description="Samples drawn for this lot and their disposition."
      icon={<FlaskConical className="h-4 w-4" />}
      actions={
        <div className="flex items-center gap-2">
          <RoleGate permission="sample:recollect" needs={["sampler", "qa-manager"]}>
            <Button
              variant="outline"
              size="sm"
              disabled={!samples?.length || recollect.isPending}
              onClick={() =>
                recollect.mutate(undefined, {
                  onSuccess: (s) =>
                    toast.success("Sample recollected", { description: `New sample ${s.sampleId}` }),
                })
              }
            >
              {recollect.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
              Recollect
            </Button>
          </RoleGate>
          <RoleGate permission="sample:create" needs={["sampler", "qa-manager"]}>
            <Button
              size="sm"
              variant="primary"
              disabled={create.isPending}
              onClick={() =>
                create.mutate(undefined, {
                  onSuccess: (s) =>
                    toast.success("Sample created", { description: `Sample ${s.sampleId} assigned to workflow.` }),
                })
              }
            >
              {create.isPending ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating…
                </span>
              ) : (
                <>
                  <TestTube2 className="h-3.5 w-3.5" />
                  Create Sample
                </>
              )}
            </Button>
          </RoleGate>
        </div>
      }
    >
      {!samples || samples.length === 0 ? (
        <EmptyState
          icon={<FlaskConical className="h-4 w-4" />}
          title="No sample drawn yet"
          description="Click Create Sample to generate a sample ID and auto-assign the required tests for this material."
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {samples.map((s) => (
            <SampleCard key={s.id} sample={s} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function SampleCard({ sample }: { sample: Sample }) {
  const tone =
    sample.status === "Collected"
      ? "success"
      : sample.status === "Recollected"
      ? "warning"
      : "muted";
  return (
    <div className="surface-inset p-3.5 space-y-2 hover:shadow-card transition-shadow">
      <div className="flex items-center justify-between gap-2">
        <div className="font-mono text-sm font-semibold">{sample.sampleId}</div>
        <Badge tone={tone}>{sample.status}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-ink-muted">
        <div className="flex items-center gap-1.5">
          <UserCircle2 className="h-3 w-3" /> {sample.collectedBy}
        </div>
        <div className="text-right">{shortDate(sample.collectionDate)}</div>
      </div>
      {sample.notes && <div className="text-xs text-ink-muted">{sample.notes}</div>}
      <div className="text-[10px] text-ink-subtle">Collected {relativeTime(sample.collectionDate)}</div>
    </div>
  );
}
