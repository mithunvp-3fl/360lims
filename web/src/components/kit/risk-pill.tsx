import { Badge } from "@/components/ui/badge";
import { riskToAccent } from "@/lib/format";
import type { RiskLevel } from "@/lib/types";

export function RiskPill({ level }: { level: RiskLevel }) {
  const accent = riskToAccent(level);
  return <Badge tone={accent}>{level} risk</Badge>;
}
