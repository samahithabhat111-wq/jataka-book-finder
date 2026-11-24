import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { advancedSearch } from "@/api/jataka";
import { JatakaTable, type JatakaRow } from "@/components/jataka-table";
import { PaginationBar } from "@/components/pagination-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/advanced")({
  head: () => ({ meta: [{ title: "Advanced Search — Shri Ganesha Jyotishyalaya" }] }),
  component: AdvancedSearch,
});

const PAGE_SIZE = 10;
const EMPTY = {
  jataka_number: "",
  client_name: "",
  date_of_birth: "",
  time_of_birth: "",
  father_name: "",
  mother_name: "",
  phone: "",
  place: "",
  status: "all",
};

function AdvancedSearch() {
  const [f, setF] = useState(EMPTY);
  const [result, setResult] = useState<{ rows: JatakaRow[]; total: number; page: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof EMPTY, v: string) => setF((x) => ({ ...x, [k]: v }));

  async function run(page = 1) {
    setBusy(true);
    try {
      const res = await advancedSearch({ data: { ...f, status: f.status === "all" ? "" : f.status, page, pageSize: PAGE_SIZE } });
      setResult({ rows: res.rows as JatakaRow[], total: res.total, page });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Advanced Search</CardTitle>
          <CardDescription>Every field is optional. The more you fill in, the fewer results you get.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(1);
            }}
            className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2"
          >
            <Field label="Jataka Number"><Input value={f.jataka_number} onChange={(e) => set("jataka_number", e.target.value)} placeholder="Enter Jataka Number" /></Field>
            <Field label="Client Name"><Input value={f.client_name} onChange={(e) => set("client_name", e.target.value)} placeholder="Enter Client Name" /></Field>
            <Field label="Date of Birth"><Input type="date" value={f.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} /></Field>
            <Field label="Time of Birth"><Input type="time" value={f.time_of_birth} onChange={(e) => set("time_of_birth", e.target.value)} /></Field>
            <Field label="Father's Name"><Input value={f.father_name} onChange={(e) => set("father_name", e.target.value)} placeholder="Enter Father's Name" /></Field>
            <Field label="Mother's Name"><Input value={f.mother_name} onChange={(e) => set("mother_name", e.target.value)} placeholder="Enter Mother's Name" /></Field>
            <Field label="Phone Number"><Input type="tel" inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Enter Phone Number" /></Field>
            <Field label="Place"><Input value={f.place} onChange={(e) => set("place", e.target.value)} placeholder="Enter Place" /></Field>
            <Field label="Status">
              <Select value={f.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="collected">Collected</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-end justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => { setF(EMPTY); setResult(null); }}>Reset</Button>
              <Button type="submit" disabled={busy} className="min-w-24">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Search
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{result.total.toLocaleString()}</span> result(s) found
          </p>
          <Card>
            <CardContent className="p-0 md:p-2">
              {result.rows.length === 0 ? (
                <p className="p-10 text-center text-sm text-muted-foreground">No Jatakas match these filters.</p>
              ) : (
                <div className={cn("px-3 md:px-0", busy && "opacity-60 transition-opacity")}>
                  <JatakaTable rows={result.rows} />
                  <div className="px-1 pb-3 md:px-4">
                    <PaginationBar page={result.page} pageSize={PAGE_SIZE} total={result.total} onPage={(p) => void run(p)} />
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
