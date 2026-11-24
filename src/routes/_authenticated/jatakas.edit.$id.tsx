import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getJataka, getPhoto } from "@/api/jataka";
import { JatakaForm, type JatakaFormValues } from "@/components/jataka-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/jatakas/edit/$id")({
  beforeLoad: ({ context }) => {
    if (context.user.role !== "admin") throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Edit Jataka — Shri Ganesha Jyotishyalaya" }] }),
  component: EditJataka,
});

function EditJataka() {
  const { id } = Route.useParams();
  const [values, setValues] = useState<JatakaFormValues | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    getJataka({ data: { id } }).then(async (r) => {
      if (!r) return setMissing(true);
      const row = r as unknown as Record<string, string | number | null>;
      if (row.has_photo) setPhotoUrl((await getPhoto({ data: { id } }))?.url ?? null);
      setValues({
        jataka_number: String(row.jataka_number ?? ""),
        client_name: String(row.client_name ?? ""),
        date_of_birth: String(row.date_of_birth ?? ""),
        time_of_birth: String(row.time_of_birth ?? "").slice(0, 5),
        father_name: String(row.father_name ?? ""),
        mother_name: String(row.mother_name ?? ""),
        phone: String(row.phone ?? ""),
        place: String(row.place ?? ""),
        status: (row.status ?? "preparing") as JatakaFormValues["status"],
      });
    });
  }, [id]);

  if (missing) return <p className="text-muted-foreground">Record not found.</p>;

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle>Edit Jataka</CardTitle>
      </CardHeader>
      <CardContent>
        {values ? (
          <JatakaForm initial={values} initialPhotoUrl={photoUrl} editId={id} />
        ) : (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}
      </CardContent>
    </Card>
  );
}
