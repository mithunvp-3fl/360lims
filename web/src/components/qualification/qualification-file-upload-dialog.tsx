"use client";
import * as React from "react";
import { toast } from "sonner";
import { Check, FileText, Loader2, UploadCloud } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQualificationFileUpload } from "@/lib/queries";
import type { QualificationTest } from "@/lib/types";
import { cn } from "@/lib/utils";

const PHASES = [
  { label: "File uploaded", delay: 600 },
  { label: "Extracting values…", delay: 900 },
  { label: "Validation complete", delay: 700 },
];

export function QualificationFileUploadDialog({
  qualificationNumber,
  test,
  open,
  onOpenChange,
}: {
  qualificationNumber: string;
  test: QualificationTest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const upload = useQualificationFileUpload(qualificationNumber);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [phase, setPhase] = React.useState(-1);

  React.useEffect(() => {
    if (!open) {
      setFileName(null);
      setPhase(-1);
    }
  }, [open]);

  async function run(name: string) {
    if (!test) return;
    setFileName(name);
    for (let i = 0; i < PHASES.length; i++) {
      setPhase(i);
      await new Promise((r) => setTimeout(r, PHASES[i].delay));
    }
    upload.mutate(
      { testId: test.id, fileName: name },
      {
        onSuccess: () => {
          toast.success("File processed", { description: `${name} parsed and saved.` });
          setTimeout(() => onOpenChange(false), 600);
        },
        onError: (e: unknown) =>
          toast.error("Upload failed", {
            description: e instanceof Error ? e.message : "",
          }),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadCloud className="h-4 w-4 text-accent" />
            Upload result file
          </DialogTitle>
          <DialogDescription>
            Supported formats: PDF, CSV, Excel, image scans. The file is parsed and validated against the spec.
          </DialogDescription>
        </DialogHeader>

        {!fileName ? (
          <div
            className="surface-inset p-8 text-center cursor-pointer hover:border-accent/50 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <UploadCloud className="h-8 w-8 mx-auto mb-2 text-ink-muted" />
            <div className="font-medium">Click to choose a file</div>
            <div className="text-xs text-ink-muted mt-1">or drop a PDF / CSV / Excel here</div>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) run(f.name);
              }}
            />
          </div>
        ) : (
          <div className="surface-inset p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium truncate">{fileName}</span>
            </div>
            <div className="space-y-2">
              {PHASES.map((p, i) => {
                const done = i < phase;
                const running = i === phase && !upload.isSuccess;
                return (
                  <div key={p.label} className="flex items-center gap-2.5 text-sm">
                    <div
                      className={cn(
                        "h-6 w-6 rounded-md grid place-items-center border text-xs",
                        done && "bg-success-soft text-success border-success/30",
                        running && "bg-accent-soft text-accent border-accent/30",
                        !done && !running && "bg-surface text-ink-subtle border-line",
                      )}
                    >
                      {done ? (
                        <Check className="h-3 w-3" />
                      ) : running ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <div
                      className={cn(
                        "flex-1",
                        done && "text-ink",
                        running && "text-ink font-medium",
                        !done && !running && "text-ink-muted",
                      )}
                    >
                      {p.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
