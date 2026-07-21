import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, type JatakaStatus } from "@/components/status-badge";
import { Users, Clock, CheckCircle2, PackageCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Jataka Manager" }] }),
  component: Dashboard,
});

type Recent = { id: string; jataka_number: string; client_name: string | null; status: JatakaStatus };

function Dashboard() {
  const [counts, setCounts] = useState({ total: 0, preparing: 0, ready: 0, collected: 0 });
  const [recent, setRecent] = useState<Recent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [total, prep, ready, coll, rec] = await Promise.all([
        supabase.from("jatakas").select("*", { count: "exact", head: true }),
        supabase.from("jatakas").select("*", { count: "exact", head: true }).eq("status", "preparing"),
        supabase.from("jatakas").select("*", { count: "exact", head: true }).eq("status", "ready"),
        supabase.from("jatakas").select("*", { count: "exact", head: true }).eq("status", "collected"),
        supabase.from("jatakas").select("id,jataka_number,client_name,status").order("created_at", { ascending: false }).limit(10),
      ]);
      setCounts({
        total: total.count ?? 0,
        preparing: prep.count ?? 0,
        ready: ready.count ?? 0,
        collected: coll.count ?? 0,
      });
      setRecent((rec.data ?? []) as Recent[]);
      setLoading(false);
    })();
  }, []);

  const stats = [
    { label: "Total Jatakas", value: counts.total, icon: Users, color: "text-primary" },
    { label: "Preparing", value: counts.preparing, icon: Clock, color: "text-amber-600" },
    { label: "Ready", value: counts.ready, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Collected", value: counts.collected, icon: PackageCheck, color: "text-slate-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of Jataka records.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <Icon className={`h-4 w-4 ${s.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{loading ? "…" : s.value.toLocaleString()}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No Jatakas yet.</p>
          ) : (
            <ul className="divide-y">
              {recent.map((r) => (
                <li key={r.id}>
                  <Link
                    to="/jatakas/$id"
                    params={{ id: r.id }}
                    className={`flex items-center gap-3 py-2.5 hover:bg-muted/50 px-2 -mx-2 rounded ${
                      r.status === "collected" ? "opacity-70" : ""
                    }`}
                  >
                    <StatusBadge status={r.status} faded={r.status === "collected"} />
                    <span className="font-mono text-sm">{r.jataka_number}</span>
                    <span className="font-medium">{r.client_name ?? "—"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
