import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, SearchX } from "lucide-react";
import { searchJatakas } from "@/api/jataka";
import { JatakaTable, type JatakaRow } from "@/components/jataka-table";
import { PaginationBar } from "@/components/pagination-bar";
import { SmartSearch } from "@/components/smart-search";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({ meta: [{ title: "Search Jataka — Shri Ganesha Jyotishyalaya" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : "",
    page: Number(s.page) > 0 ? Math.floor(Number(s.page)) : 1,
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q, page } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const [data, setData] = useState<{ rows: JatakaRow[]; total: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setData(null);
      return;
    }
    let live = true;
    setLoading(true);
    searchJatakas({ data: { q, page, pageSize: PAGE_SIZE } })
      .then((res) => live && setData({ rows: res.rows as JatakaRow[], total: res.total }))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [q, page]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Search Jataka</h1>
        <p className="text-sm text-muted-foreground">Type a name, Jataka number, phone, date of birth, parent or place.</p>
      </div>

      <SmartSearch initial={q} showButton className="max-w-2xl" />

      {q.trim() === "" ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <SearchX className="h-8 w-8" />
            <p className="text-sm">Start typing to see matching Jatakas instantly.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {data ? (
              <>
                <span className="font-semibold text-foreground">{data.total.toLocaleString()}</span> result(s) found for “{q}”
              </>
            ) : (
              "Searching…"
            )}
          </p>
          <Card>
            <CardContent className="p-0 md:p-2">
              {!data ? (
                <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Searching…
                </div>
              ) : data.rows.length === 0 ? (
                <p className="p-10 text-center text-sm text-muted-foreground">No Jatakas match “{q}”.</p>
              ) : (
                <div className={cn("px-3 md:px-0", loading && "opacity-60 transition-opacity")}>
                  <JatakaTable rows={data.rows} />
                  <div className="px-1 pb-3 md:px-4">
                    <PaginationBar
                      page={page}
                      pageSize={PAGE_SIZE}
                      total={data.total}
                      onPage={(p) => navigate({ search: { q, page: p } })}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
