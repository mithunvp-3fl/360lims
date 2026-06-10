"use client";
import * as React from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Beaker,
  CheckCircle2,
  FileText,
  Layers,
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
import { ProductInstrumentFlow } from "./product-instrument-flow";
import { ProductManualEntryDialog } from "./product-manual-entry-dialog";
import { ProductFileUploadDialog } from "./product-file-upload-dialog";
import {
  useProductResults,
  useProductRetest,
  useProductTests,
} from "@/lib/queries";
import type { ProductResult, ProductTest, ResultStatus } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";
import { resultStatusToAccent } from "@/lib/format";

const CATEGORY_ORDER = ["Mechanical", "Physical", "Metallography", "Visual"];

function inferCategory(t: ProductTest): string {
  if (t.category) return t.category;
  const name = t.name.toLowerCase();
  if (/tensile|hardness|impact|yield|elong|strength|mechanical/.test(name)) return "Mechanical";
  if (/density|porosity|grain|metallograph|micro/.test(name)) return "Metallography";
  if (/visual|surface|appearance/.test(name)) return "Visual";
  if (/conductivity|thermal|melt|physical/.test(name)) return "Physical";
  return "Physical";
}

export function ProductTestWorkspace({
  productBatchNumber,
}: {
  productBatchNumber: string;
}) {
  const { data: tests } = useProductTests(productBatchNumber);
  const { data: results } = useProductResults(productBatchNumber);
  const retest = useProductRetest(productBatchNumber);

  const [importFor, setImportFor] = React.useState<ProductTest | null>(null);
  const [manualFor, setManualFor] = React.useState<ProductTest | null>(null);
  const [fileFor, setFileFor] = React.useState<ProductTest | null>(null);

  const resultByTestId = React.useMemo(() => {
    const m = new Map<string, ProductResult>();
    for (const r of results ?? []) m.set(r.testId, r);
    return m;
  }, [results]);

  const grouped = React.useMemo(() => {
    const groups: Record<string, ProductTest[]> = {};
    for (const t of tests ?? []) {
      const c = inferCategory(t);
      (groups[c] ??= []).push(t);
    }
    return groups;
  }, [tests]);

  return (
    <SectionCard
      title="Product test workspace"
      description="Capture mechanical, physical, metallography, and visual results. Spec checks run on every parameter."
      icon={<Beaker className="h-4 w-4" />}
    >
      {!tests || tests.length === 0 ? (
        <EmptyState
          icon={<Beaker className="h-4 w-4" />}
          title="No tests assigned yet"
          description="Generate a sample to auto-assign the product test plan."
        />
      ) : (
        <div className="space-y-4">
          {CATEGORY_ORDER.filter((c) => grouped[c]?.length).map((cat) => (
            <div key={cat} className="space-y-2">
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-accent" />
                <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  {cat}
                </div>
                <Badge tone="muted">{grouped[cat].length}</Badge>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {grouped[cat].map((t) => {
                  const r = resultByTestId.get(t.id);
                  return (
                    <TestCard
                      key={t.id}
                      test={t}
                      result={r}
                      onImport={() => setImportFor(t)}
                      onManual={() => setManualFor(t)}
                      onUpload={() => setFileFor(t)}
                      onRetest={() =>
                        r &&
                        retest.mutate(r.id, {
                          onSuccess: () => toast.info("Retest queued"),
                        })
                      }
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <ProductInstrumentFlow
        productBatchNumber={productBatchNumber}
        test={importFor}
        open={!!importFor}
        onOpenChange={(o) => !o && setImportFor(null)}
      />
      <ProductManualEntryDialog
        productBatchNumber={productBatchNumber}
        test={manualFor}
        open={!!manualFor}
        onOpenChange={(o) => !o && setManualFor(null)}
      />
      <ProductFileUploadDialog
        productBatchNumber={productBatchNumber}
        test={fileFor}
        open={!!fileFor}
        onOpenChange={(o) => !o && setFileFor(null)}
      />
    </SectionCard>
  );
}

function TestCard({
  test,
  result,
  onImport,
  onManual,
  onUpload,
  onRetest,
}: {
  test: ProductTest;
  result?: ProductResult;
  onImport: () => void;
  onManual: () => void;
  onUpload: () => void;
  onRetest: () => void;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium truncate">{test.name}</div>
          <div className="text-[11px] text-ink-muted truncate">
            {test.parameters.join(", ")}
          </div>
        </div>
        <TestStatusBadge result={result} test={test} />
      </div>

      <div className="flex items-center gap-2 text-xs text-ink-muted">
        {result ? (
          <>
            {result.source === "Instrument" && <Wand2 className="h-3 w-3 text-accent" />}
            {result.source === "Manual" && <Pencil className="h-3 w-3 text-info" />}
            {result.source === "File Upload" && <FileText className="h-3 w-3 text-warning" />}
            <span>{result.source}</span>
            <span>·</span>
            <span>{relativeTime(result.enteredAt)}</span>
          </>
        ) : (
          <span className="text-ink-subtle">Awaiting capture</span>
        )}
      </div>

      {result && (
        <div className="rounded-md border border-line/60 bg-inset/40 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-ink-muted bg-inset/60">
                <th className="text-left font-semibold py-1.5 px-2">Parameter</th>
                <th className="text-right font-semibold py-1.5 px-2">Value</th>
                <th className="text-right font-semibold py-1.5 px-2">Spec</th>
                <th className="text-right font-semibold py-1.5 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {result.values.map((v) => (
                <tr key={v.parameter} className="border-t border-line/60">
                  <td className="py-1 px-2 font-medium">{v.parameter}</td>
                  <td className="py-1 px-2 text-right tabular-nums">
                    {v.value}
                    <span className="text-[10px] text-ink-subtle ml-1">{v.unit}</span>
                  </td>
                  <td className="py-1 px-2 text-right tabular-nums text-ink-muted text-[11px]">
                    {typeof v.specMin === "number" && typeof v.specMax === "number"
                      ? `${v.specMin} – ${v.specMax}`
                      : "—"}
                  </td>
                  <td className="py-1 px-2 text-right">
                    <span
                      className={cn(
                        "inline-block h-1.5 w-1.5 rounded-full",
                        v.status === "Pass" && "bg-success",
                        v.status === "Warning" && "bg-warning",
                        v.status === "Fail" && "bg-danger",
                        v.status === "Pending" && "bg-ink-subtle",
                      )}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between gap-1.5 pt-1">
        {result ? (
          <div className="flex items-center gap-1.5">
            <ResultBadge status={result.overallStatus} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onRetest}>
                  <RotateCcw className="h-3.5 w-3.5" /> Retest
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="text-[11px] text-ink-muted">
            {test.instrumentCode ? `Suggested: ${test.instrumentCode}` : "Capture results"}
          </div>
        )}
        {!result && (
          <div className="flex items-center gap-1.5 ml-auto">
            <RoleGate permission="result:import" needs={["lab-analyst", "qa-manager"]}>
              <Button size="sm" variant="primary" onClick={onImport}>
                <Wand2 className="h-3.5 w-3.5" />
                Import
              </Button>
            </RoleGate>
            <RoleGate permission="result:enter" needs={["lab-analyst", "qa-manager"]}>
              <Button size="sm" variant="outline" onClick={onManual}>
                <Pencil className="h-3.5 w-3.5" />
                Manual
              </Button>
            </RoleGate>
            <RoleGate permission="result:upload" needs={["lab-analyst", "qa-manager"]}>
              <Button size="sm" variant="ghost" onClick={onUpload}>
                <UploadCloud className="h-3.5 w-3.5" />
                Upload
              </Button>
            </RoleGate>
          </div>
        )}
      </div>
    </div>
  );
}

function TestStatusBadge({
  result,
  test,
}: {
  result?: ProductResult;
  test: ProductTest;
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
