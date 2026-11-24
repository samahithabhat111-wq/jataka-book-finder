import { useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createJataka, findDuplicates, updateJataka } from "@/api/jataka";
import { prepareImage, type PhotoPayload } from "@/lib/image";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusDot, STATUS_META, type JatakaStatus } from "@/components/status-badge";
import { fmtDate } from "@/lib/format";

export type JatakaFormValues = {
  jataka_number: string;
  client_name: string;
  date_of_birth: string;
  time_of_birth: string;
  father_name: string;
  mother_name: string;
  phone: string;
  place: string;
  status: JatakaStatus;
};

export const EMPTY_FORM: JatakaFormValues = {
  jataka_number: "",
  client_name: "",
  date_of_birth: "",
  time_of_birth: "",
  father_name: "",
  mother_name: "",
  phone: "",
  place: "",
  status: "preparing",
};

type Dup = { id: string; jataka_number: string; client_name: string | null; date_of_birth: string; phone: string | null };

export function JatakaForm({
  initial = EMPTY_FORM,
  initialPhotoUrl = null,
  editId,
}: {
  initial?: JatakaFormValues;
  initialPhotoUrl?: string | null;
  editId?: string;
}) {
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [dups, setDups] = useState<Dup[] | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof JatakaFormValues, string>>>({});
  // undefined = unchanged, null = remove, payload = new photo
  const [photo, setPhoto] = useState<PhotoPayload | null | undefined>(undefined);
  const [preview, setPreview] = useState<string | null>(initialPhotoUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const { payload, previewUrl } = await prepareImage(file);
      setPhoto(payload);
      setPreview(previewUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that image");
    }
  }

  function removePhoto() {
    setPhoto(initialPhotoUrl || editId ? null : undefined);
    setPreview(null);
  }

  const set = <K extends keyof JatakaFormValues>(k: K, v: JatakaFormValues[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  function validate() {
    const e: typeof errors = {};
    if (!form.jataka_number.trim()) e.jataka_number = "Jataka Number is required";
    if (!form.date_of_birth) e.date_of_birth = "Date of Birth is required";
    if (!form.time_of_birth) e.time_of_birth = "Time of Birth is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(force: boolean) {
    if (!validate()) return;
    setBusy(true);
    try {
      if (!force) {
        const found = (await findDuplicates({
          data: {
            exclude_id: editId,
            client_name: form.client_name,
            date_of_birth: form.date_of_birth,
            time_of_birth: form.time_of_birth,
            phone: form.phone,
          },
        })) as Dup[];
        if (found.length) {
          setDups(found);
          setBusy(false);
          return;
        }
      }
      setDups(null);
      if (editId) {
        await updateJataka({ data: { id: editId, values: { ...form, photo } } });
        toast.success("Jataka updated");
        navigate({ to: "/jatakas/$id", params: { id: editId } });
      } else {
        const { id } = await createJataka({ data: { ...form, photo } });
        toast.success("Jataka saved");
        navigate({ to: "/jatakas/$id", params: { id } });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      if (/Jataka Number already exists/i.test(msg)) setErrors((e) => ({ ...e, jataka_number: "This Jataka Number already exists." }));
      toast.error(msg);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(false);
        }}
        className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2"
      >
        <Field label="Jataka Number" required error={errors.jataka_number}>
          <Input value={form.jataka_number} onChange={(e) => set("jataka_number", e.target.value)} placeholder="Enter Jataka Number (Manual)" autoFocus={!editId} />
        </Field>
        <Field label="Client Name">
          <Input value={form.client_name} onChange={(e) => set("client_name", e.target.value)} placeholder="Enter Client Name" />
        </Field>
        <Field label="Date of Birth" required error={errors.date_of_birth}>
          <Input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
        </Field>
        <Field label="Time of Birth" required error={errors.time_of_birth}>
          <Input type="time" value={form.time_of_birth} onChange={(e) => set("time_of_birth", e.target.value)} />
        </Field>
        <Field label="Father's Name">
          <Input value={form.father_name} onChange={(e) => set("father_name", e.target.value)} placeholder="Enter Father's Name" />
        </Field>
        <Field label="Mother's Name">
          <Input value={form.mother_name} onChange={(e) => set("mother_name", e.target.value)} placeholder="Enter Mother's Name" />
        </Field>
        <Field label="Phone Number">
          <Input type="tel" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Enter Phone Number" />
        </Field>
        <Field label="Place">
          <Input value={form.place} onChange={(e) => set("place", e.target.value)} placeholder="Enter Place" />
        </Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => set("status", v as JatakaStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["preparing", "ready", "collected"] as const).map((s) => (
                <SelectItem key={s} value={s}>
                  <span className="flex items-center gap-2">
                    <StatusDot status={s} className="h-2.5 w-2.5" /> {STATUS_META[s].label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-sm font-medium">Photo</Label>
          <div className="flex items-center gap-4 rounded-lg border border-dashed bg-muted/30 p-3">
            {preview ? (
              <img src={preview} alt="Selected photo" className="h-24 w-24 rounded-md border object-cover" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-md border bg-card text-muted-foreground">
                <ImagePlus className="h-7 w-7" />
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Optional. Saved securely with this Jataka and visible to anyone who can sign in.</p>
              <div className="flex flex-wrap gap-2">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <ImagePlus className="mr-1.5 h-4 w-4" /> {preview ? "Change photo" : "Add photo"}
                </Button>
                {preview && (
                  <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={removePhoto}>
                    <Trash2 className="mr-1.5 h-4 w-4" /> Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 md:col-span-2">
          <p className="text-xs text-muted-foreground">* Required Fields</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => history.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="min-w-24">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editId ? "Save Changes" : "Save"}
            </Button>
          </div>
        </div>
      </form>

      {dups && dups.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-950">
          <AlertTriangle className="h-4 w-4 !text-amber-600" />
          <AlertTitle>Possible duplicate found.</AlertTitle>
          <AlertDescription>
            <p className="mb-2">A record with the same name, date and time of birth, or the same phone number already exists:</p>
            <ul className="mb-3 space-y-1">
              {dups.map((d) => (
                <li key={d.id} className="text-sm">
                  <Link to="/jatakas/$id" params={{ id: d.id }} className="font-mono font-semibold underline">
                    {d.jataka_number}
                  </Link>
                  {" — "}
                  {d.client_name || "—"} · DOB {fmtDate(d.date_of_birth)}
                  {d.phone ? ` · ${d.phone}` : ""}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/jatakas/$id" params={{ id: dups[0].id }}>
                  Open Existing Record
                </Link>
              </Button>
              <Button size="sm" onClick={() => void submit(true)} disabled={busy}>
                Save Anyway
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
