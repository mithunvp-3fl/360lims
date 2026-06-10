"use client";
import * as React from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Beaker,
  CheckCircle2,
  FileText,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  UploadCloud,
  Wand2,
  XCircle,
} from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { EmptyState } from "@/components/kit/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoleGate } from "@/components/kit/role-gate";
import { QualificationInstrumentFlow } from "./qualification-instrument-flow";
import { QualificationManualEntryDialog } from "./qualification-manual-entry-dialog";
import { QualificationFileUploadDialog } from "./qualification-file-upload-dialog";
import {
  useQualificationResults,
  useQualificationRetest,
  useQualificationTests,
} from "@/lib/queries";
import type {
  QualificationResult,
  QualificationTest,
  ResultStatus,
} from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";
import { resultStatusToAccent } from "@/lib/format";

export function QualificationTestWorkspace({
  qualificationNumber,
}: {
  qualificationNumber: string;
}) {
  const { data: tests } = useQualificationTests(qualificationNumber);
  const { data: results } = useQualificationResults(qualificationNumber);
  const retest = useQualificationRetest(qualificationNumber);

  const [importFor, setImportFor] = React.useState<QualificationTest | null>(null);
  const [manualFor, setManualFor] = React.useState<QualificationTest | null>(null);
  const [fileFor, setFileFor] = React.useState<QualificationTest | null>(null);

  const resultByTestId = React.useMemo(() => {
    const m = new Map<string, QualificationResult>();
    for (const r of results ?? []) m.set(r.testId, r);
    return m;
  }, [results]);

  // Staggered fade-in for newly captured results (mirrors Phase 1 behaviour).
  const seenIdsRef = React.useRef<Set<string>>(new Set());
  const initialisedRef = React.useRef(false);
  const [freshIds, setFreshIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!results) return;
    if (!initialisedRef.current) {
      results.forEach((r) => seenIdsRef.current.add(r.id));
      initialisedRef.current = true;
      return;
    }
    const newIds: string[] = [];
    for (const r of results) {
      if (!seenIdsRef.current.has(r.id)) {
        seenIdsRef.current.add(r.id);
        newIds.push(r.id);
      }
    }
    if (newIds.length === 0) return;
    setFreshIds((prev) => {
      const next = new Set(prev);
      newIds.forEach((id) => next.add(id));
      return next;
    });
    const maxValues = Math.max(
      ...results.filter((r) => newIds.includes(r.id)).map((r) => r.values.length),
    );
    const total = maxValues * 180 + 700;
    const timer = window.setTimeout(() => {
      setFreshIds((prev) => {
        const next = new Set(prev);
        newIds.forEach((id) => next.delete(id));
        return next;
      });
    }, total);
    return () => window.clearTimeout(timer);
  }, [results]);

  return (
    <SectionCard
      title="Test workspace"
      description="Capture qualification results from instruments, manual entry, or uploaded files. Spec checks run on every value."
      icon={<Beaker className="h-4 w-4" />}
    >
      {!tests || tests.length === 0 ? (
        <EmptyState
          icon={<Beaker className="h-4 w-4" />}
          title="No tests assigned yet"
          description="Generate a sample to auto-assign the qualification test matrix."
        />
      ) : (
        <div className="rounded-lg border border-line overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-inset/60 text-[11px] uppercase tracking-wide text-ink-muted">
                <th className="text-left font-semibold py-2.5 px-3">Test</th>
                <th className="text-left font-semibold py-2.5 px-3">Source</th>
                <th className="text-left font-semibold py-2.5 px-3">Status</th>
                <th className="text-left font-semibold py-2.5 px-3">Result</th>
                <th className="text-right font-semibold py-2.5 px-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => {
                const r = resultByTestId.get(t.id);
                return (
                  <React.Fragment key={t.id}>
                    <tr className="border-t border-line hover:bg-inset/40">
                      <td className="py-3 px-3">
                        <div className="font-medium">{t.name}</div>
                        <div className="text-[11px] text-ink-muted">{t.parameters.join(", ")}</div>
                      </td>
                      <td className="py-3 px-3">
                        {r ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            {r.source === "Instrument" && <Wand2 className="h-3 w-3 text-accent" />}
                            {r.source === "Manual" && <Pencil className="h-3 w-3 text-info" />}
                            {r.source === "File Upload" && <FileText className="h-3 w-3 text-warning" />}
                            <span>{r.source}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-ink-subtle">—</span>
                        )}
                        {t.instrumentCode && !r && (
                          <div className="text-[11px] text-ink-muted">Suggested: {t.instrumentCode}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <TestStatusBadge result={r} test={t} />
                      </td>
                      <td className="py-3 px-3">
                        {r ? (
                          <ResultSummary result={r} />
                        ) : (
                          <span className="text-xs text-ink-subtle">Awaiting capture</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {r ? (
                          <div className="flex items-center justify-end gap-1">
                            <ResultBadge status={r.overallStatus} />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    retest.mutate(r.id, {
                                      onSuccess: () => toast.info("Retest queued"),
                                    })
                                  }
                                >
                                  <RotateCcw className="h-3.5 w-3.5" /> Retest
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <RoleGate permission="result:import" needs={["lab-analyst", "qa-manager"]}>
                              <Button size="sm" variant="primary" onClick={() => setImportFor(t)}>
                                <Wand2 className="h-3.5 w-3.5" />
                                Import
                              </Button>
                            </RoleGate>
                            <RoleGate permission="result:enter" needs={["lab-analyst", "qa-manager"]}>
                              <Button size="sm" variant="outline" onClick={() => setManualFor(t)}>
                                <Pencil className="h-3.5 w-3.5" />
                                Manual
                              </Button>
                            </RoleGate>
                            <RoleGate permission="result:upload" needs={["lab-analyst", "qa-manager"]}>
                              <Button size="sm" variant="ghost" onClick={() => setFileFor(t)}>
                                <UploadCloud className="h-3.5 w-3.5" />
                                Upload
                              </Button>
                            </RoleGate>
                          </div>
                        )}
                      </td>
                    </tr>
                    {r && (
                      <tr className="bg-inset/40 border-t border-line/60">
                        <td colSpan={5} className="px-3 py-2.5">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1.5">
                            {r.values.map((v, idx) => (
                              <ParameterReadout
                                key={v.parameter}
                                value={v}
                                fresh={freshIds.has(r.id)}
                                staggerIdx={idx}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-ink-muted">
                            <span>Entered by {r.enteredBy}</span>
                            <span>·</span>
                            <span>{relativeTime(r.enteredAt)}</span>
                            {r.reason && (
                              <>
                                <span>·</span>
                                <span>
                                  Reason: <span className="text-ink">{r.reason}</span>
                                </span>
                              </>
                            )}
                            {r.fileName && (
                              <>
                                <span>·</span>
                                <span>
                                  File: <span className="text-ink">{r.fileName}</span>
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <QualificationInstrumentFlow
        qualificationNumber={qualificationNumber}
        test={importFor}
        open={!!importFor}
        onOpenChange={(o) => !o && setImportFor(null)}
      />
      <QualificationManualEntryDialog
        qualificationNumber={qualificationNumber}
        test={manualFor}
        open={!!manualFor}
        onOpenChange={(o) => !o && setManualFor(null)}
      />
      <QualificationFileUploadDialog
        qualificationNumber={qualificationNumber}
        test={fileFor}
        open={!!fileFor}
        onOpenChange={(o) => !o && setFileFor(null)}
      />
    </SectionCard>
  );
}

function TestStatusBadge({
  result,
  test,
}: {
  result?: QualificationResult;
  test: QualificationTest;
}) {
  if (!result) return <Badge tone="muted">{test.status}</Badge>;
  if (result.overallStatus === "Fail") {
    return (
      <Badge tone="danger">
        <XCircle className="h-3 w-3" /> Out of spec
      </Badge>
    );
  }
  if (result.overallStatus === "Warning") {
    return (
      <Badge tone="warning">
        <AlertTriangle className="h-3 w-3" /> Variance
      </Badge>
    );
  }
  return (
    <Badge tone="success">
      <CheckCircle2 className="h-3 w-3" /> Compliant
    </Badge>
  );
}

function ResultBadge({ status }: { status: ResultStatus }) {
  const tone = resultStatusToAccent(status);
  return <Badge tone={tone === "muted" ? "muted" : tone}>{status}</Badge>;
}

function ResultSummary({ result }: { result: QualificationResult }) {
  const total = result.values.length;
  const pass = result.values.filter((v) => v.status === "Pass").length;
  const warn = result.values.filter((v) => v.status === "Warning").length;
  const fail = result.values.filter((v) => v.status === "Fail").length;
  return (
    <div className="text-xs text-ink-muted">
      <span className="text-ink font-medium tabular-nums">
        {pass}/{total}
      </span>{" "}
      in spec
      {warn > 0 && <span className="ml-1 text-warning">· {warn} variance</span>}
      {fail > 0 && <span className="ml-1 text-danger">· {fail} fail</span>}
    </div>
  );
}

function ParameterReadout({
  value,
  fresh,
  staggerIdx = 0,
}: {
  value: QualificationResult["values"][number];
  fresh?: boolean;
  staggerIdx?: number;
}) {
  return (
    <div
      className={cn(
        "surface-card p-2.5 relative",
        value.status === "Fail" && "border-danger/40",
        value.status === "Warning" && "border-warning/40",
        fresh && "animate-fade-in",
        fresh && "ring-1 ring-accent/30",
      )}
      style={
        fresh
          ? {
              animationDelay: `${staggerIdx * 180}ms`,
              animationFillMode: "backwards",
              animationDuration: "320ms",
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          {value.parameter}
        </span>
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            value.status === "Pass" && "bg-success",
            value.status === "Warning" && "bg-warning",
            value.status === "Fail" && "bg-danger",
          )}
        />
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-base font-semibold tabular-nums">{value.value}</span>
        <span className="text-[11px] text-ink-muted">{value.unit}</span>
      </div>
      <div className="text-[10px] text-ink-subtle mt-0.5">
        {typeof value.specMin === "number" && typeof value.specMax === "number"
          ? `spec ${value.specMin} – ${value.specMax}`
          : "no spec"}
      </div>
    </div>
  );
}
