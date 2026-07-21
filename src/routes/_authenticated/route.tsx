import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SmartSearch } from "@/components/smart-search";
import { LogOut, LayoutDashboard, Plus, Search as SearchIcon } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/search", label: "Advanced Search", icon: SearchIcon },
    ...(auth.isAdmin ? [{ to: "/jatakas/new", label: "Add Jataka", icon: Plus }] : []),
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-right" />
      <header className="border-b sticky top-0 z-30 bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center justify-between md:w-64">
            <Link to="/dashboard" className="font-bold text-lg">Jataka Manager</Link>
            <div className="md:hidden flex items-center gap-2">
              {auth.role && <Badge variant={auth.isAdmin ? "default" : "secondary"}>{auth.role}</Badge>}
              <Button size="sm" variant="ghost" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="flex-1 max-w-2xl">
            <SmartSearch />
          </div>
          <div className="hidden md:flex items-center gap-2">
            {auth.role && <Badge variant={auth.isAdmin ? "default" : "secondary"}>{auth.role}</Badge>}
            <Button size="sm" variant="ghost" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {nav.map((n) => {
            const active = pathname === n.to || pathname.startsWith(n.to + "/");
            const Icon = n.icon;
            return (
              <Link key={n.to} to={n.to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm whitespace-nowrap ${
                  active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}>
                <Icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
