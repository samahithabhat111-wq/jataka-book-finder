import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signIn } from "@/api/jataka";
import { loadUser, setCachedUser } from "@/lib/auth";
import { APP_NAME, APP_NAME_DEVANAGARI, APP_OWNER, APP_OWNER_DEVANAGARI } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: `Sign in — ${APP_NAME}` },
      { name: "description", content: `Sign in to ${APP_NAME}.` },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadUser().then((user) => {
      if (user) navigate({ to: "/dashboard", replace: true });
      else setChecking(false);
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      setCachedUser(await signIn({ data: { username, password } }));
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setBusy(false);
    }
  }

  if (checking) return null;

  return (
    <div className="mandala-bg flex min-h-screen items-center justify-center bg-secondary p-0 sm:p-6">
      <div className="grid w-full max-w-4xl overflow-hidden border-[oklch(0.78_0.14_85)] bg-card shadow-2xl sm:rounded-2xl sm:border-2 md:grid-cols-[1fr_1fr]">
        <div className="brand-panel relative flex min-h-80 flex-col justify-end md:min-h-[34rem]">
          <img
            src="/ganesha.jpg"
            alt="Lord Ganesha seated on a lotus"
            className="absolute inset-0 h-full w-full object-cover object-[50%_42%] md:object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.22_0.08_28)] via-[oklch(0.22_0.08_28/0.35)] to-transparent" />
          <div
            aria-hidden
            className="absolute left-1/2 top-4 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border-2 border-[oklch(0.78_0.14_85)] bg-[oklch(0.3_0.11_28/0.85)] text-3xl text-[oklch(0.9_0.13_85)] shadow-lg backdrop-blur"
          >
            ॐ
          </div>
          <div className="relative px-6 pb-6 pt-24 text-center text-white">
            <p className="text-sm tracking-widest text-[oklch(0.88_0.13_85)]">॥ श्री गणेशाय नमः ॥</p>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">{APP_NAME}</h1>
            <p className="mt-2 text-sm text-white/90">
              <span className="text-[oklch(0.88_0.13_85)]">❖</span> Owned &amp; Guided by <span className="font-semibold">{APP_OWNER}</span>{" "}
              <span className="text-[oklch(0.88_0.13_85)]">❖</span>
            </p>
            <p className="mt-1 text-xs tracking-wide text-white/75">स्वामी: {APP_OWNER_DEVANAGARI} · शुभं भवतु</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col justify-center gap-5 px-6 py-10 sm:px-10">
          <div className="text-center md:text-left">
            <p className="text-xs font-medium tracking-wider text-primary">{APP_NAME_DEVANAGARI}</p>
            <h2 className="mt-1 text-2xl font-bold">Welcome Back</h2>
            <p className="mt-1 text-sm text-muted-foreground">Please login to your account</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" autoComplete="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" disabled={busy} className="w-full">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {busy ? "Signing in…" : "Login"}
          </Button>
        </form>
      </div>
    </div>
  );
}
