import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Library, Loader2, PackageCheck, PlusCircle } from "lucide-react";
import { getDashboard, listJatakas } from "@/api/jataka";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_META, StatusDot } from "@/components/status-badge";
import { JatakaTable, type JatakaRow } from "@/components/jataka-table";
import { PaginationBar } from "@/components/pagination-bar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Shri Ganesha Jyotishyalaya" }] }),
  component: Dashboard,
});

type Counts = Awaited<ReturnType<typeof getDashboard>>["counts"];
type Filter = "" | "ready" | "preparing" | "collected";

const PAGE_SIZE = 8;
const FILTERS: { value: Filter; label: string }[] = [
  { value: "collected", label: "Collected" },
  { value: "ready", label: "Ready" },
  { value: "preparing", label: "Preparing" },
  { value: "", label: "All" },
];

function Dashboard() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Counts | null>(null);
  // Completed (Collected) records are shown by default; the filter reveals the rest.
  const [filter, setFilter] = useState<Filter>("collected");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<{ rows: JatakaRow[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard().then((d) => setCounts(d.counts));
  }, []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    listJatakas({ data: { sort: "recent", status: filter || undefined, page, pageSize: PAGE_SIZE } })
      .then((res) => live && setList({ rows: res.rows as JatakaRow[], total: res.total }))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [filter, page]);

  function choose(f: Filter) {
    setFilter(f);
    setPage(1);
  }

  const stats = [
    { label: "Total Jatakas", value: counts?.total, icon: Library, tone: "bg-primary/10 text-primary", filter: "" as Filter },
    { label: "Preparing", value: counts?.preparing, icon: Clock, tone: "bg-amber-100 text-amber-600", filter: "preparing" as Filter },
    { label: "Ready", value: counts?.ready, icon: CheckCircle2, tone: "bg-emerald-100 text-emerald-600", filter: "ready" as Filter },
    { label: "Collected", value: counts?.collected, icon: PackageCheck, tone: "bg-stone-200 text-stone-800", filter: "collected" as Filter },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">नमस्ते, {user?.full_name || user?.username}.</p>
        </div>
        {user?.role === "admin" && (
          <Button asChild>
            <Link to="/jatakas/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Jataka
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          const active = filter === s.filter;
          return (
            <button key={s.label} onClick={() => choose(s.filter)} className="text-left">
              <Card className={cn("h-full transition-shadow hover:shadow-md", active && "border-primary ring-1 ring-primary/40")}>
                <CardContent className="flex items-start justify-between p-4 md:p-5">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground md:text-sm">{s.label}</p>
                    {counts ? (
                      <p className="mt-1 text-2xl font-bold md:text-3xl">{s.value?.toLocaleString()}</p>
                    ) : (
                      <Skeleton className="mt-2 h-8 w-16" />
                    )}
                    <p className="mt-2 text-xs font-medium text-primary">Show</p>
                  </div>
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-full md:h-12 md:w-12", s.tone)}>
                    <Icon className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg">
              {filter ? `${STATUS_META[filter].label} Jatakas` : "All Jatakas"}
              {list && <span className="ml-2 text-sm font-normal text-muted-foreground">({list.total.toLocaleString()})</span>}
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link to="/jatakas" search={{ page: 1, status: filter || undefined }}>View all</Link>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.label}
                onClick={() => choose(f.value)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  filter === f.value ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
                )}
              >
                {f.value ? <StatusDot status={f.value} className="h-2.5 w-2.5" /> : null}
                {f.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="px-3 md:px-6">
          {loading && !list ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : list && list.rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No {filter ? STATUS_META[filter].label.toLowerCase() : ""} Jatakas yet.</p>
          ) : (
            <div className={cn(loading && "opacity-60 transition-opacity")}>
              <JatakaTable rows={list?.rows ?? []} />
              <PaginationBar page={page} pageSize={PAGE_SIZE} total={list?.total ?? 0} onPage={setPage} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
