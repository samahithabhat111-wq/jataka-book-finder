import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, type JatakaStatus } from "@/components/status-badge";
import { toast } from "sonner";
import { Edit, ArrowLeft, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/jatakas/$id")({
  head: () => ({ meta: [{ title: "Jataka Details" }] }),
  component: JatakaDetail,
});

type Jataka = {
  id: string;
  jataka_number: string;
  client_name: string | null;
  date_of_birth: string;
  time_of_birth: string;
  father_name: string | null;
  mother_name: string | null;
  phone: string | null;
  place: string | null;
  status: JatakaStatus;
  created_at: string;
};

function JatakaDetail() {
  const { id } = Route.useParams();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [rec, setRec] = useState<Jataka | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Jataka | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("jatakas").select("*").eq("id", id).maybeSingle();
    setLoading(false);
    if (error) return toast.error(error.message);
    if (!data) return;
    setRec(data as Jataka);
    setForm(data as Jataka);
  }

  async function save() {
    if (!form) return;
    setBusy(true);
    const { error } = await supabase.from("jatakas").update({
      jataka_number: form.jataka_number.trim(),
      client_name: form.client_name?.trim() || null,
      date_of_birth: form.date_of_birth,
      time_of_birth: form.time_of_birth,
      father_name: form.father_name?.trim() || null,
      mother_name: form.mother_name?.trim() || null,
      phone: form.phone?.trim() || null,
      place: form.place?.trim() || null,
      status: form.status,
    }).eq("id", form.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(false);
    load();
  }

  async function del() {
    if (!confirm("Delete this Jataka?")) return;
    const { error } = await supabase.from("jatakas").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    navigate({ to: "/dashboard" });
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!rec) return <p className="text-muted-foreground">Record not found.</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={() => history.back()}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center gap-3">
              <span className="font-mono">{rec.jataka_number}</span>
              <StatusBadge status={rec.status} faded={rec.status === "collected"} />
            </CardTitle>
            <p className="text-muted-foreground text-sm mt-1">Created {new Date(rec.created_at).toLocaleString()}</p>
          </div>
          {isAdmin && !editing && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setEditing(true)}><Edit className="h-4 w-4 mr-1" /> Edit</Button>
              <Button size="sm" variant="destructive" onClick={del}><Trash2 className="h-4 w-4" /></Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {editing && form ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Jataka Number"><Input value={form.jataka_number} onChange={(e) => setForm({ ...form, jataka_number: e.target.value })} /></F>
              <F label="Client Name"><Input value={form.client_name ?? ""} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></F>
              <F label="Date of Birth"><Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></F>
              <F label="Time of Birth"><Input type="time" value={form.time_of_birth} onChange={(e) => setForm({ ...form, time_of_birth: e.target.value })} /></F>
              <F label="Father's Name"><Input value={form.father_name ?? ""} onChange={(e) => setForm({ ...form, father_name: e.target.value })} /></F>
              <F label="Mother's Name"><Input value={form.mother_name ?? ""} onChange={(e) => setForm({ ...form, mother_name: e.target.value })} /></F>
              <F label="Phone"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></F>
              <F label="Place"><Input value={form.place ?? ""} onChange={(e) => setForm({ ...form, place: e.target.value })} /></F>
              <F label="Status">
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as JatakaStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preparing">Preparing</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="collected">Collected</SelectItem>
                  </SelectContent>
                </Select>
              </F>
              <div className="md:col-span-2 flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setEditing(false); setForm(rec); }}>Cancel</Button>
                <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              <Row label="Name" value={rec.client_name} />
              <Row label="Date of Birth" value={rec.date_of_birth} />
              <Row label="Time of Birth" value={rec.time_of_birth} />
              <Row label="Father's Name" value={rec.father_name} />
              <Row label="Mother's Name" value={rec.mother_name} />
              <Row label="Phone" value={rec.phone} />
              <Row label="Place" value={rec.place} />
              <Row label="Status" value={rec.status} />
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value ?? "—"}</dd>
    </div>
  );
}
