import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle2, Clock, FileText, 
         TrendingUp, Award, Target, Download } from "lucide-react";
import { exportLessonPdf } from "@/lib/document-export";

export const Route = createFileRoute("/_app/progress")({ 
  component: ProgressPage 
});

function ProgressPage() {
  const { user, role } = useAuth();
  const isTeacher = role === "teacher";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">
          {isTeacher ? "📊 Student Progress" : "📈 My Progress"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isTeacher 
            ? "Track how your students are performing." 
            : "See how far you have come!"}
        </p>
      </div>
      {isTeacher ? <TeacherProgress /> : <StudentProgress userId={user?.id} />}
    </div>
  );
}

function StudentProgress({ userId }: { userId?: string }) {
  const quizQ = useQuery({
    queryKey: ["student-quiz-progress", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("id, score, total, created_at, lesson_id")
        .eq("student_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const homeworkQ = useQuery({
    queryKey: ["student-homework-progress", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homework_submissions")
        .select("id, file_name, created_at, lesson_id")
        .eq("student_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const quizzes = quizQ.data ?? [];
  const homeworks = homeworkQ.data ?? [];

  const totalScore = quizzes.reduce((sum, q) => sum + q.score, 0);
  const totalPossible = quizzes.reduce((sum, q) => sum + q.total, 0);
  const avgPercent = totalPossible > 0 
    ? Math.round((totalScore / totalPossible) * 100) 
    : 0;

  const passedQuizzes = quizzes.filter(q => 
    q.total > 0 && (q.score / q.total) >= 0.6
  ).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Target}
          label="Quizzes Taken"
          value={quizzes.length}
          color="text-blue-500"
          bg="bg-blue-50"
        />
        <StatCard
          icon={Award}
          label="Average Score"
          value={`${avgPercent}%`}
          color="text-amber-500"
          bg="bg-amber-50"
        />
        <StatCard
          icon={CheckCircle2}
          label="Quizzes Passed"
          value={passedQuizzes}
          color="text-green-500"
          bg="bg-green-50"
        />
        <StatCard
          icon={FileText}
          label="Homework Done"
          value={homeworks.length}
          color="text-purple-500"
          bg="bg-purple-50"
        />
      </div>

      {/* Overall Progress Bar */}
      <Card className="p-6 shadow-soft">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">
            Overall Performance
          </h2>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Quiz Average</span>
              <span className="font-medium">{avgPercent}%</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  avgPercent >= 75 ? "bg-green-500" :
                  avgPercent >= 50 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${avgPercent}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Homework Completion</span>
              <span className="font-medium">{homeworks.length} submitted</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-purple-500 transition-all"
                style={{ 
                  width: `${Math.min((homeworks.length / 10) * 100, 100)}%` 
                }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Quiz History */}
      <Card className="p-6 shadow-soft">
        <h2 className="font-display text-lg font-semibold mb-4">
          📝 Quiz History
        </h2>
        {quizzes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No quizzes taken yet. Start learning!
          </p>
        ) : (
          <div className="space-y-3">
            {quizzes.map((q: any) => {
              const pct = q.total > 0 
                ? Math.round((q.score / q.total) * 100) 
                : 0;
              return (
                <div key={q.id} 
                  className="flex items-center justify-between 
                             rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">
                      Quiz Attempt
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(q.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold">
                        {q.score}/{q.total}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pct}%
                      </p>
                    </div>
                    <Badge className={
                      pct >= 75 ? "bg-green-100 text-green-800" :
                      pct >= 50 ? "bg-amber-100 text-amber-800" :
                      "bg-red-100 text-red-800"
                    }>
                      {pct >= 75 ? "Pass" : 
                       pct >= 50 ? "Average" : "Needs Work"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Homework History */}
      <Card className="p-6 shadow-soft">
        <h2 className="font-display text-lg font-semibold mb-4">
          📚 Homework History
        </h2>
        {homeworks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No homework submitted yet.
          </p>
        ) : (
          <div className="space-y-3">
            {homeworks.map((h: any) => (
              <div key={h.id} 
                className="flex items-center justify-between 
                           rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {h.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(h.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-800 shrink-0">
                  ✓ Submitted
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function TeacherProgress() {
  const { user } = useAuth();

  const studentsQ = useQuery({
    queryKey: ["teacher-students-progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_teacher_progress");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.student_id,
        name: r.full_name ?? "Unknown Student",
        email: "",
        level: r.assigned_grade ?? "Beginner",
        quizzes: Number(r.quizzes ?? 0),
        avgScore: Number(r.avg_score ?? 0),
        homework: Number(r.homework ?? 0),
      }));
    },
  });

  const students = studentsQ.data ?? [];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={BookOpen}
          label="Total Students"
          value={students.length}
          color="text-blue-500"
          bg="bg-blue-50"
        />
        <StatCard
          icon={Award}
          label="Class Average"
          value={students.length > 0
            ? `${Math.round(students.reduce((s, st) => 
                s + st.avgScore, 0) / students.length)}%`
            : "—"
          }
          color="text-amber-500"
          bg="bg-amber-50"
        />
        <StatCard
          icon={FileText}
          label="Total Submissions"
          value={students.reduce((s, st) => s + st.homework, 0)}
          color="text-purple-500"
          bg="bg-purple-50"
        />
      </div>

      {/* Students Table */}
      <Card className="p-6 shadow-soft">
        <h2 className="font-display text-lg font-semibold mb-4">
          👨‍🎓 All Students Progress
        </h2>
        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No student activity yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs 
                               uppercase tracking-wider 
                               text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Student</th>
                  <th className="py-2 pr-4">Level</th>
                  <th className="py-2 pr-4">Quizzes</th>
                  <th className="py-2 pr-4">Avg Score</th>
                  <th className="py-2 pr-4">Homework</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.email}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge className={
                        s.level === "Beginner" 
                          ? "bg-green-100 text-green-800" :
                        s.level === "Intermediate" 
                          ? "bg-blue-100 text-blue-800" :
                        s.level === "Advanced" 
                          ? "bg-amber-100 text-amber-800" :
                        "bg-purple-100 text-purple-800"
                      }>
                        {s.level}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">{s.quizzes}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${
                              s.avgScore >= 75 ? "bg-green-500" :
                              s.avgScore >= 50 ? "bg-amber-500" : 
                              "bg-red-500"
                            }`}
                            style={{ width: `${s.avgScore}%` }}
                          />
                        </div>
                        <span>{s.avgScore}%</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">{s.homework}</td>
                    <td className="py-3 pr-4">
                      <Badge className={
                        s.avgScore >= 75 
                          ? "bg-green-100 text-green-800" :
                        s.avgScore >= 50 
                          ? "bg-amber-100 text-amber-800" :
                        "bg-red-100 text-red-800"
                      }>
                        {s.avgScore >= 75 ? "Excellent" :
                         s.avgScore >= 50 ? "Good" : "Needs Help"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  color: string;
  bg: string;
}) {
  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className={`grid h-9 w-9 place-items-center rounded-lg ${bg}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </div>
      <p className="mt-3 font-display text-3xl font-bold">{value}</p>
    </Card>
  );
}
