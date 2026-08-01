import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, ChevronRight, Eye, EyeOff, Loader2 } from "lucide-react";
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
import {
  isOwnerMfaChallenge,
  isOwnerWorkspaceSelection,
  loginOwner,
  selectOwnerWorkspace,
  verifyOwnerMfa,
  type OwnerAuthData,
  type OwnerWorkspaceAccess,
} from "@/lib/owner-auth-api";
import {
  getSession,
  sessionFromAuthData,
  setSession,
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  const [selectionToken, setSelectionToken] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<OwnerWorkspaceAccess[]>([]);

  const finishLogin = (data: OwnerAuthData) => {
    setSession(sessionFromAuthData(data));
    toast.success(`Welcome to ${data.gym.name}`);
    navigate({ to: "/" });
  };

  const handleLoginResult = (
    data: Awaited<ReturnType<typeof loginOwner>>["data"],
  ) => {
    if (isOwnerMfaChallenge(data)) {
      setMfaToken(data.mfaToken);
      setMfaCode("");
      setSelectionToken(null);
      setWorkspaces([]);
      toast.message("Enter the code from your authenticator app");
      return;
    }
    if (isOwnerWorkspaceSelection(data)) {
      setMfaToken(null);
      setSelectionToken(data.selectionToken);
      setWorkspaces(data.workspaces);
      return;
    }
    finishLogin(data);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await loginOwner({ email, password });
      handleLoginResult(result.data);
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
      handleLoginResult(result.data);
    } catch (error) {
      toast.error(formatApiError(error, "Could not verify MFA code"));
    } finally {
      setLoading(false);
    }
  };

  const onSelectWorkspace = async (gymId: string) => {
    if (!selectionToken) return;
    setLoading(true);
    try {
      const result = await selectOwnerWorkspace({ selectionToken, gymId });
      finishLogin(result.data);
    } catch (error) {
      toast.error(formatApiError(error, "Could not open workspace"));
    } finally {
      setLoading(false);
    }
  };

  const resetToCredentials = () => {
    setMfaToken(null);
    setMfaCode("");
    setSelectionToken(null);
    setWorkspaces([]);
    setPassword("");
  };

  if (selectionToken && workspaces.length > 0) {
    return (
      <AuthShell
        title="Choose a workspace"
        subtitle="You have access to more than one gym. Pick where you want to continue."
        footer={
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={resetToCredentials}
          >
            Back to sign in
          </button>
        }
      >
        <div className="space-y-2">
          {workspaces.map((ws) => (
            <button
              key={ws.gymId}
              type="button"
              disabled={loading}
              onClick={() => void onSelectWorkspace(ws.gymId)}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition hover:border-primary/40 hover:bg-muted/40 disabled:opacity-60"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-foreground">{ws.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {ws.gymRoleName || ws.role}
                </div>
              </div>
              {loading ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </button>
          ))}
        </div>
      </AuthShell>
    );
  }

  if (mfaToken) {
    return (
      <AuthShell
        title="Two-factor authentication"
        subtitle="Enter the 6-digit code from your authenticator app to continue."
        footer={
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={resetToCredentials}
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
      title="Sign in"
      subtitle="Enter your email and password to access your gym workspaces."
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
          <Label htmlFor="email">Email</Label>
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
            "Sign in"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
