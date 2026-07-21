import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import type { JatakaStatus } from "@/components/status-badge";

export const Route = createFileRoute("/_authenticated/jatakas/new")({
  head: () => ({ meta: [{ title: "Add Jataka — Jataka Manager" }] }),
  component: NewJataka,
});

type Dup = { id: string; jataka_number: string; client_name: string | null; date_of_birth: string; phone: string | null };

function NewJataka() {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    jataka_number: "",
    client_name: "",
    date_of_birth: "",
    time_of_birth: "",
    father_name: "",
    mother_name: "",
    phone: "",
    place: "",
    status: "preparing" as JatakaStatus,
  });
  const [busy, setBusy] = useState(false);
  const [dups, setDups] = useState<Dup[] | null>(null);
  const [pending, setPending] = useState(false);

  if (!isAdmin) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Not authorized</AlertTitle>
        <AlertDescription>Only admins can add new Jatakas.</AlertDescription>
      </Alert>
    );
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function findDuplicates(): Promise<Dup[]> {
    const filters: string[] = [];
    if (form.date_of_birth) filters.push(`date_of_birth.eq.${form.date_of_birth}`);
    if (form.phone.trim()) filters.push(`phone.eq.${form.phone.trim()}`);
    if (!filters.length) return [];
    const { data } = await supabase
      .from("jatakas")
      .select("id,jataka_number,client_name,date_of_birth,phone")
      .or(filters.join(","))
      .limit(10);
    return (data ?? []) as Dup[];
  }

  async function trySave(force: boolean) {
    if (!form.jataka_number.trim()) return toast.error("Jataka Number is required");
    if (!form.date_of_birth) return toast.error("Date of Birth is required");
    if (!form.time_of_birth) return toast.error("Time of Birth is required");

    // Uniqueness check
    const { data: existing } = await supabase
      .from("jatakas")
      .select("id")
      .eq("jataka_number", form.jataka_number.trim())
      .maybeSingle();
    if (existing) {
      toast.error("This Jataka Number already exists.");
      return;
    }

    if (!force) {
      const d = await findDuplicates();
      if (d.length) {
        setDups(d);
        setPending(true);
        return;
      }
    }

    setBusy(true);
    const payload = {
      jataka_number: form.jataka_number.trim(),
      client_name: form.client_name.trim() || null,
      date_of_birth: form.date_of_birth,
      time_of_birth: form.time_of_birth,
      father_name: form.father_name.trim() || null,
      mother_name: form.mother_name.trim() || null,
      phone: form.phone.trim() || null,
      place: form.place.trim() || null,
      status: form.status,
      created_by: user?.id ?? null,
    };
    const { data, error } = await supabase.from("jatakas").insert(payload).select("id").single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Jataka added");
    navigate({ to: "/jatakas/$id", params: { id: data.id } });
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Jataka</CardTitle>
          <CardDescription>Required fields: Jataka Number, Date of Birth, Time of Birth.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => { e.preventDefault(); trySave(false); }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <Field label="Jataka Number *"><Input value={form.jataka_number} onChange={(e) => set("jataka_number", e.target.value)} required /></Field>
            <Field label="Client Name"><Input value={form.client_name} onChange={(e) => set("client_name", e.target.value)} /></Field>
            <Field label="Date of Birth *"><Input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} required /></Field>
            <Field label="Time of Birth *"><Input type="time" value={form.time_of_birth} onChange={(e) => set("time_of_birth", e.target.value)} required /></Field>
            <Field label="Father's Name"><Input value={form.father_name} onChange={(e) => set("father_name", e.target.value)} /></Field>
            <Field label="Mother's Name"><Input value={form.mother_name} onChange={(e) => set("mother_name", e.target.value)} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label="Place"><Input value={form.place} onChange={(e) => set("place", e.target.value)} /></Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => set("status", v as JatakaStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="collected">Collected</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="md:col-span-2 flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => history.back()}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save Jataka"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {pending && dups && dups.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Possible duplicate found.</AlertTitle>
          <AlertDescription>
            <p className="mb-2">A record with the same date of birth or phone already exists:</p>
            <ul className="space-y-1 mb-3">
              {dups.map((d) => (
                <li key={d.id} className="text-sm">
                  <Link to="/jatakas/$id" params={{ id: d.id }} className="underline font-mono">{d.jataka_number}</Link>
                  {" — "}{d.client_name ?? "—"} · DOB {d.date_of_birth}{d.phone ? ` · ${d.phone}` : ""}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              {dups[0] && (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/jatakas/$id" params={{ id: dups[0].id }}>Open Existing Record</Link>
                </Button>
              )}
              <Button size="sm" onClick={() => { setPending(false); setDups(null); trySave(true); }}>Save Anyway</Button>
              <Button variant="ghost" size="sm" onClick={() => { setPending(false); setDups(null); }}>Back to form</Button>
            </div>
          </AlertDescription>
        </Alert>
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
