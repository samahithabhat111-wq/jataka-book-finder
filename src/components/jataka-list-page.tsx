import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { listJatakas } from "@/api/jataka";
import { JatakaTable, type JatakaRow } from "@/components/jataka-table";
import { PaginationBar } from "@/components/pagination-bar";
import { Card, CardContent } from "@/components/ui/card";
import { STATUS_META, StatusDot } from "@/components/status-badge";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 15;
export const STATUS_FILTERS = ["", "ready", "preparing", "collected"] as const;

export function JatakaListPage({
  title,
  description,
  sort,
  status,
  page,
  onPage,
  onStatus,
}: {
  title: string;
  description: string;
  sort: "status" | "recent";
  status?: string;
  page: number;
  onPage: (p: number) => void;
  onStatus?: (s: string) => void;
}) {
  const [data, setData] = useState<{ rows: JatakaRow[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    listJatakas({ data: { sort, status, page, pageSize: PAGE_SIZE } })
      .then((res) => live && setData({ rows: res.rows as JatakaRow[], total: res.total }))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [sort, status, page]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {onStatus && (
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s || "all"}
              onClick={() => onStatus(s)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                (status ?? "") === s ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
              )}
            >
              {s ? <StatusDot status={s} className="h-2.5 w-2.5" /> : null}
              {s ? STATUS_META[s].label : "All"}
            </button>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-0 md:p-2">
          {loading && !data ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : data && data.rows.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">No Jatakas found.</p>
          ) : (
            <div className={cn("px-3 md:px-0", loading && "opacity-60 transition-opacity")}>
              <JatakaTable rows={data?.rows ?? []} />
              <div className="px-1 pb-3 md:px-4">
                <PaginationBar page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPage={onPage} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
