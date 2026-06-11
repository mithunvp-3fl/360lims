"use client";
import * as React from "react";
import Link from "next/link";
import { Loader2, QrCode, ScanLine, Search, X } from "lucide-react";
import { SectionCard } from "@/components/kit/section-card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useScopedTraceabilitySearch } from "@/lib/queries";
import type { GenealogyNodeType, TraceabilitySearchHit } from "@/lib/types";

const SCOPE_OPTIONS: { key: GenealogyNodeType; label: string; short: string }[] = [
  { key: "raw-material", label: "Lot", short: "Lot" },
  { key: "process-qualification", label: "PMQ", short: "PMQ" },
  { key: "metal-batch", label: "MB", short: "MB" },
  { key: "product-batch", label: "PB", short: "PB" },
  { key: "certificate", label: "COA", short: "COA" },
];

const EXAMPLE_QUERIES: { label: string; type: GenealogyNodeType }[] = [
  { label: "LOT-2026-0042", type: "raw-material" },
  { label: "PMQ-2026-001245", type: "process-qualification" },
  { label: "MB-2026-000789", type: "metal-batch" },
];

const NODE_LABEL: Record<GenealogyNodeType, string> = {
  "raw-material": "Raw Material",
  "process-qualification": "Process Qualification",
  "metal-batch": "Metal Batch",
  "product-batch": "Product Batch",
  certificate: "Certificate",
};

interface Props {
  selectedKey?: string;
  onPick: (type: GenealogyNodeType, key: string) => void;
}

export function EnhancedSearch({ selectedKey, onPick }: Props) {
  const [query, setQuery] = React.useState("");
  const [scope, setScope] = React.useState<GenealogyNodeType[]>([]);

  const { data: hits, isLoading: searching } = useScopedTraceabilitySearch(
    query,
    scope.length > 0 ? scope : undefined,
  );

  const toggleScope = (key: GenealogyNodeType) => {
    setScope((cur) =>
      cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key],
    );
  };

  return (
    <SectionCard
      title="Traceability Search"
      description="Search by Lot, PMQ, MB, PB, COA, Supplier, Customer, Barcode or QR — scope with the chips below."
      icon={<ScanLine className="h-4 w-4" />}
      actions={
        <div className="flex items-center gap-2 text-[11px] text-ink-muted">
          <span>Try:</span>
          {EXAMPLE_QUERIES.map((e) => (
            <button
              key={e.label}
              type="button"
              onClick={() => {
                setQuery(e.label);
                onPick(e.type, e.label);
              }}
              className="rounded-full bg-inset border border-line px-2 py-0.5 font-mono text-[10px] text-ink hover:bg-surface"
            >
              {e.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="LOT, PMQ, MB, PB, COA · supplier · customer · barcode · QR code"
            className="pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 grid place-items-center text-ink-muted hover:text-ink rounded hover:bg-inset"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-ink-muted mr-1">
            Scope
          </span>
          {SCOPE_OPTIONS.map((opt) => {
            const active = scope.includes(opt.key);
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggleScope(opt.key)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors",
                  active
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line bg-surface text-ink-muted hover:bg-inset",
                )}
              >
                {opt.short}
              </button>
            );
          })}
          {scope.length > 0 && (
            <button
              type="button"
              onClick={() => setScope([])}
              className="text-[10px] text-ink-muted hover:text-ink underline-offset-2 hover:underline ml-1"
            >
              Clear
            </button>
          )}
          <div className="ml-auto flex items-center gap-1 text-[10px] text-ink-muted">
            <QrCode className="h-3 w-3" />
            QR / barcode values match against this field.
          </div>
        </div>

        {query.trim().length > 0 && (
          <div className="max-h-72 overflow-y-auto rounded-md border border-line bg-surface">
            {searching ? (
              <div className="px-3 py-2 text-xs text-ink-muted flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
              </div>
            ) : !hits || hits.length === 0 ? (
              <div className="px-3 py-2 text-xs text-ink-muted">No matches.</div>
            ) : (
              <ul className="divide-y divide-line">
                {hits.map((h) => (
                  <SearchHitRow
                    key={`${h.nodeType}-${h.nodeKey}`}
                    hit={h}
                    active={selectedKey === h.nodeKey}
                    onPick={() => onPick(h.nodeType, h.nodeKey)}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function SearchHitRow({
  hit,
  active,
  onPick,
}: {
  hit: TraceabilitySearchHit;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        className={cn(
          "w-full text-left px-3 py-2 flex items-center justify-between gap-3 hover:bg-inset",
          active && "bg-inset",
        )}
      >
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{hit.title}</div>
          <div className="text-[11px] text-ink-muted truncate">
            {NODE_LABEL[hit.nodeType]}
            {hit.subtitle ? ` · ${hit.subtitle}` : ""}
          </div>
        </div>
        <Badge tone="muted" className="text-[10px]">
          {hit.status}
        </Badge>
      </button>
    </li>
  );
}
