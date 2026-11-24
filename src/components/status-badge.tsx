import { cn } from "@/lib/utils";

export type JatakaStatus = "preparing" | "ready" | "collected";

export const STATUS_META: Record<JatakaStatus, { label: string; dot: string; text: string }> = {
  ready: { label: "Ready", dot: "bg-emerald-500", text: "text-emerald-700" },
  preparing: { label: "Preparing", dot: "bg-amber-400", text: "text-amber-700" },
  collected: { label: "Collected", dot: "bg-slate-900", text: "text-slate-600" },
};

export function StatusDot({ status, className, decorative }: { status: JatakaStatus; className?: string; decorative?: boolean }) {
  return (
    <span
      {...(decorative ? { "aria-hidden": true } : { "aria-label": STATUS_META[status].label })}
      className={cn("inline-block h-3 w-3 shrink-0 rounded-full", STATUS_META[status].dot, className)}
    />
  );
}

export function StatusBadge({ status, className }: { status: JatakaStatus; className?: string }) {
  const m = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm font-medium", m.text, className)}>
      <StatusDot status={status} decorative className="h-2.5 w-2.5" />
      {m.label}
    </span>
  );
}

export const StatusIcon = StatusDot;
