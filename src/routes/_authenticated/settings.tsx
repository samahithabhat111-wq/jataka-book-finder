import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { changeOwnPassword, createUser, deleteUser, listUsers, resetUserPassword } from "@/api/jataka";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Shri Ganesha Jyotishyalaya" }] }),
  component: SettingsPage,
});

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

function SettingsPage() {
  const isAdmin = useAuth().user?.role === "admin";
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? "Manage your password and the people who can sign in." : "Manage your password."}
        </p>
      </div>
      <PasswordCard />
      {isAdmin && <UsersCard />}
    </div>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await changeOwnPassword({ data: { current, next } });
      toast.success("Password changed");
      setCurrent("");
      setNext("");
    } catch (err) {
      toast.error(errMsg(err));
    }
    setBusy(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Change password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Current password</Label>
            <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>New password</Label>
            <Input type="password" autoComplete="new-password" minLength={6} value={next} onChange={(e) => setNext(e.target.value)} required />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

type UserRow = Awaited<ReturnType<typeof listUsers>>[number];

function UsersCard() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [form, setForm] = useState<{ username: string; full_name: string; password: string; role: "admin" | "astrologer" }>({
    username: "",
    full_name: "",
    password: "",
    role: "astrologer",
  });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => listUsers().then(setUsers), []);
  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createUser({ data: form });
      toast.success(`User “${form.username}” created`);
      setForm({ ...form, username: "", full_name: "", password: "" });
      await load();
    } catch (err) {
      toast.error(errMsg(err));
    }
    setBusy(false);
  }

  async function reset(u: UserRow) {
    const password = window.prompt(`New password for ${u.username} (min 6 characters):`);
    if (!password) return;
    try {
      await resetUserPassword({ data: { id: u.id, password } });
      toast.success("Password reset");
    } catch (err) {
      toast.error(errMsg(err));
    }
  }

  async function remove(u: UserRow) {
    if (!window.confirm(`Delete user “${u.username}”?`)) return;
    try {
      await deleteUser({ data: { id: u.id } });
      toast.success("User deleted");
      await load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Users</CardTitle>
        <CardDescription>Admins can add, edit and delete records. Astrologers can only search and view.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Username</Label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="e.g. ravi" required />
          </div>
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input type="password" autoComplete="new-password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "astrologer" })}
            >
              <option value="astrologer">Astrologer (view only)</option>
              <option value="admin">Admin (full access)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />} Add user
            </Button>
          </div>
        </form>

        <ul className="divide-y rounded-md border">
          {users === null && <li className="p-4 text-sm text-muted-foreground">Loading…</li>}
          {users?.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {u.full_name || u.username} {u.id === me?.id && <span className="text-xs text-muted-foreground">(you)</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">@{u.username} · {u.role} · added {fmtDateTime(u.created_at)}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => reset(u)}>
                <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
              {u.id !== me?.id && (
                <Button variant="outline" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(u)} aria-label={`Delete ${u.username}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
