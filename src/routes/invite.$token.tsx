import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatApiError } from "@/lib/api";
import { acceptStaffInvite, previewStaffInvite, type StaffInvitePreview } from "@/lib/staff-api";
import { getSession, sessionFromAuthData, setSession } from "@/lib/tenant";

export const Route = createFileRoute("/invite/$token")({
  beforeLoad: () => {
    if (getSession()) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [{ title: "Accept invitation — GymmerzHub" }],
  }),
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<StaffInvitePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPreview(true);
      setPreviewError(null);
      try {
        const data = await previewStaffInvite(token);
        if (!cancelled) setPreview(data);
      } catch (error) {
        if (!cancelled) setPreviewError(formatApiError(error, "This invitation is not valid"));
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview) return;
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      toast.error("Password must include at least one letter and one number");
      return;
    }
    if (!preview.accountExists && password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const result = await acceptStaffInvite(token, password);
      setSession(sessionFromAuthData(result.data));
      toast.success(`Welcome to ${result.data.gym.name}`);
      navigate({ to: "/" });
    } catch (error) {
      toast.error(formatApiError(error, "Could not accept invitation"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingPreview) {
    return (
      <AuthShell title="Loading invitation" subtitle="Please wait…">
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </AuthShell>
    );
  }

  if (previewError || !preview) {
    return (
      <AuthShell
        title="Invitation unavailable"
        subtitle={previewError || "This link is invalid or expired."}
        footer={
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in instead
          </Link>
        }
      >
        <Button asChild className="w-full">
          <Link to="/login">Go to sign in</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={`Join ${preview.gymName}`}
      subtitle={
        preview.accountExists
          ? `You already have a GymmerzHub account. Enter your password to join as ${preview.roleName}.`
          : `Create a password to join as ${preview.roleName}. Invited as ${preview.fullName}.`
      }
      footer={
        <span>
          Already on the team?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
          <div className="font-medium">{preview.fullName}</div>
          <div className="text-muted-foreground">{preview.email}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Role: {preview.roleName}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">
            {preview.accountExists ? "Your password" : "Create password"}
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={preview.accountExists ? "current-password" : "new-password"}
              required
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {!preview.accountExists && (
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
        )}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Joining…
            </>
          ) : (
            "Accept & join"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
