import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { formatApiError } from "@/lib/api";
import { isOwnerMfaChallenge, loginOwner, verifyOwnerMfa } from "@/lib/owner-auth-api";
import {
  getSession,
  sessionFromAuthData,
  setSession,
  workspaceUrl,
} from "@/lib/tenant";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    if (getSession()) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Sign in — GymmerzHub" },
      { name: "description", content: "Sign in to your gym workspace on GymmerzHub." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaGymName, setMfaGymName] = useState("");
  const [mfaCode, setMfaCode] = useState("");

  const finishLogin = (data: Parameters<typeof sessionFromAuthData>[0]) => {
    setSession(sessionFromAuthData(data));
    toast.success(`Welcome to ${data.gym.name}`);
    navigate({ to: "/" });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await loginOwner({ slug, email, password });
      if (isOwnerMfaChallenge(result.data)) {
        setMfaToken(result.data.mfaToken);
        setMfaGymName(result.data.gymName);
        setMfaCode("");
        toast.message("Enter the code from your authenticator app");
        return;
      }
      finishLogin(result.data);
    } catch (error) {
      toast.error(formatApiError(error, "Could not sign in"));
    } finally {
      setLoading(false);
    }
  };

  const onVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaToken) return;
    if (mfaCode.length !== 6) {
      toast.error("Enter the 6-digit authenticator code.");
      return;
    }
    setLoading(true);
    try {
      const result = await verifyOwnerMfa({ mfaToken, code: mfaCode });
      finishLogin(result.data);
    } catch (error) {
      toast.error(formatApiError(error, "Could not verify MFA code"));
    } finally {
      setLoading(false);
    }
  };

  if (mfaToken) {
    return (
      <AuthShell
        title="Two-factor authentication"
        subtitle={`Enter the 6-digit code from your authenticator app to finish signing in to ${mfaGymName || "your workspace"}.`}
        footer={
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={() => {
              setMfaToken(null);
              setMfaCode("");
              setPassword("");
            }}
          >
            Back to sign in
          </button>
        }
      >
        <form onSubmit={onVerifyMfa} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="mfaCode">Authenticator code</Label>
            <InputOTP maxLength={6} value={mfaCode} onChange={setMfaCode} id="mfaCode">
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button type="submit" className="w-full" disabled={loading || mfaCode.length !== 6}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              "Verify and continue"
            )}
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Sign in to your gym"
      subtitle="Access your gym workspace — manage members, attendance, and member payments."
      footer={
        <>
          New gym on GymmerzHub?{" "}
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
              .gymmerzhub.com
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Example: <span className="font-medium text-foreground">{workspaceUrl("powerhouse")}</span>
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
