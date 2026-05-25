import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, BookOpen, Search, Eye, Pencil, RotateCcw, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { generateLesson } from "@/lib/lesson.functions";
import { audienceLabel, audienceBadgeClass } from "@/lib/grades";

export const Route = createFileRoute("/_app/library")({ component: Library });

type LessonRow = {
  id: string; title: string; subject: string; grade: string; topic: string;
  created_at: string; teacher_id: string;
  duration?: number; objectives?: string | null; difficulty?: string; language?: string;
  target_grade?: string | null;
};

function Library() {
  const { user, role } = useAuth();
  const isTeacher = role === "teacher";
  const [q, setQ] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();
  const gen = useServerFn(generateLesson);

  const [editing, setEditing] = useState<LessonRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [regenId, setRegenId] = useState<string | null>(null);

  const lessonsQ = useQuery({
    queryKey: ["library", isTeacher, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("list_lessons_for_viewer");
      if (error) throw error;
      return (data ?? []) as LessonRow[];
    },
  });

  const filtered = (lessonsQ.data ?? []).filter((l) =>
    [l.title, l.subject, l.grade, l.topic].some((f) => f?.toLowerCase().includes(q.toLowerCase()))
  );

  async function del(id: string) {
    if (!confirm("Delete this lesson?")) return;
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["library"] });
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase.from("lessons").update({
      title: editing.title,
      subject: editing.subject,
      grade: editing.grade,
      topic: editing.topic,
      duration: editing.duration ?? 45,
      objectives: editing.objectives ?? "",
      difficulty: editing.difficulty ?? "medium",
      language: editing.language ?? "English",
    }).eq("id", editing.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Lesson updated");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["library"] });
  }

  async function regenerate(l: LessonRow) {
    if (!confirm(`Regenerate "${l.title}"? This replaces the current content.`)) return;
    setRegenId(l.id);
    const res = await gen({ data: {
      subject: l.subject, grade: l.grade, topic: l.topic,
      duration: l.duration ?? 45, objectives: l.objectives ?? "",
      difficulty: (l.difficulty ?? "medium") as any, language: l.language ?? "English",
    }});
    if (!res.ok) { setRegenId(null); return toast.error(res.error); }
    const { error } = await supabase.from("lessons")
      .update({ content: res.lesson, title: res.lesson.title ?? l.title })
      .eq("id", l.id);
    setRegenId(null);
    if (error) return toast.error(error.message);
    toast.success("Regenerated");
    qc.invalidateQueries({ queryKey: ["library"] });
    qc.invalidateQueries({ queryKey: ["lesson", l.id] });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Lesson library</h1>
        <p className="text-sm text-muted-foreground">{isTeacher ? "Your lessons — view, edit, or regenerate any entry" : "All available lessons"}</p>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by title, subject, topic…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
      </div>

      {lessonsQ.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {!lessonsQ.isLoading && filtered.length === 0 && (
        <Card className="border-border p-12 text-center shadow-soft">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary"><BookOpen className="h-5 w-5" /></div>
          <p className="mt-3 font-medium">No lessons found</p>
          <p className="text-sm text-muted-foreground">
            {isTeacher ? "Generate your first lesson." : "Aapki class ke liye abhi koi naya lesson nahi hai."}
          </p>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((l) => {
          const owned = isTeacher && l.teacher_id === user?.id;
          const regenBusy = regenId === l.id;
          return (
            <Card key={l.id} className="group flex flex-col border-border p-5 shadow-soft transition hover:shadow-card">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{l.subject} · {l.grade}</div>
                {l.target_grade && (
                  <Badge variant="outline" className={`shrink-0 text-[10px] font-medium ${audienceBadgeClass(l.target_grade)}`}>
                    {audienceLabel(l.target_grade)}
                  </Badge>
                )}
              </div>
              <Link to="/lesson/$id" params={{ id: l.id }} className="mt-2 block font-display text-lg font-semibold leading-snug hover:text-primary">{l.title}</Link>
              <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{l.topic}</div>
              <div className="mt-auto pt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</span>
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => navigate({ to: "/lesson/$id", params: { id: l.id } })}>
                    <Eye className="mr-1 h-3.5 w-3.5" /> View
                  </Button>
                  {owned && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setEditing(l)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" disabled={regenBusy} onClick={() => regenerate(l)}>
                        {regenBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-1 h-3.5 w-3.5" />}
                        Regenerate
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => del(l.id)} aria-label="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit lesson</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="e-title">Title</Label>
                <Input id="e-title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="e-subject">Subject</Label>
                  <Input id="e-subject" value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="e-grade">Level</Label>
                  <Input id="e-grade" value={editing.grade} onChange={(e) => setEditing({ ...editing, grade: e.target.value })} placeholder="Beginner / Intermediate / Advanced" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="e-topic">Topic</Label>
                <Input id="e-topic" value={editing.topic} onChange={(e) => setEditing({ ...editing, topic: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="e-duration">Duration (min)</Label>
                  <Input id="e-duration" type="number" min={5} max={240}
                    value={editing.duration ?? 45}
                    onChange={(e) => setEditing({ ...editing, duration: Number(e.target.value) })} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Difficulty</Label>
                  <Select value={editing.difficulty ?? "medium"} onValueChange={(v) => setEditing({ ...editing, difficulty: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="e-lang">Language</Label>
                  <Select value={["English","Hindi","Roman Hindi"].includes(editing.language ?? "") ? (editing.language as string) : "English"} onValueChange={(v) => setEditing({ ...editing, language: v })}>
                    <SelectTrigger id="e-lang"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Hindi">Hindi</SelectItem>
                      <SelectItem value="Roman Hindi">Roman Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="e-obj">Objectives</Label>
                <Textarea id="e-obj" rows={3} value={editing.objectives ?? ""} onChange={(e) => setEditing({ ...editing, objectives: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving} className="gradient-emerald text-primary-foreground">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
