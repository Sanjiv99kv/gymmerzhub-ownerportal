import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatApiError } from "@/lib/api";
import { getIndiaCitiesByStateCode, getIndiaStates } from "@/lib/india-locations";
import {
  checkOwnerSlug,
  registerOwner,
  resendOwnerOtp,
  verifyOwnerOtp,
} from "@/lib/owner-auth-api";
import {
  getSession,
  slugifyGymName,
  workspaceUrl,
  PLATFORM_PLANS,
  TRIAL_DAYS,
  formatINR,
  setSession,
  sessionFromAuthData,
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
  const [step, setStep] = useState<"details" | "otp">("details");
  const [gymName, setGymName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [stateCode, setStateCode] = useState("");
  const [stateName, setStateName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState<GymPlan>("starter");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [slugStatus, setSlugStatus] = useState<{
    kind: "idle" | "checking" | "available" | "error";
    message: string | null;
  }>({ kind: "idle", message: null });
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  const previewSlug = useMemo(
    () => (slugTouched ? slug : slugifyGymName(gymName)),
    [gymName, slug, slugTouched],
  );

  const indiaStates = useMemo(() => getIndiaStates(), []);
  const indiaCities = useMemo(
    () => getIndiaCitiesByStateCode(stateCode),
    [stateCode],
  );

  const onStateChange = (code: string) => {
    const selected = indiaStates.find((s) => s.isoCode === code);
    setStateCode(code);
    setStateName(selected?.name ?? "");
    setCity("");
  };

  useEffect(() => {
    if (!previewSlug || previewSlug.length < 2) {
      setSlugStatus({ kind: "idle", message: null });
      return;
    }

    setSlugStatus({ kind: "checking", message: "Checking availability…" });

    const timer = window.setTimeout(async () => {
      try {
        const result = await checkOwnerSlug(previewSlug);
        if (result.data.available) {
          setSlugStatus({
            kind: "available",
            message: `${result.data.workspaceUrl} is available`,
          });
        } else {
          setSlugStatus({
            kind: "error",
            message: `${result.data.workspaceUrl} is already taken. Choose another.`,
          });
        }
      } catch (error) {
        setSlugStatus({
          kind: "error",
          message: formatApiError(error, "This workspace URL is not available"),
        });
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [previewSlug]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const onGymNameChange = (value: string) => {
    setGymName(value);
    if (!slugTouched) setSlug(slugifyGymName(value));
  };

  const onRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (slugStatus.kind === "error") {
      toast.error(slugStatus.message || "Choose a different workspace URL.");
      return;
    }
    if (slugStatus.kind === "checking") {
      toast.error("Please wait while we check the workspace URL.");
      return;
    }
    if (!stateCode || !stateName) {
      toast.error("Please select a state.");
      return;
    }
    if (!city) {
      toast.error("Please select a city.");
      return;
    }
    if (address.trim().length < 5) {
      toast.error("Enter the full gym address.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      toast.error("Password must include at least one letter and one number.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const result = await registerOwner({
        gymName,
        slug: previewSlug,
        state: stateName,
        stateCode,
        city,
        address: address.trim(),
        ownerName,
        email,
        phone,
        password,
        plan,
      });
      setDevOtp(result.data.devOtp ?? null);
      setStep("otp");
      setResendSeconds(60);
      toast.success(
        result.data.emailSent
          ? "Verification code sent to your email"
          : "Verification code ready (dev mode)",
      );
    } catch (error) {
      toast.error(formatApiError(error, "Could not start registration"));
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOwnerOtp({ email, otp });
      setSession(sessionFromAuthData(result.data));
      toast.success(`${result.data.gym.name} workspace created`);
      navigate({ to: "/" });
    } catch (error) {
      toast.error(formatApiError(error, "Could not verify code"));
    } finally {
      setLoading(false);
    }
  };

  const onResendOtp = async () => {
    if (resendSeconds > 0) return;
    setLoading(true);
    try {
      const result = await resendOwnerOtp({ email });
      setDevOtp(result.data.devOtp ?? null);
      setResendSeconds(60);
      toast.success("Verification code resent");
    } catch (error) {
      toast.error(formatApiError(error, "Could not resend code"));
    } finally {
      setLoading(false);
    }
  };

  if (step === "otp") {
    return (
      <AuthShell
        title="Verify your email"
        subtitle={`Enter the 6-digit code sent to ${email}. This creates your workspace at ${workspaceUrl(previewSlug)}.`}
        footer={
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={() => {
              setStep("details");
              setOtp("");
              setDevOtp(null);
            }}
          >
            Back to registration
          </button>
        }
      >
        <form onSubmit={onVerifyOtp} className="space-y-5">
          {devOtp && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-sm text-amber-900 dark:text-amber-100">
              Dev OTP (mail disabled): <span className="font-mono font-semibold tracking-widest">{devOtp}</span>
            </div>
          )}

          <div className="space-y-3">
            <Label htmlFor="otp">Verification code</Label>
            <InputOTP maxLength={6} value={otp} onChange={setOtp} id="otp">
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

          <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              "Verify & create workspace"
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Didn&apos;t get a code?{" "}
            <button
              type="button"
              className="font-semibold text-primary hover:underline disabled:opacity-50"
              onClick={onResendOtp}
              disabled={loading || resendSeconds > 0}
            >
              {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend code"}
            </button>
          </p>
        </form>
      </AuthShell>
    );
  }

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
      <form onSubmit={onRegisterSubmit} className="space-y-4">
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
          <div
            className={cn(
              "flex overflow-hidden rounded-md border bg-card shadow-sm focus-within:ring-1",
              slugStatus.kind === "error"
                ? "border-destructive focus-within:ring-destructive"
                : "border-input focus-within:ring-ring",
            )}
          >
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
              aria-invalid={slugStatus.kind === "error"}
            />
            <span className="flex items-center border-l border-border bg-muted/60 px-3 text-xs text-muted-foreground whitespace-nowrap">
              .gymmerzhub.com
            </span>
          </div>
          <p
            className={cn(
              "text-xs",
              slugStatus.kind === "error" && "font-medium text-destructive",
              slugStatus.kind === "available" && "font-medium text-emerald-600",
              (slugStatus.kind === "idle" || slugStatus.kind === "checking") && "text-muted-foreground",
            )}
          >
            {slugStatus.message ?? (
              <>
                Your gym will live at{" "}
                <span className="font-medium text-foreground">{workspaceUrl(previewSlug || "your-gym")}</span>
              </>
            )}
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Select value={stateCode || undefined} onValueChange={onStateChange}>
              <SelectTrigger id="state" className="w-full">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {indiaStates.map((state) => (
                  <SelectItem key={state.isoCode} value={state.isoCode}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Select
              value={city || undefined}
              onValueChange={setCity}
              disabled={!stateCode}
            >
              <SelectTrigger id="city" className="w-full">
                <SelectValue placeholder={stateCode ? "Select city" : "Select state first"} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {indiaCities.map((item) => (
                  <SelectItem key={item.name} value={item.name}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Gym address</Label>
          <Textarea
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Building, street, landmark, pincode"
            rows={3}
            required
          />
          <p className="text-xs text-muted-foreground">
            Exact address where your gym is located.
          </p>
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
                placeholder="Min. 8 chars, letter + number"
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

        <Button
          type="submit"
          className="w-full"
          disabled={loading || slugStatus.kind === "error" || slugStatus.kind === "checking"}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending verification code…
            </>
          ) : (
            "Continue with email verification"
          )}
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          Members pay you for gym memberships. You pay GymmerzHub a platform fee after trial, based on active members.
        </p>
      </form>
    </AuthShell>
  );
}
