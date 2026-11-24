import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getDashboard, getReports } from "@/api/jataka";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_META, type JatakaStatus } from "@/components/status-badge";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — Shri Ganesha Jyotishyalaya" }] }),
  component: Reports,
});

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Fills in months with no entries so the last 12 months are always shown.
function lastTwelve(monthly: { month: string; n: number }[]) {
  const map = new Map(monthly.map((m) => [m.month, m.n]));
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { label: MONTHS[d.getMonth()], year: d.getFullYear(), n: map.get(key) ?? 0 };
  });
}

function Reports() {
  const [reports, setReports] = useState<Awaited<ReturnType<typeof getReports>> | null>(null);
  const [counts, setCounts] = useState<Awaited<ReturnType<typeof getDashboard>>["counts"] | null>(null);

  useEffect(() => {
    getReports().then(setReports);
    getDashboard().then((d) => setCounts(d.counts));
  }, []);

  const months = reports ? lastTwelve(reports.monthly) : [];
  const maxMonth = Math.max(1, ...months.map((m) => m.n));
  const maxPlace = Math.max(1, ...(reports?.byPlace.map((p) => p.n) ?? [1]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">A quick look at how the index is growing.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 md:gap-4">
        {[
          ["Total Jatakas", reports?.total],
          ["Added this month", reports?.month],
          ["Added today", reports?.today],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              {reports ? <p className="mt-1 text-3xl font-bold">{(value as number).toLocaleString()}</p> : <Skeleton className="mt-2 h-9 w-20" />}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">By status</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(["ready", "preparing", "collected"] as JatakaStatus[]).map((s) => {
              const n = counts?.[s] ?? 0;
              const pct = counts && counts.total ? (n / counts.total) * 100 : 0;
              return (
                <div key={s} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{STATUS_META[s].label}</span>
                    <span className="text-muted-foreground">{n.toLocaleString()} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${STATUS_META[s].dot}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Top places</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {reports && reports.byPlace.length === 0 && <p className="text-sm text-muted-foreground">No place data yet.</p>}
            {reports?.byPlace.map((p) => (
              <div key={p.place} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{p.place}</span>
                  <span className="text-muted-foreground">{p.n}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(p.n / maxPlace) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Jatakas added — last 12 months</CardTitle></CardHeader>
        <CardContent>
          <div className="flex h-48 items-end gap-1.5 sm:gap-3">
            {months.map((m, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[11px] text-muted-foreground">{m.n || ""}</span>
                <div className="w-full rounded-t bg-primary/80" style={{ height: `${(m.n / maxMonth) * 100}%`, minHeight: m.n ? 4 : 2, opacity: m.n ? 1 : 0.2 }} />
                <span className="text-[11px] text-muted-foreground">{m.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
