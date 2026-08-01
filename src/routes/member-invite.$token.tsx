import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatApiError } from "@/lib/api";
import {
  acceptMemberInvite,
  previewMemberInvite,
  type MemberInvitePreview,
} from "@/lib/membership-api";

export const Route = createFileRoute("/member-invite/$token")({
  head: () => ({
    meta: [{ title: "Activate member app — GymmerzHub" }],
  }),
  component: AcceptMemberInvitePage,
});

function AcceptMemberInvitePage() {
  const { token } = Route.useParams();
  const [preview, setPreview] = useState<MemberInvitePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ gymName: string; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPreview(true);
      setPreviewError(null);
      try {
        const data = await previewMemberInvite(token);
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
      const result = await acceptMemberInvite(token, password);
      toast.success("App access activated");
      setDone({
        gymName: result.data.gym.name,
        message: result.data.message,
      });
    } catch (error) {
      toast.error(formatApiError(error, "Could not activate access"));
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
      <AuthShell title="Invitation unavailable" subtitle={previewError || "This link is invalid or expired."}>
        <Button asChild variant="outline" className="w-full">
          <Link to="/login">Back to login</Link>
        </Button>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="You're all set" subtitle={done.gymName}>
        <p className="mb-6 text-sm text-muted-foreground">{done.message}</p>
        <p className="text-sm text-muted-foreground">
          Open the GymmerzHub member app and sign in with <strong>{preview.email}</strong>.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Activate member app"
      subtitle={`${preview.gymName} · ${preview.fullName}`}
    >
      <p className="mb-4 text-sm text-muted-foreground">
        {preview.accountExists
          ? "An account already exists for this email. Enter your password to link gym access."
          : "Create a password to activate your member app access."}
      </p>
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={preview.email} readOnly className="bg-muted/40" />
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={preview.accountExists ? "current-password" : "new-password"}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {!preview.accountExists && (
          <div className="space-y-2">
            <Label>Confirm password</Label>
            <Input
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Invite expires {new Date(preview.expiresAt).toLocaleString()}
        </p>
        <Button type="submit" className="w-full bg-lime text-lime-foreground" disabled={submitting}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Activate access
        </Button>
      </form>
    </AuthShell>
  );
}
