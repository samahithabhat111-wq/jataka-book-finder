import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { StatusIcon, type JatakaStatus } from "@/components/status-badge";
import { Search } from "lucide-react";

type Row = {
  id: string;
  jataka_number: string;
  client_name: string | null;
  date_of_birth: string;
  phone: string | null;
  status: JatakaStatus;
};

export function SmartSearch() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const boxRef = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const term = q.trim();
    if (!term) { setRows([]); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      const like = `%${term}%`;
      const isDate = /^\d{4}-\d{2}-\d{2}$/.test(term);
      let query = supabase
        .from("jatakas")
        .select("id,jataka_number,client_name,date_of_birth,phone,status")
        // Preparing first, Ready next, Collected faded/last
        .order("status", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(20);

      if (isDate) {
        query = query.eq("date_of_birth", term);
      } else {
        const or = [
          `jataka_number.ilike.${like}`,
          `client_name.ilike.${like}`,
          `phone.ilike.${like}`,
          `father_name.ilike.${like}`,
          `mother_name.ilike.${like}`,
          `place.ilike.${like}`,
        ].join(",");
        query = query.or(or);
      }
      const { data } = await query;
      // Sort: preparing, ready, collected
      const rank = { preparing: 0, ready: 1, collected: 2 } as const;
      const sorted = (data ?? []).slice().sort(
        (a, b) => rank[a.status as JatakaStatus] - rank[b.status as JatakaStatus],
      );
      setRows(sorted as Row[]);
      setOpen(true);
      setLoading(false);
    }, 180);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [q]);

  function pick(id: string) {
    setOpen(false);
    setQ("");
    navigate({ to: "/jatakas/$id", params: { id } });
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => rows.length && setOpen(true)}
          placeholder="Search by Jataka #, name, phone, place, parent name, DOB (YYYY-MM-DD)…"
          className="pl-9"
        />
      </div>
      {open && (loading || rows.length > 0) && (
        <div className="absolute mt-1 w-full bg-popover border rounded-md shadow-lg max-h-96 overflow-auto z-40">
          {loading && <div className="p-3 text-sm text-muted-foreground">Searching…</div>}
          {!loading && rows.length === 0 && <div className="p-3 text-sm text-muted-foreground">No matches</div>}
          {rows.map((r) => (
            <button
              key={r.id}
              onClick={() => pick(r.id)}
              className={`w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-3 border-b last:border-b-0 ${
                r.status === "collected" ? "opacity-60" : ""
              }`}
            >
              <StatusIcon status={r.status} />
              <span className="font-mono text-sm shrink-0">{r.jataka_number}</span>
              <span className="text-sm font-medium truncate">{r.client_name ?? "—"}</span>
              <span className="text-xs text-muted-foreground ml-auto shrink-0">
                {r.date_of_birth} {r.phone ? `· ${r.phone}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
