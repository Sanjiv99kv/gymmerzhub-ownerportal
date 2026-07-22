import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSession, loginGym, workspaceUrl } from "@/lib/tenant";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    if (getSession()) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Sign in — FitSaathi" },
      { name: "description", content: "Sign in to your gym workspace on FitSaathi." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState("andheri");
  const [email, setEmail] = useState("rajesh@fitsaathi.in");
  const [password, setPassword] = useState("fitsaathi");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    window.setTimeout(() => {
      const result = loginGym({ slug, email, password });
      setLoading(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Welcome to ${result.session.gymName}`);
      navigate({ to: "/" });
    }, 450);
  };

  return (
    <AuthShell
      title="Sign in to your gym"
      subtitle="Access your gym workspace. Platform billing starts after your free trial — member memberships stay your revenue."
      footer={
        <>
          New gym on FitSaathi?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create a workspace
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="slug">Gym workspace</Label>
          <div className="flex overflow-hidden rounded-md border border-input bg-card shadow-sm focus-within:ring-1 focus-within:ring-ring">
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="your-gym"
              className="border-0 shadow-none focus-visible:ring-0"
              autoComplete="organization"
              required
            />
            <span className="flex items-center border-l border-border bg-muted/60 px-3 text-xs text-muted-foreground whitespace-nowrap">
              .fitsaathi.com
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Demo: <span className="font-medium text-foreground">{workspaceUrl("andheri")}</span> or{" "}
            <span className="font-medium text-foreground">{workspaceUrl("koramangala")}</span>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Owner email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@gym.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button type="button" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
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

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in to workspace"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
