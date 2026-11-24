import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Search } from "lucide-react";
import { quickSearch } from "@/api/jataka";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/status-badge";
import type { JatakaRow } from "@/components/jataka-table";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SmartSearch({
  initial = "",
  showButton = false,
  placeholder = "Search name, number, phone, DOB…",
  className,
}: {
  initial?: string;
  showButton?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [q, setQ] = useState(initial);
  const [rows, setRows] = useState<JatakaRow[]>([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const navigate = useNavigate();
  const boxRef = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);
  const submitted = useRef(initial.trim());

  useEffect(() => setQ(initial), [initial]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    const term = q.trim();
    const id = ++reqId.current;
    if (!term) {
      setRows([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await quickSearch({ data: { q: term } });
        if (id !== reqId.current) return;
        setRows(res.rows as JatakaRow[]);
        setTotal(res.total);
        setActive(-1);
        // Don't reopen the dropdown for a term whose full results are already on screen.
        setOpen(term !== submitted.current);
      } catch {
        if (id === reqId.current) setRows([]);
      }
      if (id === reqId.current) setLoading(false);
    }, 150);
    return () => clearTimeout(t);
  }, [q]);

  function viewAll() {
    const term = q.trim();
    if (!term) return;
    submitted.current = term;
    setOpen(false);
    navigate({ to: "/search", search: { q: term, page: 1 } });
  }

  function pick(id: string) {
    setOpen(false);
    navigate({ to: "/jatakas/$id", params: { id } });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(rows.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && rows[active]) pick(rows[active].id);
      else viewAll();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showPanel = open && q.trim() !== "";

  return (
    <div ref={boxRef} className={cn("relative w-full", className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => {
              submitted.current = "";
              setQ(e.target.value);
            }}
            onFocus={() => rows.length && q.trim() !== submitted.current && setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            enterKeyHint="search"
            className="h-10 w-full rounded-md border bg-background pl-9 pr-9 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
          {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
        {showButton && <Button onClick={viewAll} className="h-10 px-5">Search</Button>}
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 z-40 mt-1 overflow-hidden rounded-md border bg-popover shadow-lg">
          {!loading && rows.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No matches for “{q.trim()}”</div>
          ) : (
            <>
              <ul>
                {rows.map((r, i) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => pick(r.id)}
                      onMouseEnter={() => setActive(i)}
                      className={cn(
                        "grid w-full grid-cols-[auto_3.5rem_1fr_auto] items-center gap-3 border-b px-4 py-2.5 text-left text-sm last:border-b-0 sm:grid-cols-[auto_4rem_1fr_6rem_8rem]",
                        i === active ? "bg-muted" : "hover:bg-muted/60",
                        r.status === "collected" && "opacity-70",
                      )}
                    >
                      <StatusDot status={r.status} />
                      <span className="font-mono font-semibold">{r.jataka_number}</span>
                      <span className="truncate font-medium">{r.client_name || "—"}</span>
                      <span className="hidden text-muted-foreground sm:block">{fmtDate(r.date_of_birth)}</span>
                      <span className="truncate text-right text-muted-foreground">{r.phone || ""}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {total > 0 && (
                <button
                  type="button"
                  onClick={viewAll}
                  className="w-full border-t bg-muted/30 px-4 py-2.5 text-center text-sm font-medium text-primary hover:bg-muted/60"
                >
                  View all results for “{q.trim()}” ({total.toLocaleString()})
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
