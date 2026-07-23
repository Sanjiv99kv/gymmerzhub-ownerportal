import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getSession,
  registerGym,
  slugifyGymName,
  workspaceUrl,
  PLATFORM_PLANS,
  TRIAL_DAYS,
  formatINR,
  type GymPlan,
} from "@/lib/tenant";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  beforeLoad: () => {
    if (getSession()) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Register your gym — GymmerzHub" },
      { name: "description", content: "Create a new gym workspace on GymmerzHub multi-tenant platform." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [gymName, setGymName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [city, setCity] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState<GymPlan>("starter");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const previewSlug = useMemo(
    () => (slugTouched ? slug : slugifyGymName(gymName)),
    [gymName, slug, slugTouched],
  );

  const onGymNameChange = (value: string) => {
    setGymName(value);
    if (!slugTouched) setSlug(slugifyGymName(value));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    window.setTimeout(() => {
      const result = registerGym({
        name: gymName,
        slug: previewSlug,
        city,
        ownerName,
        ownerEmail: email,
        phone,
        plan,
      });
      setLoading(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${result.tenant.name} workspace created`);
      navigate({ to: "/" });
    }, 550);
  };

  return (
    <AuthShell
      title="Register your gym"
      subtitle={`Start with a free ${TRIAL_DAYS}-day trial. After that, pay GymmerzHub based on your plan + active members. Member memberships stay your revenue.`}
      footer={
        <>
          Already have a workspace?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-3 text-sm">
          <span className="font-semibold text-primary">{TRIAL_DAYS} days free</span>
          <span className="text-muted-foreground"> — no platform charges until trial ends.</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gymName">Gym name</Label>
          <Input
            id="gymName"
            value={gymName}
            onChange={(e) => onGymNameChange(e.target.value)}
            placeholder="e.g. PowerHouse Fitness"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Workspace URL</Label>
          <div className="flex overflow-hidden rounded-md border border-input bg-card shadow-sm focus-within:ring-1 focus-within:ring-ring">
            <Input
              id="slug"
              value={previewSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              }}
              placeholder="powerhouse"
              className="border-0 shadow-none focus-visible:ring-0"
              required
            />
            <span className="flex items-center border-l border-border bg-muted/60 px-3 text-xs text-muted-foreground whitespace-nowrap">
              .gymmerzhub.com
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Your gym will live at{" "}
            <span className="font-medium text-foreground">{workspaceUrl(previewSlug || "your-gym")}</span>
          </p>
        </div>

        <div className="space-y-2">
          <Label>Choose plan (billed after trial)</Label>
          <div className="grid gap-2">
            {PLATFORM_PLANS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlan(p.id)}
                className={cn(
                  "rounded-xl border px-3.5 py-3 text-left transition-colors",
                  plan === p.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border bg-card hover:bg-muted/40",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-sm font-semibold text-foreground">
                    {formatINR(p.monthlyFee)}
                    <span className="font-normal text-muted-foreground">/mo</span>
                  </div>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  + {formatINR(p.perMemberFee)}/member · up to {p.memberLimit} members
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Mumbai"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ownerName">Owner full name</Label>
          <Input
            id="ownerName"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@gym.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 9XXXXXXXXX"
              autoComplete="tel"
              required
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                autoComplete="new-password"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
              autoComplete="new-password"
              required
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating workspace…
            </>
          ) : (
            `Start ${TRIAL_DAYS}-day free trial`
          )}
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          Members pay you for gym memberships. You pay GymmerzHub a platform fee after trial, based on active members.
        </p>
      </form>
    </AuthShell>
  );
}
