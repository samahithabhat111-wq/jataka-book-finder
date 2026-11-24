import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  BarChart3,
  Clock,
  Library,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  Search as SearchIcon,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import { signOut as signOutFn } from "@/api/jataka";
import { useAuth, loadUser, setCachedUser } from "@/lib/auth";
import { APP_NAME, APP_SHORT } from "@/lib/brand";
import { SmartSearch } from "@/components/smart-search";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const user = await loadUser();
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: AuthedLayout,
});

const ALL_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { to: "/jatakas/new", label: "Add New Jataka", icon: PlusCircle, adminOnly: true },
  { to: "/search", label: "Search Jataka", icon: SearchIcon, adminOnly: false },
  { to: "/advanced", label: "Advanced Search", icon: SlidersHorizontal, adminOnly: false },
  { to: "/recent", label: "Recent Entries", icon: Clock, adminOnly: false },
  { to: "/jatakas", label: "All Jatakas", icon: Library, adminOnly: false },
  { to: "/reports", label: "Reports", icon: BarChart3, adminOnly: false },
  { to: "/settings", label: "Settings", icon: Settings, adminOnly: false },
] as const;

function NavList({ pathname, isAdmin, onNavigate, onLogout }: { pathname: string; isAdmin: boolean; onNavigate?: () => void; onLogout: () => void }) {
  const NAV = ALL_NAV.filter((n) => isAdmin || !n.adminOnly);
  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
      {NAV.map((n) => {
        const active = n.to === "/jatakas" ? pathname === "/jatakas" : pathname === n.to || pathname.startsWith(n.to + "/");
        const Icon = n.icon;
        return (
          <Link
            key={n.to}
            to={n.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_3px_0_0_0_var(--primary)]" : "text-foreground/80 hover:bg-muted",
            )}
          >
            <Icon className="h-4 w-4" /> {n.label}
          </Link>
        );
      })}
      <button
        onClick={onLogout}
        className="mt-auto flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted"
      >
        <LogOut className="h-4 w-4" /> Logout
      </button>
    </nav>
  );
}

function AuthedLayout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [menu, setMenu] = useState(false);

  async function logout() {
    await signOutFn();
    setCachedUser(null);
    navigate({ to: "/auth", replace: true });
  }

  const name = auth.user?.full_name || auth.user?.username || "";
  const isAdmin = auth.user?.role === "admin";
  const showSearch = pathname !== "/search";

  return (
    <div className="flex min-h-screen flex-col">
      <Toaster richColors position="top-right" />
      <header className="brand-bar sticky top-0 z-30 text-white shadow">
        <div className="flex h-14 items-center gap-3 px-3 md:px-5">
          <button onClick={() => setMenu(true)} className="rounded p-2 hover:bg-white/10 md:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2 font-bold tracking-wide md:w-60">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg ring-1 ring-[oklch(0.78_0.14_85)]">ॐ</span>
            <span className="hidden text-sm leading-tight lg:block">{APP_NAME}</span>
            <span className="text-lg lg:hidden">{APP_SHORT}</span>
          </Link>
          {showSearch && (
            <div className="hidden max-w-xl flex-1 text-foreground md:block">
              <SmartSearch />
            </div>
          )}
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right text-sm font-medium leading-tight">{name}</div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-semibold uppercase ring-1 ring-[oklch(0.78_0.14_85)]">
              {name.charAt(0)}
            </div>
          </div>
        </div>
        {showSearch && (
          <div className="px-3 pb-3 text-foreground md:hidden">
            <SmartSearch />
          </div>
        )}
      </header>

      <div className="flex flex-1">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
          <NavList pathname={pathname} isAdmin={isAdmin} onLogout={logout} />
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="left" className="flex w-64 flex-col gap-0 p-0">
          <SheetHeader className="brand-bar p-4 text-white">
            <SheetTitle className="text-white">{APP_NAME}</SheetTitle>
          </SheetHeader>
          <NavList pathname={pathname} isAdmin={isAdmin} onNavigate={() => setMenu(false)} onLogout={logout} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
