import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, GraduationCap, PlusCircle, Sparkles, ArrowRight, Bell, BellRing, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { audienceLabel, audienceBadgeClass } from "@/lib/grades";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user, role } = useAuth();
  const isTeacher = role === "teacher";

  const lessonsQ = useQuery({
    queryKey: ["lessons", isTeacher ? "mine" : "all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("list_lessons_for_viewer");
      if (error) throw error;
      return (data ?? []).slice(0, 6);
    },
  });

  const statsQ = useQuery({
    queryKey: ["stats", user?.id, role],
    enabled: !!user,
    queryFn: async () => {
      const { data: lessonCount, error: lessonCountError } = await (supabase.rpc as any)("count_lessons_for_viewer");
      if (lessonCountError) throw lessonCountError;
      if (isTeacher) {
        const [{ count: attempts }] = await Promise.all([
          supabase.from("quiz_attempts").select("id", { count: "exact", head: true }),
        ]);
        return { lessons: Number(lessonCount ?? 0), attempts: attempts ?? 0 };
      }
      const [{ count: attempts }, { count: subs }] = await Promise.all([
        supabase.from("quiz_attempts").select("id", { count: "exact", head: true }).eq("student_id", user!.id),
        supabase.from("homework_submissions").select("id", { count: "exact", head: true }).eq("student_id", user!.id),
      ]);
      return { lessons: Number(lessonCount ?? 0), attempts: attempts ?? 0, subs: subs ?? 0 };
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Welcome back 👋</h1>
          <p className="text-sm text-muted-foreground">
            {isTeacher ? "Create a new lesson or review your library." : "Pick a lesson to read or attempt a quiz."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isTeacher && <NotificationBell userId={user?.id} />}
          {isTeacher && (
            <Link to="/create-lesson">
              <Button className="gradient-emerald text-primary-foreground shadow-soft">
                <PlusCircle className="mr-2 h-4 w-4" /> Generate lesson
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={BookOpen} label={isTeacher ? "Your lessons" : "Available lessons"} value={statsQ.data?.lessons ?? "—"} />
        <StatCard icon={FileText} label={isTeacher ? "Quiz attempts" : "Quizzes taken"} value={statsQ.data?.attempts ?? "—"} />
        <StatCard icon={GraduationCap} label={isTeacher ? "Role" : "Homework submitted"} value={isTeacher ? "Teacher" : (statsQ.data?.subs ?? "—")} />
      </div>

      {/* Student Notifications Panel */}
      {!isTeacher && <StudentNotificationsPanel userId={user?.id} />}

      <Card className="border-border shadow-soft">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="font-display text-lg font-semibold">Recent lessons</h2>
            <p className="text-xs text-muted-foreground">Your latest activity</p>
          </div>
          <Link to="/library"><Button variant="ghost" size="sm">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></Link>
        </div>
        <div className="divide-y">
          {lessonsQ.isLoading && <div className="p-6 text-sm text-muted-foreground">Loading…</div>}
          {!lessonsQ.isLoading && (lessonsQ.data?.length ?? 0) === 0 && (
            <div className="p-10 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="mt-3 font-medium">No lessons yet</p>
              <p className="text-sm text-muted-foreground">
                {isTeacher
                  ? "Generate your first lesson to get started."
                  : "Aapki class ke liye abhi koi naya lesson nahi hai."}
              </p>
              {isTeacher && <Link to="/create-lesson"><Button className="mt-4 gradient-emerald text-primary-foreground">Create lesson</Button></Link>}
            </div>
          )}
          {lessonsQ.data?.map((l: any) => (
            <Link key={l.id} to="/lesson/$id" params={{ id: l.id }}
              className="flex items-center justify-between gap-4 p-5 transition hover:bg-secondary/50">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="truncate font-medium">{l.title}</div>
                  {l.target_grade && (
                    <Badge variant="outline" className={`shrink-0 text-[10px] font-medium ${audienceBadgeClass(l.target_grade)}`}>
                      {audienceLabel(l.target_grade)}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{l.subject} · {l.grade} · {new Date(l.created_at).toLocaleDateString()}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}

// 🔔 Bell icon with unread count badge
function NotificationBell({ userId }: { userId?: string }) {
  const [open, setOpen] = useState(false);
  const unreadQ = useQuery({
    queryKey: ["notifications-unread", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count } = await supabase
        .from("student_notifications")
        .select("id", { count: "exact", head: true })
        .eq("student_id", userId!)
        .eq("is_read", false);
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)} className="relative">
        {(unreadQ.data ?? 0) > 0 ? <BellRing className="h-4 w-4 text-primary" /> : <Bell className="h-4 w-4" />}
        {(unreadQ.data ?? 0) > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadQ.data}
          </span>
        )}
      </Button>
    </div>
  );
}

// 📬 Student Notifications Panel
function StudentNotificationsPanel({ userId }: { userId?: string }) {
  const qc = useQueryClient();
  const notifQ = useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_notifications")
        .select("id, is_read, created_at, notifications(lesson_id, lesson_title, subject, target_level, message)")
        .eq("student_id", userId!)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("student_notifications").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", userId] });
      qc.invalidateQueries({ queryKey: ["notifications-unread", userId] });
    },
  });

  const unread = (notifQ.data ?? []).filter((n: any) => !n.is_read).length;

  if ((notifQ.data ?? []).length === 0) return null;

  return (
    <Card className="border-border shadow-soft">
      <div className="flex items-center justify-between border-b p-5">
        <div className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Notifications</h2>
          {unread > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </div>
      </div>
      <div className="divide-y">
        {notifQ.isLoading && <div className="p-6 text-sm text-muted-foreground">Loading…</div>}
        {(notifQ.data ?? []).map((n: any) => (
          <div key={n.id} className={`flex items-start justify-between gap-4 p-4 ${!n.is_read ? "bg-primary/5" : ""}`}>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                <p className="text-sm font-medium">{n.notifications?.lesson_title ?? "New Lesson"}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {n.notifications?.subject} · {n.notifications?.target_level}
              </p>
              <p className="text-xs text-muted-foreground">{n.notifications?.message}</p>
              <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              {n.notifications?.lesson_id && (
                <Link to="/lesson/$id" params={{ id: n.notifications.lesson_id }}>
                  <Button size="sm" variant="outline" className="text-xs">View Lesson</Button>
                </Link>
              )}
              {!n.is_read && (
                <Button size="sm" variant="ghost" onClick={() => markRead.mutate(n.id)}>
                  <Check className="h-4 w-4 text-primary" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <Card className="border-border p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary"><Icon className="h-4 w-4" /></div>
      </div>
      <div className="mt-3 font-display text-3xl font-bold">{value}</div>
    </Card>
  );
}
