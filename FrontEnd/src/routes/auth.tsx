import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, GraduationCap, BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LEVEL_OPTIONS } from "@/lib/grades";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup", "forgot"]).optional(),
});

function safeAuthError(kind: "signin" | "signup") {
  return kind === "signin"
    ? "Invalid email or password. Please try again."
    : "We couldn't create the account. Please check your details and try again.";
}

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup" | "forgot">(mode ?? "signin");

  useEffect(() => { if (mode) setTab(mode); }, [mode]);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between gradient-prestige p-12 text-primary-foreground">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-background/15 backdrop-blur">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold">AI PathShala</span>
        </Link>
        <div className="max-w-md">
          <h1 className="font-display text-4xl font-bold leading-tight">Plan less. Teach more.</h1>
          <p className="mt-4 text-primary-foreground/85">Generate complete lessons, worksheets and quizzes with AI — built for teachers and students alike.</p>
          <div className="mt-10 space-y-3">
            <Feature icon={<BookOpen className="h-4 w-4" />} text="Full lesson packages in seconds" />
            <Feature icon={<GraduationCap className="h-4 w-4" />} text="Separate teacher & student workspaces" />
            <Feature icon={<Sparkles className="h-4 w-4" />} text="Multilingual, modern, and secure" />
          </div>
        </div>
        <div className="text-xs text-primary-foreground/60">© {new Date().getFullYear()} AI PathShala</div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden mb-6 inline-flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg gradient-emerald">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-base font-bold">AI PathShala</span>
          </Link>

          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
              <TabsTrigger value="forgot">Forgot</TabsTrigger>
            </TabsList>
            <TabsContent value="signin"><SignInForm /></TabsContent>
            <TabsContent value="signup"><SignUpForm /></TabsContent>
            <TabsContent value="forgot"><ForgotForm /></TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-primary-foreground/90">
      <div className="grid h-7 w-7 place-items-center rounded-md bg-background/15">{icon}</div>
      {text}
    </div>
  );
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { toast.error(safeAuthError("signin")); return; }
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold">Welcome back</h2>
        <p className="text-sm text-muted-foreground">Sign in to your AI PathShala account.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" disabled={busy} className="w-full gradient-emerald text-primary-foreground">
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
      </Button>
    </form>
  );
}

function SignUpForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [level, setLevel] = useState<string>("Beginner");
  const [aiClass, setAiClass] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (!LEVEL_OPTIONS.includes(level as any)) {
      toast.error("Please choose your current level."); return;
    }
    setBusy(true);
    // Role is always 'student' — teacher accounts are provisioned out-of-band by an admin.
    const meta: Record<string, unknown> = {
      full_name: fullName,
      assigned_grade: level,
      special_class: aiClass,
    };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: meta,
      },
    });
    setBusy(false);
    if (error) { toast.error(safeAuthError("signup")); return; }
    toast.success("Account created! Check your inbox to verify your email.");
    navigate({ to: "/auth", search: { mode: "signin" } });
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold">Create your student account</h2>
        <p className="text-sm text-muted-foreground">Teacher accounts are provisioned by an admin — contact your school to request one.</p>
      </div>

      <div className="space-y-2">
        <Label>Current Level</Label>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger><SelectValue placeholder="Select your level" /></SelectTrigger>
          <SelectContent>
            {LEVEL_OPTIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-3 cursor-pointer">
        <Checkbox checked={aiClass} onCheckedChange={(v) => setAiClass(v === true)} className="mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-medium text-sm">Enrolled in AI Class</div>
          <div className="text-xs text-muted-foreground">Tick this if you attend the AI Class — you'll see lessons tagged "AI Class".</div>
        </div>
      </label>


      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email2">Email</Label>
        <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password2">Password</Label>
        <Input id="password2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" disabled={busy} className="w-full gradient-emerald text-primary-foreground">
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
      </Button>
    </form>
  );
}

function ForgotForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) console.warn("Password reset request failed", error);
    toast.success("If an account exists for this email, a reset link has been sent.");
  }
  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold">Reset password</h2>
        <p className="text-sm text-muted-foreground">We'll email you a secure link.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="emailF">Email</Label>
        <Input id="emailF" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <Button type="submit" disabled={busy} className="w-full gradient-emerald text-primary-foreground">
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send reset link
      </Button>
    </form>
  );
}
