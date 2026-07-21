import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, type JatakaStatus } from "@/components/status-badge";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({ meta: [{ title: "Advanced Search — Jataka Manager" }] }),
  component: AdvancedSearch,
});

type Row = {
  id: string; jataka_number: string; client_name: string | null;
  date_of_birth: string; phone: string | null; place: string | null; status: JatakaStatus;
};

function AdvancedSearch() {
  const [f, setF] = useState({
    jataka_number: "", client_name: "", date_of_birth: "", time_of_birth: "",
    father_name: "", mother_name: "", phone: "", place: "", status: "any",
  });
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    let q = supabase.from("jatakas")
      .select("id,jataka_number,client_name,date_of_birth,phone,place,status")
      .order("created_at", { ascending: false })
      .limit(200);
    if (f.jataka_number.trim()) q = q.ilike("jataka_number", `%${f.jataka_number.trim()}%`);
    if (f.client_name.trim()) q = q.ilike("client_name", `%${f.client_name.trim()}%`);
    if (f.date_of_birth) q = q.eq("date_of_birth", f.date_of_birth);
    if (f.time_of_birth) q = q.eq("time_of_birth", f.time_of_birth);
    if (f.father_name.trim()) q = q.ilike("father_name", `%${f.father_name.trim()}%`);
    if (f.mother_name.trim()) q = q.ilike("mother_name", `%${f.mother_name.trim()}%`);
    if (f.phone.trim()) q = q.ilike("phone", `%${f.phone.trim()}%`);
    if (f.place.trim()) q = q.ilike("place", `%${f.place.trim()}%`);
    if (f.status !== "any") q = q.eq("status", f.status as JatakaStatus);
    const { data, error } = await q;
    setBusy(false);
    if (error) return;
    setRows((data ?? []) as Row[]);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Advanced Search</CardTitle>
          <CardDescription>All fields are optional. More fields = fewer results.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={run} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Jataka Number"><Input value={f.jataka_number} onChange={(e) => set("jataka_number", e.target.value)} /></Field>
            <Field label="Client Name"><Input value={f.client_name} onChange={(e) => set("client_name", e.target.value)} /></Field>
            <Field label="Phone"><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label="Date of Birth"><Input type="date" value={f.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} /></Field>
            <Field label="Time of Birth"><Input type="time" value={f.time_of_birth} onChange={(e) => set("time_of_birth", e.target.value)} /></Field>
            <Field label="Place"><Input value={f.place} onChange={(e) => set("place", e.target.value)} /></Field>
            <Field label="Father's Name"><Input value={f.father_name} onChange={(e) => set("father_name", e.target.value)} /></Field>
            <Field label="Mother's Name"><Input value={f.mother_name} onChange={(e) => set("mother_name", e.target.value)} /></Field>
            <Field label="Status">
              <Select value={f.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="collected">Collected</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="md:col-span-3 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setF({ jataka_number: "", client_name: "", date_of_birth: "", time_of_birth: "", father_name: "", mother_name: "", phone: "", place: "", status: "any" }); setRows(null); }}>Clear</Button>
              <Button type="submit" disabled={busy}>{busy ? "Searching…" : "Search"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {rows && (
        <Card>
          <CardHeader><CardTitle>Results ({rows.length})</CardTitle></CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No results.</p>
            ) : (
              <ul className="divide-y">
                {rows.map((r) => (
                  <li key={r.id}>
                    <Link to="/jatakas/$id" params={{ id: r.id }}
                      className={`flex flex-wrap items-center gap-3 py-2.5 hover:bg-muted/50 px-2 -mx-2 rounded ${
                        r.status === "collected" ? "opacity-70" : ""
                      }`}>
                      <StatusBadge status={r.status} faded={r.status === "collected"} />
                      <span className="font-mono text-sm">{r.jataka_number}</span>
                      <span className="font-medium">{r.client_name ?? "—"}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        DOB {r.date_of_birth}{r.phone ? ` · ${r.phone}` : ""}{r.place ? ` · ${r.place}` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
