import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Loader2, Sparkles, RotateCcw, UploadCloud, FileText, X, Youtube, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { generateLesson } from "@/lib/lesson.functions";
import { fetchYouTubeTranscript } from "@/lib/youtube.functions";
import { extractImageTranscript } from "@/lib/image.functions";
import { supabase } from "@/integrations/supabase/client";
import { parseDocument } from "@/lib/document-parser";
import { TARGET_AUDIENCE_OPTIONS } from "@/lib/grades";
import {
  CURRICULUM_SUBJECTS,
  CURRICULUM_LEVELS,
  getSuggestedTopics,
  isCurriculumSubject,
  levelBadgeClass,
} from "@/lib/subjectCurriculum";
import { cn } from "@/lib/utils";
import { Pencil, ListChecks } from "lucide-react";

export const Route = createFileRoute("/_app/create-lesson")({ component: CreateLesson });

const empty = {
  subject: "", grade: "Beginner", topic: "", duration: 45,
  objectives: "", difficulty: "medium" as "easy" | "medium" | "hard",
  language: "English",
  targetGrade: "All" as string,
};

function CreateLesson() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<"" | "parsing" | "analyzing" | "saving" | "transcript" | "image">("");
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [extracted, setExtracted] = useState<string>("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const gen = useServerFn(generateLesson);
  const fetchTranscript = useServerFn(fetchYouTubeTranscript);
  const analyzeImage = useServerFn(extractImageTranscript);

  if (role !== "teacher") {
    return <div className="mx-auto max-w-2xl rounded-xl border bg-card p-8 shadow-soft text-center">
      <h1 className="font-display text-xl font-bold">Teachers only</h1>
      <p className="mt-2 text-sm text-muted-foreground">Only teacher accounts can create lessons.</p>
    </div>;
  }

  async function runGeneration(sourceText: string, sourceFileName: string, sourceImage?: string) {
    setBusy(true);
    setStage("analyzing");
    setProgress(60);
    try {
      const res = await gen({ data: { ...form, sourceText, sourceFileName } });
      if (!res.ok) { toast.error(res.error); return; }
      const lesson = res.lesson;
      setStage("saving");
      setProgress(90);
      try {
        const { data: integ } = await supabase.from("teacher_integrations").select("webhook_url").eq("teacher_id", user!.id).maybeSingle();
        if (integ?.webhook_url) {
          fetch(integ.webhook_url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "lesson.generated", input: form, lesson }) }).catch(() => {});
        }
      } catch {}
      const lessonWithImage = sourceImage ? { ...lesson, sourceImage } : lesson;
      const { data, error } = await supabase.from("lessons").insert({
        teacher_id: user!.id,
        title: lesson.title ?? form.topic,
        subject: form.subject, grade: form.grade, topic: form.topic,
        duration: form.duration, objectives: form.objectives,
        difficulty: form.difficulty, language: form.language,
        target_grade: form.targetGrade,
        content: lessonWithImage,
      }).select("id").single();
      if (error) throw error;
      setProgress(100);
      toast.success("Lesson generated!");
      navigate({ to: "/lesson/$id", params: { id: data.id } });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
      setStage("");
      setProgress(0);
    }
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    await runGeneration("", "");
  }

  async function submitDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast.error("Please upload a PDF or DOCX file."); return; }
    let text = extracted;
    if (!text) {
      setBusy(true);
      setStage("parsing");
      setProgress(20);
      try {
        text = await parseDocument(file);
        setExtracted(text);
      } catch (err: any) {
        toast.error(err.message ?? "Failed to parse document");
        setBusy(false); setStage(""); setProgress(0); return;
      }
    }
    if (!text || text.length < 50) {
      toast.error("Couldn't extract enough text from this document.");
      setBusy(false); setStage(""); setProgress(0); return;
    }
    await runGeneration(text, file.name);
  }

  async function submitYouTube(e: React.FormEvent) {
    e.preventDefault();
    if (!youtubeUrl.trim()) { toast.error("Please paste a YouTube video URL."); return; }
    setBusy(true);
    setStage("transcript");
    setProgress(25);
    try {
      const res = await fetchTranscript({ data: { url: youtubeUrl, lang: "en" } });
      if (!res.ok) { toast.error(res.error); setBusy(false); setStage(""); setProgress(0); return; }
      await runGeneration(res.transcript, `YouTube video ${res.videoId}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to fetch transcript");
      setBusy(false); setStage(""); setProgress(0);
    }
  }

  function onImageSelected(f: File | null) {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    if (!f) { setImageFile(null); setImagePreview(""); return; }
    if (!/\.(png|jpe?g|webp)$/i.test(f.name)) { toast.error("Only PNG, JPG, or WEBP images."); return; }
    if (f.size > 10 * 1024 * 1024) { toast.error("Image must be under 10MB."); return; }
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  }

  async function submitImage(e: React.FormEvent) {
    e.preventDefault();
    if (!imageFile) { toast.error("Please upload an image."); return; }
    setBusy(true);
    setStage("image");
    setProgress(20);
    try {
      const buf = await imageFile.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      const rawMime = (imageFile.type || "image/png").toLowerCase();
      const mime = rawMime === "image/jpg" ? "image/jpeg" : rawMime;
      const sourceImage = `data:${mime};base64,${base64}`;
      const res = await analyzeImage({
        data: {
          imageBase64: base64,
          mimeType: mime as "image/png" | "image/jpeg" | "image/webp",
          subject: form.subject,
          grade: form.grade,
          duration: form.duration,
          difficulty: form.difficulty,
          language: form.language,
        },
      });
      if (!res.ok) { toast.error(res.error); setBusy(false); setStage(""); setProgress(0); return; }
      await runGeneration(res.transcript, `Image: ${imageFile.name}`, sourceImage);
    } catch (err: any) {
      console.error("Image submit failed", err);
      toast.error(err?.message ?? "Failed to analyze image");
      setBusy(false); setStage(""); setProgress(0);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Create a lesson</h1>
        <p className="text-sm text-muted-foreground">AI generates the overview, plan, worksheet, quiz, homework and answer key.</p>
      </div>

      <Tabs defaultValue="document">
        <TabsList className="mb-4">
          <TabsTrigger value="document"><UploadCloud className="mr-2 h-4 w-4" /> From document</TabsTrigger>
          <TabsTrigger value="youtube"><Youtube className="mr-2 h-4 w-4" /> From YouTube Video</TabsTrigger>
          <TabsTrigger value="image"><ImageIcon className="mr-2 h-4 w-4" /> From Image</TabsTrigger>
          <TabsTrigger value="manual"><Sparkles className="mr-2 h-4 w-4" /> From topic</TabsTrigger>
        </TabsList>

        <TabsContent value="document">
          <Card className="border-border p-6 shadow-card">
            <form onSubmit={submitDocument} className="space-y-5">
              <DropZone file={file} onFile={(f) => { setFile(f); setExtracted(""); }} disabled={busy} />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Subject"><SubjectField value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} /></Field>
                <Field label="Level"><LevelSelect value={form.grade} onChange={(v) => setForm({ ...form, grade: v })} /></Field>
                <TopicField subject={form.subject} level={form.grade} value={form.topic} onChange={(v) => setForm({ ...form, topic: v })} placeholder="Optional — derived from document if blank" required />
                <Field label="Duration (min)"><Input type="number" min={5} max={240} value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} /></Field>
                <Field label="Difficulty">
                  <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Language" full><LanguageSelect value={form.language} onChange={(v) => setForm({ ...form, language: v })} /></Field>
                <Field label="Target audience" full><TargetAudienceSelect value={form.targetGrade} onChange={(v) => setForm({ ...form, targetGrade: v })} /></Field>
              </div>

              {busy && <GenerationProgress stage={stage} progress={progress} />}

              <div className="flex justify-end">
                <Button type="submit" disabled={busy || !file} className="gradient-emerald text-primary-foreground shadow-soft">
                  {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Working…</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate from document</>}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="youtube">
          <Card className="border-border p-6 shadow-card">
            <form onSubmit={submitYouTube} className="space-y-5">
              <Field label="YouTube Video URL" full>
                <Input
                  type="url"
                  required
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="e.g., https://youtube.com"
                  disabled={busy}
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Subject"><SubjectField value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} /></Field>
                <Field label="Level"><LevelSelect value={form.grade} onChange={(v) => setForm({ ...form, grade: v })} /></Field>
                <TopicField subject={form.subject} level={form.grade} value={form.topic} onChange={(v) => setForm({ ...form, topic: v })} placeholder="Optional — derived from video if blank" required />
                <Field label="Duration (min)"><Input type="number" min={5} max={240} value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} /></Field>
                <Field label="Difficulty">
                  <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Language" full><LanguageSelect value={form.language} onChange={(v) => setForm({ ...form, language: v })} /></Field>
                <Field label="Target audience" full><TargetAudienceSelect value={form.targetGrade} onChange={(v) => setForm({ ...form, targetGrade: v })} /></Field>
              </div>

              {busy && <GenerationProgress stage={stage} progress={progress} />}

              <div className="flex justify-end">
                <Button type="submit" disabled={busy || !youtubeUrl.trim()} className="gradient-emerald text-primary-foreground shadow-soft">
                  {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Working…</> : <><Youtube className="mr-2 h-4 w-4" /> Generate from YouTube Video</>}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="image">
          <Card className="border-border p-6 shadow-card">
            <form onSubmit={submitImage} className="space-y-5">
              <Field label="Upload an image" full>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                  disabled={busy}
                  onChange={(e) => { const f = e.target.files?.[0] ?? null; onImageSelected(f); e.target.value = ""; }}
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-secondary/80"
                />
                {imagePreview && (
                  <div className="mt-3 flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-3">
                    <img src={imagePreview} alt="preview" className="h-24 w-24 rounded-md object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{imageFile?.name}</div>
                      <div className="text-xs text-muted-foreground">{imageFile ? `${(imageFile.size / 1024).toFixed(0)} KB` : ""}</div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => onImageSelected(null)} disabled={busy}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Subject"><SubjectField value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} /></Field>
                <Field label="Level"><LevelSelect value={form.grade} onChange={(v) => setForm({ ...form, grade: v })} /></Field>
                <TopicField subject={form.subject} level={form.grade} value={form.topic} onChange={(v) => setForm({ ...form, topic: v })} placeholder="Optional — derived from image if blank" required />
                <Field label="Duration (min)"><Input type="number" min={5} max={240} value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} /></Field>
                <Field label="Difficulty">
                  <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Language" full><LanguageSelect value={form.language} onChange={(v) => setForm({ ...form, language: v })} /></Field>
                <Field label="Target audience" full><TargetAudienceSelect value={form.targetGrade} onChange={(v) => setForm({ ...form, targetGrade: v })} /></Field>
              </div>

              {busy && <GenerationProgress stage={stage} progress={progress} />}

              <div className="flex justify-end">
                <Button type="submit" disabled={busy || !imageFile} className="gradient-emerald text-primary-foreground shadow-soft">
                  {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Working…</> : <><ImageIcon className="mr-2 h-4 w-4" /> Generate from image</>}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <Card className="border-border p-6 shadow-card">
            <form onSubmit={submitManual} className="grid gap-5 sm:grid-cols-2">
              <Field label="Subject"><SubjectField value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} /></Field>
              <Field label="Level"><LevelSelect value={form.grade} onChange={(v) => setForm({ ...form, grade: v })} /></Field>
              <TopicField subject={form.subject} level={form.grade} value={form.topic} onChange={(v) => setForm({ ...form, topic: v })} placeholder="e.g. Photosynthesis" required />
              <Field label="Duration (min)"><Input type="number" min={5} max={240} value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} /></Field>
              <Field label="Difficulty">
                <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Language" full><LanguageSelect value={form.language} onChange={(v) => setForm({ ...form, language: v })} /></Field>
              <Field label="Target audience" full><TargetAudienceSelect value={form.targetGrade} onChange={(v) => setForm({ ...form, targetGrade: v })} /></Field>
              <Field label="Learning objectives" full>
                <Textarea rows={4} value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} placeholder="Optional — what should students be able to do?" />
              </Field>
              {busy && <div className="sm:col-span-2"><GenerationProgress stage={stage} progress={progress} /></div>}
              <div className="sm:col-span-2 flex flex-wrap items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setForm(empty)} disabled={busy}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset
                </Button>
                <Button type="submit" disabled={busy} className="gradient-emerald text-primary-foreground shadow-soft">
                  {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate lesson</>}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GenerationProgress({ stage, progress }: { stage: string; progress: number }) {
  const label =
    stage === "parsing" ? "Reading your document…" :
    stage === "transcript" ? "Fetching YouTube transcript…" :
    stage === "image" ? "Analyzing image with Gemini…" :
    stage === "analyzing" ? "AI is analyzing your document and preparing the lesson…" :
    stage === "saving" ? "Saving lesson…" : "Working…";
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
        <Loader2 className="h-4 w-4 animate-spin" /> {label}
      </div>
      <Progress value={progress} />
    </div>
  );
}

function DropZone({ file, onFile, disabled }: { file: File | null; onFile: (f: File | null) => void; disabled: boolean }) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = useCallback((f: File) => {
    if (!/\.(pdf|docx)$/i.test(f.name)) { toast.error("Only PDF or DOCX files."); return false; }
    if (f.size > 25 * 1024 * 1024) { toast.error("Max 25MB."); return false; }
    return true;
  }, []);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && validate(f)) onFile(f);
          e.target.value = "";
        }}
      />
      {!file ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault(); setOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f && validate(f)) onFile(f);
          }}
          className={`flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition ${over ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-secondary/40"} ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div className="grid h-12 w-12 place-items-center rounded-full gradient-emerald text-primary-foreground">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div>
            <div className="font-display text-base font-semibold">Upload a source document</div>
            <div className="mt-1 text-sm text-muted-foreground">Drag &amp; drop or click to browse. PDF or DOCX, up to 25MB.</div>
          </div>
        </button>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/30 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium">{file.name}</div>
              <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</div>
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => onFile(null)} disabled={disabled}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={`space-y-2 ${full ? "sm:col-span-2" : ""}`}><Label>{label}</Label>{children}</div>;
}

export const LANGUAGES = ["English", "Hindi", "Roman Hindi", "Arabic"] as const;

function LanguageSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const v = (LANGUAGES as readonly string[]).includes(value) ? value : "English";
  return (
    <Select value={v} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function TargetAudienceSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const v = (TARGET_AUDIENCE_OPTIONS as readonly string[]).includes(value) ? value : "All";
  return (
    <Select value={v} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Select target audience" /></SelectTrigger>
      <SelectContent>
        {TARGET_AUDIENCE_OPTIONS.map((g) => (
          <SelectItem key={g} value={g}>
            {g === "All" ? "ALL (Universal visibility)" : g}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function LevelSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const allowed = CURRICULUM_LEVELS as readonly string[]; // Beginner / Intermediate / Advanced / AI Class
  const v = allowed.includes(value) ? value : "Beginner";
  return (
    <Select value={v} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
      <SelectContent>
        {CURRICULUM_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

const OTHER_SUBJECT = "__other__";

function SubjectField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const presetMatch = isCurriculumSubject(value);
  const [mode, setMode] = useState<"preset" | "custom">(
    value === "" || presetMatch ? "preset" : "custom",
  );

  const selectValue = mode === "custom" ? OTHER_SUBJECT : presetMatch ? value : "";

  return (
    <div className="space-y-2">
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (v === OTHER_SUBJECT) {
            setMode("custom");
            onChange("");
          } else {
            setMode("preset");
            onChange(v);
          }
        }}
      >
        <SelectTrigger><SelectValue placeholder="Select a subject" /></SelectTrigger>
        <SelectContent>
          {CURRICULUM_SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          <SelectItem value={OTHER_SUBJECT}>Other (type custom)…</SelectItem>
        </SelectContent>
      </Select>
      {mode === "custom" && (
        <Input
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Math, Science, History"
        />
      )}
    </div>
  );
}

function TopicField({
  subject, level, value, onChange, placeholder, required,
}: {
  subject: string; level: string; value: string;
  onChange: (v: string) => void;
  placeholder: string; required?: boolean;
}) {
  const suggestions = getSuggestedTopics(subject, level);
  const [manual, setManual] = useState(false);

  if (!suggestions) {
    return (
      <Field label="Topic" full>
        <Input
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </Field>
    );
  }

  if (manual) {
    return (
      <div className="space-y-2 sm:col-span-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Topic</Label>
          <Button
            type="button" variant="ghost" size="sm"
            onClick={() => setManual(false)}
            className="h-7 text-xs"
          >
            <ListChecks className="mr-1.5 h-3.5 w-3.5" /> Pick from suggestions
          </Button>
        </div>
        <Input
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">📚 Suggested Topics for {subject}</span>
          <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold", levelBadgeClass(level))}>
            {level}
          </span>
        </div>
        <Button
          type="button" variant="ghost" size="sm"
          onClick={() => setManual(true)}
          className="h-7 text-xs"
        >
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Type my own topic instead
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {suggestions.map((t) => {
          const selected = value === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onChange(t)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm transition",
                selected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card hover:border-primary/40 hover:shadow-sm",
              )}
            >
              {t}
            </button>
          );
        })}
      </div>
      {required && (
        <input
          tabIndex={-1}
          aria-hidden
          required
          value={value}
          onChange={() => {}}
          className="sr-only"
        />
      )}
    </div>
  );
}
