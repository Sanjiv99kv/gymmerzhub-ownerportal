import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Camera,
  Check,
  Copy,
  KeyRound,
  Loader2,
  MonitorSmartphone,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/topbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatApiError } from "@/lib/api";
import { expireOwnerSession } from "@/lib/auth-session";
import {
  disableOwnerMfa,
  enableOwnerMfa,
  fetchOwnerMe,
  fetchOwnerMfaStatus,
  fetchOwnerSessions,
  revokeOwnerSession,
  setupOwnerMfa,
  updateOwnerProfile,
  uploadOwnerAvatar,
  type OwnerMfaSetupData,
  type OwnerSession,
} from "@/lib/owner-auth-api";
import {
  getPlan,
  getSession,
  getTrialInfo,
  setSession,
  workspaceUrl,
  TRIAL_MEMBER_LIMIT,
  type AuthSession,
} from "@/lib/tenant";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — GymmerzHub" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const session = getSession();

  const [section, setSection] = useState("personal");
  const [ownerName, setOwnerName] = useState(session?.ownerName ?? "");
  const [email, setEmail] = useState(session?.ownerEmail ?? "");
  const [phone, setPhone] = useState(session?.ownerPhone ?? "");
  const [roleLabel, setRoleLabel] = useState(session?.hubRoleName || "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [sessions, setSessions] = useState<OwnerSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaSetup, setMfaSetup] = useState<OwnerMfaSetupData | null>(null);
  const [mfaEnableCode, setMfaEnableCode] = useState("");
  const [mfaDisablePassword, setMfaDisablePassword] = useState("");
  const [mfaDisableCode, setMfaDisableCode] = useState("");
  const [showDisableMfa, setShowDisableMfa] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(session?.ownerAvatarUrl ?? null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (section !== "personal" || !session?.token) return;

    let cancelled = false;
    setSessionsLoading(true);

    Promise.all([
      fetchOwnerSessions(session.token),
      fetchOwnerMe(session.token).catch(() => null),
    ])
      .then(([sessionsResult, meResult]) => {
        if (cancelled) return;
        setSessions(sessionsResult.data.sessions);
        if (meResult?.data?.user) {
          const user = meResult.data.user;
          const membership = meResult.data.membership;
          const resolvedRoleName = membership?.gymRoleName || session.hubRoleName || "";
          const next: AuthSession = {
            ...session,
            ownerName: user.fullName || session.ownerName,
            ownerEmail: user.email || session.ownerEmail,
            ownerPhone: user.phone ?? null,
            ownerAvatarUrl: user.avatarUrl ?? session.ownerAvatarUrl ?? null,
            emailVerified: Boolean(user.emailVerified ?? user.emailVerifiedAt),
            hubRole: membership?.role || session.hubRole || "owner",
            hubRoleName: resolvedRoleName || null,
            permissionKeys: Array.isArray(membership?.permissionKeys)
              ? membership.permissionKeys
              : membership?.role === "owner"
                ? session.permissionKeys
                : [],
          };
          setOwnerName(next.ownerName);
          setEmail(next.ownerEmail);
          setAvatarUrl(next.ownerAvatarUrl ?? null);
          setPhone(user.phone ?? "");
          setRoleLabel(resolvedRoleName);
          setSession(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSessions([]);
          toast.error("Could not load active sessions");
        }
      })
      .finally(() => {
        if (!cancelled) setSessionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [section, session?.token]);

  useEffect(() => {
    if (section !== "security" || !session?.token) return;

    let cancelled = false;
    setMfaLoading(true);

    fetchOwnerMfaStatus(session.token)
      .then((result) => {
        if (cancelled) return;
        setMfaEnabled(result.data.enabled);
        if (result.data.enabled) {
          setMfaSetup(null);
          setShowDisableMfa(false);
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load MFA status");
      })
      .finally(() => {
        if (!cancelled) setMfaLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [section, session?.token]);

  if (!session) return null;

  const plan = getPlan(session.plan);
  const trial = getTrialInfo(session);
  const ws = workspaceUrl(session.gymSlug);
  const location = [session.address, session.city, session.state].filter(Boolean).join(", ");
  const initials = session.ownerName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session.token) return;
    const name = ownerName.trim();
    if (name.length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }
    setSaving(true);
    try {
      const result = await updateOwnerProfile(session.token, {
        fullName: name,
        phone: phone.trim() || null,
      });
      const user = result.data.user;
      const membership = result.data.membership;
      const resolvedRoleName = membership?.gymRoleName || session.hubRoleName || "";
      const next: AuthSession = {
        ...session,
        ownerName: user.fullName,
        ownerEmail: user.email,
        ownerPhone: user.phone ?? null,
        ownerAvatarUrl: user.avatarUrl ?? session.ownerAvatarUrl ?? null,
        hubRole: membership?.role || session.hubRole || "owner",
        hubRoleName: resolvedRoleName || null,
        permissionKeys: Array.isArray(membership?.permissionKeys)
          ? membership.permissionKeys
          : membership?.role === "owner"
            ? session.permissionKeys
            : [],
      };
      setOwnerName(next.ownerName);
      setPhone(user.phone ?? "");
      setRoleLabel(resolvedRoleName);
      setSession(next);
      toast.success("Profile saved");
    } catch (error) {
      toast.error(formatApiError(error, "Could not save profile"));
    } finally {
      setSaving(false);
    }
  };

  const updatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast.error("Password must include at least one letter and one number.");
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
      toast.success("Copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };

  const disableSession = async (row: OwnerSession) => {
    if (!session.token) return;
    setRevokingId(row.id);
    try {
      const result = await revokeOwnerSession(session.token, row.id);
      if (result.data.current) {
        toast.success("This device was signed out");
        expireOwnerSession();
        return;
      }
      setSessions((prev) => prev.filter((s) => s.id !== row.id));
      toast.success("Session revoked");
    } catch {
      toast.error("Could not revoke session");
    } finally {
      setRevokingId(null);
    }
  };

  const startMfaSetup = async () => {
    if (!session.token) return;
    setMfaBusy(true);
    try {
      const result = await setupOwnerMfa(session.token);
      setMfaSetup(result.data);
      setMfaEnableCode("");
      toast.message("Scan the QR code, then enter a code to confirm");
    } catch (error) {
      toast.error(formatApiError(error, "Could not start MFA setup"));
    } finally {
      setMfaBusy(false);
    }
  };

  const confirmEnableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session.token) return;
    if (mfaEnableCode.length !== 6) {
      toast.error("Enter the 6-digit authenticator code.");
      return;
    }
    setMfaBusy(true);
    try {
      await enableOwnerMfa(session.token, mfaEnableCode);
      setMfaEnabled(true);
      setMfaSetup(null);
      setMfaEnableCode("");
      toast.success("MFA enabled");
    } catch (error) {
      toast.error(formatApiError(error, "Could not enable MFA"));
    } finally {
      setMfaBusy(false);
    }
  };

  const confirmDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session.token) return;
    if (mfaDisableCode.length !== 6) {
      toast.error("Enter the 6-digit authenticator code.");
      return;
    }
    setMfaBusy(true);
    try {
      await disableOwnerMfa(session.token, {
        password: mfaDisablePassword,
        code: mfaDisableCode,
      });
      setMfaEnabled(false);
      setShowDisableMfa(false);
      setMfaDisablePassword("");
      setMfaDisableCode("");
      setMfaSetup(null);
      toast.success("MFA disabled");
    } catch (error) {
      toast.error(formatApiError(error, "Could not disable MFA"));
    } finally {
      setMfaBusy(false);
    }
  };

  const applyAvatarUser = (user: { avatarUrl?: string | null; fullName?: string }) => {
    const current = getSession();
    if (!current) return;
    const next: AuthSession = {
      ...current,
      ownerAvatarUrl: user.avatarUrl ?? null,
      ownerName: user.fullName || current.ownerName,
    };
    setAvatarUrl(next.ownerAvatarUrl ?? null);
    setSession(next);
  };

  const onAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !session.token) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Use a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be 2MB or smaller.");
      return;
    }

    setAvatarUploading(true);
    try {
      const result = await uploadOwnerAvatar(session.token, file);
      applyAvatarUser(result.data.user);
      toast.success("Profile photo updated");
    } catch (error) {
      toast.error(formatApiError(error, "Could not upload photo"));
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <div>
      <PageHeader
        badge="Account"
        title="Profile"
        description={`Manage your account for ${session.gymName}.`}
      />

      <div className="space-y-6 p-6">
        <Card className="overflow-hidden border-border bg-card shadow-card">
          <div className="flex flex-col gap-4 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <Avatar className="h-16 w-16 border border-border shadow-sm">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt={session.ownerName} />
                  ) : null}
                  <AvatarFallback className="bg-primary/15 font-display text-lg font-semibold text-primary">
                    {initials || "GO"}
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onAvatarSelected}
                />
                <button
                  type="button"
                  disabled={avatarUploading}
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-60"
                  aria-label="Upload profile photo"
                >
                  {avatarUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-display text-lg font-semibold text-foreground">
                    {session.ownerName}
                  </h2>
                  {roleLabel ? (
                    <Badge variant="secondary" className="rounded-full">
                      {roleLabel}
                    </Badge>
                  ) : null}
                  {session.emailVerified && (
                    <Badge
                      variant="outline"
                      className="border-success/30 bg-success/10 text-success"
                    >
                      <BadgeCheck className="mr-1 h-3.5 w-3.5" />
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="truncate text-sm text-muted-foreground">{session.ownerEmail}</p>
                <p className="font-mono text-xs text-muted-foreground">{ws}</p>
              </div>
            </div>
            <Badge variant="outline" className="w-fit border-border bg-background/80">
              {trial.isTrialing ? "Free trial" : plan ? `${plan.name} plan` : "No plan"}
            </Badge>
          </div>
        </Card>

        <Tabs value={section} onValueChange={setSection} className="space-y-5">
          <TabsList className="h-auto border border-border bg-card p-1 shadow-sm">
            <TabsTrigger value="personal" className="px-4">
              Personal
            </TabsTrigger>
            <TabsTrigger value="security" className="px-4">
              Security
            </TabsTrigger>
            <TabsTrigger value="workspace" className="px-4">
              Workspace
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-0">
            <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <Card className="border-border bg-card shadow-card">
                <CardHeader>
                  <CardTitle className="font-display">Personal information</CardTitle>
                  <CardDescription>
                    Your name and contact details used across GymmerzHub.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={saveProfile}>
                  <CardContent className="space-y-4">
                    <Field label="Full name" htmlFor="ownerName">
                      <Input
                        id="ownerName"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        className="border-border bg-background"
                        required
                      />
                    </Field>
                    <Field label="Email" htmlFor="email">
                      <div className="relative">
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          readOnly
                          className={cn(
                            "border-border bg-muted/40",
                            session.emailVerified && "pr-24",
                          )}
                        />
                        {session.emailVerified && (
                          <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center gap-1 text-xs font-medium text-success">
                            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                            Verified
                          </span>
                        )}
                      </div>
                    </Field>
                    <Field label="Role" htmlFor="role">
                      <Input
                        id="role"
                        value={roleLabel || "—"}
                        readOnly
                        className="border-border bg-muted/40"
                      />
                    </Field>
                    <Field label="Phone" htmlFor="phone">
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Add phone number"
                        className="border-border bg-background"
                      />
                    </Field>
                  </CardContent>
                  <CardFooter className="justify-end border-t border-border px-6 py-4">
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving…" : "Save changes"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>

              <Card className="border-border bg-card shadow-card">
                <CardHeader>
                  <CardTitle className="font-display">Active sessions</CardTitle>
                  <CardDescription>
                    Devices signed in to your account. Revoke any you don’t recognize.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {sessionsLoading ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Loading sessions…
                    </p>
                  ) : sessions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
                      <MonitorSmartphone className="mx-auto h-8 w-8 text-muted-foreground/70" />
                      <p className="mt-3 text-sm text-muted-foreground">
                        No tracked sessions yet. Sign out and sign back in to start tracking
                        devices.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border rounded-xl border border-border">
                      {sessions.map((row) => (
                        <li
                          key={row.id}
                          className="flex items-start justify-between gap-3 px-4 py-3.5"
                        >
                          <div className="flex min-w-0 gap-3">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                              <MonitorSmartphone className="h-4 w-4" aria-hidden />
                            </div>
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-foreground">
                                  {row.deviceLabel}
                                </p>
                                {row.current && (
                                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                                    This device
                                  </Badge>
                                )}
                              </div>
                              <p className="font-mono text-xs text-muted-foreground">
                                {row.ipAddress || "IP unknown"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Last active {formatRelative(row.lastActiveAt)}
                              </p>
                            </div>
                          </div>
                          {!row.current && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={revokingId === row.id}
                              onClick={() => disableSession(row)}
                            >
                              {revokingId === row.id ? "…" : "Revoke"}
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="security" className="mt-0">
            <div className="grid gap-5 xl:grid-cols-2">
              <Card className="border-border bg-card shadow-card">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="font-display">Password</CardTitle>
                      <CardDescription>
                        Update the password for {session.gymName}.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <form onSubmit={updatePassword}>
                  <CardContent className="space-y-4">
                    <Field label="Current password" htmlFor="currentPassword">
                      <Input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                        className="border-border bg-background"
                        required
                      />
                    </Field>
                    <Field label="New password" htmlFor="newPassword">
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        className="border-border bg-background"
                        required
                      />
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        At least 8 characters, with a letter and a number.
                      </p>
                    </Field>
                    <Field label="Confirm new password" htmlFor="confirmPassword">
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        className="border-border bg-background"
                        required
                      />
                    </Field>
                  </CardContent>
                  <CardFooter className="justify-end border-t border-border px-6 py-4">
                    <Button type="submit">Update password</Button>
                  </CardFooter>
                </form>
              </Card>

              <Card className="border-border bg-card shadow-card">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "grid h-9 w-9 place-items-center rounded-lg",
                        mfaEnabled
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {mfaEnabled ? (
                        <ShieldCheck className="h-4 w-4" />
                      ) : (
                        <ShieldOff className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="font-display">Two-factor authentication</CardTitle>
                      <CardDescription>
                        Require an authenticator code each time you sign in.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {mfaLoading ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Loading MFA status…
                    </p>
                  ) : mfaEnabled ? (
                    <div className="space-y-5">
                      <div className="rounded-xl border border-success/25 bg-success/5 px-4 py-3">
                        <p className="text-sm font-medium text-foreground">MFA is enabled</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Sign-in requires a code from your authenticator app.
                        </p>
                      </div>

                      {!showDisableMfa ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowDisableMfa(true)}
                        >
                          Disable MFA
                        </Button>
                      ) : (
                        <form onSubmit={confirmDisableMfa} className="space-y-4">
                          <Field label="Password" htmlFor="mfaDisablePassword">
                            <Input
                              id="mfaDisablePassword"
                              type="password"
                              value={mfaDisablePassword}
                              onChange={(e) => setMfaDisablePassword(e.target.value)}
                              autoComplete="current-password"
                              className="border-border bg-background"
                              required
                            />
                          </Field>
                          <div className="space-y-2">
                            <Label htmlFor="mfaDisableCode">Authenticator code</Label>
                            <InputOTP
                              maxLength={6}
                              value={mfaDisableCode}
                              onChange={setMfaDisableCode}
                              id="mfaDisableCode"
                            >
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
                          <div className="flex flex-wrap gap-2">
                            <Button type="submit" variant="destructive" disabled={mfaBusy}>
                              {mfaBusy ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Disabling…
                                </>
                              ) : (
                                "Confirm disable"
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                setShowDisableMfa(false);
                                setMfaDisablePassword("");
                                setMfaDisableCode("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      )}
                    </div>
                  ) : mfaSetup ? (
                    <form onSubmit={confirmEnableMfa} className="space-y-5">
                      <div className="space-y-3">
                        <img
                          src={mfaSetup.qrCodeDataUrl}
                          alt="MFA QR code"
                          className="h-[200px] w-[200px] rounded-xl border border-border bg-white p-2 shadow-sm"
                        />
                        <p className="text-sm text-muted-foreground">
                          Scan with Google Authenticator, 1Password, Authy, or similar — or enter
                          this key manually:
                        </p>
                        <code className="block break-all rounded-lg border border-border bg-muted/50 px-3 py-2 font-mono text-xs">
                          {mfaSetup.secret}
                        </code>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="mfaEnableCode">Confirm with a code</Label>
                        <InputOTP
                          maxLength={6}
                          value={mfaEnableCode}
                          onChange={setMfaEnableCode}
                          id="mfaEnableCode"
                        >
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

                      <div className="flex flex-wrap gap-2">
                        <Button type="submit" disabled={mfaBusy || mfaEnableCode.length !== 6}>
                          {mfaBusy ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Enabling…
                            </>
                          ) : (
                            "Enable MFA"
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setMfaSetup(null);
                            setMfaEnableCode("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-5">
                        <p className="text-sm text-muted-foreground">
                          MFA is off. Enable it to protect your owner account with an authenticator
                          app.
                        </p>
                      </div>
                      <Button type="button" onClick={startMfaSetup} disabled={mfaBusy}>
                        {mfaBusy ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Preparing…
                          </>
                        ) : (
                          "Enable MFA"
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="workspace" className="mt-0">
            <Card className="border-border bg-card shadow-card">
              <CardHeader>
                <CardTitle className="font-display">Workspace</CardTitle>
                <CardDescription>Details for this gym tenant on GymmerzHub.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  <MetaRow label="Gym" value={session.gymName} />
                  <MetaRow
                    label="Workspace URL"
                    value={
                      <span className="inline-flex items-center gap-2">
                        <span className="font-mono text-sm">{ws}</span>
                        <button
                          type="button"
                          onClick={copyWorkspace}
                          className="text-muted-foreground transition-colors hover:text-foreground"
                          aria-label="Copy workspace URL"
                        >
                          {copied ? (
                            <Check className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </span>
                    }
                  />
                  <MetaRow label="Location" value={location || "—"} />
                  <MetaRow
                    label="Plan"
                    value={
                      trial.isTrialing
                        ? `Trial · up to ${TRIAL_MEMBER_LIMIT} members`
                        : plan
                          ? `${plan.name} · up to ${plan.memberLimit ?? "∞"} members`
                          : "Choose a plan on Billing"
                    }
                  />
                  <MetaRow
                    label={trial.isTrialing ? "Trial ends" : "Joined"}
                    value={trial.isTrialing ? trial.trialEndsAt : session.createdAt}
                  />
                  {trial.isTrialing && (
                    <MetaRow
                      label="Trial status"
                      value={`${trial.daysLeft} days left · ${trial.elapsed} of ${trial.totalDays} used`}
                    />
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2 border-t border-border px-6 py-4">
                <Button variant="outline" asChild>
                  <Link to="/billing">Billing</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/settings">Settings</Link>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function formatRelative(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
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
    <div className="grid gap-1 px-6 py-3.5 sm:grid-cols-[160px_1fr] sm:items-center sm:gap-6">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
