import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Check,
  CreditCard,
  Download,
  FileText,
  Loader2,
  Sparkles,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  confirmInvoicePayment,
  confirmPayAllPayment,
  createInvoicePaymentOrder,
  createPayAllOrder,
  downloadInvoicePdf,
  fetchBillingSummary,
  markAllInvoicesPaidDev,
  markInvoicePaidDev,
  openRazorpayCheckout,
  purchasePlatformPlan,
  switchPlatformPlan,
  voidCheckoutInvoice,
  type BillingSummary,
  type PlatformInvoiceRow,
  type PlatformInvoiceStatus,
  type PlatformPlanRow,
} from "@/lib/billing-api";
import {
  formatINR,
  getSession,
  setSession,
  type BillingStatus,
  type GymPlan,
} from "@/lib/tenant";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/billing")({
  head: () => ({ meta: [{ title: "Billing — GymmerzHub" }] }),
  component: BillingPage,
});

const statusStyles: Record<PlatformInvoiceStatus, string> = {
  paid: "border-success/25 bg-success/10 text-success",
  due: "border-warning/25 bg-warning/10 text-warning",
  overdue: "border-destructive/25 bg-destructive/10 text-destructive",
  void: "border-border bg-muted text-muted-foreground",
  draft: "border-border bg-muted text-muted-foreground",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const raw = String(value).slice(0, 10);
  const d = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function planFeatures(plan: PlatformPlanRow): string[] {
  const included = plan.includedMembers;
  if (plan.pricingModel === "enterprise" || plan.code === "enterprise") {
    return [
      "Unlimited members",
      "Custom onboarding",
      "Volume pricing",
      "Dedicated support",
    ];
  }
  return [
    included != null
      ? `Up to ${included.toLocaleString("en-IN")} active members`
      : "Custom member capacity",
    "All GymmerzHub features",
    "Member app & attendance",
    "Workouts, diet & payments",
    "Email support",
  ];
}

function PlanCard({
  plan,
  current,
  scheduled,
  popular,
  activeMembers,
  switching,
  disabled,
  mode,
  currentMonthlyFee = 0,
  onAction,
}: {
  plan: PlatformPlanRow;
  current: boolean;
  scheduled: boolean;
  popular: boolean;
  activeMembers: number;
  switching: boolean;
  disabled: boolean;
  mode: "purchase" | "upgrade";
  currentMonthlyFee?: number;
  onAction: () => void;
}) {
  const isEnterprise = plan.pricingModel === "enterprise" || plan.code === "enterprise";
  const included = plan.includedMembers;
  const canScheduleDowngrade =
    isEnterprise || included == null || activeMembers <= included;
  const blocked = !current && !isEnterprise && !canScheduleDowngrade && mode === "upgrade";
  const tooSmallForPurchase =
    mode === "purchase"
    && !isEnterprise
    && included != null
    && activeMembers > included;
  const isDowngrade = mode === "upgrade" && plan.monthlyFee < currentMonthlyFee;
  const actionLabel = current
    ? "Current plan"
    : scheduled
      ? "Scheduled"
      : isEnterprise
        ? "Contact sales"
        : mode === "purchase"
          ? "Get started"
          : isDowngrade
            ? "Schedule"
            : "Upgrade";
  const features = planFeatures(plan);
  const actionDisabled =
    current || scheduled || blocked || tooSmallForPurchase || disabled;
  const subtitle = plan.tagline
    || (isEnterprise || included == null
      ? "For large gyms & chains"
      : `Best for up to ${included.toLocaleString("en-IN")} members`);

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card p-5 shadow-sm transition-shadow",
        popular && !current && "border-primary/40 shadow-glow",
        current && "border-primary/50 bg-primary/[0.03]",
        !popular && !current && "border-border hover:border-border/80",
      )}
    >
      {(popular || current || scheduled) && (
        <div className="absolute -top-2.5 left-5">
          <Badge
            className={cn(
              "h-5 px-2 text-[10px] font-semibold uppercase tracking-wide",
              current
                ? "bg-primary text-primary-foreground"
                : scheduled
                  ? "border border-border bg-background text-muted-foreground"
                  : "bg-gradient-primary text-primary-foreground",
            )}
          >
            {current ? "Current" : scheduled ? "Scheduled" : "Popular"}
          </Badge>
        </div>
      )}

      <div className="space-y-1 pt-1">
        <h4 className="font-display text-lg font-semibold tracking-tight">{plan.name}</h4>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="mt-5">
        {isEnterprise ? (
          <div className="font-display text-3xl font-bold tracking-tight">Custom</div>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="font-display text-3xl font-bold tracking-tight">
              {formatINR(plan.monthlyFee)}
            </span>
            <span className="text-sm text-muted-foreground">/ month</span>
          </div>
        )}
      </div>

      <ul className="mt-5 flex-1 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-foreground/90">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {(blocked || tooSmallForPurchase) && included != null ? (
        <p className="mt-3 text-xs text-destructive">
          You have more than {included.toLocaleString("en-IN")} members — pick a larger plan
        </p>
      ) : null}

      <div className="mt-6">
        {isEnterprise && !current ? (
          <Button variant="outline" className="w-full" asChild>
            <a href="mailto:sales@gymmerzhub.com">Contact sales</a>
          </Button>
        ) : (
          <Button
            className={cn(
              "w-full",
              !actionDisabled && (popular || mode === "purchase")
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : undefined,
            )}
            variant={actionDisabled || (!popular && mode === "upgrade") ? "outline" : "default"}
            disabled={actionDisabled}
            onClick={onAction}
          >
            {switching ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

function BillingPage() {
  const session = getSession();
  const [data, setData] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payingAll, setPayingAll] = useState(false);
  const [switchingPlan, setSwitchingPlan] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await fetchBillingSummary();
      setData(summary);
      // Keep hub session plan/status in sync with live billing (avoids Growth vs Starter mismatch).
      const current = getSession();
      if (current && summary.gym) {
        setSession({
          ...current,
          plan: (summary.gym.platformPlan as GymPlan | null) ?? null,
          billingStatus: (summary.gym.billingStatus as BillingStatus) || current.billingStatus,
          trialEndsAt: summary.gym.trialEndsAt
            ? String(summary.gym.trialEndsAt).slice(0, 10)
            : current.trialEndsAt,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!session) return null;

  async function payInvoice(invoice: PlatformInvoiceRow) {
    setPayingId(invoice.id);
    setError(null);
    try {
      if (!data?.razorpayEnabled) {
        await markInvoicePaidDev(invoice.id);
        await reload();
        return;
      }
      const order = await createInvoicePaymentOrder(invoice.id);
      const result = await openRazorpayCheckout(order, session!);
      await confirmInvoicePayment(invoice.id, result);
      await reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed";
      if (message !== "Payment cancelled") setError(message);
    } finally {
      setPayingId(null);
    }
  }

  async function payAllUnpaid() {
    setPayingAll(true);
    setError(null);
    try {
      if (!data?.razorpayEnabled) {
        await markAllInvoicesPaidDev();
        await reload();
        return;
      }
      const order = await createPayAllOrder();
      const result = await openRazorpayCheckout(order, session!);
      await confirmPayAllPayment(result);
      await reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed";
      if (message !== "Payment cancelled") setError(message);
    } finally {
      setPayingAll(false);
    }
  }

  async function onPurchasePlan(planCode: string) {
    setSwitchingPlan(planCode);
    setError(null);
    let checkoutInvoiceId: string | null = null;
    try {
      const result = await purchasePlatformPlan(planCode);
      const invoice = result.invoice;
      if (!invoice?.id) throw new Error("Could not start checkout");
      checkoutInvoiceId = invoice.id;

      if (!data?.razorpayEnabled || !result.paymentOrder?.orderId) {
        await markInvoicePaidDev(invoice.id);
        toast.success("Plan activated. Next bill is next month.");
        await reload();
        return;
      }

      const order = result.paymentOrder.orderId
        ? result.paymentOrder
        : await createInvoicePaymentOrder(invoice.id);
      const payment = await openRazorpayCheckout(order, session!);
      await confirmInvoicePayment(invoice.id, payment);
      toast.success("Plan activated. Next bill is next month.");
      await reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not purchase plan";
      if (message === "Payment cancelled" && checkoutInvoiceId) {
        try {
          await voidCheckoutInvoice(checkoutInvoiceId);
        } catch {
          // ignore
        }
        await reload();
        return;
      }
      if (message !== "Payment cancelled") {
        setError(message);
        toast.error(message);
      }
    } finally {
      setSwitchingPlan(null);
    }
  }

  async function onUpgradePlan(planCode: string) {
    setSwitchingPlan(planCode);
    setError(null);
    let checkoutInvoiceId: string | null = null;
    try {
      const result = await switchPlatformPlan(planCode);
      const current = getSession();

      if (result.requiresPayment && result.invoice?.id) {
        checkoutInvoiceId = result.invoice.id;
        if (!data?.razorpayEnabled || !result.paymentOrder?.orderId) {
          await markInvoicePaidDev(result.invoice.id);
          toast.success(result.message || "Upgraded");
          await reload();
          return;
        }
        const order = result.paymentOrder!.orderId
          ? result.paymentOrder!
          : await createInvoicePaymentOrder(result.invoice.id);
        const payment = await openRazorpayCheckout(order, session!);
        await confirmInvoicePayment(result.invoice.id, payment);
        toast.success(result.message || "Upgraded. Next bill stays on renewal.");
        await reload();
        return;
      }

      if (current && result.gym?.platformPlan) {
        setSession({
          ...current,
          plan: (result.gym.platformPlan as GymPlan | null) ?? null,
        });
      }
      toast.success(result.message || "Plan updated");
      await reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not upgrade plan";
      if (message === "Payment cancelled" && checkoutInvoiceId) {
        try {
          await voidCheckoutInvoice(checkoutInvoiceId);
        } catch {
          // ignore
        }
        await reload();
        return;
      }
      setError(message);
      toast.error(message);
    } finally {
      setSwitchingPlan(null);
    }
  }

  async function downloadPdf(invoice: PlatformInvoiceRow) {
    setDownloadingId(invoice.id);
    setError(null);
    try {
      const { blob, filename } = await downloadInvoicePdf(invoice.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF download failed");
    } finally {
      setDownloadingId(null);
    }
  }

  const trial = data?.trial;
  const estimate = data?.estimate;
  const capacity = data?.capacity;
  const activeMembers = data?.activeMembers ?? 0;
  const peakMembers = data?.peakMembers ?? data?.gym?.billingPeriodPeakMembers ?? activeMembers;
  const billableMembers = data?.billableMembers ?? Math.max(peakMembers, activeMembers);
  const billingStatus = data?.gym.billingStatus ?? session.billingStatus;
  const needsPlanPurchase = Boolean(data?.needsPlanPurchase || trial?.trialExpired);
  const currentPlanCode = needsPlanPurchase ? null : (data?.gym?.platformPlan || null);
  const included = capacity?.includedMembers
    ?? (needsPlanPurchase || trial?.isTrialing ? (trial?.memberLimit ?? 30) : null)
    ?? estimate?.includedMembers
    ?? 0;
  const hardLimit = capacity?.hardLimit ?? (included + (estimate?.graceMembers ?? 0));
  const memberUsagePct = Math.min(
    100,
    Math.round((activeMembers / Math.max(included || 1, 1)) * 100),
  );
  const nextPlanCode = data?.gym?.nextPlanCode || null;
  const trialElapsed = trial
    ? Math.min(trial.totalDays, Math.max(0, trial.totalDays - trial.daysLeft))
    : 0;
  const openInvoice = data?.openInvoice ?? null;
  const unpaidCount = data?.unpaidCount
    ?? data?.invoices?.filter((i) => i.status === "due" || i.status === "overdue").length
    ?? 0;
  const unpaidTotal = data?.unpaidTotal
    ?? data?.invoices
      ?.filter((i) => i.status === "due" || i.status === "overdue")
      .reduce((sum, i) => sum + i.totalAmount, 0)
    ?? 0;
  const needsAttention =
    Boolean(openInvoice)
    || billingStatus === "past_due"
    || billingStatus === "suspended";
  const capacityWarning = !needsPlanPurchase ? capacity?.message : null;
  const atTrialMemberLimit =
    Boolean(trial?.isTrialing) && capacity?.atHardLimit === true;
  const planAction = needsPlanPurchase || !currentPlanCode ? "purchase" : "upgrade";

  return (
    <div>
      <PageHeader
        badge="Billing"
        title="Billing"
        description="Your GymmerzHub subscription and invoices."
      />

      <div className="mx-auto max-w-5xl space-y-8 p-6">
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {loading && !data ? (
          <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading billing…
          </div>
        ) : null}

        {data ? (
          <>
            {needsPlanPurchase ? (
              <BillingCallout
                tone="danger"
                icon={<AlertTriangle className="h-5 w-5" />}
                title="Free trial ended"
                body="Choose a plan to keep managing your gym."
                actions={
                  <>
                    <Button
                      size="sm"
                      className="bg-gradient-primary text-primary-foreground"
                      onClick={() =>
                        document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })
                      }
                    >
                      Choose a plan
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href="mailto:sales@gymmerzhub.com">Talk to sales</a>
                    </Button>
                  </>
                }
              />
            ) : null}

            {atTrialMemberLimit && !needsPlanPurchase ? (
              <BillingCallout
                tone="warn"
                icon={<Users className="h-5 w-5" />}
                title="Member limit on free trial"
                body={`Free trial allows ${trial?.memberLimit ?? 30} members. Upgrade anytime to add more — ${trial?.daysLeft ?? 0} day${(trial?.daysLeft ?? 0) === 1 ? "" : "s"} left.`}
                actions={
                  <>
                    <Button
                      size="sm"
                      className="bg-gradient-primary text-primary-foreground"
                      onClick={() =>
                        document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })
                      }
                    >
                      See plans
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })
                      }
                    >
                      Upgrade
                    </Button>
                  </>
                }
              />
            ) : null}

            {capacityWarning && !atTrialMemberLimit && !needsPlanPurchase ? (
              <BillingCallout
                tone="warn"
                icon={<AlertTriangle className="h-5 w-5" />}
                title="Heads up"
                body={capacityWarning}
                actions={
                  capacity?.suggestedUpgrade ? (
                    <Button
                      size="sm"
                      className="bg-gradient-primary text-primary-foreground"
                      onClick={() =>
                        void (planAction === "purchase"
                          ? onPurchasePlan(capacity.suggestedUpgrade!)
                          : onUpgradePlan(capacity.suggestedUpgrade!))
                      }
                    >
                      Upgrade
                    </Button>
                  ) : null
                }
              />
            ) : null}

            {nextPlanCode ? (
              <BillingCallout
                tone="neutral"
                icon={<Check className="h-5 w-5" />}
                title="Lower plan scheduled"
                body="It will take effect on your next renewal. Nothing changes until then."
              />
            ) : null}

            {needsAttention && openInvoice ? (
              <BillingCallout
                tone="pay"
                icon={<CreditCard className="h-5 w-5" />}
                title={
                  billingStatus === "suspended"
                    ? "Pay to restore access"
                    : billingStatus === "past_due" || openInvoice.status === "overdue"
                      ? "Payment overdue"
                      : "Payment due"
                }
                body={
                  unpaidCount > 1
                    ? `${unpaidCount} unpaid bills · ${formatINR(unpaidTotal)} total`
                    : `${formatINR(openInvoice.totalAmount)} due by ${formatDate(openInvoice.dueAt)}`
                }
                actions={
                  <>
                    {unpaidCount === 1 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={downloadingId === openInvoice.id}
                        onClick={() => void downloadPdf(openInvoice)}
                      >
                        {downloadingId === openInvoice.id ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        PDF
                      </Button>
                    ) : null}
                    {unpaidCount > 1 ? (
                      <Button
                        size="sm"
                        className="bg-gradient-primary text-primary-foreground shadow-glow"
                        disabled={payingAll || payingId != null}
                        onClick={() => void payAllUnpaid()}
                      >
                        {payingAll ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        Pay {formatINR(unpaidTotal)}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-gradient-primary text-primary-foreground shadow-glow"
                        disabled={payingId === openInvoice.id || payingAll}
                        onClick={() => void payInvoice(openInvoice)}
                      >
                        {payingId === openInvoice.id ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        Pay {formatINR(openInvoice.totalAmount)}
                      </Button>
                    )}
                  </>
                }
              />
            ) : null}

            {/* Current plan summary */}
            <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
              <div className="flex flex-col gap-4 border-b border-border p-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-semibold tracking-tight">
                      {trial?.isTrialing
                        ? "Free trial"
                        : needsPlanPurchase
                          ? "Choose a plan"
                          : estimate?.bandName || currentPlanCode
                            ? `${estimate?.bandName || currentPlanCode} plan`
                            : "Choose a plan"}
                    </h2>
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize",
                        trial?.isTrialing && "border-primary/25 bg-primary/10 text-primary",
                        needsPlanPurchase && "border-warning/30 bg-warning/10 text-warning",
                        !trial?.isTrialing && !needsPlanPurchase && billingStatus === "active" && "border-success/25 bg-success/10 text-success",
                        billingStatus === "past_due" && "border-warning/25 bg-warning/10 text-warning",
                        billingStatus === "suspended" && "border-destructive/25 bg-destructive/10 text-destructive",
                      )}
                    >
                      {trial?.isTrialing
                        ? "Trial"
                        : needsPlanPurchase
                          ? "Trial ended"
                          : statusLabel(billingStatus)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {data.gym.name}
                    {trial?.isTrialing
                      ? ` · ${trial.daysLeft} day${trial.daysLeft === 1 ? "" : "s"} left in free trial`
                      : needsPlanPurchase
                        ? " · Choose a plan to continue"
                        : ` · Renews ${formatDate(data.gym.nextInvoiceAt)}`}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <div className="font-display text-3xl font-bold tracking-tight">
                    {needsPlanPurchase || trial?.isTrialing
                      ? "Free"
                      : estimate
                        ? formatINR(estimate.amount)
                        : "—"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {needsPlanPurchase || trial?.isTrialing ? "during trial" : "per month"}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 p-6 sm:grid-cols-3">
                <Metric
                  label="Active members"
                  value={activeMembers.toLocaleString("en-IN")}
                  hint={
                    capacity?.mode === "trial"
                      ? `Free trial allows up to ${included.toLocaleString("en-IN")}`
                      : `Your plan includes ${included.toLocaleString("en-IN")}${
                          hardLimit != null && hardLimit > included
                            ? ` (room for ${hardLimit - included} more in buffer)`
                            : ""
                        }`
                  }
                />
                <Metric
                  label="Monthly fee"
                  value={
                    needsPlanPurchase || trial?.isTrialing
                      ? "—"
                      : estimate
                        ? formatINR(estimate.baseFee)
                        : "—"
                  }
                  hint={
                    trial?.isTrialing
                      ? "No charge while you're on trial"
                      : needsPlanPurchase
                        ? "Shown after you pick a plan"
                        : "Same price every month · all features included"
                  }
                />
                <Metric
                  label={trial?.isTrialing ? "Trial ends" : "Next bill"}
                  value={
                    trial?.isTrialing
                      ? formatDate(trial.trialEndsAt)
                      : formatDate(data.gym.nextInvoiceAt)
                  }
                  hint={
                    trial?.isTrialing
                      ? `${trial.daysLeft} day${trial.daysLeft === 1 ? "" : "s"} remaining`
                      : "You'll get a bill each month"
                  }
                />
              </div>

              {trial?.isTrialing ? (
                <div className="border-t border-border bg-primary/[0.03] px-6 py-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Free trial · {trial.daysLeft} day{trial.daysLeft === 1 ? "" : "s"} left · up to{" "}
                    {trial.memberLimit ?? 30} members
                  </div>
                  <Progress
                    value={(trialElapsed / Math.max(trial.totalDays, 1)) * 100}
                    className="h-1.5"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Day {trialElapsed} of {trial.totalDays}. You can upgrade anytime if you need more
                    members.
                  </p>
                </div>
              ) : needsPlanPurchase ? (
                <div className="border-t border-border bg-warning/[0.04] px-6 py-5 text-sm text-muted-foreground">
                  Pick a plan below and complete payment to keep using GymmerzHub.
                </div>
              ) : (
                <div className="border-t border-border px-6 py-5">
                  <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                    <span>Members vs your plan limit</span>
                    <span>
                      {activeMembers} / {included}
                      {hardLimit != null && hardLimit > included
                        ? ` (buffer up to ${hardLimit})`
                        : ""}
                    </span>
                  </div>
                  <Progress value={memberUsagePct} className="h-1.5" />
                </div>
              )}
            </section>

            <Tabs defaultValue={needsPlanPurchase || atTrialMemberLimit ? "plans" : "invoices"} className="space-y-5">
              <TabsList className="h-10 w-full justify-start gap-1 rounded-lg border border-border bg-muted/40 p-1 sm:w-auto">
                <TabsTrigger value="invoices" className="rounded-md px-4">
                  Bills
                </TabsTrigger>
                <TabsTrigger value="plans" className="rounded-md px-4">
                  Plans
                </TabsTrigger>
              </TabsList>

              <TabsContent value="invoices" className="mt-0 space-y-3">
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
                  <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <div>
                      <h3 className="text-sm font-semibold">Bills</h3>
                      <p className="text-xs text-muted-foreground">
                        What you pay GymmerzHub for the software
                      </p>
                    </div>
                  </div>

                  {data.invoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                      <div className="grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="text-sm font-medium">No bills yet</div>
                      <p className="max-w-sm text-xs text-muted-foreground">
                        {trial?.isTrialing
                          ? "Nothing to pay during your free trial."
                          : "Your first bill appears when you choose a plan."}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="pl-5">Invoice</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead>Members managing</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="pr-5 text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.invoices.map((inv) => (
                            <InvoiceRow
                              key={inv.id}
                              invoice={inv}
                              paying={payingId === inv.id}
                              downloading={downloadingId === inv.id}
                              onPay={() => void payInvoice(inv)}
                              onDownload={() => void downloadPdf(inv)}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <p className="px-1 text-xs text-muted-foreground">
                  Money your members pay the gym is tracked under{" "}
                  <Link to="/payments" className="font-medium text-foreground underline-offset-2 hover:underline">
                    Payments
                  </Link>
                  . This page is only your GymmerzHub subscription.
                </p>
              </TabsContent>

              <TabsContent value="plans" className="mt-0" id="plans">
                <div className="space-y-5">
                  <div className="text-center sm:text-left">
                    <h3 className="font-display text-xl font-semibold tracking-tight">
                      {needsPlanPurchase || atTrialMemberLimit ? "Choose a plan" : "Plans"}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Every plan includes all features. Pick the member capacity that fits your gym.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {data.plans.map((p) => (
                      <PlanCard
                        key={p.code}
                        plan={p}
                        current={Boolean(currentPlanCode) && p.code === currentPlanCode}
                        scheduled={p.code === nextPlanCode}
                        popular={p.code === "growth"}
                        activeMembers={billableMembers}
                        switching={switchingPlan === p.code}
                        disabled={switchingPlan != null}
                        mode={planAction}
                        currentMonthlyFee={estimate?.monthlyFee ?? estimate?.baseFee ?? 0}
                        onAction={() =>
                          void (planAction === "purchase"
                            ? onPurchasePlan(p.code)
                            : onUpgradePlan(p.code))
                        }
                      />
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </div>
    </div>
  );
}

function BillingCallout({
  tone,
  icon,
  title,
  body,
  actions,
}: {
  tone: "warn" | "danger" | "pay" | "neutral";
  icon: ReactNode;
  title: string;
  body: string;
  actions?: ReactNode;
}) {
  const toneStyles = {
    warn: {
      wrap: "border-warning/25 bg-[linear-gradient(135deg,hsl(var(--warning)/0.12),hsl(var(--card)_/_1)_55%)]",
      bar: "bg-warning",
      icon: "bg-warning/15 text-warning",
    },
    danger: {
      wrap: "border-destructive/25 bg-[linear-gradient(135deg,hsl(var(--destructive)/0.1),hsl(var(--card)_/_1)_55%)]",
      bar: "bg-destructive",
      icon: "bg-destructive/15 text-destructive",
    },
    pay: {
      wrap: "border-primary/25 bg-[linear-gradient(135deg,hsl(var(--primary)/0.12),hsl(var(--card)_/_1)_55%)]",
      bar: "bg-primary",
      icon: "bg-primary/15 text-primary",
    },
    neutral: {
      wrap: "border-border bg-muted/40",
      bar: "bg-muted-foreground/40",
      icon: "bg-muted text-muted-foreground",
    },
  }[tone];

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border shadow-sm",
        toneStyles.wrap,
      )}
    >
      <div className={cn("absolute inset-y-0 left-0 w-1", toneStyles.bar)} />
      <div className="flex flex-col gap-4 p-5 pl-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <div
            className={cn(
              "mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl",
              toneStyles.icon,
            )}
          >
            {icon}
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
              {title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
          </div>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 pl-0 sm:pl-2">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 font-display text-xl font-semibold tracking-tight">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function InvoiceRow({
  invoice,
  paying,
  downloading,
  onPay,
  onDownload,
}: {
  invoice: PlatformInvoiceRow;
  paying: boolean;
  downloading: boolean;
  onPay: () => void;
  onDownload: () => void;
}) {
  const payable = invoice.status === "due" || invoice.status === "overdue";

  return (
    <TableRow>
      <TableCell className="pl-5">
        <div className="font-medium">{invoice.number}</div>
        <div className="text-xs text-muted-foreground">
          {invoice.paidAt ? `Paid ${formatDate(invoice.paidAt)}` : `Due ${formatDate(invoice.dueAt)}`}
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
      </TableCell>
      <TableCell>
        <div className="font-medium">
          {(invoice.billableMembers ?? invoice.membersManaging ?? invoice.activeMembersSnapshot ?? 0).toLocaleString("en-IN")}
        </div>
        <div className="text-xs text-muted-foreground">
          {invoice.peakMembersSnapshot != null
            ? `peak ${invoice.peakMembersSnapshot.toLocaleString("en-IN")}`
            : "billable"}
        </div>
      </TableCell>
      <TableCell className="font-medium">{formatINR(invoice.totalAmount)}</TableCell>
      <TableCell>
        <Badge variant="outline" className={cn("capitalize", statusStyles[invoice.status])}>
          {invoice.status}
        </Badge>
        {invoice.status === "paid" && invoice.paymentMethod ? (
          <div className="mt-1 text-xs text-muted-foreground">{invoice.paymentMethod}</div>
        ) : null}
      </TableCell>
      <TableCell className="pr-5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <Button size="sm" variant="ghost" disabled={downloading} onClick={onDownload}>
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span className="ml-1.5">PDF</span>
          </Button>
          {payable ? (
            <Button size="sm" disabled={paying} onClick={onPay}>
              {paying ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Pay
            </Button>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}
