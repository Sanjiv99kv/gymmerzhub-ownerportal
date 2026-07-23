import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowUpRight, Building2, Camera, Check, Copy, KeyRound, Mail, Phone, UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  getPlan,
  getSession,
  getTrialInfo,
  setSession,
  workspaceUrl,
  type AuthSession,
} from "@/lib/tenant";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — GymmerzHub" }] }),
  component: ProfilePage,
});

function ownerInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

type Section = "personal" | "security" | "workspace";

function ProfilePage() {
  const session = getSession();
  if (!session) return null;

  const plan = getPlan(session.plan);
  const trial = getTrialInfo(session);

  const [section, setSection] = useState<Section>("personal");
  const [ownerName, setOwnerName] = useState(session.ownerName);
  const [email, setEmail] = useState(session.ownerEmail);
  const [phone, setPhone] = useState("+91 98765 43210");
  const [roleTitle, setRoleTitle] = useState("Gym Owner");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const ws = workspaceUrl(session.gymSlug);

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    window.setTimeout(() => {
      const next: AuthSession = {
        ...session,
        ownerName: ownerName.trim() || session.ownerName,
        ownerEmail: email.trim().toLowerCase() || session.ownerEmail,
      };
      setSession(next);
      setSaving(false);
      toast.success("Profile saved");
    }, 350);
  };

  const updatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated");
  };

  const copyWorkspace = async () => {
    try {
      await navigator.clipboard.writeText(ws);
      setCopied(true);
      toast.success("Workspace URL copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };

  const nav = [
    { id: "personal" as const, label: "Personal info", icon: UserRound },
    { id: "security" as const, label: "Password", icon: KeyRound },
    { id: "workspace" as const, label: "Workspace", icon: Building2 },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 md:p-8">
      {/* Page intro */}
      <div className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-16 w-16 border border-border shadow-sm">
              <AvatarFallback className="bg-slate-100 text-lg font-semibold text-slate-700">
                {ownerInitials(ownerName || session.ownerName)}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              className="absolute -bottom-0.5 -right-0.5 grid h-7 w-7 place-items-center rounded-full border border-border bg-white text-muted-foreground shadow-sm transition-colors hover:text-foreground"
              aria-label="Change photo"
              onClick={() => toast.message("Photo upload coming soon")}
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              {ownerName || session.ownerName}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {roleTitle} · {session.gymName}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="outline" className="border-border bg-muted/50 font-normal capitalize text-foreground">
                {plan.name}
              </Badge>
              {trial.isTrialing ? (
                <Badge variant="outline" className="border-primary/25 bg-primary/5 font-normal text-primary">
                  Trial · {trial.daysLeft} days left
                </Badge>
              ) : (
                <Badge variant="outline" className="border-success/25 bg-success/5 font-normal text-success">
                  Active
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/billing">Billing</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings">
              Settings <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
        {/* Side nav */}
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                section === item.id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="min-w-0">
          {section === "personal" && (
            <section className="space-y-6">
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight">Personal information</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  This is how you appear across GymmerzHub and where we send billing emails.
                </p>
              </div>

              <form onSubmit={saveProfile} className="space-y-5 rounded-xl border border-border bg-card p-5 md:p-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Full name" htmlFor="ownerName">
                    <Input
                      id="ownerName"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Role title" htmlFor="roleTitle">
                    <Input
                      id="roleTitle"
                      value={roleTitle}
                      onChange={(e) => setRoleTitle(e.target.value)}
                    />
                  </Field>
                  <Field label="Email" htmlFor="email">
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        className="pl-9"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </Field>
                  <Field label="Phone" htmlFor="phone">
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        className="pl-9"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </Field>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-5">
                  <p className="text-xs text-muted-foreground">Changes apply to this gym workspace only.</p>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </form>
            </section>
          )}

          {section === "security" && (
            <section className="space-y-6">
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight">Password</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Update the password you use to sign in to {session.gymName}.
                </p>
              </div>

              <form onSubmit={updatePassword} className="space-y-5 rounded-xl border border-border bg-card p-5 md:p-6">
                <Field label="Current password" htmlFor="currentPassword">
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="New password" htmlFor="newPassword">
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </Field>
                  <Field label="Confirm new password" htmlFor="confirmPassword">
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </Field>
                </div>
                <div className="flex justify-end border-t border-border pt-5">
                  <Button type="submit">Update password</Button>
                </div>
              </form>
            </section>
          )}

          {section === "workspace" && (
            <section className="space-y-6">
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight">Workspace</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your gym tenant on GymmerzHub. Member data here stays isolated from other gyms.
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="border-b border-border px-5 py-4 md:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-display text-base font-semibold">{session.gymName}</div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{session.city}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">{session.plan}</Badge>
                  </div>
                </div>

                <div className="space-y-0 divide-y divide-border px-5 md:px-6">
                  <MetaRow
                    label="Workspace URL"
                    value={
                      <div className="flex items-center gap-2">
                        <code className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground">
                          {ws}
                        </code>
                        <button
                          type="button"
                          onClick={copyWorkspace}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Copy workspace URL"
                        >
                          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    }
                  />
                  <MetaRow label="Plan" value={`${plan.name} · up to ${plan.memberLimit} members`} />
                  <MetaRow
                    label={trial.isTrialing ? "Trial ends" : "Joined"}
                    value={trial.isTrialing ? trial.trialEndsAt : session.createdAt}
                  />
                  <MetaRow
                    label="Owner email"
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        {session.ownerEmail}
                      </span>
                    }
                  />
                </div>

                {trial.isTrialing && (
                  <div className="border-t border-border bg-muted/30 px-5 py-4 md:px-6">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">Free trial</span>
                      <span className="text-muted-foreground">
                        {trial.elapsed} / {trial.totalDays} days used
                      </span>
                    </div>
                    <Progress value={(trial.elapsed / trial.totalDays) * 100} className="h-1.5" />
                    <div className="mt-3">
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/billing">Manage billing</Link>
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <QuickLink to="/settings" title="Workspace settings" desc="Gym info, attendance, notifications" />
                <QuickLink to="/billing" title="Bills & invoices" desc="Platform fees and plan details" />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground sm:text-right">{value}</div>
    </div>
  );
}

function QuickLink({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-muted/30"
    >
      <div className="flex items-center justify-between">
        <div className="font-medium text-foreground">{title}</div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </Link>
  );
}
