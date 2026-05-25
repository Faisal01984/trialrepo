import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Sparkles, LayoutDashboard, PlusCircle, BookOpen, Settings, LogOut, GraduationCap, TrendingUp, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app")({ component: AppLayout });

function AppLayout() {
  const { session, loading, role, signOut, user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  }

  const isTeacher = role === "teacher";
  const nav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: true },
    { to: "/create-lesson", label: "Create lesson", icon: PlusCircle, show: isTeacher },
    { to: "/library", label: "Lesson library", icon: BookOpen, show: true },
    { to: "/settings", label: "Settings", icon: Settings, show: true },
    { to: "/progress", label: "Progress", icon: TrendingUp, show: true },
  ];

  return (
    <div className="min-h-screen flex bg-secondary/30">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar">
        <Link to="/dashboard" className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <div className="grid h-8 w-8 place-items-center rounded-lg gradient-emerald">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-base font-bold">AI PathShala</span>
        </Link>
        <nav className="flex-1 space-y-1 p-3">
          {nav.filter((n) => n.show).map((n) => {
            const active = pathname === n.to;
            return (
              <Link key={n.to} to={n.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-primary text-primary-foreground shadow-soft" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}>
                <n.icon className="h-4 w-4" />{n.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* mobile top bar (logo only — user chip lives in main area top-right) */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex h-14 items-center border-b bg-background px-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md gradient-emerald">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-display text-sm font-bold">AI PathShala</span>
        </Link>
      </div>

      <main className="flex-1 md:p-8 p-4 pt-20 md:pt-8 overflow-x-hidden">
        {/* Top-right user chip — desktop + mobile */}
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1 shadow-soft">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-secondary">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="hidden sm:flex flex-col leading-tight pr-1">
              <span className="text-xs font-medium capitalize flex items-center gap-1">
                <GraduationCap className="h-3 w-3 text-primary" />{role ?? "user"}
              </span>
              <span className="text-[11px] text-muted-foreground truncate max-w-[160px]">{user?.email}</span>
            </div>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
              <LogOut className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline text-xs">Sign out</span>
            </Button>
          </div>
        </div>
        <Outlet />
        {/* mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4 border-t bg-background">
          {nav.filter((n) => n.show).slice(0, 4).map((n) => {
            const active = pathname === n.to;
            return (
              <Link key={n.to} to={n.to} className={`flex flex-col items-center gap-1 py-2 text-xs ${active ? "text-primary" : "text-muted-foreground"}`}>
                <n.icon className="h-4 w-4" />{n.label.split(" ")[0]}
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
