import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LogOut, Save } from "lucide-react";
import { LEVEL_OPTIONS } from "@/lib/grades";

export const Route = createFileRoute("/_app/settings")({ component: Settings });

function Settings() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [assignedGrade, setAssignedGrade] = useState<string>("");
  const [specialClass, setSpecialClass] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [webhook, setWebhook] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name,email_notifications,roll_number,assigned_grade,special_class")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name ?? "");
          setEmailNotif(data.email_notifications);
          setRollNumber((data as any).roll_number ?? "");
          setAssignedGrade((data as any).assigned_grade ?? "");
          setSpecialClass(!!(data as any).special_class);
        }
      });
    if (role === "teacher") {
      supabase.from("teacher_integrations").select("webhook_url").eq("teacher_id", user.id).maybeSingle()
        .then(({ data }) => { if (data?.webhook_url) setWebhook(data.webhook_url); });
    }
  }, [user, role]);

  async function save() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName,
      email_notifications: emailNotif,
      roll_number: rollNumber || null,
    });
    if (!error && role === "teacher") {
      await supabase.from("teacher_integrations").upsert({ teacher_id: user.id, webhook_url: webhook || null });
    }
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and preferences.</p>
      </div>

      <Card className="p-6 shadow-soft space-y-4">
        <h2 className="font-display text-lg font-semibold">Profile</h2>
        <div className="space-y-2"><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
        <div className="space-y-2"><Label>Role</Label><Input value={role ?? ""} disabled className="capitalize" /></div>
        <div className="space-y-2"><Label>Full name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" /></div>
        {role === "student" && (
          <>
            <div className="space-y-2">
              <Label>Roll number</Label>
              <Input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder="e.g. 23A045" />
              <p className="text-xs text-muted-foreground">Your unique class identifier.</p>
            </div>
            <div className="space-y-2">
              <Label>Current Level</Label>
              <Select value={assignedGrade} disabled>
                <SelectTrigger><SelectValue placeholder="Not assigned yet" /></SelectTrigger>
                <SelectContent>
                  {LEVEL_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Your level is managed by your teacher. Contact them to request a change.</p>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-3 opacity-80">
              <Checkbox id="special-class" checked={specialClass} disabled className="mt-0.5" />
              <div className="space-y-0.5">
                <Label htmlFor="special-class" className="font-medium">Enrolled in AI Class</Label>
                <p className="text-xs text-muted-foreground">AI Class enrollment is managed by your teacher.</p>
              </div>
            </div>
          </>
        )}
      </Card>

      <Card className="p-6 shadow-soft space-y-4">
        <h2 className="font-display text-lg font-semibold">Email preferences</h2>
        <div className="flex items-center justify-between">
          <div><div className="font-medium">Email notifications</div><div className="text-sm text-muted-foreground">Updates about your lessons and submissions.</div></div>
          <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
        </div>
      </Card>

      {role === "teacher" && (
        <Card className="p-6 shadow-soft space-y-4">
          <h2 className="font-display text-lg font-semibold">Make.com webhook</h2>
          <p className="text-sm text-muted-foreground">Receive a POST with each generated lesson — paste your webhook URL.</p>
          <Input placeholder="https://hook.eu1.make.com/..." value={webhook} onChange={(e) => setWebhook(e.target.value)} />
        </Card>
      )}

      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="outline" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
        <Button onClick={save} disabled={busy} className="gradient-emerald text-primary-foreground"><Save className="mr-2 h-4 w-4" /> Save changes</Button>
      </div>
    </div>
  );
}
