import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Edit, ImageOff, Loader2, Trash2, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { deleteJataka, getJataka, getPhoto } from "@/api/jataka";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { STATUS_META, StatusDot } from "@/components/status-badge";
import type { JatakaRow } from "@/components/jataka-table";
import { fmtDate, fmtDateTime, fmtTime } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/jatakas/$id")({
  head: () => ({ meta: [{ title: "Jataka Details — Shri Ganesha Jyotishyalaya" }] }),
  component: JatakaDetail,
});

function JatakaDetail() {
  const { id } = Route.useParams();
  const isAdmin = useAuth().user?.role === "admin";
  const navigate = useNavigate();
  const [rec, setRec] = useState<JatakaRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoState, setPhotoState] = useState<"none" | "loading" | "ready">("none");
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setPhoto(null);
    setPhotoState("none");
    getJataka({ data: { id } })
      .then(async (r) => {
        if (!live) return;
        setRec(r as JatakaRow | null);
        if (r?.has_photo) {
          setPhotoState("loading");
          const p = await getPhoto({ data: { id } });
          if (!live) return;
          setPhoto(p?.url ?? null);
          setPhotoState(p ? "ready" : "none");
        }
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [id]);

  async function remove() {
    setDeleting(true);
    try {
      await deleteJataka({ data: { id } });
      toast.success("Jataka deleted");
      navigate({ to: "/jatakas", search: { page: 1, status: undefined } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (!rec) return <p className="text-muted-foreground">Record not found.</p>;

  const meta = STATUS_META[rec.status];
  const rows: [string, string][] = [
    ["Client Name", rec.client_name || "—"],
    ["Date of Birth", fmtDate(rec.date_of_birth)],
    ["Time of Birth", fmtTime(rec.time_of_birth)],
    ["Father's Name", rec.father_name || "—"],
    ["Mother's Name", rec.mother_name || "—"],
    ["Phone Number", rec.phone || "—"],
    ["Place", rec.place || "—"],
    ["Status", meta.label],
    ["Created Date", fmtDateTime(rec.created_at)],
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="text-primary" onClick={() => history.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Results
        </Button>
        {isAdmin && (
        <div className="flex gap-2">
          <Button size="sm" asChild>
            <Link to="/jatakas/edit/$id" params={{ id }}>
              <Edit className="mr-1.5 h-4 w-4" /> Edit
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Jataka {rec.jataka_number}?</AlertDialogTitle>
                <AlertDialogDescription>This permanently removes the record and its photo. This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={remove} disabled={deleting} className="bg-destructive text-white hover:bg-destructive/90">
                  {deleting ? "Deleting…" : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        )}
      </div>

      <Card className="border-[oklch(0.85_0.08_85)]">
        <CardContent className="grid gap-6 p-5 sm:grid-cols-[14rem_1fr] sm:p-8">
          <div className="flex flex-col items-center gap-4 border-b pb-6 text-center sm:border-b-0 sm:border-r sm:pb-0 sm:pr-6">
            <StatusDot status={rec.status} className="h-12 w-12" />
            <span className="-mt-2 text-lg font-semibold">{meta.label}</span>
            <div>
              <p className="text-sm text-muted-foreground">Jataka Number</p>
              <p className="font-mono text-4xl font-bold text-primary">{rec.jataka_number}</p>
            </div>

            <div className="w-full">
              {photoState === "loading" ? (
                <div className="flex h-44 items-center justify-center rounded-lg border bg-muted/40">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : photo ? (
                <button
                  type="button"
                  onClick={() => setZoom(true)}
                  className="group relative block w-full overflow-hidden rounded-lg border bg-muted/40"
                  aria-label="View photo"
                >
                  <img src={photo} alt={`Photo for Jataka ${rec.jataka_number}`} className="h-44 w-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/50 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <ZoomIn className="h-3.5 w-3.5" /> View photo
                  </span>
                </button>
              ) : (
                <div className="flex h-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground">
                  <ImageOff className="h-5 w-5" /> No photo
                </div>
              )}
            </div>
          </div>
          <dl className="space-y-3 text-sm sm:text-base">
            {rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[8.5rem_1fr] gap-2">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Jataka {rec.jataka_number}
              {rec.client_name ? ` — ${rec.client_name}` : ""}
            </DialogTitle>
          </DialogHeader>
          {photo && <img src={photo} alt={`Photo for Jataka ${rec.jataka_number}`} className="max-h-[75vh] w-full rounded-md object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
