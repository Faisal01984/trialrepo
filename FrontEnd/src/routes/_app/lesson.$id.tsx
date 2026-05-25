import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, RotateCcw, Mail, Download, BellRing, Upload, Trash2, FileText, CheckCircle2, FileDown, Target, Clock, BookOpen, GraduationCap, Languages } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { generateLesson } from "@/lib/lesson.functions";
import { exportLessonPdf, exportLessonDocx, quizReportPdf, quizReportDocx, homeworkTemplatePdf, homeworkTemplateDocx, teacherKeyPdf, teacherKeyDocx, homeworkReportPdf, homeworkReportDocx } from "@/lib/document-export";
import { downloadLessonAsPDF } from "@/lib/pdf-snapshot";
import { audienceLabel, audienceBadgeClass } from "@/lib/grades";

export const Route = createFileRoute("/_app/lesson/$id")({ component: LessonView });

type Lesson = {
  id: string; teacher_id: string; title: string; subject: string; grade: string; topic: string;
  duration: number; objectives: string | null; difficulty: string; language: string; content: any;
  target_grade?: string | null;
};

function LessonView() {
  const { id } = Route.useParams();
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const gen = useServerFn(generateLesson);
  const [busy, setBusy] = useState(false);
  const [snapPdf, setSnapPdf] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const lq = useQuery({
    queryKey: ["lesson", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_lesson_for_viewer", { _lesson_id: id });
      if (error) throw error;
      return ((Array.isArray(data) ? data[0] : data) as Lesson | null) ?? null;
    },
  });

  if (lq.isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (!lq.data) {
    // RLS filters out lessons the student isn't entitled to see, so a direct
    // URL for a lesson outside their grade lands here.
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-10 text-center shadow-soft">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
          <BookOpen className="h-5 w-5" />
        </div>
        <h1 className="mt-4 font-display text-xl font-bold">Lesson not available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Aapki class ke liye abhi koi naya lesson nahi hai.
        </p>
      </div>
    );
  }
  const lesson = lq.data;
  const c = (lesson.content ?? {}) as any;
  const isOwner = role === "teacher" && lesson.teacher_id === user?.id;
  const isRTL = lesson.language === "Arabic";

  async function regenerate() {
    if (!isOwner) return;
    setBusy(true);
    const res = await gen({ data: {
      subject: lesson.subject, grade: lesson.grade, topic: lesson.topic,
      duration: lesson.duration, objectives: lesson.objectives ?? "",
      difficulty: lesson.difficulty as any, language: lesson.language,
    }});
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    const { error } = await supabase.from("lessons").update({ content: res.lesson, title: res.lesson.title ?? lesson.title }).eq("id", lesson.id);
    if (error) return toast.error(error.message);
    toast.success("Regenerated");
    qc.invalidateQueries({ queryKey: ["lesson", id] });
  }

  async function sendNotification() {
    if (!isOwner) return;
    const message = `New lesson published: ${lesson.title} for ${lesson.target_grade ?? lesson.grade} students!`;
    const { data: notif, error: notifError } = await supabase
      .from("notifications")
      .insert({
        teacher_id: user!.id,
        lesson_id: lesson.id,
        lesson_title: lesson.title,
        subject: lesson.subject,
        target_level: lesson.target_grade ?? lesson.grade,
        message,
      })
      .select()
      .single();
    if (notifError) return toast.error("Failed to create notification.");

    const { data: students, error: studentsError } = await supabase
      .rpc("get_students_by_level", { _level: lesson.target_grade ?? lesson.grade });
    if (studentsError) return toast.error("Failed to fetch students.");

    if (!students || students.length === 0) {
      toast.warning("No students found for this level.");
      return;
    }

    const rows = students.map((s: any) => ({
      notification_id: notif.id,
      student_id: s.id,
      is_read: false,
    }));

    const { error: insertError } = await supabase
      .from("student_notifications")
      .insert(rows);

    if (insertError) return toast.error("Failed to send notifications.");
    toast.success(`Notification sent to ${students.length} student(s)! 🎉`);
  }
  function emailLesson() {
    const subject = encodeURIComponent(`Lesson: ${lesson.title}`);
    const body = encodeURIComponent(JSON.stringify(c, null, 2));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function downloadPdf() { exportLessonPdf(lesson); }
  function downloadDocx() { void exportLessonDocx(lesson); }

  async function snapshotPdf() {
    if (!printRef.current) return;
    setSnapPdf(true);
    try {
      const safe = (lesson.title || "lesson").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "lesson";
      await downloadLessonAsPDF(printRef.current, `${safe}.pdf`);
      toast.success("PDF downloaded");
    } catch (e: any) {
      console.error(e);
      toast.error("Couldn't generate PDF");
    } finally {
      setSnapPdf(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{lesson.subject} · {lesson.grade} · {lesson.duration} min · {lesson.language}</div>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-bold">{lesson.title}</h1>
            {lesson.target_grade && (
              <Badge variant="outline" className={`text-xs font-medium ${audienceBadgeClass(lesson.target_grade)}`}>
                {audienceLabel(lesson.target_grade)}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={snapshotPdf} disabled={snapPdf} className="gradient-emerald text-primary-foreground">
            {snapPdf ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating PDF…</> : <><FileDown className="mr-2 h-4 w-4" /> Download PDF</>}
          </Button>
          <Button variant="outline" size="sm" onClick={downloadPdf}><Download className="mr-2 h-4 w-4" /> PDF (text)</Button>
          <Button variant="outline" size="sm" onClick={downloadDocx}><FileText className="mr-2 h-4 w-4" /> DOCX</Button>
          <Button variant="outline" size="sm" onClick={emailLesson}><Mail className="mr-2 h-4 w-4" /> Email</Button>
          {isOwner && <Button size="sm" variant="outline" onClick={sendNotification}><BellRing className="mr-2 h-4 w-4" /> Notify Students</Button>}{isOwner && <Button size="sm" disabled={busy} onClick={regenerate} className="gradient-emerald text-primary-foreground">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />} Regenerate
          </Button>}
        </div>
      </div>

      <Tabs defaultValue="fulllesson">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fulllesson">📖 Full Lesson</TabsTrigger>
          <TabsTrigger value="plan">Lesson Plan</TabsTrigger>
          <TabsTrigger value="worksheet">Worksheet</TabsTrigger>
          <TabsTrigger value="quiz">Quiz</TabsTrigger>
          <TabsTrigger value="homework">Homework</TabsTrigger>
          {isOwner && <TabsTrigger value="key">Teacher's Key</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left column — Source image */}
            <div className="flex flex-col">
              {c.sourceImage ? (
                <div className="overflow-hidden rounded-xl border bg-white shadow-soft">
                  <img
                    src={c.sourceImage}
                    alt="Source material"
                    className="h-full max-h-[350px] w-full object-contain"
                    crossOrigin="anonymous"
                  />
                </div>
              ) : (
                <div className="flex h-[260px] flex-col items-center justify-center rounded-xl border bg-muted/50 text-muted-foreground">
                  <BookOpen className="mb-3 h-10 w-10 opacity-40" />
                  <p className="text-sm">No source image uploaded.</p>
                </div>
              )}
            </div>

            {/* Right column — Overview & Objectives */}
            <Card className="p-6 shadow-soft space-y-5">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-semibold">Overview & Objectives</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/60 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" /> Subject
                  </div>
                  <p className="mt-1 text-sm font-medium">{lesson.subject}</p>
                </div>
                <div className="rounded-lg bg-muted/60 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <GraduationCap className="h-3.5 w-3.5" /> Grade
                  </div>
                  <p className="mt-1 text-sm font-medium">{lesson.grade}</p>
                </div>
                <div className="rounded-lg bg-muted/60 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> Duration
                  </div>
                  <p className="mt-1 text-sm font-medium">{lesson.duration} min</p>
                </div>
                <div className="rounded-lg bg-muted/60 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Languages className="h-3.5 w-3.5" /> Language
                  </div>
                  <p className="mt-1 text-sm font-medium">{lesson.language}</p>
                </div>
              </div>

              {lesson.objectives && (
                <div className="rounded-lg bg-primary/5 p-4">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-primary">Learning Objectives</p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">{lesson.objectives}</p>
                </div>
              )}

              <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {c.overview ?? "No overview available."}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fulllesson">
  <div className="space-y-6">
    {c.fullLesson?.objectives?.length > 0 && (
      <Card className="p-6 shadow-soft">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Learning Objectives</h2>
        </div>
        <ul className="space-y-2">
          {c.fullLesson.objectives.map((obj: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>{obj}</span>
            </li>
          ))}
        </ul>
      </Card>
    )}
    {c.fullLesson?.introduction && (
      <Card className="p-6 shadow-soft">
        <h2 className="font-display text-lg font-semibold mb-3">Introduction</h2>
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
          {c.fullLesson.introduction}
        </p>
      </Card>
    )}
    {c.fullLesson?.mainContent && (
      <Card className="p-6 shadow-soft">
        <h2 className="font-display text-lg font-semibold mb-3">📚 Main Lesson Content</h2>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {c.fullLesson.mainContent}
        </p>
      </Card>
    )}
    {c.fullLesson?.keyConcepts?.length > 0 && (
      <Card className="p-6 shadow-soft bg-primary/5 border-primary/20">
        <h2 className="font-display text-lg font-semibold mb-3">🔑 Key Concepts</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {c.fullLesson.keyConcepts.map((concept: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm rounded-lg bg-background p-3 border">
              <span className="font-bold text-primary">#{i + 1}</span>
              <span>{concept}</span>
            </li>
          ))}
        </ul>
      </Card>
    )}
    {c.fullLesson?.workedExamples?.length > 0 && (
      <Card className="p-6 shadow-soft">
        <h2 className="font-display text-lg font-semibold mb-4">✏️ Worked Examples</h2>
        <div className="space-y-4">
          {c.fullLesson.workedExamples.map((ex: any, i: number) => (
            <div key={i} className="rounded-lg border overflow-hidden">
              <div className="bg-muted/60 px-4 py-2 text-sm font-semibold">Example {i + 1}</div>
              <div className="p-4 space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-primary">Problem: </span>{ex.problem}
                </div>
                <div className="text-sm bg-primary/5 rounded p-3">
                  <span className="font-medium text-primary">Solution: </span>{ex.solution}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    )}
    {c.fullLesson?.commonMistakes?.length > 0 && (
      <Card className="p-6 shadow-soft border-destructive/20">
        <h2 className="font-display text-lg font-semibold mb-3">⚠️ Common Mistakes to Avoid</h2>
        <ul className="space-y-2">
          {c.fullLesson.commonMistakes.map((mistake: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm text-destructive bg-destructive/5 rounded-lg p-3">
              <span className="font-bold shrink-0">✗</span>
              <span>{mistake}</span>
            </li>
          ))}
        </ul>
      </Card>
    )}
    {c.fullLesson?.summary && (
      <Card className="p-6 shadow-soft bg-primary/5">
        <h2 className="font-display text-lg font-semibold mb-3">📝 Summary & Recap</h2>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {c.fullLesson.summary}
        </p>
      </Card>
    )}
    {!c.fullLesson && (
      <Card className="p-10 text-center shadow-soft">
        <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">
          Full lesson content not available yet.
          {isOwner && " Please regenerate the lesson to get full content."}
        </p>
      </Card>
    )}
  </div>
</TabsContent>
        <TabsContent value="plan">
          <Card className="p-6 shadow-soft space-y-4">
            {(c.plan ?? []).map((p: any, i: number) => (
              <div key={i} className="border-l-4 border-primary pl-4">
                <div className="flex items-baseline justify-between"><div className="font-display font-semibold">{p.section}</div><div className="text-xs text-muted-foreground">{p.minutes} min</div></div>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{p.details}</p>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="worksheet">
          <Card className="p-6 shadow-soft">
            <p className="mb-4 text-sm text-muted-foreground">{c.worksheet?.instructions}</p>
            <ol className="space-y-3 list-decimal pl-5">
              {(c.worksheet?.exercises ?? []).map((ex: any, i: number) => (
                <li key={i}><span className="font-medium">{ex.q}</span> <span className="text-xs text-muted-foreground">({ex.type})</span></li>
              ))}
            </ol>
          </Card>
        </TabsContent>

        <TabsContent value="quiz">
          <QuizSection lessonId={lesson.id} lessonTitle={lesson.title} quiz={c.quiz ?? []} canAttempt={role === "student"} />
        </TabsContent>

        <TabsContent value="homework">
          <HomeworkTab lessonId={lesson.id} lessonTitle={lesson.title} homework={c.homework ?? []} isStudent={role === "student"} />
        </TabsContent>

        {isOwner && (
          <TabsContent value="key">
            <Card className="p-6 shadow-soft space-y-4">
              <div className="flex flex-wrap gap-2 pb-2">
                <Button size="sm" variant="outline" onClick={() => teacherKeyPdf(lesson.title, c.answerKey)}><Download className="mr-2 h-4 w-4" /> PDF</Button>
                <Button size="sm" variant="outline" onClick={() => void teacherKeyDocx(lesson.title, c.answerKey)}><FileText className="mr-2 h-4 w-4" /> DOCX</Button>
              </div>
              <div>
                <h3 className="font-display font-semibold">Worksheet answers</h3>
                <ol className="mt-2 list-decimal pl-5 text-sm space-y-1">{(c.answerKey?.worksheet ?? []).map((a: string, i: number) => <li key={i}>{a}</li>)}</ol>
              </div>
              <div>
                <h3 className="font-display font-semibold">Quiz explanations</h3>
                <ol className="mt-2 list-decimal pl-5 text-sm space-y-1">{(c.answerKey?.quizExplanations ?? []).map((a: string, i: number) => <li key={i}>{a}</li>)}</ol>
              </div>
              <div>
                <h3 className="font-display font-semibold">Homework model answers</h3>
                <ol className="mt-2 list-decimal pl-5 text-sm space-y-1">{(c.answerKey?.homework ?? []).map((a: string, i: number) => <li key={i}>{a}</li>)}</ol>
              </div>
            </Card>
            <div className="mt-6">
              <QuizAttemptsTable lessonId={lesson.id} />
            </div>
            <div className="mt-6">
              <HomeworkSubmissionsTable lessonId={lesson.id} lessonTitle={lesson.title} />
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Off-screen printable layout used by Download PDF — keeps the page UI intact while
          rendering all sections (and the source image) into a single capturable container. */}
      <div aria-hidden className="pointer-events-none fixed -left-[10000px] top-0 opacity-100">
        <PrintableLesson ref={printRef} lesson={lesson} />
      </div>
    </div>
  );
}

const PrintableLesson = React.forwardRef<HTMLDivElement, { lesson: Lesson }>(({ lesson }, ref) => {
  const c = (lesson.content ?? {}) as any;
  const src: string | undefined = c.sourceImage;
  return (
    <div ref={ref} style={{ width: 800, padding: 32, background: "#ffffff", color: "#0f172a", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, color: "#64748b" }}>
        {lesson.subject} · {lesson.grade} · {lesson.duration} min · {lesson.language}
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "6px 0 18px" }}>{lesson.title}</h1>

      {/* Overview */}
      <PrintSection title="Overview">
        <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 13, color: "#334155", margin: 0 }}>{c.overview ?? ""}</p>
      </PrintSection>

      {/* Full Lesson */}
      {c.fullLesson && (
        <>
          {c.fullLesson.objectives?.length > 0 && (
            <PrintSection title="Learning Objectives">
              <ol style={{ paddingLeft: 20, lineHeight: 1.7 }}>
                {c.fullLesson.objectives.map((o: string, i: number) => <li key={i} style={{ fontSize: 13 }}>{o}</li>)}
              </ol>
            </PrintSection>
          )}
          {c.fullLesson.introduction && (
            <PrintSection title="Introduction">
              <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 13, color: "#334155", margin: 0 }}>{c.fullLesson.introduction}</p>
            </PrintSection>
          )}
          {c.fullLesson.mainContent && (
            <PrintSection title="Main Lesson Content">
              <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 13, color: "#334155", margin: 0 }}>{c.fullLesson.mainContent}</p>
            </PrintSection>
          )}
          {c.fullLesson.keyConcepts?.length > 0 && (
            <PrintSection title="Key Concepts">
              <ol style={{ paddingLeft: 20, lineHeight: 1.7 }}>
                {c.fullLesson.keyConcepts.map((k: string, i: number) => <li key={i} style={{ fontSize: 13 }}>{k}</li>)}
              </ol>
            </PrintSection>
          )}
          {c.fullLesson.workedExamples?.length > 0 && (
            <PrintSection title="Worked Examples">
              {c.fullLesson.workedExamples.map((ex: any, i: number) => (
                <div key={i} style={{ marginBottom: 12, borderLeft: "4px solid #10b981", paddingLeft: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Example {i + 1}</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}><b>Problem:</b> {ex.problem}</div>
                  <div style={{ fontSize: 13, marginTop: 4, background: "#f0fdf4", padding: 8, borderRadius: 4 }}><b>Solution:</b> {ex.solution}</div>
                </div>
              ))}
            </PrintSection>
          )}
          {c.fullLesson.commonMistakes?.length > 0 && (
            <PrintSection title="Common Mistakes to Avoid">
              <ol style={{ paddingLeft: 20, lineHeight: 1.7 }}>
                {c.fullLesson.commonMistakes.map((m: string, i: number) => <li key={i} style={{ fontSize: 13, color: "#dc2626" }}>{m}</li>)}
              </ol>
            </PrintSection>
          )}
          {c.fullLesson.summary && (
            <PrintSection title="Summary & Recap">
              <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 13, color: "#334155", margin: 0 }}>{c.fullLesson.summary}</p>
            </PrintSection>
          )}
        </>
      )}

      {/* Lesson Plan */}
      <PrintSection title="Lesson Plan">
        {(c.plan ?? []).map((p: any, i: number) => (
          <div key={i} style={{ borderLeft: "4px solid #10b981", paddingLeft: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
              <span>{p.section}</span><span style={{ fontSize: 11, color: "#64748b" }}>{p.minutes} min</span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 13, whiteSpace: "pre-wrap", color: "#334155" }}>{p.details}</p>
          </div>
        ))}
      </PrintSection>

      {/* Worksheet */}
      <PrintSection title="Worksheet">
        {c.worksheet?.instructions && <p style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>{c.worksheet.instructions}</p>}
        <ol style={{ paddingLeft: 20, lineHeight: 1.7 }}>
          {[
            ...(c.worksheet?.fillInBlanks ?? []).map((e: any) => `Fill in blank: ${e.q}`),
            ...(c.worksheet?.trueOrFalse ?? []).map((e: any) => `True/False: ${e.statement}`),
            ...(c.worksheet?.shortAnswer ?? []).map((e: any) => e.q),
            ...(c.worksheet?.longAnswer ?? []).map((e: any) => e.q),
            ...(c.worksheet?.exercises ?? []).map((e: any) => e.q),
          ].map((q: string, i: number) => <li key={i} style={{ fontSize: 13 }}>{q}</li>)}
        </ol>
      </PrintSection>

      {/* Quiz */}
      <PrintSection title="Quiz">
        <ol style={{ paddingLeft: 20, lineHeight: 1.7 }}>
          {(c.quiz ?? []).map((q: any, i: number) => (
            <li key={i} style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{q.q}</div>
              {q.options && (
                <ul style={{ paddingLeft: 16, marginTop: 4, listStyle: "none" }}>
                  {q.options.map((o: string, j: number) => (
                    <li key={j} style={{ fontSize: 13 }}>{String.fromCharCode(65 + j)}. {o}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </PrintSection>

      {/* Homework */}
      <PrintSection title="Homework">
        <ol style={{ paddingLeft: 20, lineHeight: 1.7 }}>
          {(c.homework ?? []).map((h: any, i: number) => (
            <li key={i} style={{ marginBottom: 6, fontSize: 13 }}>
              <div>{h.q}</div>
              {h.guidance && <div style={{ fontSize: 11, color: "#64748b" }}>Guidance: {h.guidance}</div>}
            </li>
          ))}
        </ol>
      </PrintSection>
    </div>
  );
});
PrintableLesson.displayName = "PrintableLesson";

function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 18, pageBreakInside: "avoid", breakInside: "avoid" }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px", color: "#065f46" }}>{title}</h2>
      {children}
    </section>
  );
}

function HomeworkTab({ lessonId, lessonTitle, homework, isStudent }: { lessonId: string; lessonTitle: string; homework: any[]; isStudent: boolean }) {
  return (
    <div className="space-y-6">
      <Card className="p-6 shadow-soft">
        <h3 className="font-display font-semibold mb-3">Homework questions</h3>
        {homework.length === 0 ? (
          <p className="text-sm text-muted-foreground">No homework questions for this lesson.</p>
        ) : (
          <ol className="space-y-4 list-decimal pl-5">
            {homework.map((h: any, i: number) => (
              <li key={i}>
                <div className="font-medium">{h.q}</div>
                {h.guidance && <div className="mt-1 text-xs text-muted-foreground">Guidance: {h.guidance}</div>}
              </li>
            ))}
          </ol>
        )}
      </Card>
      {isStudent && <HomeworkSection lessonId={lessonId} lessonTitle={lessonTitle} homework={homework} />}
    </div>
  );
}

function isShort(q: any) { return q?.type === "short"; }

function gradeShort(q: any, answer: string): { correct: boolean; matched: string[]; missed: string[]; ratio: number } {
  const text = (answer || "").toLowerCase();
  const keywords: string[] = (q.keywords ?? []).map((k: string) => String(k).toLowerCase()).filter(Boolean);
  if (keywords.length === 0) {
    const exp = String(q.expectedAnswer ?? "").trim().toLowerCase();
    const ok = exp.length > 0 && text.includes(exp);
    return { correct: ok, matched: ok ? [exp] : [], missed: ok ? [] : [exp], ratio: ok ? 1 : 0 };
  }
  const matched = keywords.filter((k) => text.includes(k));
  const missed = keywords.filter((k) => !text.includes(k));
  const ratio = matched.length / keywords.length;
  return { correct: ratio >= 0.6, matched, missed, ratio };
}

function QuizSection({ lessonId, lessonTitle, quiz, canAttempt }: { lessonId: string; lessonTitle: string; quiz: any[]; canAttempt: boolean }) {
  const { user } = useAuth();
  const [mcqAnswers, setMcqAnswers] = useState<number[]>(() => quiz.map(() => -1));
  const [textAnswers, setTextAnswers] = useState<string[]>(() => quiz.map(() => ""));
  const [result, setResult] = useState<{ score: number; total: number; shortFeedback: { i: number; matched: string[]; missed: string[]; ratio: number; correct: boolean }[] } | null>(null);

  async function submit() {
    let score = 0;
    const shortFeedback: { i: number; matched: string[]; missed: string[]; ratio: number; correct: boolean }[] = [];
    quiz.forEach((q, i) => {
      if (isShort(q)) {
        const g = gradeShort(q, textAnswers[i]);
        if (g.correct) score += 1;
        shortFeedback.push({ i, ...g });
      } else {
        if (mcqAnswers[i] === q.answerIndex) score += 1;
      }
    });
    const r = { score, total: quiz.length, shortFeedback };
    setResult(r);
    if (canAttempt && user) {
      const answers = quiz.map((q, i) => (isShort(q) ? textAnswers[i] : mcqAnswers[i]));
      await supabase.from("quiz_attempts").insert({ student_id: user.id, lesson_id: lessonId, answers });
    }
    toast.success(`Score: ${score}/${quiz.length}`);
  }

  function buildReportArgs() {
    return {
      title: lessonTitle,
      score: result!.score,
      total: result!.total,
      quiz,
      answers: quiz.map((q, i) => (isShort(q) ? textAnswers[i] : mcqAnswers[i])) as any,
    };
  }
  function downloadReportPdf() { if (result) quizReportPdf(buildReportArgs()); }
  function downloadReportDocx() { if (result) void quizReportDocx(buildReportArgs()); }

  return (
    <Card className="p-6 shadow-soft space-y-4">
      {quiz.length === 0 && <p className="text-sm text-muted-foreground">No quiz available.</p>}
      {quiz.map((q, i) => {
        const short = isShort(q);
        const fb = result?.shortFeedback.find((f) => f.i === i);
        return (
          <div key={i} className="space-y-2">
            <div className="font-medium">
              {i + 1}. {q.q}
              <span className="ml-2 text-xs font-normal text-muted-foreground">{short ? "Short answer" : "MCQ"}</span>
            </div>
            {short ? (
              <div className="space-y-1">
                <textarea
                  className="w-full rounded-lg border border-border bg-background p-3 text-sm"
                  rows={3}
                  placeholder="Write your answer…"
                  value={textAnswers[i]}
                  onChange={(e) => { const c = [...textAnswers]; c[i] = e.target.value; setTextAnswers(c); }}
                />
                {q.rubric && <div className="text-xs text-muted-foreground">Rubric: {q.rubric}</div>}
                {fb && (
                  <div className={`rounded-md p-2 text-xs ${fb.correct ? "bg-primary-soft text-primary" : "bg-destructive/10 text-destructive"}`}>
                    {fb.correct ? "Full credit" : "Needs improvement"} · matched {fb.matched.length}/{fb.matched.length + fb.missed.length} keywords
                    {fb.missed.length > 0 && <div className="mt-1">Missing: {fb.missed.join(", ")}</div>}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {(q.options ?? []).map((opt: string, j: number) => (
                  <label key={j} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${mcqAnswers[i] === j ? "border-primary bg-primary/5" : "border-border"}`}>
                    <input type="radio" name={`q${i}`} checked={mcqAnswers[i] === j} onChange={() => { const c = [...mcqAnswers]; c[i] = j; setMcqAnswers(c); }} />
                    {opt}
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {quiz.length > 0 && (
        <div className="flex gap-2 pt-2">
          <Button onClick={submit} className="gradient-emerald text-primary-foreground"><Save className="mr-2 h-4 w-4" /> Submit</Button>
          {result && <Button variant="outline" onClick={downloadReportPdf}><Download className="mr-2 h-4 w-4" /> Report PDF</Button>}
          {result && <Button variant="outline" onClick={downloadReportDocx}><FileText className="mr-2 h-4 w-4" /> Report DOCX</Button>}
        </div>
      )}
      {result && <div className="rounded-lg bg-primary-soft p-4 text-sm">You scored <b>{result.score}/{result.total}</b>.</div>}
    </Card>
  );
}

function HomeworkSection({ lessonId, lessonTitle, homework }: { lessonId: string; lessonTitle: string; homework: any[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const subsQ = useQuery({
    queryKey: ["submissions", lessonId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("homework_submissions").select("*").eq("lesson_id", lessonId).eq("student_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(pdf|docx)$/i.test(file.name)) { toast.error("Only PDF or DOCX files."); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("Max 20MB."); return; }
    setPendingFile(file);
    setSubmitted(false);
  }

  async function submitHomework() {
    if (!pendingFile || !user) { toast.error("Choose a file first."); return; }
    setUploading(true);
    const path = `${user.id}/${lessonId}/${Date.now()}-${pendingFile.name}`;
    const { error } = await supabase.storage.from("homework").upload(path, pendingFile);
    if (error) { setUploading(false); return toast.error(error.message); }
    const { error: e2 } = await supabase.from("homework_submissions").insert({ student_id: user.id, lesson_id: lessonId, file_path: path, file_name: pendingFile.name, file_type: pendingFile.type });
    setUploading(false);
    if (e2) return toast.error(e2.message);
    toast.success("Homework submitted successfully");
    setSubmitted(true);
    setPendingFile(null);
    qc.invalidateQueries({ queryKey: ["submissions", lessonId] });
    if (fileRef.current) fileRef.current.value = "";
  }


  async function download(s: any) {
    const { data, error } = await supabase.storage.from("homework").createSignedUrl(s.file_path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  }

  async function del(s: any) {
    await supabase.storage.from("homework").remove([s.file_path]);
    await supabase.from("homework_submissions").delete().eq("id", s.id);
    qc.invalidateQueries({ queryKey: ["submissions", lessonId] });
  }

  function downloadTemplate(kind: "pdf" | "docx") {
    if (kind === "pdf") homeworkTemplatePdf(lessonTitle, homework);
    else void homeworkTemplateDocx(lessonTitle, homework);
  }

  return (
    <Card className="p-6 shadow-soft space-y-5">
      <div>
        <h3 className="font-display font-semibold">Download homework</h3>
        <p className="text-sm text-muted-foreground">Get a template to complete offline.</p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" onClick={() => downloadTemplate("pdf")}><Download className="mr-2 h-4 w-4" /> PDF</Button>
          <Button size="sm" variant="outline" onClick={() => downloadTemplate("docx")}><Download className="mr-2 h-4 w-4" /> DOCX</Button>
        </div>
      </div>
      <div>
        <h3 className="font-display font-semibold">Submit your homework</h3>
        <p className="text-sm text-muted-foreground">PDF or DOCX, max 20MB.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" accept=".pdf,.docx" onChange={pickFile} className="text-sm" />
          <Button size="sm" onClick={submitHomework} disabled={!pendingFile || uploading} className="gradient-emerald text-primary-foreground">
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {uploading ? "Submitting..." : "Submit Homework"}
          </Button>
        </div>
        {submitted && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary-soft p-3 text-sm text-primary">
            <CheckCircle2 className="h-4 w-4" /> Successfully submitted!
          </div>
        )}
      </div>
      <div>
        <h3 className="font-display font-semibold">Your submissions</h3>
        <div className="mt-3 divide-y rounded-lg border">
          {(subsQ.data ?? []).length === 0 && <div className="p-4 text-sm text-muted-foreground">No submissions yet.</div>}
          {(subsQ.data ?? []).map((s: any) => (
            <div key={s.id} className="flex items-center justify-between p-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{s.file_name}</div>
                <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => download(s)}><Download className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => del(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function QuizAttemptsTable({ lessonId }: { lessonId: string }) {
  const [filter, setFilter] = useState("");
  const q = useQuery({
    queryKey: ["quiz-attempts", lessonId],
    queryFn: async () => {
      const { data: attempts, error } = await supabase
        .from("quiz_attempts")
        .select("id,student_id,score,total,created_at")
        .eq("lesson_id", lessonId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = Array.from(new Set((attempts ?? []).map((a) => a.student_id)));
      let profMap = new Map<string, { full_name: string | null; roll_number: string | null }>();
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,full_name,roll_number")
          .in("id", ids);
        profMap = new Map((profs ?? []).map((p: any) => [p.id, { full_name: p.full_name, roll_number: p.roll_number }]));
      }
      return (attempts ?? []).map((a) => ({
        ...a,
        full_name: profMap.get(a.student_id)?.full_name ?? "Unknown student",
        roll_number: profMap.get(a.student_id)?.roll_number ?? "—",
      }));
    },
  });

  const f = filter.trim().toLowerCase();
  const rows = (q.data ?? []).filter((a: any) =>
    !f || a.full_name?.toLowerCase().includes(f) || a.roll_number?.toLowerCase().includes(f)
  );

  return (
    <Card className="p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="font-display font-semibold">Quiz attempts by students</h3>
        <Input placeholder="Filter by name or roll number" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs" />
      </div>
      {q.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {!q.isLoading && rows.length === 0 && (
        <div className="text-sm text-muted-foreground">{(q.data?.length ?? 0) === 0 ? "No quiz attempts yet." : "No results match the filter."}</div>
      )}
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Roll number</th>
                <th className="py-2 pr-3">Score</th>
                <th className="py-2 pr-3">Percentage</th>
                <th className="py-2 pr-3">Attempted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a: any) => {
                const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
                return (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{a.full_name}</td>
                    <td className="py-2 pr-3">{a.roll_number}</td>
                    <td className="py-2 pr-3">{a.score}/{a.total}</td>
                    <td className="py-2 pr-3">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${pct >= 75 ? "bg-primary-soft text-primary" : pct >= 50 ? "bg-secondary text-foreground" : "bg-destructive/10 text-destructive"}`}>{pct}%</span>
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{new Date(a.created_at).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function HomeworkSubmissionsTable({ lessonId, lessonTitle }: { lessonId: string; lessonTitle: string }) {
  const [filter, setFilter] = useState("");
  const q = useQuery({
    queryKey: ["homework-submissions", lessonId],
    queryFn: async () => {
      const { data: subs, error } = await supabase
        .from("homework_submissions")
        .select("id,student_id,file_name,file_path,created_at")
        .eq("lesson_id", lessonId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = Array.from(new Set((subs ?? []).map((s) => s.student_id)));
      let profMap = new Map<string, { full_name: string | null; roll_number: string | null }>();
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,full_name,roll_number")
          .in("id", ids);
        profMap = new Map((profs ?? []).map((p: any) => [p.id, { full_name: p.full_name, roll_number: p.roll_number }]));
      }
      return (subs ?? []).map((s) => ({
        ...s,
        full_name: profMap.get(s.student_id)?.full_name ?? "Unknown student",
        roll_number: profMap.get(s.student_id)?.roll_number ?? "—",
      }));
    },
  });

  async function downloadSubmission(s: any) {
    const { data, error } = await supabase.storage.from("homework").createSignedUrl(s.file_path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  }

  const f = filter.trim().toLowerCase();
  const rows = (q.data ?? []).filter((s: any) =>
    !f || s.full_name?.toLowerCase().includes(f) || s.roll_number?.toLowerCase().includes(f) || s.file_name?.toLowerCase().includes(f)
  );

  const reportRows = rows.map((s: any) => ({
    full_name: s.full_name,
    roll_number: s.roll_number,
    file_name: s.file_name,
    created_at: s.created_at,
  }));

  return (
    <Card className="p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="font-display font-semibold">Homework submissions by students</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Filter by name, roll number, or file" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs" />
          <Button size="sm" variant="outline" disabled={reportRows.length === 0} onClick={() => void homeworkReportPdf(lessonTitle, reportRows)}>
            <Download className="mr-2 h-4 w-4" /> Report PDF
          </Button>
          <Button size="sm" variant="outline" disabled={reportRows.length === 0} onClick={() => void homeworkReportDocx(lessonTitle, reportRows)}>
            <FileText className="mr-2 h-4 w-4" /> Report DOCX
          </Button>
        </div>
      </div>
      {q.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {!q.isLoading && rows.length === 0 && (
        <div className="text-sm text-muted-foreground">{(q.data?.length ?? 0) === 0 ? "No homework submissions yet." : "No results match the filter."}</div>
      )}
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Roll number</th>
                <th className="py-2 pr-3">File</th>
                <th className="py-2 pr-3">Submitted</th>
                <th className="py-2 pr-3 text-right">Download</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s: any) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-medium">{s.full_name}</td>
                  <td className="py-2 pr-3">{s.roll_number}</td>
                  <td className="py-2 pr-3 max-w-[260px] truncate">{s.file_name}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{new Date(s.created_at).toLocaleString()}</td>
                  <td className="py-2 pr-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => downloadSubmission(s)}>
                      <Download className="mr-2 h-4 w-4" /> Download
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

