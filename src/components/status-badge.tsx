import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, PackageCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type JatakaStatus = "preparing" | "ready" | "collected";

const map: Record<JatakaStatus, { label: string; icon: LucideIcon; className: string }> = {
  preparing: { label: "Preparing", icon: Clock, className: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200" },
  ready: { label: "Ready", icon: CheckCircle2, className: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200" },
  collected: { label: "Collected", icon: PackageCheck, className: "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800/50 dark:text-slate-400" },
};

export function StatusBadge({ status, faded }: { status: JatakaStatus; faded?: boolean }) {
  const cfg = map[status];
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`${cfg.className} ${faded ? "opacity-60" : ""} gap-1 font-medium`}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </Badge>
  );
}

export function StatusIcon({ status }: { status: JatakaStatus }) {
  const Icon = map[status].icon;
  return <Icon className={`h-4 w-4 ${status === "collected" ? "opacity-60" : ""}`} />;
}
