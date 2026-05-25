import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles, BookOpen, FileText, GraduationCap, Zap, Globe, ShieldCheck, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl gradient-emerald shadow-soft">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">AI PathShala</span>
          </Link>
          <nav className="hidden gap-7 md:flex">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">Features</a>
            <a href="#how" className="text-sm text-muted-foreground hover:text-foreground">How it works</a>
            <a href="#audience" className="text-sm text-muted-foreground hover:text-foreground">Who it's for</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/auth" search={{ mode: "signup" } as never}>
              <Button size="sm" className="gradient-emerald text-primary-foreground shadow-soft">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-50 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="container relative mx-auto px-4 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> AI-powered lesson studio for educators
            </div>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              Beautiful lessons, worksheets and quizzes — <span className="text-primary">generated in seconds</span>
            </h1>
            <p className="mt-5 text-base text-muted-foreground md:text-lg">
              AI PathShala helps teachers craft complete lesson packages and lets students learn, attempt quizzes, and submit homework — all in one calm, modern workspace.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/auth" search={{ mode: "signup" } as never}>
                <Button size="lg" className="gradient-emerald text-primary-foreground shadow-elevated">
                  Start free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline">See features</Button>
              </a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">No credit card · Teacher & student roles · Free during beta</p>
          </div>

          {/* Mock preview card */}
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="rounded-2xl border border-border bg-card p-2 shadow-card">
              <div className="rounded-xl gradient-prestige p-8 md:p-12">
                <div className="grid gap-6 md:grid-cols-3">
                  {[
                    { k: "Lesson Plan", v: "5 sections · 45 min" },
                    { k: "Worksheet", v: "8 exercises" },
                    { k: "Quiz", v: "6 MCQs + key" },
                  ].map((c) => (
                    <div key={c.k} className="rounded-xl bg-background/95 p-5 shadow-soft">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.k}</div>
                      <div className="mt-2 font-display text-lg font-semibold">{c.v}</div>
                      <div className="mt-4 h-2 w-full rounded-full bg-muted">
                        <div className="h-2 w-3/4 rounded-full bg-primary" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/60 bg-secondary/40">
        <div className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Everything a great lesson needs</h2>
            <p className="mt-3 text-muted-foreground">From objectives to answer keys, we generate the whole package so you can focus on teaching.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { icon: Sparkles, title: "AI lesson generation", body: "Subject, grade, topic — get a structured plan, worksheet and quiz in seconds." },
              { icon: BookOpen, title: "Lesson library", body: "Save, search and reopen any lesson. Share with your class instantly." },
              { icon: FileText, title: "Quizzes & answer keys", body: "Auto-generated MCQs with explanations. Students attempt and download reports." },
              { icon: GraduationCap, title: "Student workspace", body: "Students read assigned lessons, take quizzes and submit homework as PDF or DOCX." },
              { icon: Globe, title: "Multilingual ready", body: "Generate content in any language — built for diverse classrooms." },
              { icon: ShieldCheck, title: "Secure by design", body: "Role-based access, private storage for homework, and granular permissions." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-soft transition hover:shadow-card">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-border/60">
        <div className="container mx-auto px-4 py-20">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="font-display text-3xl font-bold md:text-4xl">From blank page to ready-to-teach in 3 steps</h2>
              <p className="mt-3 text-muted-foreground">Spend your time with students, not formatting documents.</p>
              <ul className="mt-8 space-y-5">
                {[
                  ["Describe your lesson", "Subject, grade, duration, objectives and language."],
                  ["Generate with AI", "We craft overview, lesson plan, worksheet, quiz and answer key."],
                  ["Save, share, assign", "Publish to your library so students can read and attempt."],
                ].map(([t, b], i) => (
                  <li key={t} className="flex gap-4">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{i + 1}</div>
                    <div>
                      <div className="font-display text-base font-semibold">{t}</div>
                      <div className="text-sm text-muted-foreground">{b}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="h-3.5 w-3.5 text-gold" /> AI Studio preview
              </div>
              <pre className="mt-4 overflow-hidden rounded-xl bg-secondary/60 p-4 text-xs leading-relaxed">
{`Topic     : Photosynthesis
Grade     : Class 7
Duration  : 45 minutes
Difficulty: Medium
Language  : English

→ Overview ........... ✓
→ Lesson Plan (5) .... ✓
→ Worksheet (8) ...... ✓
→ Quiz (6 MCQ) ....... ✓
→ Answer Key ......... ✓`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Audience */}
      <section id="audience" className="border-t border-border/60 bg-secondary/40">
        <div className="container mx-auto grid gap-6 px-4 py-20 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Teachers</div>
            <h3 className="mt-4 font-display text-2xl font-semibold">Full creative control</h3>
            <p className="mt-2 text-sm text-muted-foreground">Generate, edit, organize and share lessons. View student attempts and homework submissions.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
            <div className="inline-flex items-center gap-2 rounded-full bg-gold/20 px-3 py-1 text-xs font-medium text-gold-foreground">Students</div>
            <h3 className="mt-4 font-display text-2xl font-semibold">Learn, attempt, submit</h3>
            <p className="mt-2 text-sm text-muted-foreground">Read lessons, take quizzes, download quiz reports and homework, and upload PDFs/DOCX submissions.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60">
        <div className="container mx-auto px-4 py-20">
          <div className="overflow-hidden rounded-3xl gradient-prestige p-10 text-center shadow-elevated md:p-16">
            <h2 className="font-display text-3xl font-bold text-primary-foreground md:text-4xl">Ready to teach with AI by your side?</h2>
            <p className="mt-3 text-primary-foreground/80">Join AI PathShala and ship your first lesson in under a minute.</p>
            <div className="mt-7 flex justify-center">
              <Link to="/auth" search={{ mode: "signup" } as never}>
                <Button size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90 shadow-soft">
                  Create your free account <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg gradient-emerald">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-display text-sm font-semibold">AI PathShala</span>
            <span className="text-xs text-muted-foreground">© {new Date().getFullYear()}</span>
          </div>
          <div className="text-xs text-muted-foreground">Crafted for educators worldwide.</div>
        </div>
      </footer>
    </div>
  );
}
